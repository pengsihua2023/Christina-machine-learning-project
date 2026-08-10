#!/usr/bin/env python3
"""
SVM-RBF 的两项收尾分析：
  1. 超参网格扩展 —— 确认最优 C/gamma 没有卡在网格边缘
  2. Permutation importance —— 给核方法一个可解释的特征重要性

用法:
    python3 svm_analysis.py                # 两项都跑
    python3 svm_analysis.py --only grid
    python3 svm_analysis.py --only imp

说明: 调参阶段用 probability=False + decision_function（roc_auc 打分不需要概率），
比 probability=True 快一个数量级；只有最终需要 0.5 阈值指标时才启用概率。
"""
import argparse
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import (GridSearchCV, RepeatedStratifiedKFold,
                                     StratifiedKFold)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

warnings.filterwarnings("ignore")
RNG = 0
DATA = "ml_dataset/primary_merged.csv"
DICT = "ml_dataset/feature_dictionary.csv"
OUTDIR = "results"

# 向上向下都扩过原范围，用于检验边界
C_GRID = [0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0, 500.0]
GAMMA_GRID = ["scale", 1e-4, 1e-3, 1e-2, 1e-1]


def load():
    d = pd.read_csv(DATA, index_col=0)
    feat = [c for c in d.columns if c.endswith("__clr")]
    return d[feat].values, d["label"].values, [c[:-5] for c in feat]


def svm_pipe(**kw):
    return Pipeline([("sc", StandardScaler()),
                     ("clf", SVC(kernel="rbf", class_weight="balanced",
                                 random_state=RNG, **kw))])


def grid_scan(X, y, n_repeats=3):
    """在扩展网格上做嵌套 CV，统计每折选中的超参，检查是否触边界。"""
    print(f"网格: C={C_GRID}")
    print(f"      gamma={GAMMA_GRID}")
    grid = {"clf__C": C_GRID, "clf__gamma": GAMMA_GRID}
    splits = list(RepeatedStratifiedKFold(n_splits=5, n_repeats=n_repeats,
                                          random_state=RNG).split(X, y))
    aucs, chosen = [], []
    for tr, te in splits:
        gs = GridSearchCV(svm_pipe(), grid, scoring="roc_auc", n_jobs=-1,
                          cv=StratifiedKFold(4, shuffle=True, random_state=RNG))
        gs.fit(X[tr], y[tr])
        aucs.append(roc_auc_score(y[te], gs.decision_function(X[te])))
        chosen.append((gs.best_params_["clf__C"], gs.best_params_["clf__gamma"]))
    aucs = np.array(aucs)
    print(f"\n扩展网格下嵌套 CV AUC: {aucs.mean():.3f} ± {aucs.std():.3f} "
          f"({len(splits)} 折)")

    cdf = pd.Series([c for c, _ in chosen]).value_counts().sort_index()
    gdf = pd.Series([str(g) for _, g in chosen]).value_counts()
    print("\n各折选中的 C 分布:")
    for k, v in cdf.items():
        bar = "#" * v
        edge = "  <-- 网格边缘" if k in (C_GRID[0], C_GRID[-1]) else ""
        print(f"  C={k:<7} {v:3d} 折 {bar}{edge}")
    print("各折选中的 gamma 分布:")
    for k, v in gdf.items():
        print(f"  gamma={k:<8} {v:3d} 折 {'#' * v}")

    n_edge = sum(1 for c, _ in chosen if c in (C_GRID[0], C_GRID[-1]))
    print(f"\n触及 C 网格边缘的折数: {n_edge}/{len(chosen)}", end=" ")
    print("-> 网格范围充分" if n_edge == 0 else "-> 建议继续扩展网格")

    # 完整的 C x gamma 热图（单次 CV 的平均分，用于看曲面形状）
    gs = GridSearchCV(svm_pipe(), grid, scoring="roc_auc", n_jobs=-1,
                      cv=StratifiedKFold(5, shuffle=True, random_state=RNG))
    gs.fit(X, y)
    heat = (pd.DataFrame(gs.cv_results_)
            .pivot_table(index="param_clf__C", columns="param_clf__gamma",
                         values="mean_test_score"))
    print("\n超参曲面 (CV AUC，行=C 列=gamma):")
    print(heat.round(3).to_string())
    heat.to_csv(os.path.join(OUTDIR, "svm_hyperparam_surface.csv"))
    return dict(auc=aucs.mean(), chosen=chosen, n_edge=n_edge)


def perm_importance(X, y, names, n_repeats_perm=30, n_splits=5, n_rep_cv=5):
    """折内 permutation importance：在训练折拟合，在验证折打乱，累计各折结果。

    这样得到的重要性反映"打乱该特征会让泛化性能掉多少"，
    而不是在训练集上的拟合贡献。
    """
    imps = []
    splits = list(RepeatedStratifiedKFold(n_splits=n_splits, n_repeats=n_rep_cv,
                                          random_state=RNG).split(X, y))
    grid = {"clf__C": [0.5, 1.0, 5.0, 10.0], "clf__gamma": ["scale", 1e-3, 1e-2]}
    for i, (tr, te) in enumerate(splits):
        gs = GridSearchCV(svm_pipe(), grid, scoring="roc_auc", n_jobs=-1,
                          cv=StratifiedKFold(4, shuffle=True, random_state=RNG))
        gs.fit(X[tr], y[tr])
        r = permutation_importance(gs.best_estimator_, X[te], y[te],
                                   scoring="roc_auc", n_repeats=n_repeats_perm,
                                   random_state=RNG, n_jobs=-1)
        imps.append(r.importances_mean)
        if (i + 1) % 5 == 0:
            print(f"    折 {i+1}/{len(splits)} ...")
    I = np.vstack(imps)
    df = pd.DataFrame({
        "feature": names,
        "importance_mean": I.mean(0),
        "importance_sd": I.std(0),
        "frac_folds_positive": (I > 0).mean(0),
    }).sort_values("importance_mean", ascending=False)

    if os.path.exists(DICT):
        fd = pd.read_csv(DICT).set_index("column")
        for lv in ["Genus", "Family", "Phylum"]:
            if lv in fd.columns:
                df[lv] = fd[lv].reindex(df.feature).values
    return df


def plot_importance(df, path, top=20):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    t = df.head(top).iloc[::-1]
    lab = t["Genus"].fillna(t.feature) if "Genus" in t.columns else t.feature
    fig, ax = plt.subplots(figsize=(7, 0.32 * top + 1.2))
    ax.barh(range(len(t)), t.importance_mean, xerr=t.importance_sd,
            color="steelblue", error_kw=dict(lw=0.7, ecolor="gray"))
    ax.set_yticks(range(len(t)))
    ax.set_yticklabels(lab, fontsize=8)
    ax.axvline(0, c="k", lw=0.8)
    ax.set_xlabel("Permutation importance (AUC drop)")
    ax.set_title("SVM-RBF feature importance (out-of-fold)")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    print(f"  图已保存: {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["grid", "imp"], default=None)
    ap.add_argument("--n-repeats", type=int, default=3)
    args = ap.parse_args()
    os.makedirs(OUTDIR, exist_ok=True)

    X, y, names = load()
    print(f"数据: {X.shape[0]} 样本 x {X.shape[1]} 特征 (CLR)\n")

    if args.only != "imp":
        print("=" * 68)
        print("[1] 超参网格扩展 —— 检查是否触及边界")
        print("=" * 68)
        grid_scan(X, y, args.n_repeats)

    if args.only != "grid":
        print("\n" + "=" * 68)
        print("[2] Permutation importance (折内计算)")
        print("=" * 68)
        df = perm_importance(X, y, names)
        df.to_csv(os.path.join(OUTDIR, "svm_permutation_importance.csv"), index=False)
        cols = [c for c in ["Genus", "Family", "importance_mean", "importance_sd",
                            "frac_folds_positive"] if c in df.columns]
        print("\nTop 20 特征:")
        print(df.head(20)[cols].to_string(index=False))
        n_pos = int((df.importance_mean > 0).sum())
        print(f"\n重要性 > 0 的特征: {n_pos}/{len(df)}")
        plot_importance(df, os.path.join(OUTDIR, "svm_permutation_importance.png"))


if __name__ == "__main__":
    main()
