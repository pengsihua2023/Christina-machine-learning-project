#!/usr/bin/env python3
"""
火鸡队列（PRJNA644054）：毒株效应能否检验，以及纯粹的笼效应有多强。

出发点
------
原计划检验两个感染毒株（CK/PA H5N2 与 TK/MN H5N2，各 16 只）的菌群差异。
但元数据显示三者完全共线：

    毒株      CKPA          TKMN
    隔离器    3、4 号        5、6 号
    提取批次  18-10-30      18-11-06

因此「CKPA vs TKMN」在数值上等同于「隔离器 {3,4} vs {5,6}」，也等同于
「10-30 批次 vs 11-06 批次」——毒株效应无法与笼效应、批次效应分离。

但这个共线结构同时提供了一个更干净的实验：
**隔离器 3 vs 4 内部，毒株相同、批次相同、感染状态相同，只有笼号不同。**
这能给出不受任何其他因素污染的纯笼效应估计——比上一轮跨 4 个隔离器
（横跨两个毒株与两个批次）的 0.719 更严格。

用法:
    python3 turkey_strain_cage.py
    python3 turkey_strain_cage.py --n-perm 500
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import RepeatedStratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"
PROJECT = "PRJNA644054"
PREV = 0.10


def pipe(prevalence=PREV):
    return Pipeline([("clr", mb.PrevalenceCLR(prevalence)),
                     ("sc", StandardScaler()),
                     ("clf", SVC(kernel="rbf", C=1.0, gamma="scale",
                                 class_weight="balanced", random_state=RNG))])


def cv_auc(X, y, n_splits=4, n_repeats=10, seed=RNG):
    """样本很小（8 vs 8），故用 4 折 × 10 次以压低划分方差。"""
    _, cnt = np.unique(y, return_counts=True)
    if len(cnt) < 2 or cnt.min() < 2:
        return np.nan
    k = min(n_splits, int(cnt.min()))
    if k < 2:
        return np.nan
    return cross_val_score(pipe(), X, y, scoring="roc_auc", n_jobs=-1,
                           cv=RepeatedStratifiedKFold(n_splits=k, n_repeats=n_repeats,
                                                      random_state=seed)).mean()


def perm_test(X, y, n_perm, label):
    """小样本对比必须配置换检验：8 vs 8 时噪声可以跑得很高。"""
    obs = cv_auc(X, y)
    if np.isnan(obs):
        return None
    null = np.empty(n_perm)
    for i in range(n_perm):
        null[i] = cv_auc(X, np.random.RandomState(7000 + i).permutation(y), seed=i,
                         n_repeats=2)
    p = (np.sum(null >= obs) + 1) / (n_perm + 1)
    print(f"    {label:<34} AUC {obs:.3f} | 零分布 {null.mean():.3f} ± {null.std():.3f}"
          f" (max {null.max():.3f}) | p = {p:.4f}")
    return {"label": label, "n": int(len(y)), "AUC": float(obs),
            "null_mean": float(null.mean()), "null_sd": float(null.std()),
            "null_max": float(null.max()), "p_value": float(p), "n_perm": n_perm}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-perm", type=int, default=300)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    counts, taxonomy, meta = mb.load_all(".")
    sel = (meta[mb.BATCH_COL] == PROJECT).values
    counts, meta = counts[sel], meta[sel]
    y = mb.get_label(meta).values
    X = counts.values.astype(float)
    grp = meta["experimental_group"].astype(str).values
    iso = meta["Isolator_."].astype(str).values
    ext = meta["dna_extraction_date"].astype(str).values

    res = {"project": PROJECT, "n": int(len(y)), "n_perm": args.n_perm}

    # ---------------------------------------------------------------- 1
    print("=" * 86)
    print("[1] 毒株、隔离器、提取批次三者的共线结构")
    print("=" * 86)
    print(pd.crosstab(pd.Series(grp, name="实验组"),
                      pd.Series(iso, name="Isolator")).to_string())
    print()
    print(pd.crosstab(pd.Series(grp, name="实验组"),
                      pd.Series(ext, name="提取批次")).to_string())
    sub = pd.crosstab(pd.Series(grp[y == 1]), pd.Series(iso[y == 1]))
    one_strain = bool(((sub > 0).sum(axis=0) == 1).all())
    print(f"\n  每个隔离器只含一种毒株: {one_strain}")
    print("  → CKPA = 隔离器 {3,4} = 批次 10-30；TKMN = 隔离器 {5,6} = 批次 11-06")
    print("  → 「毒株效应」与「笼效应」「批次效应」三者完全共线，无法分离。")
    res["strain_isolator_batch_collinear"] = one_strain

    # ---------------------------------------------------------------- 2
    print("\n" + "=" * 86)
    print("[2] 名义上的「毒株差异」")
    print("=" * 86)
    pos = y == 1
    print("  下面这个数字在数值上同时等于三件事：毒株差异、隔离器 {3,4} vs {5,6}、")
    print("  提取批次 10-30 vs 11-06。三者是同一个划分。")
    r_strain = perm_test(X[pos], (grp[pos] == "TKMN").astype(int), args.n_perm,
                         "CKPA vs TKMN（n=32）")
    res["nominal_strain_effect"] = r_strain
    print("\n  → 该数字不可解释为毒株效应。")

    # ---------------------------------------------------------------- 3
    print("\n" + "=" * 86)
    print("[3] 纯笼效应：毒株、批次、感染状态全部固定，只变笼号")
    print("=" * 86)
    print("  这是本队列唯一能给出干净笼效应估计的对比。")
    pure = []
    for a, b, tag in [("3", "4", "隔离器 3 vs 4（同 CKPA、同 10-30 批次）"),
                      ("5", "6", "隔离器 5 vs 6（同 TKMN、同 11-06 批次）"),
                      ("1", "2", "隔离器 1 vs 2（同 Mock、同 10-30 批次）")]:
        m = np.isin(iso, [a, b])
        r = perm_test(X[m], (iso[m] == b).astype(int), args.n_perm, tag)
        if r:
            pure.append(r)
    res["pure_cage_effect"] = pure
    if pure:
        mean_auc = float(np.mean([r["AUC"] for r in pure]))
        n_sig = sum(1 for r in pure if r["p_value"] < 0.05)
        print(f"\n  三组对比平均 AUC {mean_auc:.3f}，其中 {n_sig}/{len(pure)} 组 p<0.05")
        res["pure_cage_mean_auc"] = mean_auc
        res["pure_cage_n_significant"] = n_sig

    # ---------------------------------------------------------------- 4
    print("\n" + "=" * 86)
    print("[4] 与感染效应的量级对照")
    print("=" * 86)
    r_inf = perm_test(X, y, args.n_perm, "感染 vs 对照（n=45，全队列）")
    res["infection_effect"] = r_inf
    if pure and r_inf:
        print(f"\n  感染效应 AUC {r_inf['AUC']:.3f}  vs  纯笼效应平均 "
              f"{res['pure_cage_mean_auc']:.3f}")
        print("  两者量级越接近，说明「感染信号」中笼效应的占比越可能不小。")

    # ---------------------------------------------------------------- 5
    print("\n" + "=" * 86)
    print("[5] 哪些菌在同笼别内部即有差异（纯笼效应驱动的菌）")
    print("=" * 86)
    clr = mb.clr_frame(counts, PREV)
    rows = []
    for a, b, tag in [("3", "4", "CKPA 内 3vs4"), ("5", "6", "TKMN 内 5vs6"),
                      ("1", "2", "Mock 内 1vs2")]:
        m = np.isin(iso, [a, b])
        g1, g2 = clr.values[m & (iso == a)], clr.values[m & (iso == b)]
        t, p = stats.ttest_ind(g1, g2, equal_var=False)
        fdr = stats.false_discovery_control(p, method="bh")
        n_sig = int((fdr < 0.05).sum())
        rows.append({"contrast": tag, "n_sig": n_sig, "n_tested": len(fdr)})
        print(f"  {tag:<16} {n_sig:2d}/{len(fdr)} 个特征 FDR<0.05")
        for fid in clr.columns[fdr < 0.05][:5]:
            gname = taxonomy.loc[fid, "Genus"] if fid in taxonomy.index else "?"
            i = list(clr.columns).index(fid)
            print(f"      {str(gname):<24} t={t[i]:+.2f}  FDR={fdr[i]:.4f}")
    res["per_contrast_da"] = rows

    with open(os.path.join(OUT, "turkey_strain_cage.json"), "w") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 86)
    print("结论：毒株效应无法检验（与笼、批次三重共线）。")
    print("可检验的是纯笼效应——毒株/批次/感染状态全部固定后仅变笼号的对比。")
    print(f"结果已写入 {OUT}/turkey_strain_cage.json")
    print("=" * 86)


if __name__ == "__main__":
    main()
