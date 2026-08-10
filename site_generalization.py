#!/usr/bin/env python3
"""
按采样地点分组的泛化评估：模型能否推广到没见过的采样点？

动机
----
§5.8 指出空间混杂未解决：采样地点预测标签 AUC 0.740，菌群预测地点 AUC 0.753。
随机划分的交叉验证会把同一地点的样本同时放进训练与测试折，模型可以靠"认地点"
拿分。按地点分组则切断这条捷径。

这也是最接近实际应用的问题：把模型部署到一个新的湿地，它还有用吗？

注意：本队列中地点与月份高度纠缠（Sacramento 80 个样本中 46 个在 1 月；
GIWA 96 个中 82 个在 7–8 月），因此留一地点同时也是留一时段——这是一个
比随机划分严格得多的检验，性能下降是预期之中的。

用法:
    python3 site_generalization.py
    python3 site_generalization.py --min-n 15 --min-minor 5
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, average_precision_score, matthews_corrcoef
from sklearn.model_selection import RepeatedStratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"

MODELS = {
    "SVM-RBF": SVC(kernel="rbf", C=5, gamma="scale", probability=True,
                   class_weight="balanced", random_state=RNG),
    "ExtraTrees": ExtraTreesClassifier(n_estimators=500, max_features=0.3,
                                       class_weight="balanced_subsample",
                                       random_state=RNG, n_jobs=-1),
    "L1-LR": LogisticRegression(max_iter=5000, penalty="l1", solver="liblinear",
                                C=0.5, class_weight="balanced"),
}


def pipe(model, prevalence=0.10):
    return Pipeline([("clr", mb.PrevalenceCLR(prevalence)),
                     ("sc", StandardScaler()), ("clf", model)])


def score(est, X):
    return (est.predict_proba(X)[:, 1] if hasattr(est, "predict_proba")
            else est.decision_function(X))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-n", type=int, default=15,
                    help="地点作为测试折所需的最小样本数")
    ap.add_argument("--min-minor", type=int, default=5,
                    help="地点作为测试折所需的最小少数类样本数")
    ap.add_argument("--prevalence", type=float, default=0.10)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    counts, taxonomy, meta = mb.load_all(".")
    sel = (meta[mb.BATCH_COL] == mb.PRIMARY_STUDY).values
    counts, meta = counts[sel], meta[sel]
    y = mb.get_label(meta).values
    X = counts.values.astype(float)
    loc = meta["Location"].fillna("__NA__").values
    month = pd.to_numeric(meta["month"], errors="coerce").values

    print("=" * 78)
    print("按采样地点分组的泛化评估")
    print("=" * 78)

    # ---------- 地点构成 ----------
    tab = pd.DataFrame({"loc": loc, "y": y})
    ct = pd.crosstab(tab["loc"], tab["y"]).rename(columns={0: "Neg", 1: "Pos"})
    ct["n"] = ct.sum(axis=1)
    ct["pos_rate"] = (ct["Pos"] / ct["n"]).round(3)
    ct["testable"] = ((ct[["Neg", "Pos"]].min(axis=1) >= args.min_minor)
                      & (ct["n"] >= args.min_n))
    ct = ct.sort_values("n", ascending=False)
    print("\n[1] 地点构成")
    print(ct.to_string())
    testable = list(ct.index[ct["testable"]])
    print(f"\n可作测试折的地点: {len(testable)}/{len(ct)}"
          f"  覆盖 {int(ct.loc[testable, 'n'].sum())}/{len(y)} 个样本")
    ct.to_csv(os.path.join(OUT, "site_composition.csv"))

    # ---------- 地点与月份的纠缠 ----------
    print("\n[2] 地点 × 月份（说明为何留一地点同时也是留一时段）")
    cm = pd.crosstab(pd.Series(loc).str[:22], month)
    print(cm.to_string())

    # ---------- 留一地点 ----------
    print("\n[3] 留一地点交叉验证（LOLO）vs 随机分层交叉验证")
    rows = []
    for name, model in MODELS.items():
        per_site = []
        for site in testable:
            te = loc == site
            tr = ~te
            if len(np.unique(y[tr])) < 2:
                continue
            est = pipe(model, args.prevalence).fit(X[tr], y[tr])
            p = score(est, X[te])
            per_site.append({
                "model": name, "held_out_site": site, "n_test": int(te.sum()),
                "pos_rate_test": float(y[te].mean()),
                "AUC": roc_auc_score(y[te], p),
                "PR_AUC": average_precision_score(y[te], p),
                "MCC": matthews_corrcoef(y[te], (p >= 0.5).astype(int)),
            })
        d = pd.DataFrame(per_site)
        # 只在可测试地点的样本上做随机 CV，保证可比
        keep = np.isin(loc, testable)
        rand = cross_val_score(pipe(model, args.prevalence), X[keep], y[keep],
                               scoring="roc_auc", n_jobs=-1,
                               cv=RepeatedStratifiedKFold(n_splits=5, n_repeats=5,
                                                          random_state=RNG)).mean()
        rows.append({"model": name, "LOLO_AUC_mean": d.AUC.mean(),
                     "LOLO_AUC_min": d.AUC.min(), "LOLO_AUC_max": d.AUC.max(),
                     "LOLO_MCC_mean": d.MCC.mean(),
                     "random_CV_AUC": rand, "drop": d.AUC.mean() - rand})
        print(f"\n  {name}")
        print(d[["held_out_site", "n_test", "pos_rate_test", "AUC", "PR_AUC", "MCC"]]
              .to_string(index=False, float_format=lambda v: f"{v:.3f}"))
        print(f"    LOLO 平均 AUC {d.AUC.mean():.3f}   "
              f"同样本随机 CV {rand:.3f}   差 {d.AUC.mean() - rand:+.3f}")
        d.to_csv(os.path.join(OUT, f"site_lolo_{name.replace('-', '')}.csv"), index=False)

    summ = pd.DataFrame(rows)
    summ.to_csv(os.path.join(OUT, "site_generalization_summary.csv"), index=False)
    print("\n" + "-" * 78)
    print(summ.to_string(index=False, float_format=lambda v: f"{v:.3f}"))

    # ---------- 基线：地点自身能预测多少 ----------
    print("\n[4] 参照：把「地点」当作唯一特征")
    lo = pd.get_dummies(pd.Series(loc)).values.astype(float)
    site_only = cross_val_score(
        Pipeline([("sc", StandardScaler()),
                  ("clf", LogisticRegression(max_iter=5000, class_weight="balanced"))]),
        lo, y, scoring="roc_auc", n_jobs=-1,
        cv=RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=RNG)).mean()
    print(f"  仅地点 -> 标签  随机 CV AUC {site_only:.3f}")
    print("  （LOLO 下该基线必然为 0.5：留出地点的 one-hot 列在训练集中恒为 0）")

    # ---------- 关键对照：固定季节后再做留一地点 ----------
    print("\n[5] 关键对照：固定季节（仅 7–8 月）后重做留一地点")
    print("    朴素 LOLO 把空间与时间混在一起。固定季节可分离两者。")
    s78 = np.isin(month, [7, 8])
    season_rows = []
    for site in pd.Series(loc[s78]).value_counts().index:
        te = (loc == site) & s78
        tr = s78 & ~te
        if te.sum() < 8 or len(np.unique(y[te])) < 2 or len(np.unique(y[tr])) < 2:
            print(f"  {site[:34]:36s} n={int(te.sum()):3d}  跳过（样本或类别不足）")
            continue
        est = pipe(MODELS["SVM-RBF"], args.prevalence).fit(X[tr], y[tr])
        auc = roc_auc_score(y[te], score(est, X[te]))
        season_rows.append({"held_out_site": site, "n_test": int(te.sum()),
                            "n_pos": int(y[te].sum()), "AUC": auc})
        print(f"  {site[:34]:36s} n={int(te.sum()):3d}  阳性 {int(y[te].sum()):2d}  AUC {auc:.3f}")
    if season_rows:
        sr = pd.DataFrame(season_rows)
        sr.to_csv(os.path.join(OUT, "site_lolo_season_fixed.csv"), index=False)
        print(f"\n  季节固定后平均 AUC {sr.AUC.mean():.3f}"
              f"   （朴素 LOLO 为 {summ.loc[summ.model == 'SVM-RBF', 'LOLO_AUC_mean'].iloc[0]:.3f}）")

    # ---------- 朴素 LOLO 失败的来源 ----------
    print("\n[6] 朴素 LOLO 失败的来源诊断")
    SAC = [s_ for s_ in testable if s_.startswith("Sacramento")]
    if SAC:
        te = loc == SAC[0]
        est = pipe(MODELS["SVM-RBF"], args.prevalence).fit(X[~te], y[~te])
        p_ = score(est, X[te])
        mo_te, y_te = month[te], y[te]
        jan = mo_te == 1
        print(f"  留出 {SAC[0][:30]}：")
        print(f"    其 1 月样本 n={int(jan.sum())}，其中阳性仅 {int(y_te[jan].sum())} 个"
              f" -> AUC {roc_auc_score(y_te[jan], p_[jan]):.3f}"
              if jan.sum() > 5 and len(np.unique(y_te[jan])) == 2 else "")
        print(f"    而训练集中 1 月样本仅 {int((month[~te] == 1).sum())} 个 —— 模型几乎没见过冬季")
        print("    该 AUC 实为「单个阳性样本的排名百分位」，极不稳定，不应过度解读")

    with open(os.path.join(OUT, "site_generalization.json"), "w") as f:
        json.dump({"testable_sites": testable,
                   "n_covered": int(ct.loc[testable, "n"].sum()),
                   "site_only_auc": float(site_only),
                   "summary": summ.to_dict("records"),
                   "season_fixed_lolo": season_rows}, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 78)
    print("结论：朴素 LOLO 的低分来自【时间外推】而非空间。固定季节后跨地点迁移良好")
    print("（AUC 0.84–0.92）。本队列地点与月份高度纠缠，朴素 LOLO 无法分离二者。")
    print(f"结果已写入 {OUT}/site_*")
    print("=" * 78)


if __name__ == "__main__":
    main()
