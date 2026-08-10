#!/usr/bin/env python3
"""
去混杂敏感性分析：排除月份与感染状态近乎共线的三个月（11、12、1 月）。

动机
----
在全队列中，11–12 月 100% 阳性、1 月 90% 阴性。这 95 个样本上，模型只要学会
「这是几月」就能拿高分，菌群信号被淹没。排除它们可以检验：时间混杂被消除后，
菌群本身还剩多少判别力。

这是**敏感性分析，不是主分析**。被排除的样本同时也是判别最困难的一批
（Jan+Oct 分层 AUC 仅 0.668），因此子集上的高 AUC 不能与全队列直接相比。

用法:
    python3 deconfound_analysis.py                 # 完整
    python3 deconfound_analysis.py --n-perm 60     # 缩短置换检验
    python3 deconfound_analysis.py --drop 11 12 1  # 自定义排除哪些月份
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RepeatedStratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"


def LR():
    return LogisticRegression(max_iter=5000, C=0.5, class_weight="balanced")


def SVM():
    return SVC(kernel="rbf", C=5, gamma="scale", class_weight="balanced",
               random_state=RNG)


def micro_pipe(model, prevalence=0.10):
    return Pipeline([("clr", mb.PrevalenceCLR(prevalence)),
                     ("sc", StandardScaler()), ("clf", model)])


def cov_pipe(cat, num, model):
    pre = ColumnTransformer([
        ("c", OneHotEncoder(handle_unknown="ignore"), cat),
        ("n", Pipeline([("i", SimpleImputer(strategy="median")),
                        ("s", StandardScaler())]), num),
    ])
    return Pipeline([("pre", pre), ("clf", model)])


def cv(pipe, X, y, seed=RNG, n_repeats=5):
    return cross_val_score(pipe, X, y, scoring="roc_auc", n_jobs=-1,
                           cv=RepeatedStratifiedKFold(n_splits=5, n_repeats=n_repeats,
                                                      random_state=seed)).mean()


def combined_pipe(counts, cov, cat, num, model):
    """菌群 + 协变量合并模型；菌群侧的 CLR 仍在折内拟合。"""
    n = counts.shape[1]
    mcols = [f"m{i}" for i in range(n)]
    X = pd.concat([counts.reset_index(drop=True).set_axis(mcols, axis=1),
                   cov.reset_index(drop=True)], axis=1)
    pre = ColumnTransformer([
        ("mic", Pipeline([("clr", mb.PrevalenceCLR(0.10)), ("sc", StandardScaler())]), mcols),
        ("cov", ColumnTransformer([
            ("c", OneHotEncoder(handle_unknown="ignore"), cat),
            ("n", Pipeline([("i", SimpleImputer(strategy="median")),
                            ("s", StandardScaler())]), num)]), list(cov.columns)),
    ])
    return Pipeline([("pre", pre), ("clf", model)]), X


def month_collapse(month, y, mask, tag):
    """仅用月份这一个变量预测标签的能力——去混杂是否成功的直接证据。"""
    mo = month[mask].reshape(-1, 1)
    if len(np.unique(mo)) < 2:
        return np.nan
    return cv(make_pipeline(SimpleImputer(strategy="median"), StandardScaler(),
                            LogisticRegression(max_iter=2000, class_weight="balanced")),
              mo, y[mask])


def diff_abundance(counts, y, taxonomy):
    clr = mb.clr_frame(counts, 0.10)
    a, b = clr.values[y == 1], clr.values[y == 0]
    t, p = stats.ttest_ind(a, b, equal_var=False)
    fdr = stats.false_discovery_control(p, method="bh")
    df = pd.DataFrame({"FeatureID": clr.columns, "t": t, "p": p, "FDR": fdr})
    tax = taxonomy.reindex(df.FeatureID)
    for lv in ["Family", "Genus"]:
        if lv in tax.columns:
            df[lv] = tax[lv].values
    return df.sort_values("p")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--drop", type=int, nargs="+", default=[11, 12, 1],
                    help="要排除的月份（默认 11 12 1）")
    ap.add_argument("--n-perm", type=int, default=100)
    ap.add_argument("--prevalence", type=float, default=0.10)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    counts, taxonomy, meta = mb.load_all(".")
    sel = (meta[mb.BATCH_COL] == mb.PRIMARY_STUDY).values
    counts, meta = counts[sel], meta[sel]
    y = mb.get_label(meta).values
    month = pd.to_numeric(meta["month"], errors="coerce").values
    keep = ~np.isin(month, args.drop)
    full = np.ones(len(y), bool)

    print("=" * 74)
    print(f"去混杂敏感性分析 —— 排除月份 {args.drop}")
    print("=" * 74)
    print(f"全队列  n={full.sum():3d}  阳性 {y.sum():3d} ({y.mean():.0%})")
    print(f"子集    n={keep.sum():3d}  阳性 {y[keep].sum():3d} ({y[keep].mean():.0%})"
          f"   排除 {(~keep).sum()} 个样本")
    print("\n各月阳性率:")
    rows_m = []
    for mo in sorted(set(month[~np.isnan(month)])):
        s = month == mo
        rows_m.append({"month": int(mo), "n": int(s.sum()),
                       "pos_rate": float(y[s].mean()),
                       "dropped": int(mo) in args.drop})
        flag = "  <- 排除" if int(mo) in args.drop else ""
        print(f"  {int(mo):2d}月  n={s.sum():3d}  阳性率 {y[s].mean():.0%}{flag}")
    pd.DataFrame(rows_m).to_csv(os.path.join(OUT, "deconf_month_table.csv"), index=False)

    # ---------- 去混杂是否成功 ----------
    print("\n[1] 去混杂是否成功：仅用「月份」一个变量预测标签")
    m_full = month_collapse(month, y, full, "full")
    m_sub = month_collapse(month, y, keep, "sub")
    print(f"  全队列 AUC {m_full:.3f}   ->   子集 AUC {m_sub:.3f}"
          f"   {'(已中和)' if m_sub < 0.6 else '(仍有残余)'}")

    # ---------- 特征集消融 ----------
    print("\n[2] 特征集消融（统一 L2-LR 口径，与 README 消融表可比）")
    res = {}
    for tag, mask in [("full", full), ("sub", keep)]:
        cov, cat, num = mb.build_covariates(meta[mask])
        a = cv(cov_pipe(cat, num, LR()), cov, y[mask])
        b = cv(micro_pipe(LR()), counts[mask].values.astype(float), y[mask])
        b_svm = cv(micro_pipe(SVM()), counts[mask].values.astype(float), y[mask])
        pipe, X = combined_pipe(counts[mask], cov, cat, num, LR())
        c = cv(pipe, X, y[mask])
        res[tag] = dict(cov=a, micro=b, micro_svm=b_svm, both=c, increment=c - a,
                        n=int(mask.sum()))
    print(f"  {'':16s} {'全队列 n=260':>14s} {'子集 n=%d' % keep.sum():>14s} {'变化':>10s}")
    for k, lbl in [("cov", "仅协变量"), ("micro", "仅菌群 (LR)"),
                   ("micro_svm", "仅菌群 (SVM-RBF)"), ("both", "菌群+协变量")]:
        print(f"  {lbl:16s} {res['full'][k]:14.3f} {res['sub'][k]:14.3f} "
              f"{res['sub'][k] - res['full'][k]:+10.3f}")
    print(f"  {'菌群独立增量':16s} {res['full']['increment']:+14.3f} "
          f"{res['sub']['increment']:+14.3f}")

    # ---------- 置换检验 ----------
    print(f"\n[3] 子集上的置换检验（{args.n_perm} 次，SVM-RBF）")
    Xs = counts[keep].values.astype(float)
    ys = y[keep]
    obs = cv(micro_pipe(SVM()), Xs, ys, n_repeats=2)
    null = np.empty(args.n_perm)
    for i in range(args.n_perm):
        null[i] = cv(micro_pipe(SVM()), Xs, np.random.RandomState(2000 + i).permutation(ys),
                     seed=i, n_repeats=1)
        if (i + 1) % 25 == 0:
            print(f"    {i+1}/{args.n_perm} ...")
    pval = (np.sum(null >= obs) + 1) / (args.n_perm + 1)
    print(f"  实测 {obs:.3f} | 零分布 {null.mean():.3f} ± {null.std():.3f} "
          f"(max {null.max():.3f}) | p = {pval:.4f}")
    np.savetxt(os.path.join(OUT, "deconf_permutation_null.txt"), null)

    # ---------- 残余混杂 ----------
    print("\n[4] 残余混杂：删掉月份之后还剩什么")
    resid = {}
    if "Location" in meta.columns:
        loc = meta["Location"].fillna("__na__").values[keep]
        top = pd.Series(loc).value_counts().index[0]
        tgt = (loc == top).astype(int)
        if 10 < tgt.sum() < len(tgt) - 10:
            resid["micro_predicts_site"] = cv(micro_pipe(LR()), Xs, tgt, n_repeats=3)
            print(f"  菌群 -> 采样地点(最大类)   AUC {resid['micro_predicts_site']:.3f}")
        lo = pd.get_dummies(pd.Series(loc)).values.astype(float)
        resid["site_predicts_label"] = cv(make_pipeline(StandardScaler(), LR()), lo, ys,
                                          n_repeats=3)
        print(f"  采样地点 -> 标签           AUC {resid['site_predicts_label']:.3f}"
              f"   {'<- 残余混杂通路' if resid['site_predicts_label'] > 0.6 else ''}")
    mo_sub = month[keep]
    if len(np.unique(mo_sub)) > 1:
        big = pd.Series(mo_sub).value_counts().index[0]
        resid["micro_predicts_month"] = cv(micro_pipe(LR()), Xs,
                                           (mo_sub == big).astype(int), n_repeats=3)
        print(f"  菌群 -> 是否 {int(big)} 月         AUC {resid['micro_predicts_month']:.3f}")

    # ---------- biomarker 是否改变 ----------
    print("\n[5] 去混杂后 biomarker 是否改变（CLR + Welch t + BH-FDR）")
    da_full = diff_abundance(counts, y, taxonomy)
    da_sub = diff_abundance(counts[keep], ys, taxonomy)
    n_f, n_s = int((da_full.FDR < 0.05).sum()), int((da_sub.FDR < 0.05).sum())
    print(f"  显著特征数  全队列 {n_f}/{len(da_full)}   子集 {n_s}/{len(da_sub)}")
    mg = da_full[["FeatureID", "t", "FDR", "Genus"]].merge(
        da_sub[["FeatureID", "t", "FDR"]], on="FeatureID", suffixes=("_full", "_sub"))
    rho, prho = stats.spearmanr(mg.t_full, mg.t_sub)
    both = set(da_full[da_full.FDR < 0.05].FeatureID) & set(da_sub[da_sub.FDR < 0.05].FeatureID)
    print(f"  t 统计量 Spearman ρ = {rho:.3f} (p = {prho:.1e})")
    print(f"  两边同时显著的特征: {len(both)}")
    print("\n  子集中最显著的 8 个:")
    print(da_sub.head(8)[["Genus", "Family", "t", "FDR"]].to_string(index=False))
    da_sub.to_csv(os.path.join(OUT, "deconf_differential_abundance.csv"), index=False)

    summary = dict(dropped_months=args.drop, n_full=int(full.sum()), n_sub=int(keep.sum()),
                   month_auc_full=float(m_full), month_auc_sub=float(m_sub),
                   ablation=res, permutation=dict(observed=float(obs),
                   null_mean=float(null.mean()), null_sd=float(null.std()),
                   null_max=float(null.max()), p_value=float(pval), n_perm=args.n_perm),
                   residual_confounding=resid,
                   da_sig_full=n_f, da_sig_sub=n_s,
                   da_spearman_t=float(rho), da_both_sig=len(both))
    with open(os.path.join(OUT, "deconfound_summary.json"), "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 74)
    print("提醒：这是敏感性分析。被排除的 95 个样本同时也是判别最困难的一批")
    print("（Jan+Oct 分层 AUC 仅 0.668），因此子集 AUC 不可与全队列直接相比。")
    print(f"结果已写入 {OUT}/deconf_* 与 deconfound_summary.json")
    print("=" * 74)


if __name__ == "__main__":
    main()
