#!/usr/bin/env python3
"""
家禽合并队列（PRJNA644054 火鸡 45 + PRJNA379944 鸡 6 = 51）的 SVM-RBF 建模。

与主队列（PRJNA464410，n=260）的三点关键差异，决定了结果怎么读
-------------------------------------------------------------------
1. **p/n 翻转**：流行度 ≥10% 时保留 68 个特征，p/n = 1.33（主队列为 0.27）。
   这已是 p > n 的高维问题，需要更强的正则化或更高的过滤阈值。
2. **两个 project 在技术上完全不同**：宿主（火鸡/鸡）、中心（Ohio State /
   华南农大）、Assay.Type、LibrarySource 四者与 BioProject 完全共线。
   合并等于把两批不可比的数据放在一起。
3. **少数类只有 16 个**：5 折 CV 下每折测试集约 3 个阴性，估计极不稳定。

因此本脚本除了给出 AUC，还必做三件事：
  * 置换检验（n=51 时尤其必要）
  * 检验模型是不是在学「火鸡还是鸡」而非感染状态
  * 与「仅 PRJNA644054（n=45）」对照，看加入 6 个鸡样本是帮忙还是添乱

用法:
    python3 poultry_cohort.py
    python3 poultry_cohort.py --prevalence 0.20 --n-perm 200
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, average_precision_score,
                             balanced_accuracy_score, confusion_matrix,
                             matthews_corrcoef, recall_score, roc_auc_score)
from sklearn.model_selection import (GridSearchCV, LeaveOneOut,
                                     RepeatedStratifiedKFold, StratifiedKFold,
                                     cross_val_score)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"
PROJECTS = ["PRJNA644054", "PRJNA379944"]
GRID = {"clf__C": [0.1, 0.5, 1.0, 5.0, 10.0],
        "clf__gamma": ["scale", 1e-3, 1e-2]}


def pipe(prevalence, C=None, gamma=None):
    svc = SVC(kernel="rbf", probability=True, class_weight="balanced",
              random_state=RNG, **({"C": C, "gamma": gamma} if C else {}))
    return Pipeline([("clr", mb.PrevalenceCLR(prevalence)),
                     ("sc", StandardScaler()), ("clf", svc)])


def nested_cv(X, y, prevalence, n_splits=5, n_repeats=10):
    """外层评估、内层调参；n=51 故用 5×10 重复以压低划分方差。"""
    cv = RepeatedStratifiedKFold(n_splits=n_splits, n_repeats=n_repeats,
                                 random_state=RNG)
    ps, ys, chosen = [], [], []
    for tr, te in cv.split(X, y):
        gs = GridSearchCV(pipe(prevalence), GRID, scoring="roc_auc", n_jobs=-1,
                          cv=StratifiedKFold(4, shuffle=True, random_state=RNG))
        gs.fit(X[tr], y[tr])
        ps.append(gs.predict_proba(X[te])[:, 1])
        ys.append(y[te])
        chosen.append(str(gs.best_params_))
    p, yv = np.concatenate(ps), np.concatenate(ys)
    yh = (p >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(yv, yh, labels=[0, 1]).ravel()
    return {
        "n": int(len(y)), "n_pos": int(y.sum()), "pos_rate": float(y.mean()),
        "AUC": roc_auc_score(yv, p), "PR_AUC": average_precision_score(yv, p),
        "accuracy": accuracy_score(yv, yh),
        "baseline_acc": float(max(y.mean(), 1 - y.mean())),
        "balanced_acc": balanced_accuracy_score(yv, yh),
        "sensitivity": recall_score(yv, yh),
        "specificity": recall_score(yv, yh, pos_label=0),
        "MCC": matthews_corrcoef(yv, yh),
        "confusion": {"TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)},
        "best_params": pd.Series(chosen).value_counts().index[0],
    }


def simple_auc(X, y, prevalence, seed=RNG, n_repeats=3):
    return cross_val_score(pipe(prevalence, C=5, gamma="scale"), X, y,
                           scoring="roc_auc", n_jobs=-1,
                           cv=RepeatedStratifiedKFold(n_splits=5, n_repeats=n_repeats,
                                                      random_state=seed)).mean()


def loo_auc(X, y, prevalence):
    """留一法：n=51 时每折只测 1 个样本，折外预测合并后算一次 AUC。"""
    p = np.empty(len(y))
    for tr, te in LeaveOneOut().split(X):
        est = pipe(prevalence, C=5, gamma="scale").fit(X[tr], y[tr])
        p[te] = est.predict_proba(X[te])[:, 1]
    return roc_auc_score(y, p), p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prevalence", type=float, default=0.10)
    ap.add_argument("--n-perm", type=int, default=200)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    counts, taxonomy, meta = mb.load_all(".")
    sel = meta[mb.BATCH_COL].isin(PROJECTS).values
    counts, meta = counts[sel], meta[sel]
    y = mb.get_label(meta).values
    X = counts.values.astype(float)
    proj = meta[mb.BATCH_COL].values

    print("=" * 84)
    print(f"家禽合并队列 SVM-RBF 建模 —— {' + '.join(PROJECTS)}")
    print("=" * 84)
    print(pd.crosstab(meta[mb.BATCH_COL], meta["Influenza"], margins=True).to_string())
    prev = (X > 0).mean(0)
    print(f"\n流行度 >= {args.prevalence} 保留 {int((prev >= args.prevalence).sum())} 个特征，"
          f"p/n = {(prev >= args.prevalence).sum() / len(y):.2f}"
          f"   {'← p > n，高维' if (prev >= args.prevalence).sum() > len(y) else ''}")

    # ---------- 1. 流行度阈值扫描（n=51 下 p/n 是首要问题）----------
    print("\n[1] 流行度阈值扫描（控制 p/n）")
    scan = []
    for th in [0.05, 0.10, 0.15, 0.20, 0.30, 0.40]:
        k = int((prev >= th).sum())
        a = simple_auc(X, y, th)
        scan.append({"prevalence": th, "n_features": k, "p_over_n": k / len(y), "AUC": a})
        print(f"  >= {th:.2f}   {k:3d} 个特征   p/n={k/len(y):.2f}   AUC {a:.3f}")
    pd.DataFrame(scan).to_csv(os.path.join(OUT, "poultry_prevalence_scan.csv"), index=False)

    # ---------- 2. 主结果：嵌套 CV ----------
    print(f"\n[2] 嵌套 CV（外层 5 折 × 10 次 = 50 折，内层 4 折；流行度 {args.prevalence}）")
    res = nested_cv(X, y, args.prevalence)
    for k, lbl in [("AUC", "ROC-AUC"), ("PR_AUC", "PR-AUC"), ("accuracy", "Accuracy"),
                   ("baseline_acc", "基线 accuracy"), ("balanced_acc", "平衡准确率"),
                   ("sensitivity", "灵敏度"), ("specificity", "特异度"), ("MCC", "MCC")]:
        print(f"  {lbl:<16} {res[k]:.3f}")
    c = res["confusion"]
    print(f"  混淆矩阵（折外合并，已除以重复次数 10）: "
          f"TN {c['TN']/10:.1f}  FP {c['FP']/10:.1f}  FN {c['FN']/10:.1f}  TP {c['TP']/10:.1f}")
    print(f"  最常选中的超参: {res['best_params']}")

    # ---------- 3. 留一法（小样本的另一种视角）----------
    print("\n[3] 留一法交叉验证（LOO）")
    loo, p_loo = loo_auc(X, y, args.prevalence)
    print(f"  LOO AUC {loo:.3f}   （与 5 折的 {res['AUC']:.3f} 对照，差异反映划分方差）")

    # ---------- 4. 置换检验 ----------
    print(f"\n[4] 置换检验（{args.n_perm} 次）")
    obs = simple_auc(X, y, args.prevalence, n_repeats=5)
    null = np.empty(args.n_perm)
    for i in range(args.n_perm):
        null[i] = simple_auc(X, np.random.RandomState(3000 + i).permutation(y),
                             args.prevalence, seed=i, n_repeats=1)
        if (i + 1) % 50 == 0:
            print(f"    {i+1}/{args.n_perm} ...")
    pval = (np.sum(null >= obs) + 1) / (args.n_perm + 1)
    print(f"  实测 {obs:.3f} | 零分布 {null.mean():.3f} ± {null.std():.3f} "
          f"(max {null.max():.3f}) | p = {pval:.4f}")
    np.savetxt(os.path.join(OUT, "poultry_permutation_null.txt"), null)

    # ---------- 5. 模型是不是在学「哪个 project」----------
    print("\n[5] 批次检查：模型是否在学「火鸡还是鸡」而非感染状态")
    is_chicken = (proj == "PRJNA379944").astype(int)
    a_batch = simple_auc(X, is_chicken, args.prevalence)
    print(f"  菌群 -> 预测 project（鸡 vs 火鸡）  AUC {a_batch:.3f}"
          f"   {'← 批次信号极强' if a_batch > 0.85 else ''}")
    # project 本身能预测标签吗
    from sklearn.linear_model import LogisticRegression
    a_proj2y = cross_val_score(
        Pipeline([("sc", StandardScaler()),
                  ("clf", LogisticRegression(max_iter=2000, class_weight="balanced"))]),
        is_chicken.reshape(-1, 1), y, scoring="roc_auc", n_jobs=-1,
        cv=RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=RNG)).mean()
    print(f"  project -> 预测标签                AUC {a_proj2y:.3f}")

    # ---------- 6. 加入 6 个鸡样本是帮忙还是添乱 ----------
    print("\n[6] 对照：仅 PRJNA644054（火鸡 n=45）")
    only = proj == "PRJNA644054"
    res45 = nested_cv(X[only], y[only], args.prevalence)
    print(f"  n=45  阳性 {res45['n_pos']}  基线 acc {res45['baseline_acc']:.3f}")
    print(f"  AUC {res45['AUC']:.3f}   accuracy {res45['accuracy']:.3f}   "
          f"特异度 {res45['specificity']:.3f}   MCC {res45['MCC']:.3f}")
    print(f"  合并后 (n=51) AUC {res['AUC']:.3f}   "
          f"Δ = {res['AUC'] - res45['AUC']:+.3f}")

    summary = {"projects": PROJECTS, "prevalence": args.prevalence,
               "combined_n51": res, "turkey_only_n45": res45,
               "loo_auc": float(loo),
               "permutation": {"observed": float(obs), "null_mean": float(null.mean()),
                               "null_sd": float(null.std()), "null_max": float(null.max()),
                               "p_value": float(pval), "n_perm": args.n_perm},
               "batch_checks": {"microbiome_predicts_project": float(a_batch),
                                "project_predicts_label": float(a_proj2y)},
               "prevalence_scan": scan}
    with open(os.path.join(OUT, "poultry_cohort.json"), "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 84)
    print("解读提醒：n=51、少数类 16、p/n>1，且两个 project 在宿主/中心/建库上完全共线。")
    print("任何单一数字都不应脱离置换检验与批次检查单独引用。")
    print(f"结果已写入 {OUT}/poultry_cohort.json 与 poultry_*.csv")
    print("=" * 84)


if __name__ == "__main__":
    main()
