#!/usr/bin/env python3
"""
对 ExtraTrees 施加与 SVM-RBF 完全相同的验证，判断它是否真的值得取代主模型。

仅仅 AUC 高 0.020（p=0.085，未显著）不足以换主模型。真正的问题是：
它在混杂检验下是否同样稳健，尤其是在 Jan+Oct 那个弱分层上。

用法:
    python3 validate_extratrees.py                # 全部
    python3 validate_extratrees.py --n-perm 60    # 缩短置换检验
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import (RepeatedStratifiedKFold, StratifiedKFold,
                                     cross_val_score)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

warnings.filterwarnings("ignore")
RNG = 0
DATA = "ml_dataset/primary_merged.csv"
DICT = "ml_dataset/feature_dictionary.csv"
OUT = "results"


def ET():
    return ExtraTreesClassifier(n_estimators=500, max_features=0.3,
                                min_samples_leaf=1, random_state=RNG, n_jobs=-1,
                                class_weight="balanced_subsample")


def SVM():
    return SVC(kernel="rbf", C=5, gamma="scale", probability=True,
               class_weight="balanced", random_state=RNG)


def pipe(model):
    return make_pipeline(StandardScaler(), model)


def cv_auc(X, y, model, seed=RNG, n_repeats=5):
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=n_repeats, random_state=seed)
    return cross_val_score(pipe(model), X, y, cv=cv, scoring="roc_auc", n_jobs=-1).mean()


def load():
    d = pd.read_csv(DATA, index_col=0)
    cols = [c for c in d.columns if c.endswith("__clr")]
    return d, d[cols].values, d["label"].values, [c[:-5] for c in cols]


def month_strata(d, y):
    m = pd.to_numeric(d["month"], errors="coerce").values
    g = {f"{int(v)}月": m == v for v in np.unique(m[~np.isnan(m)])}
    g["Jul+Aug"] = np.isin(m, [7, 8])
    g["Jan+Oct"] = np.isin(m, [1, 10])
    g["Nov+Dec"] = np.isin(m, [11, 12])
    return g


def run_stratified(d, X, y):
    print("[1] 月份分层对比 —— 两个模型在同一分层上并排跑")
    rows = []
    for name, sel in month_strata(d, y).items():
        n = int(sel.sum())
        ys = y[sel]
        minor = min(ys.sum(), (1 - ys).sum())
        if n < 40 or minor < 8:
            continue
        a_et = cv_auc(X[sel], ys, ET())
        a_sv = cv_auc(X[sel], ys, SVM())
        rows.append({"stratum": name, "n": n, "n_pos": int(ys.sum()),
                     "ExtraTrees": a_et, "SVM_RBF": a_sv, "delta": a_et - a_sv})
        print(f"  {name:<10} n={n:3d} Pos={int(ys.sum()):3d}   "
              f"ExtraTrees {a_et:.3f}   SVM-RBF {a_sv:.3f}   Δ={a_et - a_sv:+.3f}")
    return pd.DataFrame(rows)


def run_permutation(X, y, n_perm):
    print(f"\n[2] 置换检验（{n_perm} 次，ExtraTrees）")
    obs = cv_auc(X, y, ET(), n_repeats=2)
    null = np.empty(n_perm)
    for i in range(n_perm):
        yp = np.random.RandomState(1000 + i).permutation(y)
        null[i] = cv_auc(X, yp, ET(), seed=i, n_repeats=1)
        if (i + 1) % 20 == 0:
            print(f"    {i+1}/{n_perm} ...")
    p = (np.sum(null >= obs) + 1) / (n_perm + 1)
    print(f"  实测 {obs:.3f} | 零分布 {null.mean():.3f} ± {null.std():.3f} "
          f"(max {null.max():.3f}) | p = {p:.4f}")
    if null.mean() > 0.55:
        print("  [warn] 零分布明显高于 0.5，提示流程泄漏，需要排查")
    return dict(observed=float(obs), null_mean=float(null.mean()),
                null_sd=float(null.std()), null_max=float(null.max()),
                p_value=float(p), n_perm=n_perm), null


def run_importance(X, y, names, n_rep_cv=3):
    print("\n[3] Permutation importance（折内计算）")
    imps = []
    splits = list(RepeatedStratifiedKFold(n_splits=5, n_repeats=n_rep_cv,
                                          random_state=RNG).split(X, y))
    for i, (tr, te) in enumerate(splits):
        m = pipe(ET()).fit(X[tr], y[tr])
        r = permutation_importance(m, X[te], y[te], scoring="roc_auc",
                                   n_repeats=20, random_state=RNG, n_jobs=-1)
        imps.append(r.importances_mean)
        if (i + 1) % 5 == 0:
            print(f"    折 {i+1}/{len(splits)} ...")
    I = np.vstack(imps)
    df = pd.DataFrame({"feature": names, "importance_mean": I.mean(0),
                       "importance_sd": I.std(0),
                       "frac_folds_positive": (I > 0).mean(0)})
    if os.path.exists(DICT):
        fd = pd.read_csv(DICT).set_index("column")
        for lv in ["Genus", "Family"]:
            if lv in fd.columns:
                df[lv] = fd[lv].reindex(df.feature).values
    return df.sort_values("importance_mean", ascending=False)


def compare_rankings(et_imp):
    """ExtraTrees 与 SVM-RBF 的重要性排名是否一致？一致则 biomarker 结论稳固。"""
    path = os.path.join(OUT, "svm_permutation_importance.csv")
    if not os.path.exists(path):
        return None
    sv = pd.read_csv(path)[["feature", "importance_mean"]].rename(
        columns={"importance_mean": "svm_imp"})
    m = et_imp[["feature", "importance_mean", "Genus"]].rename(
        columns={"importance_mean": "et_imp"}).merge(sv, on="feature")
    from scipy import stats
    rho, prho = stats.spearmanr(m.et_imp, m.svm_imp)
    top_et = set(m.nlargest(15, "et_imp").feature)
    top_sv = set(m.nlargest(15, "svm_imp").feature)
    print(f"\n[4] 两模型特征重要性排名一致性")
    print(f"  Spearman ρ = {rho:.3f} (p = {prho:.2e})")
    print(f"  Top-15 重合数: {len(top_et & top_sv)}/15")
    print("\n  ExtraTrees Top 10:")
    print(m.nlargest(10, "et_imp")[["Genus", "et_imp", "svm_imp"]].to_string(index=False))
    return dict(spearman_rho=float(rho), spearman_p=float(prho),
                top15_overlap=int(len(top_et & top_sv)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-perm", type=int, default=100)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    d, X, y, names = load()
    print(f"队列 {X.shape[0]} 样本 x {X.shape[1]} 特征\n")

    strat = run_stratified(d, X, y)
    strat.to_csv(os.path.join(OUT, "et_month_stratified.csv"), index=False)

    perm, null = run_permutation(X, y, args.n_perm)
    np.savetxt(os.path.join(OUT, "et_permutation_null.txt"), null)

    imp = run_importance(X, y, names)
    imp.to_csv(os.path.join(OUT, "et_permutation_importance.csv"), index=False)

    agree = compare_rankings(imp)

    with open(os.path.join(OUT, "et_validation.json"), "w") as f:
        json.dump({"permutation": perm, "ranking_agreement": agree,
                   "stratified": strat.to_dict("records")}, f,
                  indent=2, ensure_ascii=False)
    print(f"\n结果已写入 {OUT}/et_*")


if __name__ == "__main__":
    main()
