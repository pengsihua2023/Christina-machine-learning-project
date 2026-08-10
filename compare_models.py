#!/usr/bin/env python3
"""
四种模型的性能横向比较（嵌套 CV，全指标）。

外层 RepeatedStratifiedKFold(5折 x N次) 评估，内层 4 折调超参，
所有模型共用同一套折划分，保证可比。

用法:
    python3 compare_models.py                 # 默认 5x5
    python3 compare_models.py --n-repeats 10
    python3 compare_models.py --level count   # 用原始计数列
"""
import argparse
import warnings

import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score,
                             balanced_accuracy_score, confusion_matrix, f1_score,
                             matthews_corrcoef, roc_auc_score)
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")
RNG = 0
DATA = "ml_dataset/primary_merged.csv"

MODELS = {
    "L2-LR": (LogisticRegression(max_iter=5000, class_weight="balanced"),
              {"clf__C": [0.01, 0.05, 0.1, 0.5, 1.0, 5.0]}),
    "L1-LR": (LogisticRegression(max_iter=5000, penalty="l1", solver="liblinear",
                                 class_weight="balanced"),
              {"clf__C": [0.05, 0.1, 0.5, 1.0, 5.0]}),
    "RandomForest": (RandomForestClassifier(n_estimators=500, random_state=RNG,
                                            class_weight="balanced_subsample", n_jobs=-1),
                     {"clf__max_features": ["sqrt", 0.3],
                      "clf__min_samples_leaf": [1, 3, 5]}),
    "SVM-linear": (SVC(kernel="linear", probability=True, class_weight="balanced",
                       random_state=RNG),
                   {"clf__C": [0.01, 0.05, 0.1, 0.5, 1.0]}),
    "SVM-RBF": (SVC(kernel="rbf", probability=True, class_weight="balanced",
                    random_state=RNG),
                {"clf__C": [0.1, 0.5, 1.0, 5.0, 10.0],
                 "clf__gamma": ["scale", 0.001, 0.01]}),
    "HistGB": (HistGradientBoostingClassifier(random_state=RNG),
               {"clf__learning_rate": [0.05, 0.1], "clf__max_leaf_nodes": [7, 15],
                "clf__min_samples_leaf": [5, 10]}),
}

# XGBoost 没有 class_weight 参数，用 scale_pos_weight = n_neg/n_pos 等价实现类别加权
if HAS_XGB:
    MODELS["XGBoost"] = (
        XGBClassifier(random_state=RNG, n_jobs=-1, eval_metric="logloss",
                      subsample=0.8, colsample_bytree=0.8, tree_method="hist"),
        {"clf__max_depth": [2, 3, 4], "clf__learning_rate": [0.05, 0.1],
         "clf__n_estimators": [200, 400]})


def metrics(y, p, thr=0.5):
    yh = (p >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, yh, labels=[0, 1]).ravel()
    return dict(
        Accuracy=accuracy_score(y, yh),
        BalancedAcc=balanced_accuracy_score(y, yh),
        ROC_AUC=roc_auc_score(y, p),
        PR_AUC=average_precision_score(y, p),
        Sensitivity=tp / max(tp + fn, 1),
        Specificity=tn / max(tn + fp, 1),
        Precision=tp / max(tp + fp, 1),
        F1=f1_score(y, yh, zero_division=0),
        MCC=matthews_corrcoef(y, yh),
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=DATA)
    ap.add_argument("--level", default="clr", choices=["clr", "count"])
    ap.add_argument("--n-repeats", type=int, default=5)
    ap.add_argument("--out", default="results/model_comparison_full.csv")
    args = ap.parse_args()

    d = pd.read_csv(args.data, index_col=0)
    feat = [c for c in d.columns if c.endswith(f"__{args.level}")]
    X, y = d[feat].values, d["label"].values
    print(f"数据: {X.shape[0]} 样本 x {len(feat)} 特征 ({args.level}) | "
          f"Pos={int(y.sum())} Neg={int((1-y).sum())} | "
          f"多数类基线 acc={max(y.mean(), 1-y.mean()):.3f}")

    outer = RepeatedStratifiedKFold(n_splits=5, n_repeats=args.n_repeats,
                                    random_state=RNG)
    splits = list(outer.split(X, y))
    print(f"外层 5折 x {args.n_repeats}次 = {len(splits)} 折，内层 4 折调参\n")

    if HAS_XGB:
        spw = float((y == 0).sum() / (y == 1).sum())
        MODELS["XGBoost"][0].set_params(scale_pos_weight=spw)
        print(f"XGBoost 已启用，scale_pos_weight = {spw:.3f}\n")
    else:
        print("XGBoost 未安装，跳过\n")

    rows, best = [], {}
    for name, (clf, grid) in MODELS.items():
        per_fold = []
        chosen = []
        for tr, te in splits:
            gs = GridSearchCV(Pipeline([("sc", StandardScaler()), ("clf", clf)]),
                              grid, scoring="roc_auc", n_jobs=-1,
                              cv=StratifiedKFold(4, shuffle=True, random_state=RNG))
            gs.fit(X[tr], y[tr])
            per_fold.append(metrics(y[te], gs.predict_proba(X[te])[:, 1]))
            chosen.append(str(gs.best_params_))
        m = pd.DataFrame(per_fold)
        rows.append({"Model": name, **{k: m[k].mean() for k in m.columns},
                     **{k + "_sd": m[k].std() for k in m.columns}})
        best[name] = pd.Series(chosen).value_counts().index[0]
        print(f"  {name} 完成，最常选中的超参: {best[name]}")

    # 基线
    per_fold = []
    for tr, te in splits:
        dm = DummyClassifier(strategy="most_frequent").fit(X[tr], y[tr])
        per_fold.append(metrics(y[te], dm.predict_proba(X[te])[:, 1]))
    m = pd.DataFrame(per_fold)
    rows.append({"Model": "Baseline(全猜Pos)", **{k: m[k].mean() for k in m.columns},
                 **{k + "_sd": m[k].std() for k in m.columns}})

    res = pd.DataFrame(rows)
    res.to_csv(args.out, index=False)

    cols = ["Accuracy", "BalancedAcc", "ROC_AUC", "PR_AUC", "Sensitivity",
            "Specificity", "Precision", "F1", "MCC"]
    print("\n" + "=" * 100)
    disp = res[["Model"] + cols].copy()
    for c in cols:
        disp[c] = res.apply(lambda r: f"{r[c]:.3f}±{r[c+'_sd']:.3f}", axis=1)
    print(disp.to_string(index=False))
    print("=" * 100)
    print(f"\n完整结果(含标准差列): {args.out}")


if __name__ == "__main__":
    main()
