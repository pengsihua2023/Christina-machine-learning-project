#!/usr/bin/env python3
"""
第一步：构建建模用的特征矩阵与标签表，并输出数据质控报告。

用法:
    python3 build_features.py                      # 全部样本 + 主队列
    python3 build_features.py --study PRJNA464410  # 只导出主队列
    python3 build_features.py --prevalence 0.05

输出到 features/ :
    counts_featureID.csv    对齐后的 FeatureID 级计数（全部样本）
    counts_genus.csv        Genus 级聚合计数
    labels.csv              SampleID, label(0/1), Influenza, BioProject, 协变量
    qc_report.txt           质控报告（深度、稀疏度、流行度、批次分布）
    prevalence_table.csv    每个特征的流行度/丰度/分类学，供人工核查
"""
import argparse
import os
import sys

import numpy as np
import pandas as pd

import mb_common as mb

OUTDIR = "features"


def qc_report(counts, taxonomy, meta, y, path):
    lines = []
    w = lines.append
    X = counts.values.astype(float)
    depth = X.sum(axis=1)
    rich = (X > 0).sum(axis=1)

    w("=" * 72)
    w("数据质控报告")
    w("=" * 72)
    w(f"样本数: {counts.shape[0]}    特征数(FeatureID): {counts.shape[1]}")
    w(f"标签分布: Pos={int(y.sum())}  Neg={int((1 - y).sum())}  "
      f"(阳性率 {y.mean():.3f})")
    w("")

    w("--- 测序深度 ---")
    w(f"min={depth.min():.0f}  q25={np.percentile(depth,25):.0f}  "
      f"median={np.median(depth):.0f}  q75={np.percentile(depth,75):.0f}  "
      f"max={depth.max():.0f}")
    w(f"深度恰好等于 {depth.max():.0f} 的样本: {(depth == depth.max()).sum()} "
      f"({(depth == depth.max()).mean():.1%})  -> 提示数据已被抽平(rarefied)")
    for t in [1000, 2000, 3000, 5000]:
        n = (depth < t).sum()
        if n:
            w(f"  深度 < {t}: {n} 个样本")
    w("")

    w("--- 稀疏度与流行度 ---")
    w(f"零值比例: {(X == 0).mean():.3f}")
    w(f"每样本观测到的特征数: median={np.median(rich):.0f} "
      f"[{rich.min()}, {rich.max()}]")
    prev = (X > 0).mean(axis=0)
    for t in [0.01, 0.05, 0.10, 0.20, 0.30, 0.50]:
        w(f"  流行度 >= {t:.2f}: {(prev >= t).sum():4d} 个特征")
    w("")

    w("--- 分类学注释完整度 ---")
    for lv in ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"]:
        if lv in taxonomy.columns:
            n = taxonomy[lv].notna().sum()
            w(f"  {lv:<8} 有注释 {n:4d}/{len(taxonomy)}  "
              f"({taxonomy[lv].nunique()} 个不同取值)")
    w("")

    w("--- 批次(BioProject) x 标签 ---")
    ct = pd.crosstab(meta[mb.BATCH_COL], meta[mb.LABEL_COL])
    for line in ct.to_string().split("\n"):
        w("  " + line)
    w("")
    w("  各批次深度中位数 / 观测特征数中位数:")
    tmp = pd.DataFrame({"proj": meta[mb.BATCH_COL].values, "depth": depth, "rich": rich})
    for line in tmp.groupby("proj").median().to_string().split("\n"):
        w("  " + line)
    w("")

    w("--- 已排除的标签泄漏列 ---")
    for c in mb.LEAKAGE_COLS:
        if c in meta.columns:
            # 只看有取值的样本：NA 行代表该列不适用于这些样本，不算作一个类别
            obs = meta[c].notna()
            n_obs = int(obs.sum())
            if n_obs == 0:
                w(f"  {c:<45} 全空")
                continue
            vc = pd.crosstab(meta.loc[obs, c], meta.loc[obs, mb.LABEL_COL])
            perfect = ((vc > 0).sum(axis=1) == 1).all()
            tag = "完全可分(泄漏)" if perfect else "部分相关"
            w(f"  {c:<45} {tag}  (在 {n_obs}/{len(meta)} 个样本上有取值)")
    w("")

    w("--- 采样月份 x 标签（已知混杂因子）---")
    if meta["month"].notna().any():
        ct = pd.crosstab(meta["month"].fillna(-1), meta[mb.LABEL_COL])
        for line in ct.to_string().split("\n"):
            w("  " + line)
    w("")
    w("=" * 72)

    text = "\n".join(lines)
    with open(path, "w") as f:
        f.write(text + "\n")
    return text


def prevalence_table(counts, taxonomy):
    X = counts.values.astype(float)
    rel = X / np.maximum(X.sum(axis=1, keepdims=True), 1)
    df = pd.DataFrame({
        "FeatureID": counts.columns,
        "prevalence": (X > 0).mean(axis=0),
        "mean_rel_abundance": rel.mean(axis=0),
        "max_rel_abundance": rel.max(axis=0),
        "total_count": X.sum(axis=0).astype(int),
    })
    tax = taxonomy.reindex(df.FeatureID)
    for lv in ["Phylum", "Family", "Genus"]:
        if lv in tax.columns:
            df[lv] = tax[lv].values
    return df.sort_values("prevalence", ascending=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--study", default=None,
                    help="只导出指定 BioProject（如 PRJNA464410）")
    ap.add_argument("--prevalence", type=float, default=mb.PREVALENCE,
                    help="报告用的流行度阈值参考值（不在此处过滤，过滤在 CV 内进行）")
    ap.add_argument("--outdir", default=OUTDIR)
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    print("读取数据 ...")
    counts, taxonomy, meta = mb.load_all(args.root)
    y = mb.get_label(meta)
    print(f"  对齐后: {counts.shape[0]} 样本 x {counts.shape[1]} 特征")

    if args.study:
        sel = meta[mb.BATCH_COL] == args.study
        if sel.sum() == 0:
            sys.exit(f"没有找到 BioProject={args.study}")
        counts, meta, y = counts[sel.values], meta[sel.values], y[sel.values]
        print(f"  限定 {args.study}: {counts.shape[0]} 样本")

    print("生成质控报告 ...")
    text = qc_report(counts, taxonomy, meta, y,
                     os.path.join(args.outdir, "qc_report.txt"))
    print(text)

    print("聚合到 Genus 层 ...")
    genus = mb.collapse_to_genus(counts, taxonomy, "Genus")
    print(f"  FeatureID {counts.shape[1]} -> Genus {genus.shape[1]}")

    # 标签 + 协变量表
    cov, cat, num = mb.build_covariates(meta)
    labels = pd.DataFrame({"label": y.values}, index=counts.index)
    labels[mb.LABEL_COL] = meta[mb.LABEL_COL].values
    labels[mb.BATCH_COL] = meta[mb.BATCH_COL].values
    for c in ["HostGroup", "HostType", "SampleContext"]:
        if c in meta.columns:
            labels[c] = meta[c].values
    for c in cat + num:
        labels[c] = cov[c].values
    labels.index.name = mb.SAMPLE_COL

    counts.to_csv(os.path.join(args.outdir, "counts_featureID.csv"))
    genus.to_csv(os.path.join(args.outdir, "counts_genus.csv"))
    labels.to_csv(os.path.join(args.outdir, "labels.csv"))
    prevalence_table(counts, taxonomy).to_csv(
        os.path.join(args.outdir, "prevalence_table.csv"), index=False)

    print(f"\n已写出到 {args.outdir}/ :")
    for f in ["counts_featureID.csv", "counts_genus.csv", "labels.csv",
              "prevalence_table.csv", "qc_report.txt"]:
        p = os.path.join(args.outdir, f)
        print(f"  {f:<24} {os.path.getsize(p)/1024:8.1f} KB")

    prev = (counts.values > 0).mean(axis=0)
    print(f"\n提示: 在流行度 >= {args.prevalence} 下将保留 "
          f"{(prev >= args.prevalence).sum()} 个 FeatureID；"
          f"实际过滤在 train_eval.py 的 CV 训练折内进行。")


if __name__ == "__main__":
    main()
