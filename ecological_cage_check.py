#!/usr/bin/env python3
"""
火鸡队列：生态特征空间是否同样分不开「感染」与「分笼」。

summary_Turkey_45_sample.md §4 已证明：在属丰度空间里，纯笼效应（毒株、批次、
感染状态全部固定，只变笼号）平均 AUC 0.908，与感染效应 0.967 几乎同量级。

若生态特征空间也是如此，那么 ecological_models.py 中火鸡那一列的高 AUC
同样无法归因于感染，跨宿主一致性的讨论必须把这一点讲清楚。

用法:
    python3 ecological_cage_check.py
    python3 ecological_cage_check.py --n-perm 500
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import RepeatedStratifiedKFold

import eco_common as ec
import ecological_models as em
import mb_common as mb

warnings.filterwarnings("ignore")
OUT = "results"
PROJECT = "PRJNA644054"
SPACES = ["alpha", "core", "pcoa_bray", "pcoa_aitch",
          "eco_pure", "eco_bray", "eco_all", "genus"]


def cv_auc(space, d, n_splits=4, n_repeats=10, seed=0):
    """小样本（8 vs 8）下用 4 折 × 10 次，固定超参，逐折算 AUC 再平均。"""
    _, cnt = np.unique(d.y, return_counts=True)
    if len(cnt) < 2 or cnt.min() < 2:
        return np.nan
    k = min(n_splits, int(cnt.min()))
    cv = RepeatedStratifiedKFold(n_splits=k, n_repeats=n_repeats, random_state=seed)
    s = []
    for tr, te in cv.split(np.zeros(len(d.y)), d.y):
        if len(np.unique(d.y[te])) < 2:
            continue
        s.append(roc_auc_score(d.y[te], em.fit_score_tabular(space, d, tr, te, tune=False)))
    return float(np.mean(s)) if s else np.nan


def perm_test(space, d, n_perm, label, seed=0):
    obs = cv_auc(space, d)
    if np.isnan(obs):
        return None
    null = np.empty(n_perm)
    for i in range(n_perm):
        dd = em._shuffled(d, seed=7000 + i)
        null[i] = cv_auc(space, dd, n_repeats=2, seed=i)
    p = float((np.sum(null >= obs) + 1) / (n_perm + 1))
    return {"label": label, "n": int(len(d.y)), "AUC": float(obs),
            "null_mean": float(null.mean()), "null_sd": float(null.std()),
            "null_max": float(null.max()), "p_value": p}


class Sub:
    """从一个 Data 里切出子集，并把标签换成任意二分类目标。"""

    def __init__(self, d, idx, y):
        for a in ("alpha", "depth", "host", "rel", "counts"):
            setattr(self, a, getattr(d, a)[idx])
        self.bray = d.bray[np.ix_(idx, idx)]
        self.aitch = d.aitch[np.ix_(idx, idx)]
        self.y = np.asarray(y, dtype=int)

    def __len__(self):
        return len(self.y)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-perm", type=int, default=300)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    alpha, bray, aitch, counts = ec.load_eco(".")
    d = em.Data(alpha, bray, aitch, counts,
                alpha["HostSpecies"].isin(["Turkey"]).values)

    _, _, meta = mb.load_all(".")
    meta = meta.loc[d.ids]
    iso = meta["Isolator_."].astype(str).values

    res = {"project": PROJECT, "n": int(len(d)), "n_perm": args.n_perm, "spaces": {}}

    print("=" * 90)
    print("火鸡队列：生态特征空间中的「纯笼效应 vs 感染效应」")
    print("=" * 90)
    print("  纯笼对比 = 毒株、提取批次、感染状态全部固定，只有笼号不同。")
    print("  对照 summary_Turkey_45_sample.md §4：属丰度空间下纯笼平均 0.908，感染 0.967。\n")

    contrasts = [("3", "4", "隔离器 3 vs 4（同 CKPA、同 10-30、同阳性）"),
                 ("5", "6", "隔离器 5 vs 6（同 TKMN、同 11-06、同阳性）"),
                 ("1", "2", "隔离器 1 vs 2（同 Mock、同 10-30、同阴性）")]

    for sp in SPACES:
        print("-" * 90)
        print(f"  {em.SPACE_LABEL[sp]}")
        print(f"  {'对比':<44}{'n':>4}{'AUC':>8}{'零最大':>9}{'p':>9}")
        cages = []
        for a, b, tag in contrasts:
            m = np.isin(iso, [a, b])
            idx = np.where(m)[0]
            r = perm_test(sp, Sub(d, idx, (iso[m] == b).astype(int)), args.n_perm, tag)
            if r:
                cages.append(r)
                print(f"  {tag:<44}{r['n']:>4}{r['AUC']:>8.3f}"
                      f"{r['null_max']:>9.3f}{r['p_value']:>9.4f}")
        inf = perm_test(sp, Sub(d, np.arange(len(d)), d.y), args.n_perm,
                        "感染 vs 对照（n=45，全队列）")
        mean_cage = float(np.mean([c["AUC"] for c in cages])) if cages else np.nan
        n_sig = sum(1 for c in cages if c["p_value"] < 0.05)
        print(f"  {'感染 vs 对照（全队列）':<44}{inf['n']:>4}{inf['AUC']:>8.3f}"
              f"{inf['null_max']:>9.3f}{inf['p_value']:>9.4f}")
        print(f"  → 纯笼平均 {mean_cage:.3f}（{n_sig}/{len(cages)} 显著）  "
              f"vs 感染 {inf['AUC']:.3f}   比值 {mean_cage / inf['AUC']:.2f}")
        res["spaces"][sp] = {"cage": cages, "infection": inf,
                             "cage_mean_auc": mean_cage,
                             "cage_n_significant": n_sig,
                             "cage_over_infection": float(mean_cage / inf["AUC"])}

    print("-" * 90)
    print("\n汇总：纯笼效应 / 感染效应")
    print(f"  {'特征空间':<34}{'纯笼':>8}{'感染':>8}{'比值':>8}{'显著':>7}")
    for sp in SPACES:
        r = res["spaces"][sp]
        print(f"  {em.SPACE_LABEL[sp]:<34}{r['cage_mean_auc']:>8.3f}"
              f"{r['infection']['AUC']:>8.3f}{r['cage_over_infection']:>8.2f}"
              f"{r['cage_n_significant']:>5}/3")

    with open(os.path.join(OUT, "ecological_cage_check.json"), "w") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
    print(f"\n结果已写入 {OUT}/ecological_cage_check.json")


if __name__ == "__main__":
    main()
