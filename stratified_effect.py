#!/usr/bin/env python3
"""
分层效应估计：模型中只放菌群，混杂靠设计（分层）控制。

为什么这样做
------------
季节是混杂因子：它同时影响菌群组成与感染风险。处理混杂有两条路——
把协变量放进模型（调整），或固定季节只在层内比较（分层）。

本项目采用分层，理由：
  1. 研究问题是「菌群对感染的影响」，协变量不是感兴趣的暴露，不应进模型
  2. 模型调整给出的增量依赖模型选择（L2-LR +0.043，SVM-RBF +0.105），不稳健
  3. 分层是流行病学处理混杂的经典手段，更易向审稿人解释

报告原则（硬性）
----------------
**必须逐层报告，并给出区间；不得只报加权平均值。**
各层表现差异极大（7 月 AUC 0.965，10 月 0.734），加权平均会掩盖 10 月的失败，
且权重由采样规模决定而非科学意义决定。

用法:
    python3 stratified_effect.py
    python3 stratified_effect.py --min-minor 8   # 提高纳入层的门槛
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, average_precision_score,
                             matthews_corrcoef, recall_score, roc_auc_score)
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"


def pipe(prevalence=0.10):
    """模型中只有菌群——没有任何协变量。"""
    return Pipeline([("clr", mb.PrevalenceCLR(prevalence)),
                     ("sc", StandardScaler()),
                     ("clf", SVC(kernel="rbf", C=5, gamma="scale", probability=True,
                                 class_weight="balanced", random_state=RNG))])


def evaluate(X, y, tag, n_repeats=5, prevalence=0.10):
    """折外预测合并后计算指标（比逐折平均更标准）。"""
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=n_repeats, random_state=RNG)
    ps, ys = [], []
    for tr, te in cv.split(X, y):
        est = pipe(prevalence).fit(X[tr], y[tr])
        ps.append(est.predict_proba(X[te])[:, 1])
        ys.append(y[te])
    p, yv = np.concatenate(ps), np.concatenate(ys)
    yh = (p >= 0.5).astype(int)
    return {
        "stratum": tag, "n": int(len(y)), "n_pos": int(y.sum()),
        "pos_rate": float(y.mean()),
        "AUC": roc_auc_score(yv, p), "PR_AUC": average_precision_score(yv, p),
        "accuracy": accuracy_score(yv, yh),
        "baseline_acc": float(max(y.mean(), 1 - y.mean())),
        "acc_gain": accuracy_score(yv, yh) - float(max(y.mean(), 1 - y.mean())),
        "sensitivity": recall_score(yv, yh),
        "specificity": recall_score(yv, yh, pos_label=0),
        "MCC": matthews_corrcoef(yv, yh),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-minor", type=int, default=8,
                    help="层内少数类的最小样本数（默认 8）")
    ap.add_argument("--min-n", type=int, default=25)
    ap.add_argument("--prevalence", type=float, default=0.10)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    counts, taxonomy, meta = mb.load_all(".")
    sel = (meta[mb.BATCH_COL] == mb.PRIMARY_STUDY).values
    counts, meta = counts[sel], meta[sel]
    y = mb.get_label(meta).values
    X = counts.values.astype(float)
    month = pd.to_numeric(meta["month"], errors="coerce").values

    print("=" * 96)
    print("分层效应估计 —— 模型中只有菌群，无任何协变量（SVM-RBF）")
    print("=" * 96)

    # ---------- 哪些层可用 ----------
    print("\n[1] 各月可建模性")
    elig = []
    for mo in sorted(set(month[~np.isnan(month)])):
        s = month == mo
        ns, npos, nneg = int(s.sum()), int(y[s].sum()), int((1 - y[s]).sum())
        minor = min(npos, nneg)
        ok = (ns >= args.min_n) and (minor >= args.min_minor)
        why = "" if ok else ("单一类别，AUC 无定义" if minor == 0
                             else f"少数类仅 {minor} 个，估计不稳定")
        print(f"  {int(mo):2d}月  n={ns:3d}  阴性 {nneg:3d}  阳性 {npos:3d}   "
              f"{'纳入' if ok else '排除'}  {why}")
        if ok:
            elig.append(int(mo))
    covered = int(np.isin(month, elig).sum())
    print(f"\n  纳入 {len(elig)} 层，覆盖 {covered}/{len(y)} 个样本；"
          f"另有 {len(y) - covered} 个样本无法纳入任何分层分析")

    # ---------- 逐层 ----------
    print("\n[2] 逐层结果（这是主要报告内容）")
    rows = [evaluate(X, y, "全部样本（未分层）", prevalence=args.prevalence)]
    for mo in elig:
        s = month == mo
        rows.append(evaluate(X[s], y[s], f"{mo} 月", prevalence=args.prevalence))
    s78 = np.isin(month, [7, 8])
    if s78.sum() > 30:
        rows.append(evaluate(X[s78], y[s78], "7+8 月（同季节合并）",
                             prevalence=args.prevalence))
    d = pd.DataFrame(rows)

    hdr = (f"  {'分层':<18} {'n':>4} {'阳性率':>7} {'AUC':>7} {'acc':>7} "
           f"{'基线acc':>8} {'增益':>7} {'灵敏':>6} {'特异':>6} {'MCC':>7}")
    print(hdr)
    print("  " + "-" * (len(hdr) - 2))
    for _, r in d.iterrows():
        print(f"  {r.stratum:<18} {r.n:>4} {r.pos_rate:>7.2f} {r.AUC:>7.3f} "
              f"{r.accuracy:>7.3f} {r.baseline_acc:>8.3f} {r.acc_gain:>+7.3f} "
              f"{r.sensitivity:>6.3f} {r.specificity:>6.3f} {r.MCC:>7.3f}")
    d.to_csv(os.path.join(OUT, "stratified_effect.csv"), index=False)

    # ---------- 区间 ----------
    per = d[d.stratum.str.match(r"^\d+ 月$")]
    lo, hi = per.AUC.min(), per.AUC.max()
    lo_s = per.loc[per.AUC.idxmin(), "stratum"]
    hi_s = per.loc[per.AUC.idxmax(), "stratum"]
    print("\n[3] 应当报告的形式")
    print(f"  AUC 区间   {lo:.3f}（{lo_s}） – {hi:.3f}（{hi_s}）")
    print(f"  acc 区间   {per.accuracy.min():.3f} – {per.accuracy.max():.3f}"
          f"   （对应基线 {per.baseline_acc.min():.3f} – {per.baseline_acc.max():.3f}）")
    print(f"  MCC 区间   {per.MCC.min():.3f} – {per.MCC.max():.3f}")

    wa = float(np.average(per.AUC, weights=per.n))
    wacc = float(np.average(per.accuracy, weights=per.n))
    print(f"\n  [仅供参考，不作为主报告值] 样本量加权 AUC {wa:.3f}，acc {wacc:.3f}")
    print("  不推荐使用加权值：各层差异达 "
          f"{hi - lo:.3f} AUC，加权会掩盖最差层；且权重由采样规模决定，"
          "而非科学意义决定。")

    worst = per.loc[per.AUC.idxmin()]
    print(f"\n[4] 最弱层的具体情况：{worst.stratum}")
    print(f"  AUC {worst.AUC:.3f}  accuracy {worst.accuracy:.3f}（基线 "
          f"{worst.baseline_acc:.3f}）  特异度 {worst.specificity:.3f}  "
          f"MCC {worst.MCC:.3f}")
    print("  该层对阴性样本的判别能力很弱，必须与最强层一并报告。")

    with open(os.path.join(OUT, "stratified_effect.json"), "w") as f:
        json.dump({"eligible_months": elig, "n_covered": covered,
                   "n_total": int(len(y)),
                   "auc_range": [float(lo), float(hi)],
                   "acc_range": [float(per.accuracy.min()), float(per.accuracy.max())],
                   "mcc_range": [float(per.MCC.min()), float(per.MCC.max())],
                   "weighted_auc_reference_only": wa,
                   "per_stratum": d.to_dict("records")}, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 96)
    print("报告规则：给出区间与逐层数字，不要只报单一汇总值。")
    print(f"结果已写入 {OUT}/stratified_effect.csv 与 .json")
    print("=" * 96)


if __name__ == "__main__":
    main()
