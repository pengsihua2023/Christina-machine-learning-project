#!/usr/bin/env python3
"""
第二轮模型探索：在 SVM-RBF 胜出这一线索的基础上，补充几类此前未覆盖的模型。

挑选依据（不是穷举）:
  * RBF 核显著优于线性核 -> 距离/核结构有效 -> 补齐核方法与近邻方法
  * 树模型三个实现一致偏弱 -> 只补一个更随机化的变体做确认
  * p/n≈0.27 的小样本 -> 收缩型判别分析在这个区间常被低估
  * PLS-DA 是组学领域的事实标准，审稿人会问为什么没做

用法:
    python3 explore_models.py                # 嵌套 CV，5x5
    python3 explore_models.py --n-repeats 3  # 快速版
"""
import argparse
import warnings

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.cross_decomposition import PLSRegression
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.ensemble import ExtraTreesClassifier, StackingClassifier, VotingClassifier
from sklearn.gaussian_process import GaussianProcessClassifier
from sklearn.gaussian_process.kernels import RBF, ConstantKernel, Matern
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score,
                             balanced_accuracy_score, confusion_matrix, f1_score,
                             matthews_corrcoef, roc_auc_score)
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
DATA = "ml_dataset/primary_merged.csv"


class PLSDA(BaseEstimator, ClassifierMixin):
    """PLS-DA：对 0/1 标签做 PLS 回归，连续输出即判别分数。

    组学领域的标准方法。sklearn 没有现成实现，这里包一层以便进 GridSearchCV。
    """

    def __init__(self, n_components=2):
        self.n_components = n_components

    def fit(self, X, y):
        self.classes_ = np.unique(y)
        self.pls_ = PLSRegression(n_components=self.n_components).fit(X, y.astype(float))
        return self

    def decision_function(self, X):
        return self.pls_.predict(X).ravel()

    def predict(self, X):
        return (self.decision_function(X) >= 0.5).astype(int)

    def predict_proba(self, X):
        s = self.decision_function(X)
        p = np.clip(s, 0, 1)
        return np.column_stack([1 - p, p])


def build_models():
    """(名称, 分类器, 网格, 理由)"""
    M = {}
    # --- 核方法家族：沿着 RBF 胜出这条线索往下挖 ---
    M["GP-RBF"] = (
        GaussianProcessClassifier(random_state=RNG, max_iter_predict=200),
        {"clf__kernel": [ConstantKernel() * RBF(l) for l in [1.0, 5.0, 10.0, 20.0]]},
        "高斯过程：RBF 核的贝叶斯版本，小样本上通常比 SVM 更稳",
    )
    M["GP-Matern"] = (
        GaussianProcessClassifier(random_state=RNG, max_iter_predict=200),
        {"clf__kernel": [ConstantKernel() * Matern(l, nu=nu)
                         for l in [5.0, 10.0] for nu in [1.5, 2.5]]},
        "Matérn 核：比 RBF 更粗糙，对非光滑决策边界更宽容",
    )
    M["SVM-poly"] = (
        SVC(kernel="poly", probability=True, class_weight="balanced", random_state=RNG),
        {"clf__C": [0.1, 1.0, 10.0], "clf__degree": [2, 3],
         "clf__gamma": ["scale", 0.01]},
        "多项式核：显式建模特征间的低阶交互",
    )
    # --- 近邻：CLR 后的欧氏距离 = Aitchison 距离，理论上适配成分数据 ---
    M["kNN-Aitchison"] = (
        KNeighborsClassifier(),
        {"clf__n_neighbors": [5, 9, 15, 25], "clf__weights": ["uniform", "distance"]},
        "kNN：CLR 空间的欧氏距离即 Aitchison 距离",
    )
    # --- 收缩型判别分析：小样本高维区间常被低估 ---
    M["LDA-shrinkage"] = (
        LinearDiscriminantAnalysis(solver="lsqr"),
        {"clf__shrinkage": ["auto", 0.1, 0.3, 0.5, 0.7]},
        "Ledoit-Wolf 收缩 LDA：p/n 中等时协方差估计更稳",
    )
    # --- 组学领域事实标准 ---
    M["PLS-DA"] = (
        PLSDA(),
        {"clf__n_components": [2, 3, 5, 8, 12]},
        "PLS-DA：代谢组/微生物组文献的标准方法，审稿人会问",
    )
    # --- 弹性网：L1/L2 之间 ---
    M["ElasticNet-LR"] = (
        LogisticRegression(penalty="elasticnet", solver="saga", max_iter=8000,
                           class_weight="balanced"),
        {"clf__C": [0.1, 0.5, 1.0], "clf__l1_ratio": [0.15, 0.5, 0.85]},
        "弹性网：兼顾稀疏性与共线特征的分组效应",
    )
    # --- 树模型只补一个更随机化的变体做确认 ---
    M["ExtraTrees"] = (
        ExtraTreesClassifier(n_estimators=500, random_state=RNG, n_jobs=-1,
                             class_weight="balanced_subsample"),
        {"clf__max_features": ["sqrt", 0.3], "clf__min_samples_leaf": [1, 3]},
        "极端随机树：分裂点随机化，小样本上常优于随机森林",
    )
    M["MLP"] = (
        MLPClassifier(random_state=RNG, max_iter=3000, early_stopping=True),
        {"clf__hidden_layer_sizes": [(16,), (32,), (32, 16)],
         "clf__alpha": [0.01, 0.1, 1.0]},
        "浅层神经网络：n=260 下预期不占优，跑一遍以免遗漏",
    )
    return M


def metrics(y, p, thr=0.5):
    yh = (p >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, yh, labels=[0, 1]).ravel()
    return dict(Accuracy=accuracy_score(y, yh),
                BalancedAcc=balanced_accuracy_score(y, yh),
                ROC_AUC=roc_auc_score(y, p),
                PR_AUC=average_precision_score(y, p),
                Sensitivity=tp / max(tp + fn, 1), Specificity=tn / max(tn + fp, 1),
                Precision=tp / max(tp + fp, 1), F1=f1_score(y, yh, zero_division=0),
                MCC=matthews_corrcoef(y, yh))


def score_of(est, X):
    if hasattr(est, "predict_proba"):
        return est.predict_proba(X)[:, 1]
    return est.decision_function(X)


def nested(X, y, clf, grid, splits):
    rows, aucs = [], []
    for tr, te in splits:
        gs = GridSearchCV(Pipeline([("clr", mb.PrevalenceCLR(0.10)),
                                    ("sc", StandardScaler()), ("clf", clf)]), grid,
                          scoring="roc_auc", n_jobs=-1,
                          cv=StratifiedKFold(4, shuffle=True, random_state=RNG))
        gs.fit(X[tr], y[tr])
        p = score_of(gs.best_estimator_, X[te])
        rows.append(metrics(y[te], p))
        aucs.append(rows[-1]["ROC_AUC"])
    return pd.DataFrame(rows), np.array(aucs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-repeats", type=int, default=5)
    ap.add_argument("--out", default="results/model_exploration.csv")
    args = ap.parse_args()

    d = pd.read_csv(DATA, index_col=0)
    # 原始计数 —— CLR 在 pipeline 内，逐折拟合（见 compare_models.py 注释）
    X = d[[c for c in d.columns if c.endswith("__count")]].values
    y = d["label"].values
    splits = list(RepeatedStratifiedKFold(n_splits=5, n_repeats=args.n_repeats,
                                          random_state=RNG).split(X, y))
    print(f"{X.shape[0]} 样本 x {X.shape[1]} 特征 | 外层 {len(splits)} 折\n")

    M = build_models()
    rows, auc_store = [], {}
    for name, (clf, grid, why) in M.items():
        m, a = nested(X, y, clf, grid, splits)
        auc_store[name] = a
        rows.append({"Model": name, **{k: m[k].mean() for k in m.columns},
                     **{k + "_sd": m[k].std() for k in m.columns}, "Rationale": why})
        print(f"  {name:<15} AUC {m.ROC_AUC.mean():.3f} ± {m.ROC_AUC.std():.3f}"
              f"   MCC {m.MCC.mean():.3f}   |  {why}")

    # --- 软投票集成：三种互补的归纳偏置 ---
    print("\n  集成: SVM-RBF + XGBoost + L1-LR 软投票 ...")
    try:
        from xgboost import XGBClassifier
        spw = float((y == 0).sum() / (y == 1).sum())
        xgb = XGBClassifier(random_state=RNG, n_jobs=-1, eval_metric="logloss",
                            subsample=0.8, colsample_bytree=0.8, tree_method="hist",
                            scale_pos_weight=spw, max_depth=4, learning_rate=0.05,
                            n_estimators=200)
    except ImportError:
        from sklearn.ensemble import HistGradientBoostingClassifier
        xgb = HistGradientBoostingClassifier(random_state=RNG, learning_rate=0.05,
                                             max_leaf_nodes=7, min_samples_leaf=5)
    vote = VotingClassifier(
        [("svm", SVC(kernel="rbf", C=5, gamma="scale", probability=True,
                     class_weight="balanced", random_state=RNG)),
         ("gb", xgb),
         ("lr", LogisticRegression(max_iter=5000, penalty="l1", solver="liblinear",
                                   C=0.5, class_weight="balanced"))],
        voting="soft")
    m, a = nested(X, y, vote, {}, splits)
    auc_store["Ensemble"] = a
    rows.append({"Model": "Ensemble(soft-vote)", **{k: m[k].mean() for k in m.columns},
                 **{k + "_sd": m[k].std() for k in m.columns},
                 "Rationale": "SVM-RBF + 梯度提升 + L1-LR 软投票"})
    print(f"  {'Ensemble':<15} AUC {m.ROC_AUC.mean():.3f} ± {m.ROC_AUC.std():.3f}"
          f"   MCC {m.MCC.mean():.3f}")

    res = pd.DataFrame(rows).sort_values("ROC_AUC", ascending=False)
    res.to_csv(args.out, index=False)
    np.savez("results/exploration_fold_aucs.npz", **auc_store)

    print("\n" + "=" * 92)
    cols = ["Accuracy", "BalancedAcc", "ROC_AUC", "PR_AUC", "Sensitivity",
            "Specificity", "F1", "MCC"]
    disp = res[["Model"] + cols].copy()
    for c in cols:
        disp[c] = res.apply(lambda r: f"{r[c]:.3f}", axis=1)
    print(disp.to_string(index=False))
    print("=" * 92)
    print("\n参考(上一轮): SVM-RBF AUC 0.839 / MCC 0.531 是需要被超越的目标")
    print(f"逐折 AUC 已存入 results/exploration_fold_aucs.npz，供配对检验使用")


if __name__ == "__main__":
    main()
