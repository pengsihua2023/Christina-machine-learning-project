#!/usr/bin/env python3
"""
导出「开箱即用」的二分类建模数据集。

用法:
    python3 export_ml_dataset.py

输出到 ml_dataset/ :
    primary_clr.csv        主力文件：n=260，CLR 变换后，可直接 fit
    primary_counts.csv     同样本的原始计数（推荐配 pipeline 用，评估更严谨）
    allstudies_clr.csv     全部 326 样本，CLR
    allstudies_counts.csv  全部 326 样本，原始计数
    feature_dictionary.csv 每个特征列 -> FeatureID / 分类学
    README.txt             列的含义与使用注意
"""
import os

import numpy as np
import pandas as pd

import mb_common as mb

OUTDIR = "ml_dataset"

# 每个数据集里放在特征前面的元数据列
META_COLS = ["label", "Influenza", "BioProject", "HostGroup", "HostType",
             "Season", "Age", "Sex", "Feeding", "Species", "Location", "month"]


def safe_name(fid, taxonomy):
    """生成人类可读且唯一的列名: <Genus>__<FeatureID前8位>"""
    g = None
    if taxonomy is not None and fid in taxonomy.index:
        for lv in ["Genus", "Family", "Order", "Phylum"]:
            v = taxonomy.loc[fid, lv] if lv in taxonomy.columns else None
            if isinstance(v, str) and v.strip():
                g = v.strip().replace(" ", "_").replace("/", "-")
                break
    g = g or "unclassified"
    return f"{g}__{str(fid)[:8]}"


def build(counts, meta, taxonomy, prevalence, transform):
    """返回一个 DataFrame: [元数据列] + [特征列]，index = SampleID。"""
    tr = mb.PrevalenceCLR(prevalence=prevalence).fit(counts.values)
    kept = tr.get_feature_names_out(counts.columns.to_numpy())

    if transform == "clr":
        X = pd.DataFrame(tr.transform(counts.values), index=counts.index, columns=kept)
    else:
        X = counts[kept].astype(int)

    X.columns = [safe_name(f, taxonomy) for f in kept]
    assert X.columns.is_unique, "特征列名冲突"

    y = mb.get_label(meta)
    head = pd.DataFrame(index=counts.index)
    head["label"] = y.values
    for c in META_COLS[1:]:
        if c in meta.columns:
            head[c] = meta[c].values

    out = pd.concat([head, X], axis=1)
    out.index.name = mb.SAMPLE_COL
    return out, kept


def readme(files, prevalence):
    return f"""二分类建模数据集 —— 流感感染 (Influenza Pos/Neg) 预测
================================================================

标签列
------
  label      0 = Neg(未感染)，1 = Pos(感染)   <-- 建模用这一列
  Influenza  原始字符串标签 Pos/Neg（冗余，便于核对）

特征列
------
  列名格式 <Genus>__<FeatureID前8位>，例如 Rothia__da821e0a
  对应关系见 feature_dictionary.csv
  已按流行度 >= {prevalence:.2f} 过滤（特征需在至少该比例样本中出现）

协变量列（可选特征，也是已知混杂因子）
--------------------------------------
  BioProject  研究批次。跨批次建模会引入强批次效应，务必留意
  HostGroup / HostType / Species   宿主
  Season / Age / Sex / Feeding / Location / month   生态与采样变量
  month 是采样月份，与标签强相关（11-12月 100% 阳性，1月 90% 阴性）。
  它既是真实的季节性信号，也是采样批次的代理变量 —— 单独用它 AUC 就有 0.78。
  报告结果时必须做月份分层或把它作为协变量调整。

文件
----
{files}

counts 版 vs clr 版怎么选
--------------------------
  counts 版 = 原始整数计数（已由上游抽平到约 5000）
  clr 版    = 已做 伪计数0.5 -> 相对丰度 -> centered log-ratio

  * 想直接 fit / 快速试模型      -> 用 clr 版
  * 想产出可发表的性能数字        -> 用 counts 版，把变换放进 sklearn pipeline：
        Pipeline([('clr', PrevalenceCLR(0.10)), ('sc', StandardScaler()), ('clf', ...)])
    （PrevalenceCLR 在 mb_common.py 里）

  原因：clr 版的流行度过滤是在全部样本上做的，交叉验证时验证折的信息
  会通过"哪些特征被保留"这一步轻微泄漏进来。用 pipeline 则在每折训练集
  内部重新过滤，没有这个问题。CLR 本身是逐样本的行内运算，不存在跨样本泄漏。

已经排除的内容
--------------
  标签泄漏列（Infection / CoreGroup / HASubType / 病毒滴度 等）已全部剔除，
  完整清单见 mb_common.py 的 LEAKAGE_COLS。样本 ID 类列也已剔除。

推荐的建模设置（基于已跑过的验证）
----------------------------------
  数据集    primary_*（PRJNA464410，n=260，同中心/同宿主/同组织）
  模型      RandomForest 或 L2/L1 逻辑回归，class_weight='balanced'
  验证      RepeatedStratifiedKFold(5折 x 5次)
  指标      ROC-AUC + PR-AUC（不要只报 accuracy，阳性率 58%）
  参考值    仅菌群 AUC ≈ 0.77-0.81；置换检验 p ≈ 0.01
            菌群+协变量 AUC ≈ 0.92
  不推荐    allstudies_* 做跨研究泛化：4 个研究宿主完全不同，
            GroupKFold 下 AUC 0.54 ± 0.29，等于随机
"""


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    counts, taxonomy, meta = mb.load_all(".")
    meta = meta.copy()

    sel = (meta[mb.BATCH_COL] == mb.PRIMARY_STUDY).values
    cohorts = {
        "primary": (counts[sel], meta[sel]),
        "allstudies": (counts, meta),
    }

    written, kept_primary = [], None
    for cname, (c, m) in cohorts.items():
        for tf in ["clr", "counts"]:
            df, kept = build(c, m, taxonomy, mb.PREVALENCE, tf)
            path = os.path.join(OUTDIR, f"{cname}_{tf}.csv")
            df.to_csv(path)
            n_feat = df.shape[1] - sum(cc in df.columns for cc in META_COLS)
            written.append(
                f"  {cname}_{tf}.csv"
                f"{'':<{max(1, 24 - len(cname) - len(tf))}}"
                f"{df.shape[0]:4d} 样本 x {n_feat:3d} 特征  "
                f"(Pos={int(df.label.sum())}, Neg={int((1-df.label).sum())})")
            print(written[-1])
            if cname == "primary" and tf == "clr":
                kept_primary = kept

    # 特征字典（以主队列保留的特征为准）
    fd = pd.DataFrame({"column": [safe_name(f, taxonomy) for f in kept_primary],
                       "FeatureID": kept_primary})
    tax = taxonomy.reindex(fd.FeatureID)
    for lv in ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus"]:
        if lv in tax.columns:
            fd[lv] = tax[lv].values
    X = counts[sel][kept_primary].values.astype(float)
    fd["prevalence_primary"] = (X > 0).mean(0)
    fd["mean_rel_abundance"] = (X / np.maximum(X.sum(1, keepdims=True), 1)).mean(0)
    fd.to_csv(os.path.join(OUTDIR, "feature_dictionary.csv"), index=False)

    with open(os.path.join(OUTDIR, "README.txt"), "w") as f:
        f.write(readme("\n".join(written), mb.PREVALENCE))

    print(f"\n已写出到 {OUTDIR}/")
    for f in sorted(os.listdir(OUTDIR)):
        print(f"  {f:<26} {os.path.getsize(os.path.join(OUTDIR, f))/1024:8.1f} KB")


if __name__ == "__main__":
    main()
