#!/usr/bin/env python3
"""
第二步：建模与评估。

设计要点（都是为了让结果站得住脚）:
  1. 流行度过滤 + CLR 封装成 pipeline 步骤 -> 在每一折的训练集内拟合，无选择偏倚
  2. 嵌套 CV：外层评估性能，内层调超参 -> 报告的 AUC 不含调参偏倚
  3. 置换检验：打乱标签重跑，给出经验 p 值 -> 排除"过拟合出来的高 AUC"
  4. 月份分层：在同一采样月份内部重跑 -> 排除季节/批次混杂
  5. 特征集消融：仅协变量 / 仅菌群 / 二者合并 -> 判断菌群是否有增量贡献
  6. 稳定性选择：bootstrap 重复 L1，输出可复现的 biomarker 列表

用法:
    python3 train_eval.py                       # 完整流程（主队列 PRJNA464410）
    python3 train_eval.py --level genus         # 用 Genus 聚合特征
    python3 train_eval.py --n-perm 200          # 更严的置换检验
    python3 train_eval.py --study all           # 全部 326 样本 + 跨研究 GroupKFold
    python3 train_eval.py --quick               # 跳过置换和稳定性选择，快速看结果
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from scipy import stats

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (roc_auc_score, average_precision_score,
                             confusion_matrix, roc_curve, balanced_accuracy_score)
from sklearn.model_selection import (GridSearchCV, GroupKFold, RepeatedStratifiedKFold,
                                     StratifiedKFold, cross_val_predict)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUTDIR = "results"


# ---------------------------------------------------------------------------
# 模型定义
# ---------------------------------------------------------------------------
def make_micro_pipe(clf, prevalence=mb.PREVALENCE):
    """菌群特征 pipeline：流行度过滤 -> CLR -> 标准化 -> 分类器。"""
    return Pipeline([
        ("clr", mb.PrevalenceCLR(prevalence=prevalence)),
        ("sc", StandardScaler()),
        ("clf", clf),
    ])


MODELS = {
    "L2-LR": (LogisticRegression(max_iter=5000, class_weight="balanced"),
              {"clf__C": [0.01, 0.05, 0.1, 0.5, 1.0, 5.0]}),
    "L1-LR": (LogisticRegression(max_iter=5000, penalty="l1", solver="liblinear",
                                 class_weight="balanced"),
              {"clf__C": [0.05, 0.1, 0.5, 1.0, 5.0]}),
    "RF": (RandomForestClassifier(n_estimators=500, random_state=RNG,
                                  class_weight="balanced_subsample", n_jobs=-1),
           {"clf__max_features": ["sqrt", 0.3], "clf__min_samples_leaf": [1, 3, 5]}),
    "HGB": (HistGradientBoostingClassifier(random_state=RNG),
            {"clf__learning_rate": [0.05, 0.1], "clf__max_leaf_nodes": [7, 15],
             "clf__min_samples_leaf": [5, 10]}),
}


def nested_cv(X, y, clf, grid, prevalence, n_splits=5, n_repeats=5, groups=None,
              seed=RNG):
    """嵌套 CV。返回外层每一折的指标 + 折外预测概率。"""
    pipe = make_micro_pipe(clf, prevalence)
    if groups is not None:
        outer = GroupKFold(n_splits=min(n_splits, len(np.unique(groups))))
        splits = list(outer.split(X, y, groups))
    else:
        outer = RepeatedStratifiedKFold(n_splits=n_splits, n_repeats=n_repeats,
                                        random_state=seed)
        splits = list(outer.split(X, y))

    aucs, aps, baccs = [], [], []
    oof = np.full(len(y), np.nan)
    for tr, te in splits:
        if len(np.unique(y[tr])) < 2 or len(np.unique(y[te])) < 2:
            continue
        inner = StratifiedKFold(4, shuffle=True, random_state=seed)
        gs = GridSearchCV(pipe, grid, scoring="roc_auc", cv=inner, n_jobs=-1,
                          refit=True)
        gs.fit(X[tr], y[tr])
        p = gs.predict_proba(X[te])[:, 1]
        aucs.append(roc_auc_score(y[te], p))
        aps.append(average_precision_score(y[te], p))
        baccs.append(balanced_accuracy_score(y[te], (p >= 0.5).astype(int)))
        oof[te] = p  # 重复 CV 下会被覆盖，仅取最后一轮用于出图
    return dict(auc=np.array(aucs), ap=np.array(aps), bacc=np.array(baccs)), oof


def simple_cv_auc(X, y, clf, prevalence, seed=RNG, n_splits=5, n_repeats=1,
                  micro=True):
    """单层 CV 的平均 AUC（用于置换检验/分层分析这类需要重复很多次的场景）。"""
    from sklearn.model_selection import cross_val_score
    pipe = make_micro_pipe(clf, prevalence) if micro else clf
    cv = RepeatedStratifiedKFold(n_splits=n_splits, n_repeats=n_repeats,
                                 random_state=seed)
    return cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc", n_jobs=-1).mean()


# ---------------------------------------------------------------------------
# 各项分析
# ---------------------------------------------------------------------------
def run_model_comparison(X, y, prevalence, groups=None, n_repeats=5):
    rows = []
    oofs = {}
    for name, (clf, grid) in MODELS.items():
        res, oof = nested_cv(X, y, clf, grid, prevalence, groups=groups,
                             n_repeats=n_repeats)
        oofs[name] = oof
        rows.append({
            "model": name,
            "AUC": res["auc"].mean(), "AUC_sd": res["auc"].std(),
            "PR-AUC": res["ap"].mean(), "PR-AUC_sd": res["ap"].std(),
            "BalAcc": res["bacc"].mean(),
            "n_folds": len(res["auc"]),
        })
        print(f"  {name:<7} AUC {res['auc'].mean():.3f} ± {res['auc'].std():.3f}"
              f"   PR-AUC {res['ap'].mean():.3f}"
              f"   BalAcc {res['bacc'].mean():.3f}")
    return pd.DataFrame(rows), oofs


def run_permutation_test(X, y, prevalence, n_perm=100, model="L2-LR"):
    clf, _ = MODELS[model]
    obs = simple_cv_auc(X, y, clf, prevalence, seed=RNG, n_repeats=2)
    null = np.empty(n_perm)
    for i in range(n_perm):
        yp = np.random.RandomState(1000 + i).permutation(y)
        null[i] = simple_cv_auc(X, yp, clf, prevalence, seed=i)
        if (i + 1) % 25 == 0:
            print(f"    置换 {i+1}/{n_perm} ...")
    p = (np.sum(null >= obs) + 1) / (n_perm + 1)
    print(f"  实测 AUC {obs:.3f} | 零分布 {null.mean():.3f} ± {null.std():.3f} "
          f"(max {null.max():.3f}) | p = {p:.4f}")
    return dict(model=model, observed=float(obs), null_mean=float(null.mean()),
                null_sd=float(null.std()), null_max=float(null.max()),
                p_value=float(p), n_perm=n_perm), null


def run_feature_set_ablation(counts, meta, y, prevalence):
    """比较：仅协变量 / 仅菌群 / 二者合并。判断菌群是否有增量贡献。"""
    cov, cat, num = mb.build_covariates(meta)
    n_micro = counts.shape[1]

    cov_pre = ColumnTransformer([
        ("c", OneHotEncoder(handle_unknown="ignore"), cat),
        ("n", Pipeline([("imp", SimpleImputer(strategy="median")),
                        ("sc", StandardScaler())]), num),
    ])
    micro_pre = Pipeline([("clr", mb.PrevalenceCLR(prevalence)), ("sc", StandardScaler())])

    idx_micro = list(range(n_micro))
    idx_cov = [n_micro + i for i in range(cov.shape[1])]
    Xall = pd.concat([counts.reset_index(drop=True), cov.reset_index(drop=True)], axis=1)
    Xall.columns = [f"m{i}" for i in range(n_micro)] + list(cov.columns)
    mcols = [f"m{i}" for i in range(n_micro)]

    specs = {
        "仅协变量": ColumnTransformer([("cov", cov_pre, list(cov.columns))]),
        "仅菌群": ColumnTransformer([("mic", micro_pre, mcols)]),
        "菌群+协变量": ColumnTransformer([("mic", micro_pre, mcols),
                                          ("cov", cov_pre, list(cov.columns))]),
    }
    from sklearn.model_selection import cross_val_score
    rows = []
    for name, pre in specs.items():
        pipe = Pipeline([("pre", pre),
                         ("clf", LogisticRegression(max_iter=5000, C=0.5,
                                                    class_weight="balanced"))])
        cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=RNG)
        s = cross_val_score(pipe, Xall, y, cv=cv, scoring="roc_auc", n_jobs=-1)
        rows.append({"feature_set": name, "AUC": s.mean(), "AUC_sd": s.std()})
        print(f"  {name:<14} AUC {s.mean():.3f} ± {s.std():.3f}")
    return pd.DataFrame(rows)


def run_month_stratified(counts, meta, y, prevalence, min_n=40, min_minor=8):
    """在同一采样月份内部建模，排除季节/采样批次混杂。"""
    month = pd.to_numeric(meta["month"], errors="coerce").values
    clf, _ = MODELS["L2-LR"]
    rows = []
    groups = {}
    for m in np.unique(month[~np.isnan(month)]):
        groups[f"month={int(m)}"] = month == m
    # 相邻月份合并，提高分层内样本量
    groups["Jul+Aug"] = np.isin(month, [7, 8])
    groups["Jan+Oct"] = np.isin(month, [1, 10])
    groups["Nov+Dec"] = np.isin(month, [11, 12])

    for name, sel in groups.items():
        n = int(sel.sum())
        if n < min_n:
            continue
        ys = y[sel]
        minor = min(ys.sum(), (1 - ys).sum())
        if minor < min_minor:
            rows.append({"stratum": name, "n": n, "n_pos": int(ys.sum()),
                         "AUC": np.nan, "note": "少数类过少，无法建模"})
            print(f"  {name:<12} n={n:3d} Pos={int(ys.sum()):3d}  -> 少数类过少，跳过")
            continue
        auc = simple_cv_auc(counts.values[sel], ys, clf, prevalence, n_repeats=5)
        rows.append({"stratum": name, "n": n, "n_pos": int(ys.sum()),
                     "AUC": auc, "note": ""})
        print(f"  {name:<12} n={n:3d} Pos={int(ys.sum()):3d}  AUC {auc:.3f}")
    return pd.DataFrame(rows)


def run_confound_check(counts, meta, prevalence):
    """菌群能多大程度预测采样月份/地点？AUC 越高说明混杂越强。"""
    clf, _ = MODELS["L2-LR"]
    month = pd.to_numeric(meta["month"], errors="coerce").values
    rows = []
    ok = ~np.isnan(month)
    if ok.sum() > 40:
        tgt = (month[ok] >= 11).astype(int)
        if 5 < tgt.sum() < ok.sum() - 5:
            auc = simple_cv_auc(counts.values[ok], tgt, clf, prevalence, n_repeats=3)
            rows.append({"target": "采样于11-12月", "AUC": auc})
            print(f"  菌群 -> 采样于11-12月    AUC {auc:.3f}")
    if "Location" in meta.columns:
        loc = meta["Location"].fillna("__na__").values
        top = pd.Series(loc).value_counts().index[0]
        tgt = (loc == top).astype(int)
        if 15 < tgt.sum() < len(tgt) - 15:
            auc = simple_cv_auc(counts.values, tgt, clf, prevalence, n_repeats=3)
            rows.append({"target": f"采样地点={top}", "AUC": auc})
            print(f"  菌群 -> 采样地点(最大类)  AUC {auc:.3f}")
    return pd.DataFrame(rows)


def run_differential_abundance(counts, taxonomy, y, prevalence):
    """CLR + Welch t 检验 + BH-FDR。描述性分析，不参与模型评估。"""
    clr = mb.clr_frame(counts, prevalence)
    a, b = clr.values[y == 1], clr.values[y == 0]
    t, p = stats.ttest_ind(a, b, equal_var=False)
    fdr = stats.false_discovery_control(p, method="bh")
    df = pd.DataFrame({
        "FeatureID": clr.columns, "t": t, "p": p, "FDR": fdr,
        "mean_clr_Pos": a.mean(0), "mean_clr_Neg": b.mean(0),
        "direction": np.where(t > 0, "Pos↑", "Pos↓"),
        "prevalence": (counts[clr.columns].values > 0).mean(0),
    })
    tax = taxonomy.reindex(df.FeatureID)
    for lv in ["Phylum", "Family", "Genus"]:
        if lv in tax.columns:
            df[lv] = tax[lv].values
    df = df.sort_values("p")
    n_sig = int((df.FDR < 0.05).sum())
    print(f"  {len(df)} 个特征中 {n_sig} 个 FDR < 0.05")
    cols = [c for c in ["Genus", "Family", "direction", "t", "FDR", "prevalence"]
            if c in df.columns]
    if n_sig:
        print(df.head(15)[cols].to_string(index=False))
    return df


def run_stability_selection(counts, y, prevalence, n_boot=200, C=0.1, thresh=0.7):
    """bootstrap 重复 L1-LR，统计每个特征被选中的频率。

    C 控制稀疏度，需要调：C 太大时几乎所有特征都被选中，选中频率全是 1.0，
    这样的 panel 没有筛选意义。在本数据上 C=0.1 约保留 18/70 个特征
    （CV-AUC 0.747，相比 C=0.5 的 0.775 只损失约 0.03），是合理的折中。
    换数据集时先跑 --scan-l1C 看非零系数个数再定。
    """
    X = counts.values.astype(float)
    n = len(y)
    counter = {}
    rng = np.random.RandomState(RNG)
    for b in range(n_boot):
        idx = rng.choice(n, size=int(0.8 * n), replace=False)
        if len(np.unique(y[idx])) < 2:
            continue
        pipe = make_micro_pipe(
            LogisticRegression(max_iter=5000, penalty="l1", solver="liblinear",
                               C=C, class_weight="balanced"), prevalence)
        pipe.fit(X[idx], y[idx])
        kept = pipe.named_steps["clr"].get_feature_names_out(counts.columns.to_numpy())
        coef = pipe.named_steps["clf"].coef_.ravel()
        for f in kept[coef != 0]:
            counter[f] = counter.get(f, 0) + 1
        if (b + 1) % 50 == 0:
            print(f"    bootstrap {b+1}/{n_boot} ...")
    df = pd.DataFrame({"FeatureID": list(counter), "selection_freq": list(counter.values())})
    df["selection_freq"] = df["selection_freq"] / n_boot
    df = df.sort_values("selection_freq", ascending=False)
    n_sel = int((df.selection_freq >= thresh).sum())
    print(f"  C={C} | 选中频率 >= {thresh} 的特征: {n_sel}")
    n_kept = int((counts.values > 0).mean(0).__ge__(prevalence).sum())
    if n_sel > 0.5 * n_kept:
        print(f"  [warn] 选中 {n_sel}/{n_kept} 个，L1 惩罚过弱，panel 不稀疏；"
              f"建议调小 --l1-C 后重跑")
    return df


def scan_l1C(X, y, prevalence, Cs=(0.005, 0.01, 0.02, 0.05, 0.1, 0.3, 0.5, 1.0)):
    """扫描 L1 惩罚强度：报告非零系数个数与 CV-AUC，用于挑选 --l1-C。"""
    from sklearn.model_selection import cross_val_score
    n_kept = int((X > 0).mean(0).__ge__(prevalence).sum())
    for C in Cs:
        pipe = make_micro_pipe(
            LogisticRegression(max_iter=5000, penalty="l1", solver="liblinear",
                               C=C, class_weight="balanced"), prevalence)
        pipe.fit(X, y)
        nz = int((pipe.named_steps["clf"].coef_ != 0).sum())
        auc = cross_val_score(pipe, X, y, scoring="roc_auc", n_jobs=-1,
                              cv=RepeatedStratifiedKFold(n_splits=5, n_repeats=5,
                                                         random_state=RNG)).mean()
        print(f"  C={C:<6} 非零系数 {nz:3d}/{n_kept}   CV-AUC {auc:.3f}")


def make_plots(oof, y, da, stab, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 3, figsize=(16, 4.6))

    ax = axes[0]
    for name, p in oof.items():
        ok = ~np.isnan(p)
        if ok.sum() < 10:
            continue
        fpr, tpr, _ = roc_curve(y[ok], p[ok])
        ax.plot(fpr, tpr, lw=1.8,
                label=f"{name} (AUC={roc_auc_score(y[ok], p[ok]):.3f})")
    ax.plot([0, 1], [0, 1], "k--", lw=0.8)
    ax.set_xlabel("False positive rate"); ax.set_ylabel("True positive rate")
    ax.set_title("ROC (out-of-fold)"); ax.legend(fontsize=8)

    ax = axes[1]
    d = da.copy()
    d["negLog10FDR"] = -np.log10(np.maximum(d.FDR, 1e-12))
    eff = d.mean_clr_Pos - d.mean_clr_Neg
    sig = d.FDR < 0.05
    ax.scatter(eff[~sig], d.negLog10FDR[~sig], s=16, c="lightgray")
    ax.scatter(eff[sig], d.negLog10FDR[sig], s=22, c="crimson")
    ax.axhline(-np.log10(0.05), ls="--", c="k", lw=0.8)
    for _, r in d[sig].head(8).iterrows():
        lab = r.get("Genus")
        if isinstance(lab, str):
            ax.annotate(lab, (r.mean_clr_Pos - r.mean_clr_Neg, r.negLog10FDR),
                        fontsize=7)
    ax.set_xlabel("CLR difference (Pos - Neg)"); ax.set_ylabel("-log10(FDR)")
    ax.set_title("Differential abundance")

    ax = axes[2]
    if stab is not None and len(stab):
        top = stab.head(20).iloc[::-1]
        ax.barh(range(len(top)), top.selection_freq, color="steelblue")
        ax.set_yticks(range(len(top)))
        ax.set_yticklabels(top.get("Genus", top.FeatureID).astype(str), fontsize=7)
        ax.axvline(0.7, ls="--", c="k", lw=0.8)
        ax.set_xlabel("Selection frequency (bootstrap L1)")
        ax.set_title("Stability selection")
    else:
        ax.axis("off")

    fig.tight_layout()
    path = os.path.join(outdir, "summary_plots.png")
    fig.savefig(path, dpi=150)
    print(f"  图已保存: {path}")


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--study", default=mb.PRIMARY_STUDY,
                    help=f"BioProject，或 'all' 用全部样本（默认 {mb.PRIMARY_STUDY}）")
    ap.add_argument("--level", default="featureID", choices=["featureID", "genus"])
    ap.add_argument("--prevalence", type=float, default=mb.PREVALENCE)
    ap.add_argument("--n-perm", type=int, default=100)
    ap.add_argument("--n-boot", type=int, default=200)
    ap.add_argument("--l1-C", type=float, default=0.1,
                    help="稳定性选择用的 L1 惩罚强度，越小越稀疏（默认 0.1）")
    ap.add_argument("--scan-l1C", action="store_true",
                    help="只扫描不同 C 下的非零系数个数与 CV-AUC，然后退出")
    ap.add_argument("--n-repeats", type=int, default=5, help="外层重复 CV 次数")
    ap.add_argument("--quick", action="store_true", help="跳过置换检验和稳定性选择")
    ap.add_argument("--outdir", default=OUTDIR)
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    counts, taxonomy, meta = mb.load_all(args.root)
    y_all = mb.get_label(meta).values

    if args.study != "all":
        sel = (meta[mb.BATCH_COL] == args.study).values
        counts, meta, y = counts[sel], meta[sel], y_all[sel]
        cohort = args.study
    else:
        y = y_all
        cohort = "all-studies"

    if args.level == "genus":
        counts = mb.collapse_to_genus(counts, taxonomy, "Genus")
        taxonomy = None

    X = counts.values.astype(float)
    print("=" * 72)
    print(f"队列: {cohort} | 特征层级: {args.level} | "
          f"{X.shape[0]} 样本 x {X.shape[1]} 特征 | "
          f"Pos={int(y.sum())} Neg={int((1-y).sum())}")
    kept = ((X > 0).mean(0) >= args.prevalence).sum()
    print(f"流行度 >= {args.prevalence} 时约保留 {kept} 个特征 "
          f"(p/n ≈ {kept/len(y):.2f})")
    print("=" * 72)

    if args.scan_l1C:
        print("\n[scan] L1 惩罚强度扫描")
        scan_l1C(X, y, args.prevalence)
        return

    summary = {"cohort": cohort, "level": args.level, "n": int(X.shape[0]),
               "n_features_raw": int(X.shape[1]), "n_pos": int(y.sum()),
               "prevalence": args.prevalence}

    print("\n[1] 模型比较（嵌套 CV，超参在内层选）")
    cmp_df, oofs = run_model_comparison(X, y, args.prevalence,
                                        n_repeats=args.n_repeats)
    cmp_df.to_csv(os.path.join(args.outdir, "model_comparison.csv"), index=False)

    if args.study == "all":
        print("\n[1b] 跨研究泛化（GroupKFold by BioProject）")
        g = meta[mb.BATCH_COL].values
        cg, _ = run_model_comparison(X, y, args.prevalence, groups=g)
        cg.to_csv(os.path.join(args.outdir, "cross_study_comparison.csv"), index=False)

    perm = None
    if not args.quick:
        print(f"\n[2] 置换检验（{args.n_perm} 次）")
        perm, null = run_permutation_test(X, y, args.prevalence, args.n_perm)
        summary["permutation"] = perm
        np.savetxt(os.path.join(args.outdir, "permutation_null.txt"), null)

    print("\n[3] 特征集消融")
    abl = run_feature_set_ablation(counts, meta, y, args.prevalence)
    abl.to_csv(os.path.join(args.outdir, "feature_set_ablation.csv"), index=False)

    print("\n[4] 混杂强度检查（菌群能否预测采样时间/地点）")
    cf = run_confound_check(counts, meta, args.prevalence)
    if len(cf):
        cf.to_csv(os.path.join(args.outdir, "confound_check.csv"), index=False)

    print("\n[5] 月份分层分析（在同一采样月份内部重跑）")
    strat = run_month_stratified(counts, meta, y, args.prevalence)
    if len(strat):
        strat.to_csv(os.path.join(args.outdir, "month_stratified.csv"), index=False)

    print("\n[6] 差异丰度（CLR + Welch t + BH-FDR）")
    tax_for_da = taxonomy if taxonomy is not None else pd.DataFrame(index=counts.columns)
    da = run_differential_abundance(counts, tax_for_da, y, args.prevalence)
    da.to_csv(os.path.join(args.outdir, "differential_abundance.csv"), index=False)

    stab = None
    if not args.quick:
        print(f"\n[7] 稳定性选择（{args.n_boot} 次 bootstrap L1）")
        stab = run_stability_selection(counts, y, args.prevalence, args.n_boot,
                                       C=args.l1_C)
        if taxonomy is not None:
            t = taxonomy.reindex(stab.FeatureID)
            for lv in ["Family", "Genus"]:
                if lv in t.columns:
                    stab[lv] = t[lv].values
        stab.to_csv(os.path.join(args.outdir, "stability_selection.csv"), index=False)

    print("\n[8] 出图")
    make_plots(oofs, y, da, stab, args.outdir)

    with open(os.path.join(args.outdir, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 72)
    print(f"全部结果已写入 {args.outdir}/")
    print("=" * 72)


if __name__ == "__main__":
    main()
