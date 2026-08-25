#!/usr/bin/env python3
"""
生态特征空间建模：α 多样性 / 核心保留度 / 群落结构 / 三者合并，
与既有的属丰度模型对照。

核心问题不是「生态指标能否打败分类学模型」，而是
**当与 AIV 相关的菌属在宿主间不一致时，更宏观的生态预测子是否更能跨宿主保持一致。**

无泄漏处理
----------
1. 核心保留度：基线核心在**每个训练折内**只用该折的阴性样本重新定义，
   再应用到折外样本。协作者的 EXPLORATORY 文件用全部阴性定义，仅供描述。
2. PCoA：在训练折的距离子矩阵上做经典 MDS，测试样本用 Gower 插值投影。
3. 属丰度：沿用 PrevalenceCLR，折内拟合流行度过滤。
4. 距离核：Bray-Curtis 与 Aitchison 距离本身无需拟合，核宽由训练折距离中位数确定。

用法:
    python3 ecological_models.py
    python3 ecological_models.py --n-perm 500 --n-repeats 20
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import eco_common as ec
import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"

# 四个宿主队列。天鹅只有 15 个样本（阴性 5），不单独建模，只作跨宿主检验的目标。
COHORTS = {
    "Duck":   {"species": ["Duck"],    "model": True},
    "Turkey": {"species": ["Turkey"],  "model": True},
    "Swan":   {"species": ["WhooperSwan"], "model": False},
}

TABULAR_SPACES = ["alpha", "core", "pcoa_bray", "pcoa_aitch",
                  "eco_pure", "eco_bray", "eco_all", "genus"]
KERNEL_SPACES = ["dist_bray", "dist_aitch"]
ALL_SPACES = TABULAR_SPACES + KERNEL_SPACES

SPACE_LABEL = {
    "alpha":      "α 多样性（6 指标）",
    "core":       "核心保留度（折内重定义）",
    "pcoa_bray":  "群落结构 PCoA（Bray，折内）",
    "pcoa_aitch": "群落结构 PCoA（Aitchison，折内）",
    "dist_bray":  "群落结构核（Bray）",
    "dist_aitch": "群落结构核（Aitchison）",
    "eco_pure":   "纯生态（α + 核心）",
    "eco_bray":   "纯生态 + 结构（α + 核心 + Bray）",
    "eco_all":    "α + 核心 + Aitchison（含分类学信息）",
    "genus":      "属丰度 CLR（既有模型，参照）",
}

# 组合空间的成分。eco_pure 只含逐样本的生态摘要统计量，因此是唯一
# 既属纯生态、又能跨宿主迁移的组合（PCoA 轴是队列内定义的，跨不过去）。
COMPOSITE = {
    "eco_pure": ("alpha", "core"),
    "eco_bray": ("alpha", "core", "pcoa_bray"),
    "eco_all":  ("alpha", "core", "pcoa_aitch"),
}

C_GRID = [0.1, 1.0, 10.0]
G_GRID = ["scale", 0.01, 0.1, 1.0]


# ---------------------------------------------------------------- 特征构建
class Data:
    """一个队列的全部原始材料，索引已对齐。"""

    def __init__(self, alpha, bray, aitch, counts, mask):
        self.ids = alpha.index[mask]
        self.alpha = alpha.loc[self.ids, ec.ALPHA_COLS].values.astype(float)
        self.depth = alpha.loc[self.ids, "SequencingDepth"].values.astype(float)
        self.host = alpha.loc[self.ids, "HostSpecies"].values
        self.y = (alpha.loc[self.ids, "Infection"] == "Pos").astype(int).values
        self.rel = ec.relative_abundance(counts.loc[self.ids])
        self.counts = counts.loc[self.ids].values.astype(float)
        self.bray = bray.loc[self.ids, self.ids].values
        self.aitch = aitch.loc[self.ids, self.ids].values

    def __len__(self):
        return len(self.ids)


def build_tabular(space, d, tr, te, k_pcoa=10):
    """返回 (Xtr, Xte)。所有需要拟合的步骤都只看训练折。"""
    if space == "alpha":
        return d.alpha[tr], d.alpha[te]

    if space == "core":
        cores = ec.baseline_core(d.rel[tr], d.y[tr], d.host[tr])
        F = ec.core_retention_features(d.rel, d.host, cores)
        return F[tr], F[te]

    if space in ("pcoa_bray", "pcoa_aitch"):
        D = d.bray if space == "pcoa_bray" else d.aitch
        coords, st = ec.pcoa_fit(D[np.ix_(tr, tr)], k=k_pcoa)
        return coords, ec.pcoa_project(D[np.ix_(te, tr)], st)

    if space == "genus":
        p = mb.PrevalenceCLR()
        p.fit(d.counts[tr])
        return p.transform(d.counts[tr]), p.transform(d.counts[te])

    if space in COMPOSITE:
        parts = [build_tabular(s, d, tr, te) for s in COMPOSITE[space]]
        return (np.hstack([a for a, _ in parts]),
                np.hstack([b for _, b in parts]))

    raise ValueError(space)


def _clean(Xtr, Xte):
    """核心保留度在极端折下可能出 NaN（某宿主该折无阴性样本），用训练折均值补。"""
    mu = np.nanmean(Xtr, axis=0)
    mu = np.where(np.isnan(mu), 0.0, mu)
    Xtr = np.where(np.isnan(Xtr), mu, Xtr)
    Xte = np.where(np.isnan(Xte), mu, Xte)
    sc = StandardScaler().fit(Xtr)
    return sc.transform(Xtr), sc.transform(Xte)


DECONF_DEPTH = False   # 由 --deconfound-depth 开启


def _residualize(Xtr, Xte, dtr, dte):
    """把每个特征对 log(测序深度) 线性回归后取残差。

    丰富度类指标（Observed / Chao1 / CoreTaxaPresent / TotalTaxaPresent）天然
    随测序深度上升，若深度本身与感染状态相关，这些特征就会借道深度获得
    虚假的预测力。回归系数**只在训练折上拟合**，再应用到折外样本。
    """
    A = np.hstack([np.ones((len(dtr), 1)), np.log(np.maximum(dtr, 1))[:, None]])
    B = np.hstack([np.ones((len(dte), 1)), np.log(np.maximum(dte, 1))[:, None]])
    coef, *_ = np.linalg.lstsq(A, Xtr, rcond=None)
    return Xtr - A @ coef, Xte - B @ coef


# ---------------------------------------------------------------- 单折评分
def fit_score_tabular(space, d, tr, te, tune=True, params=None):
    Xtr, Xte = build_tabular(space, d, tr, te)
    if DECONF_DEPTH and space != "genus":
        Xtr, Xte = _residualize(Xtr, Xte, d.depth[tr], d.depth[te])
    Xtr, Xte = _clean(Xtr, Xte)
    if tune:
        params = _inner_grid_tabular(Xtr, d.y[tr])
    C, g = params if params else (1.0, "scale")
    clf = SVC(kernel="rbf", C=C, gamma=g, class_weight="balanced",
              probability=False, random_state=RNG).fit(Xtr, d.y[tr])
    return clf.decision_function(Xte)


def fit_score_kernel(space, d, tr, te, tune=True, params=None):
    D = d.bray if space == "dist_bray" else d.aitch
    gamma = ec.median_gamma(D[np.ix_(tr, tr)])
    Ktr = ec.distance_kernel(D[np.ix_(tr, tr)], gamma)
    Kte = ec.distance_kernel(D[np.ix_(te, tr)], gamma)
    if tune:
        params = (_inner_grid_kernel(Ktr, d.y[tr]),)
    C = params[0] if params else 1.0
    clf = SVC(kernel="precomputed", C=C, class_weight="balanced",
              random_state=RNG).fit(Ktr, d.y[tr])
    return clf.decision_function(Kte)


def _inner_grid_tabular(X, y, k=4):
    _, cnt = np.unique(y, return_counts=True)
    if cnt.min() < 2:
        return (1.0, "scale")
    cv = StratifiedKFold(min(k, int(cnt.min())), shuffle=True, random_state=RNG)
    best, best_s = (1.0, "scale"), -np.inf
    for C in C_GRID:
        for g in G_GRID:
            s = []
            for a, b in cv.split(X, y):
                if len(np.unique(y[a])) < 2:
                    continue
                m = SVC(kernel="rbf", C=C, gamma=g, class_weight="balanced",
                        random_state=RNG).fit(X[a], y[a])
                if len(np.unique(y[b])) < 2:
                    continue
                s.append(roc_auc_score(y[b], m.decision_function(X[b])))
            if s and np.mean(s) > best_s:
                best_s, best = np.mean(s), (C, g)
    return best


def _inner_grid_kernel(K, y, k=4):
    _, cnt = np.unique(y, return_counts=True)
    if cnt.min() < 2:
        return 1.0
    cv = StratifiedKFold(min(k, int(cnt.min())), shuffle=True, random_state=RNG)
    best, best_s = 1.0, -np.inf
    for C in C_GRID:
        s = []
        for a, b in cv.split(K, y):
            if len(np.unique(y[a])) < 2 or len(np.unique(y[b])) < 2:
                continue
            m = SVC(kernel="precomputed", C=C, class_weight="balanced",
                    random_state=RNG).fit(K[np.ix_(a, a)], y[a])
            s.append(roc_auc_score(y[b], m.decision_function(K[np.ix_(b, a)])))
        if s and np.mean(s) > best_s:
            best_s, best = np.mean(s), C
    return best


# ---------------------------------------------------------------- 评估
def nested_cv(space, d, n_repeats, seed=RNG, tune=True):
    """外层 5 折 × n_repeats，内层 4 折调参。

    AUC **逐折计算再平均**，不把各折的 decision_function 值汇总后统一算。
    各折选中的超参不同，判别函数的尺度也就不同，汇总打分会把不可比的数值
    混在一起。这与项目既有脚本（cross_val_score(scoring="roc_auc")）口径一致。
    """
    scorer = fit_score_kernel if space in KERNEL_SPACES else fit_score_tabular
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=n_repeats, random_state=seed)
    per_fold = []
    for tr, te in cv.split(np.zeros(len(d.y)), d.y):
        if len(np.unique(d.y[te])) < 2:
            continue
        per_fold.append(roc_auc_score(d.y[te], scorer(space, d, tr, te, tune=tune)))
    per_fold = np.array(per_fold)
    # 每 5 折为一轮，轮内取均值，得到逐轮 AUC
    n = (len(per_fold) // 5) * 5
    return per_fold[:n].reshape(-1, 5).mean(axis=1) if n else per_fold


def permutation_test(space, d, n_perm, seed=RNG):
    """标签置换。为控制时间，零分布用单层 5 折 × 2 次、固定超参。"""
    obs = nested_cv(space, d, n_repeats=2, tune=False).mean()
    null = np.empty(n_perm)
    for i in range(n_perm):
        dd = _shuffled(d, seed=9000 + i)
        null[i] = nested_cv(space, dd, n_repeats=1, seed=i, tune=False).mean()
    p = (np.sum(null >= obs) + 1) / (n_perm + 1)
    return {"observed": float(obs), "null_mean": float(null.mean()),
            "null_sd": float(null.std()), "null_max": float(null.max()),
            "p_value": float(p), "n_perm": n_perm}


def _shuffled(d, seed):
    import copy
    dd = copy.copy(d)
    dd.y = np.random.RandomState(seed).permutation(d.y)
    return dd


def _transfer_matrices(space, src, dst):
    """构造跨宿主的 (Xtr, Xte)，若该特征空间无法跨队列则返回 None。"""
    if space in KERNEL_SPACES or space in ("pcoa_bray", "pcoa_aitch",
                                            "eco_bray", "eco_all"):
        # 距离矩阵与 PCoA 轴都是队列内定义的，跨队列没有共同坐标系
        return None
    if space == "eco_pure":
        parts = [_transfer_matrices(s, src, dst) for s in COMPOSITE["eco_pure"]]
        return (np.hstack([a for a, _ in parts]),
                np.hstack([b for _, b in parts]))
    if space == "genus":
        p = mb.PrevalenceCLR()
        p.fit(src.counts)                       # 只用源队列拟合
        return p.transform(src.counts), p.transform(dst.counts)
    if space == "alpha":
        return src.alpha, dst.alpha
    if space == "core":
        # 两侧各用自己宿主的阴性样本定义核心。这正是本检验的要点：
        # 迁移的是「核心保留度」这个量，而不是同一批 taxa。
        cs = ec.baseline_core(src.rel, src.y, src.host)
        cd = ec.baseline_core(dst.rel, dst.y, dst.host)
        return (ec.core_retention_features(src.rel, src.host, cs),
                ec.core_retention_features(dst.rel, dst.host, cd))
    raise ValueError(space)


def transfer(space, src, dst, n_perm=200, seed=RNG):
    """整个源队列训练，整个目标队列测试，并给出置换零分布。

    目标队列样本量很小（火鸡 45、天鹅 15），单个 AUC 没有置换检验作参照
    就无法解读，因此这里对**目标标签**做置换，得到该迁移方向的噪声上限。
    """
    mats = _transfer_matrices(space, src, dst)
    if mats is None or len(np.unique(dst.y)) < 2:
        return None
    Xtr, Xte = mats
    if DECONF_DEPTH and space != "genus":
        Xtr, Xte = _residualize(Xtr, Xte, src.depth, dst.depth)
    Xtr, Xte = _clean(Xtr, Xte)
    C, g = _inner_grid_tabular(Xtr, src.y)
    clf = SVC(kernel="rbf", C=C, gamma=g, class_weight="balanced",
              random_state=RNG).fit(Xtr, src.y)
    s = clf.decision_function(Xte)

    # 判别函数常数化意味着模型对目标队列毫无区分力，此时 AUC 0.5 是退化而非「随机」
    degenerate = bool(np.ptp(s) < 1e-9)
    auc = float(roc_auc_score(dst.y, s))
    null = np.array([roc_auc_score(np.random.RandomState(seed + i).permutation(dst.y), s)
                     for i in range(n_perm)])
    return {"auc": auc, "degenerate": degenerate,
            "null_mean": float(null.mean()), "null_max": float(null.max()),
            "p_value": float((np.sum(null >= auc) + 1) / (n_perm + 1)),
            "n_src": int(len(src.y)), "n_dst": int(len(dst.y)),
            "params": {"C": C, "gamma": g}}


# ---------------------------------------------------------------- 主程序
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-perm", type=int, default=200)
    ap.add_argument("--n-repeats", type=int, default=10)
    ap.add_argument("--deconfound-depth", action="store_true",
                    help="每个特征先对 log(测序深度) 回归取残差（折内拟合）")
    ap.add_argument("--tag", default="", help="输出文件名后缀")
    args = ap.parse_args()
    global DECONF_DEPTH
    DECONF_DEPTH = args.deconfound_depth
    os.makedirs(OUT, exist_ok=True)

    alpha, bray, aitch, counts = ec.load_eco(".")
    data = {}
    for name, cfg in COHORTS.items():
        m = alpha["HostSpecies"].isin(cfg["species"]).values
        data[name] = Data(alpha, bray, aitch, counts, m)

    res = {"n_repeats": args.n_repeats, "n_perm": args.n_perm,
           "deconfound_depth": DECONF_DEPTH, "cohorts": {}}

    print("=" * 92)
    print("生态特征空间建模  |  SVM-RBF，外层 5 折 ×", args.n_repeats, "次，内层 4 折调参")
    if DECONF_DEPTH:
        print("  ** 已开启测序深度去混杂：每个特征对 log(深度) 回归后取残差（折内拟合）**")
    res_deconf = DECONF_DEPTH
    print("=" * 92)
    for name, d in data.items():
        print(f"  {name:<8} n={len(d):<4} 阴性 {int((d.y == 0).sum()):<3} "
              f"阳性 {int((d.y == 1).sum()):<3} "
              f"基线准确率 {max(np.mean(d.y), 1 - np.mean(d.y)):.3f}")

    # ---------------------------------------------------------- 混杂检查
    print("\n" + "=" * 92)
    print("[0] 测序深度混杂检查（α 多样性中的丰富度指标对深度敏感）")
    print("=" * 92)
    res["depth_check"] = {}
    for name, d in data.items():
        if len(np.unique(d.y)) < 2:
            continue
        a = roc_auc_score(d.y, d.depth)
        a = max(a, 1 - a)
        res["depth_check"][name] = float(a)
        flag = "  ← 需警惕" if a > 0.65 else ""
        print(f"  {name:<8} 深度 → 预测感染状态  AUC {a:.3f}{flag}")

    # ---------------------------------------------------------- 队列内
    for name, cfg in COHORTS.items():
        if not cfg["model"]:
            continue
        d = data[name]
        print("\n" + "=" * 92)
        print(f"[1] 队列内建模：{name}（n={len(d)}）")
        print("=" * 92)
        print(f"  {'特征空间':<34} {'特征数':>6} {'AUC':>7} {'重复间 sd':>10}")
        print("  " + "-" * 62)
        block = {}
        for sp in ALL_SPACES:
            aucs = nested_cv(sp, d, args.n_repeats)
            npf = _n_features(sp, d)
            block[sp] = {"auc_mean": float(aucs.mean()),
                         "auc_sd": float(aucs.std()),
                         "auc_per_repeat": [float(x) for x in aucs],
                         "n_features": npf}
            print(f"  {SPACE_LABEL[sp]:<34} {npf:>6} {aucs.mean():>7.3f} {aucs.std():>10.3f}")
        res["cohorts"].setdefault(name, {})["within"] = block

    # ---------------------------------------------------------- 置换检验
    for name, cfg in COHORTS.items():
        if not cfg["model"]:
            continue
        d = data[name]
        print("\n" + "=" * 92)
        print(f"[2] 置换检验：{name}（{args.n_perm} 次，单层 CV + 固定超参）")
        print("=" * 92)
        print(f"  {'特征空间':<34} {'实测':>7} {'零均值':>8} {'零最大':>8} {'p':>8}")
        print("  " + "-" * 70)
        block = {}
        for sp in ALL_SPACES:
            r = permutation_test(sp, d, args.n_perm)
            block[sp] = r
            star = " *" if r["p_value"] < 0.05 else ""
            print(f"  {SPACE_LABEL[sp]:<34} {r['observed']:>7.3f} {r['null_mean']:>8.3f} "
                  f"{r['null_max']:>8.3f} {r['p_value']:>8.4f}{star}")
        res["cohorts"][name]["permutation"] = block

    # ---------------------------------------------------------- 跨宿主
    print("\n" + "=" * 92)
    print("[3] 跨宿主迁移：整队列训练 → 整队列测试")
    print("=" * 92)
    print("  这是本轮分析的核心问题。距离核与 PCoA 无法跨队列（坐标系是队列内定义的），")
    print("  因此可比的是：α 多样性、核心保留度、二者的合并（纯生态），以及属丰度。")
    pairs = [("Duck", "Turkey"), ("Turkey", "Duck"),
             ("Duck", "Swan"), ("Turkey", "Swan")]
    spaces = ["alpha", "core", "eco_pure", "genus"]
    block = {}
    for sp in spaces:
        print(f"\n  {SPACE_LABEL[sp]}")
        print(f"  {'源 → 目标':<20}{'n源':>6}{'n目标':>7}{'AUC':>8}{'零最大':>8}{'p':>8}   说明")
        print("  " + "-" * 76)
        for s, t in pairs:
            r = transfer(sp, data[s], data[t], n_perm=args.n_perm)
            block.setdefault(f"{s}->{t}", {})[sp] = r
            if r is None:
                print(f"  {s + ' → ' + t:<20}{'':>6}{'':>7}{'—':>8}")
                continue
            note = "判别函数常数，模型对目标完全无区分力" if r["degenerate"] else \
                   ("高于噪声上限" if r["p_value"] < 0.05 else "")
            print(f"  {s + ' → ' + t:<20}{r['n_src']:>6}{r['n_dst']:>7}{r['auc']:>8.3f}"
                  f"{r['null_max']:>8.3f}{r['p_value']:>8.4f}   {note}")
    res["transfer"] = block

    fn = f"ecological_models{args.tag}.json"
    with open(os.path.join(OUT, fn), "w") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
    print("\n" + "=" * 92)
    print(f"结果已写入 {OUT}/{fn}")
    print("=" * 92)


def _n_features(space, d):
    if space in KERNEL_SPACES:
        return len(d)
    tr = np.arange(len(d))
    X, _ = build_tabular(space, d, tr, tr[:1])
    return X.shape[1]


if __name__ == "__main__":
    main()
