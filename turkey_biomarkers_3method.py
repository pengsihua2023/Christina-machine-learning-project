#!/usr/bin/env python3
"""
火鸡队列（PRJNA644054）biomarker：用与鸭队列**完全相同**的三方法交集。

背景
----
鸭队列（README §6.2）的九菌来自三套独立方法的交集：
    ① SVM permutation importance
    ② L1 稳定性选择（200 次 bootstrap）
    ③ 差异丰度（CLR + Welch t + BH-FDR）

火鸡队列此前（turkey_confounding_biomarkers.py）用的是 ①③ + 笼效应筛查，
**缺 ② L1 稳定性选择**，因此两个队列的 biomarker 不可直接比较。本脚本补上第 ②
套，给出与鸭队列同口径的交集，再把笼效应筛查作为**第四层**叠加上去——那是本
队列特有的、鸭队列做不到的检验，不应因为对齐口径而丢掉。

L1 惩罚强度：作为敏感性轴，不是单点选择
--------------------------------------
鸭队列用 C=0.1（18/70 特征，CV-AUC 较峰值损失约 0.03）。火鸡 n=45、62 特征，
样本量只有鸭的 1/6，同一个 C 给出完全不同的结果，且两种「对齐鸭队列」的方式
互相矛盾：
    · 对齐**稀疏度比例**（≈1/4 特征）需要 C≈10 —— 此时惩罚几乎不起作用
    · 对齐**准则**（牺牲约 0.03 CV-AUC）对应 C≈0.2 —— 只剩 7 个非零系数
既然无唯一正确取法，就把 C 当敏感性轴：0.2 / 1.0 / 10.0 各跑一遍，
**只有在三个 C 下都稳定命中的特征才算 L1 命中**。

用法:
    python3 turkey_biomarkers_3method.py
    python3 turkey_biomarkers_3method.py --n-boot 500 --l1-C 0.05
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RepeatedStratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"
PROJECT = "PRJNA644054"

# 与鸭队列一致的判定阈值
FDR_CUT = 0.05      # 差异丰度
IMP_CUT = 0.0       # permutation importance 需 > 0
FREQ_CUT = 0.70     # L1 bootstrap 选中频率


def micro_pipe(clf, prevalence=mb.PREVALENCE):
    return Pipeline([("clr", mb.PrevalenceCLR(prevalence=prevalence)),
                     ("sc", StandardScaler()), ("clf", clf)])


def l1_lr(C):
    return LogisticRegression(max_iter=5000, penalty="l1", solver="liblinear",
                              C=C, class_weight="balanced")


def scan_l1C(X, y, Cs=(0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0)):
    """扫描惩罚强度：报告非零系数个数与 CV-AUC。"""
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=4, random_state=RNG)
    rows = []
    for C in Cs:
        pipe = micro_pipe(l1_lr(C)).fit(X, y)
        nz = int((pipe.named_steps["clf"].coef_.ravel() != 0).sum())
        auc = cross_val_score(micro_pipe(l1_lr(C)), X, y,
                              scoring="roc_auc", cv=cv, n_jobs=-1).mean()
        rows.append({"C": C, "n_nonzero": nz, "cv_auc": float(auc)})
    return pd.DataFrame(rows)


def stability_selection(counts, y, n_boot, C, prevalence=mb.PREVALENCE):
    """bootstrap 重复 L1-LR，统计每个特征被选中的频率。与鸭队列同实现。"""
    X = counts.values.astype(float)
    n = len(y)
    counter, rng, used = {}, np.random.RandomState(RNG), 0
    for b in range(n_boot):
        idx = rng.choice(n, size=int(0.8 * n), replace=False)
        if len(np.unique(y[idx])) < 2:
            continue
        used += 1
        pipe = micro_pipe(l1_lr(C), prevalence).fit(X[idx], y[idx])
        kept = pipe.named_steps["clr"].get_feature_names_out(counts.columns.to_numpy())
        coef = pipe.named_steps["clf"].coef_.ravel()
        for f in kept[coef != 0]:
            counter[f] = counter.get(f, 0) + 1
        if (b + 1) % 50 == 0:
            print(f"    bootstrap {b + 1}/{n_boot} ...")
    df = pd.DataFrame({"FeatureID": list(counter),
                       "selection_freq": np.array(list(counter.values())) / max(used, 1)})
    return df.sort_values("selection_freq", ascending=False), used


def duck_three_method(fdr=FDR_CUT, imp_cut=IMP_CUT, freq=FREQ_CUT):
    """重建鸭队列（PRJNA464410）的三方法交集，用于与火鸡同口径比较。

    注意三个结果文件的合并键格式不同：svm_permutation_importance.csv 用
    「属名__哈希前8位」，其余用完整哈希，故统一截取前 8 位后合并。
    """
    da = pd.read_csv(os.path.join(OUT, "differential_abundance.csv"))
    imp = pd.read_csv(os.path.join(OUT, "svm_permutation_importance.csv"))
    st = pd.read_csv(os.path.join(OUT, "stability_selection.csv"))[["FeatureID", "selection_freq"]]
    imp["key8"] = imp.feature.str.rsplit("__", n=1).str[-1]
    da["key8"], st["key8"] = da.FeatureID.str[:8], st.FeatureID.str[:8]
    d = (da[["FeatureID", "key8", "FDR", "direction", "Genus", "Family"]]
         .merge(imp[["key8", "importance_mean"]], on="key8", how="left")
         .merge(st[["key8", "selection_freq"]], on="key8", how="left"))
    d["selection_freq"] = d.selection_freq.fillna(0.0)
    return d[(d.FDR < fdr) & (d.importance_mean > imp_cut) & (d.selection_freq >= freq)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-boot", type=int, default=200)
    ap.add_argument("--l1-C", type=float, default=None,
                    help="不给则按扫描结果自动选（目标稀疏度 ≈ 1/4 特征）")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    counts, tax, meta = mb.load_all(".")
    sel = (meta[mb.BATCH_COL] == PROJECT).values
    counts, meta = counts[sel], meta[sel]
    y = mb.get_label(meta).values
    n_kept = int(((counts.values > 0).mean(0) >= mb.PREVALENCE).sum())

    print("=" * 88)
    print(f"火鸡队列 biomarker：与鸭队列同口径的三方法交集")
    print("=" * 88)
    print(f"  n = {len(y)}（阴性 {int((y==0).sum())} / 阳性 {int((y==1).sum())}）"
          f"，流行度 ≥{mb.PREVALENCE:.0%} 后保留 {n_kept} 个特征")

    # ---------------------------------------------------------- ② L1 稳定性选择
    print("\n" + "=" * 88)
    print("[1] L1 惩罚强度扫描（鸭队列的 C=0.1 不能直接照搬）")
    print("=" * 88)
    scan = scan_l1C(counts.values.astype(float), y)
    print(f"  {'C':>7}{'非零系数':>10}{'CV-AUC':>10}")
    for _, r in scan.iterrows():
        print(f"  {r.C:>7.3f}{int(r.n_nonzero):>10}{r.cv_auc:>10.3f}")

    # C 的选取在本队列没有唯一正确答案，因此作为敏感性轴处理：
    #   · 按稀疏度对齐鸭队列（≈1/4 特征）需要 C≈10，此时惩罚几乎不起作用
    #   · 按「牺牲约 0.03 CV-AUC 换稀疏度」这条鸭队列实际用的准则，对应 C≈0.2
    # 两者都跑，取在全部 C 下都稳定命中的特征，才算不依赖这个任意选择。
    Cs = [args.l1_C] if args.l1_C is not None else [0.2, 1.0, 10.0]
    print(f"\n[2] 稳定性选择（{args.n_boot} 次 bootstrap × {len(Cs)} 个 C 值）")
    print("    C 无唯一正确取法，故作为敏感性轴：0.2 对齐鸭队列的『损失约 0.03 AUC』准则，")
    print("    10.0 对齐鸭队列的稀疏度比例（≈1/4 特征），1.0 居中。")
    stabs = {}
    for C in Cs:
        st, used = stability_selection(counts, y, args.n_boot, C)
        stabs[C] = st.rename(columns={"selection_freq": f"freq_C{C}"})
        n_hit = int((st.selection_freq >= FREQ_CUT).sum())
        print(f"  C={C:<5} 有效 bootstrap {used}/{args.n_boot}，选中频率 ≥{FREQ_CUT:.0%} 的特征 {n_hit}")

    stab = stabs[Cs[0]]
    for C in Cs[1:]:
        stab = stab.merge(stabs[C], on="FeatureID", how="outer")
    fcols = [f"freq_C{C}" for C in Cs]
    stab[fcols] = stab[fcols].fillna(0.0)
    # 三个 C 下都达标才算 L1 命中——不依赖 C 的任意选择
    stab["l1_hit_all_C"] = (stab[fcols] >= FREQ_CUT).all(axis=1)
    stab["selection_freq"] = stab[fcols].min(axis=1)   # 取最保守的那个
    C = Cs[0]

    # ---------------------------------------------------------- ①③ 读已有结果
    da = pd.read_csv(os.path.join(OUT, "turkey_differential_abundance.csv"))
    imp = pd.read_csv(os.path.join(OUT, "turkey_permutation_importance.csv"))
    prev = pd.read_csv(os.path.join(OUT, "turkey_biomarkers.csv"))
    cage = prev[["FeatureID", "cage_FDR", "cage_confounded"]]

    m = (da.merge(imp, on="FeatureID", how="outer")
           .merge(stab, on="FeatureID", how="left")
           .merge(cage, on="FeatureID", how="left"))
    m["selection_freq"] = m["selection_freq"].fillna(0.0)
    m["l1_hit_all_C"] = m["l1_hit_all_C"].fillna(False)
    m["Genus"] = tax.reindex(m.FeatureID)["Genus"].values
    m["Family"] = tax.reindex(m.FeatureID)["Family"].values

    # ---------------------------------------------------------- 三方法交集
    hit_da = m.FDR < FDR_CUT
    hit_imp = m.importance_mean > IMP_CUT
    hit_l1 = m.l1_hit_all_C.fillna(False)   # 三个 C 值下均达标
    m["n_methods"] = hit_da.astype(int) + hit_imp.astype(int) + hit_l1.astype(int)
    m["three_method_hit"] = hit_da & hit_imp & hit_l1

    print("\n" + "=" * 88)
    print("[3] 三方法交集（与鸭队列 README §6.2 同口径）")
    print("=" * 88)
    print(f"  ① 差异丰度 FDR<{FDR_CUT}          命中 {int(hit_da.sum())}")
    print(f"  ② L1 选中频率 ≥{FREQ_CUT:.0%}（三个 C 均达标）  命中 {int(hit_l1.sum())}")
    print(f"  ③ permutation importance >0   命中 {int(hit_imp.sum())}")
    print(f"  ─────────────────────────────────────────")
    print(f"  三者同时命中                   {int(m.three_method_hit.sum())}")

    hits = m[m.three_method_hit].sort_values("importance_mean", ascending=False)
    if len(hits):
        print(f"\n  {'Genus':<24}{'Family':<22}{'重要性':>9}{'L1频率(最低)':>12}"
              f"{'方向':>6}{'FDR':>9}{'笼效应':>8}")
        print("  " + "-" * 88)
        for _, r in hits.iterrows():
            g = "(未注释)" if pd.isna(r.Genus) else str(r.Genus)
            f = "—" if pd.isna(r.Family) else str(r.Family)
            cg = "受污染" if r.cage_confounded is True else "通过"
            print(f"  {g:<24}{f:<22}{r.importance_mean:>9.4f}{r.selection_freq:>12.3f}"
                  f"{r.direction:>6}{r.FDR:>9.2e}{cg:>8}")

    clean = hits[hits.cage_confounded != True]
    print(f"\n  其中通过笼效应筛查（本队列特有的第四层）：{len(clean)}")

    # ---------------------------------------------------------- 与鸭队列比较
    print("\n" + "=" * 88)
    print("[4] 与鸭队列九菌的比较（同口径，因此可比）")
    print("=" * 88)
    duck = duck_three_method()
    print(f"  鸭队列三方法交集重建：{len(duck)} 个（README §6.2 记录为 9，用于校验重建正确性）")
    dg, tg = set(duck.Genus.dropna()), set(hits.Genus.dropna())
    dfam, tfam = set(duck.Family.dropna()), set(hits.Family.dropna())
    g_ov, f_ov = sorted(dg & tg), sorted(dfam & tfam)
    print(f"  属层面重叠：{g_ov or '无'}")
    print(f"  科层面重叠：{f_ov or '无'}")
    for fam in f_ov:
        dd = duck[duck.Family == fam]; tt = hits[hits.Family == fam]
        print(f"\n  === {fam} ===")
        for _, r in dd.iterrows():
            print(f"    鸭   {str(r.Genus) if pd.notna(r.Genus) else '(未注释)':<24}{r.direction}")
        for _, r in tt.iterrows():
            cg = "受笼/毒株/批次污染" if r.cage_confounded is True else "通过笼效应筛查"
            print(f"    火鸡 {str(r.Genus):<24}{r.direction}   {cg}")
    res_cross = {"duck_n_three_method": int(len(duck)),
                 "genus_overlap": g_ov, "family_overlap": f_ov}

    m.sort_values(["three_method_hit", "n_methods", "importance_mean"],
                  ascending=False).to_csv(
        os.path.join(OUT, "turkey_biomarkers_3method.csv"), index=False)
    scan.to_csv(os.path.join(OUT, "turkey_l1_scan.csv"), index=False)

    res = {"project": PROJECT, "n": int(len(y)), "n_features": n_kept,
           "l1_C_values": Cs, "l1_rule": "三个 C 值下选中频率均 ≥0.70", "n_boot": args.n_boot, "n_boot_used": used,
           "thresholds": {"FDR": FDR_CUT, "importance": IMP_CUT, "l1_freq": FREQ_CUT},
           "n_hit_da": int(hit_da.sum()), "n_hit_l1": int(hit_l1.sum()),
           "n_hit_imp": int(hit_imp.sum()),
           "n_three_method": int(m.three_method_hit.sum()),
           "n_three_method_cage_clean": int(len(clean)),
           "cross_host": res_cross,
           "biomarkers": [
               {"genus": None if pd.isna(r.Genus) else str(r.Genus),
                "family": None if pd.isna(r.Family) else str(r.Family),
                "feature_id": r.FeatureID,
                "importance": float(r.importance_mean),
                "l1_freq": float(r.selection_freq),
                "direction": r.direction, "FDR": float(r.FDR),
                "cage_confounded": bool(r.cage_confounded is True)}
               for _, r in hits.iterrows()]}
    with open(os.path.join(OUT, "turkey_biomarkers_3method.json"), "w") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
    print(f"\n结果已写入 {OUT}/turkey_biomarkers_3method.json 与 .csv")


if __name__ == "__main__":
    main()
