#!/usr/bin/env python3
"""
拆解「鸭 → 火鸡」跨宿主迁移：α + 核心保留度里到底是什么在迁移。

已知（summary_ecological_models.md §4）：
    α 单独        0.375     核心单独      0.469     两者合并   0.800 (p=0.0050)
两个成分单独都在随机水平或以下，合并却高于噪声上限。因此迁移的是**两者之间的
某种关系**，本脚本要把这个关系找出来。

预注册假设
----------
两个宿主的基线核心大小差了一倍多（鸭 14，火鸡 32），所以**计数型**特征
（Observed、Chao1、CoreTaxaPresent、TotalTaxaPresent…）在两个宿主间根本不同量纲；
用鸭的均值方差标准化后套到火鸡身上，数值会整体偏移。而**无量纲的比例型**特征
（Pielou、Simpson、CoreRetentionProportion、CoreAbundanceRetention、
CoreMembershipProportion）本身就落在 [0,1]，跨宿主可比。

若假设成立，迁移应当主要由比例型特征承担，计数型特征则不迁移甚至有害。

选择偏倚的处理
--------------
本脚本要在 90+ 个特征子集上搜索最优迁移。直接报告最大值就是项目 README 里
写过的 best-of-N 选择偏倚。因此零分布取的是**整轮搜索的最大值**：每次置换
目标标签后重跑全部子集、记录其最大 AUC，用它来判断实测最大值是否超出噪声。

用法:
    python3 ecological_transfer_anatomy.py
    python3 ecological_transfer_anatomy.py --n-perm 500
"""
import argparse
import itertools
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import eco_common as ec
import ecological_models as em

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"

FEATURES = ec.ALPHA_COLS + ec.CORE_COLS          # 6 + 7 = 13
ALPHA_IDX = list(range(len(ec.ALPHA_COLS)))
CORE_IDX = list(range(len(ec.ALPHA_COLS), len(FEATURES)))

# 预注册的量纲分组
SCALE_FREE = ["Simpson_Genus", "Pielou_Genus", "CoreRetentionProportion",
              "CoreAbundanceRetention", "CoreMembershipProportion"]
COUNT_LIKE = ["Observed_Genera", "Chao1_Genus", "CoreTaxaPresent",
              "CoreTaxaLost", "NonCoreTaxaPresent", "TotalTaxaPresent"]
INTERMEDIATE = ["Shannon_Genus", "InvSimpson_Genus"]


def matrices(src, dst):
    """(n_src, 13) 与 (n_dst, 13)，列顺序 = FEATURES。核心按各自宿主定义。"""
    cs = ec.baseline_core(src.rel, src.y, src.host)
    cd = ec.baseline_core(dst.rel, dst.y, dst.host)
    Xs = np.hstack([src.alpha, ec.core_retention_features(src.rel, src.host, cs)])
    Xd = np.hstack([dst.alpha, ec.core_retention_features(dst.rel, dst.host, cd)])
    return Xs, Xd


def target_scores(Xs, ys, Xd, cols, model="rbf"):
    """在给定特征子集上训练源队列模型，返回它给目标队列打的分。

    超参在**源队列内部** 4 折 CV 上调，与 ecological_models.py 的迁移协议一致；
    全程不接触目标标签。目标标签只在最后算 AUC 时用到 —— 这也意味着置换目标
    标签不会改变这里的打分，因此置换检验可以直接复用缓存的分数。
    """
    a, b = Xs[:, cols], Xd[:, cols]
    mu = np.nanmean(a, axis=0)
    mu = np.where(np.isnan(mu), 0.0, mu)
    a = np.where(np.isnan(a), mu, a)
    b = np.where(np.isnan(b), mu, b)
    sc = StandardScaler().fit(a)
    a, b = sc.transform(a), sc.transform(b)
    if model == "linear":
        clf = LogisticRegression(max_iter=5000, class_weight="balanced").fit(a, ys)
    else:
        C, g = em._inner_grid_tabular(a, ys)
        clf = SVC(kernel="rbf", C=C, gamma=g, class_weight="balanced",
                  random_state=RNG).fit(a, ys)
    return clf.decision_function(b)


def auc_of(scores, y):
    return 0.5 if np.ptp(scores) < 1e-12 else float(roc_auc_score(y, scores))


def transfer_auc(Xs, ys, Xd, yd, cols, model="rbf"):
    s = target_scores(Xs, ys, Xd, cols, model)
    return auc_of(s, yd), bool(np.ptp(s) < 1e-12)


def scan_scores(Xs, ys, Xd, subsets, model="rbf"):
    """每个子集的目标打分只算一次并缓存。

    目标标签不参与训练，所以置换目标标签不会改变这些分数 —— 置换检验因此
    退化成对缓存分数反复计算 AUC，几百次置换的代价可以忽略。
    """
    return [target_scores(Xs, ys, Xd, c, model) for _, c in subsets]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-perm", type=int, default=300)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    alpha, bray, aitch, counts = ec.load_eco(".")
    src = em.Data(alpha, bray, aitch, counts, alpha.HostSpecies.isin(["Duck"]).values)
    dst = em.Data(alpha, bray, aitch, counts, alpha.HostSpecies.isin(["Turkey"]).values)
    Xs, Xd = matrices(src, dst)
    ys, yd = src.y, dst.y
    res = {"source": "Duck", "target": "Turkey", "n_src": int(len(ys)),
           "n_dst": int(len(yd)), "n_perm": args.n_perm}

    print("=" * 88)
    print("拆解「鸭 → 火鸡」迁移：α + 核心里是什么在迁移")
    print("=" * 88)
    full = list(range(13))
    a_full, _ = transfer_auc(Xs, ys, Xd, yd, full)
    a_alpha, _ = transfer_auc(Xs, ys, Xd, yd, ALPHA_IDX)
    a_core, _ = transfer_auc(Xs, ys, Xd, yd, CORE_IDX)
    print(f"  全部 13 特征        AUC {a_full:.3f}")
    print(f"  仅 α（6）           AUC {a_alpha:.3f}")
    print(f"  仅核心（7）          AUC {a_core:.3f}")
    res["baseline"] = {"all13": a_full, "alpha_only": a_alpha, "core_only": a_core}

    # ------------------------------------------------------------ 0 量纲假设
    print("\n" + "=" * 88)
    print("[0] 预注册假设：跨宿主可迁移的是无量纲的比例型特征")
    print("=" * 88)
    print("  鸭的基线核心 14 个属，火鸡 32 个 —— 计数型特征在两个宿主间不同量纲。")
    groups = {"比例型（无量纲，5）": SCALE_FREE,
              "计数型（受核心大小影响，6）": COUNT_LIKE,
              "中间型（Shannon/InvSimpson，2）": INTERMEDIATE,
              "比例型 + 中间型（7）": SCALE_FREE + INTERMEDIATE}
    res["dimension_hypothesis"] = {}
    print(f"\n  {'分组':<34}{'AUC':>8}")
    print("  " + "-" * 44)
    for name, cols in groups.items():
        idx = [FEATURES.index(c) for c in cols]
        v, _ = transfer_auc(Xs, ys, Xd, yd, idx)
        res["dimension_hypothesis"][name] = {"features": cols, "auc": v}
        print(f"  {name:<34}{v:>8.3f}")

    # ------------------------------------------------------------ 1 单特征
    print("\n" + "=" * 88)
    print("[1] 单个特征各自的迁移能力")
    print("=" * 88)
    singles = []
    for j, f in enumerate(FEATURES):
        v, _ = transfer_auc(Xs, ys, Xd, yd, [j])
        singles.append({"feature": f, "auc": v,
                        "block": "alpha" if j in ALPHA_IDX else "core",
                        "kind": ("scale_free" if f in SCALE_FREE else
                                 "count_like" if f in COUNT_LIKE else "intermediate")})
    res["singles"] = singles
    print(f"  {'特征':<28}{'块':>7}{'量纲':>14}{'AUC':>8}")
    print("  " + "-" * 58)
    for s in sorted(singles, key=lambda x: -x["auc"]):
        print(f"  {s['feature']:<28}{s['block']:>7}{s['kind']:>14}{s['auc']:>8.3f}")

    # ------------------------------------------------------------ 2 特征对
    print("\n" + "=" * 88)
    print("[2] 所有特征对，按是否跨块分组")
    print("=" * 88)
    pairs = []
    for i, j in itertools.combinations(range(13), 2):
        cross = (i in ALPHA_IDX) != (j in ALPHA_IDX)
        pairs.append((f"{FEATURES[i]} + {FEATURES[j]}", [i, j], cross))
    _cache2 = scan_scores(Xs, ys, Xd, [(n, c) for n, c, _ in pairs])
    aucs = np.array([auc_of(sc, yd) for sc in _cache2])
    cross_mask = np.array([c for _, _, c in pairs])
    print(f"  跨块对（α×核心，{cross_mask.sum()} 个）   中位 {np.median(aucs[cross_mask]):.3f}"
          f"   最大 {aucs[cross_mask].max():.3f}")
    print(f"  块内对（{(~cross_mask).sum()} 个）           中位 {np.median(aucs[~cross_mask]):.3f}"
          f"   最大 {aucs[~cross_mask].max():.3f}")
    order = np.argsort(-aucs)
    print(f"\n  排名前 10：")
    print(f"  {'特征对':<62}{'跨块':>6}{'AUC':>8}")
    print("  " + "-" * 76)
    for k in order[:10]:
        print(f"  {pairs[k][0]:<62}{'是' if pairs[k][2] else '否':>6}{aucs[k]:>8.3f}")
    res["pairs"] = {"cross_block_median": float(np.median(aucs[cross_mask])),
                    "cross_block_max": float(aucs[cross_mask].max()),
                    "within_block_median": float(np.median(aucs[~cross_mask])),
                    "within_block_max": float(aucs[~cross_mask].max()),
                    "top": [{"pair": pairs[k][0], "cross_block": bool(pairs[k][2]),
                             "auc": float(aucs[k])} for k in order[:10]]}

    # ------------------------------------------------------------ 3 选择偏倚
    print("\n" + "=" * 88)
    print(f"[3] 选择偏倚校正：{len(pairs)} 个特征对里挑最大值，零分布也必须取最大值")
    print("=" * 88)
    subsets = [(n, c) for n, c, _ in pairs]
    cache = scan_scores(Xs, ys, Xd, subsets)
    obs_max = float(max(auc_of(sc, yd) for sc in cache))
    null_max = np.empty(args.n_perm)
    for t in range(args.n_perm):
        yp = np.random.RandomState(5000 + t).permutation(yd)
        null_max[t] = max(auc_of(sc, yp) for sc in cache)
    p = float((np.sum(null_max >= obs_max) + 1) / (args.n_perm + 1))
    print(f"  实测最大 AUC          {obs_max:.3f}")
    print(f"  搜索后的零分布最大值    {null_max.mean():.3f} ± {null_max.std():.3f}"
          f"  (max {null_max.max():.3f})")
    print(f"  校正后 p              {p:.4f}   {'高于搜索噪声' if p < 0.05 else '未超出搜索噪声'}")
    res["selection_corrected"] = {"observed_max": obs_max,
                                  "null_of_max_mean": float(null_max.mean()),
                                  "null_of_max_sd": float(null_max.std()),
                                  "null_of_max_max": float(null_max.max()),
                                  "p_value": p, "n_subsets": len(pairs)}

    # ------------------------------------------------------------ 4 线性可否
    print("\n" + "=" * 88)
    print("[4] 关系是线性的吗：RBF 与 L2 逻辑回归对照")
    print("=" * 88)
    print(f"  {'特征集':<34}{'RBF':>8}{'线性':>8}")
    print("  " + "-" * 50)
    res["linear_vs_rbf"] = {}
    for name, cols in [("全部 13", full), ("仅 α", ALPHA_IDX), ("仅核心", CORE_IDX),
                       ("比例型 5", [FEATURES.index(c) for c in SCALE_FREE]),
                       ("计数型 6", [FEATURES.index(c) for c in COUNT_LIKE])]:
        r, _ = transfer_auc(Xs, ys, Xd, yd, cols, "rbf")
        l, _ = transfer_auc(Xs, ys, Xd, yd, cols, "linear")
        res["linear_vs_rbf"][name] = {"rbf": r, "linear": l}
        print(f"  {name:<34}{r:>8.3f}{l:>8.3f}")

    # ------------------------------------------------------------ 5 方向一致性
    print("\n" + "=" * 88)
    print("[5] 每个特征在两个宿主里的效应方向是否一致")
    print("=" * 88)
    print("  若某特征在鸭里 Pos↑、在火鸡里也 Pos↑，它才可能承载迁移。")
    print(f"  {'特征':<28}{'鸭 AUC':>9}{'火鸡 AUC':>10}{'方向一致':>10}")
    print("  " + "-" * 60)
    res["direction"] = []
    for j, f in enumerate(FEATURES):
        def signed(X, y):
            x = X[:, j]
            x = np.where(np.isnan(x), np.nanmean(x), x)
            return float(roc_auc_score(y, x))
        ds, dt = signed(Xs, ys), signed(Xd, yd)
        same = (ds - 0.5) * (dt - 0.5) > 0
        res["direction"].append({"feature": f, "duck_auc": ds, "turkey_auc": dt,
                                 "same_direction": bool(same)})
        print(f"  {f:<28}{ds:>9.3f}{dt:>10.3f}{'是' if same else '否':>10}")
    n_same = sum(d["same_direction"] for d in res["direction"])
    print(f"\n  13 个特征中方向一致的：{n_same}")

    with open(os.path.join(OUT, "ecological_transfer_anatomy.json"), "w") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
    print(f"\n结果已写入 {OUT}/ecological_transfer_anatomy.json")


if __name__ == "__main__":
    main()
