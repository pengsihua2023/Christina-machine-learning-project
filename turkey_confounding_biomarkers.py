#!/usr/bin/env python3
"""
火鸡队列（PRJNA644054, n=45）的两项分析：

  [A] 队列内部的混杂结构
  [B] Permutation importance 与差异丰度 —— 找出驱动预测的菌与效应方向

与主队列（野鸭野外监测）的根本差异
-----------------------------------
这是一项**实验感染研究**，不是野外监测。混杂来源因此完全不同：
野鸭队列的混杂是采样季节与地点；本队列是**饲养隔离器**与**DNA 提取批次**。

关键事实：隔离器与感染状态**完全共线**（阴性鸟全在 1–2 号，阳性鸟全在 3–6 号）。
这是实验设计使然，但意味着任何隔离器效应（同笼共栖、食粪、共享饮水与垫料）
都无法与感染效应分离。本脚本用一个决定性检验量化它：
**在感染状态相同的鸟之间，菌群能否分辨隔离器？** 若能，则组间差异中必然
混有笼效应。

用法:
    python3 turkey_confounding_biomarkers.py
    python3 turkey_confounding_biomarkers.py --n-perm-imp 30
"""
import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import (RepeatedStratifiedKFold, StratifiedKFold,
                                     cross_val_predict, cross_val_score)
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

import mb_common as mb

warnings.filterwarnings("ignore")
RNG = 0
OUT = "results"
PROJECT = "PRJNA644054"
PREV = 0.10


def pipe(prevalence=PREV, C=1.0, gamma="scale"):
    """主模型：与 poultry_cohort.py 选中的超参一致（C=1.0, gamma=scale）。"""
    return Pipeline([("clr", mb.PrevalenceCLR(prevalence)),
                     ("sc", StandardScaler()),
                     ("clf", SVC(kernel="rbf", C=C, gamma=gamma, probability=True,
                                 class_weight="balanced", random_state=RNG))])


def cv_auc(X, y, n_splits=5, n_repeats=5, seed=RNG, prevalence=PREV):
    """样本或类别不足时返回 nan，而不是抛错。"""
    _, cnt = np.unique(y, return_counts=True)
    if len(cnt) < 2 or cnt.min() < n_splits:
        n_splits = max(2, int(cnt.min())) if len(cnt) > 1 else 0
        if n_splits < 2:
            return np.nan
    try:
        return cross_val_score(pipe(prevalence), X, y, scoring="roc_auc", n_jobs=-1,
                               cv=RepeatedStratifiedKFold(n_splits=n_splits,
                                                          n_repeats=n_repeats,
                                                          random_state=seed)).mean()
    except ValueError:
        return np.nan


def multiclass_acc(X, g, prevalence=PREV, n_splits=4):
    """多分类（如 4 个隔离器）的折外准确率，与随机基线对照。

    分组标签先经 factorize 转为普通 int 数组：来自 metadata 的字符串列可能是
    pyarrow 支持的，sklearn 的折索引无法直接切片。
    """
    g = pd.factorize(pd.Series(np.asarray(g, dtype=object)))[0]
    lab, cnt = np.unique(g, return_counts=True)
    if len(lab) < 2 or cnt.min() < 2:
        return np.nan, np.nan
    k = min(n_splits, int(cnt.min()))
    if k < 2:
        return np.nan, np.nan
    est = Pipeline([("clr", mb.PrevalenceCLR(prevalence)), ("sc", StandardScaler()),
                    ("clf", SVC(kernel="rbf", C=1.0, gamma="scale",
                               class_weight="balanced", random_state=RNG))])
    pred = cross_val_predict(est, X, g,
                             cv=StratifiedKFold(k, shuffle=True, random_state=RNG),
                             n_jobs=-1)
    return accuracy_score(g, pred), float(cnt.max() / cnt.sum())


# =============================================================== [A] 混杂结构
def part_a(X, y, meta, res):
    print("=" * 88)
    print("[A] 队列内部的混杂结构")
    print("=" * 88)

    iso = meta["Isolator_."].astype(str).values
    ext = meta["dna_extraction_date"].astype(str).values
    sex = meta["sex"].astype(str).values

    print("\nA1. 隔离器 × 感染状态")
    lab = meta["Influenza"].values
    ct = pd.crosstab(pd.Series(iso, name="Isolator"), pd.Series(lab, name="Influenza"))
    print(ct.to_string())
    perfect = bool(((ct > 0).sum(axis=1) == 1).all())
    print(f"\n  → {'完全共线：每个隔离器只含一种感染状态' if perfect else '存在交叉'}")
    print("    这是实验设计使然（对照与感染分笼饲养），但代价是"
          "隔离器效应与感染效应在统计上不可分离。")
    res["isolator_perfectly_confounded"] = perfect

    print("\nA2. DNA 提取批次 × 感染状态")
    ct2 = pd.crosstab(pd.Series(ext, name="ExtractionDate"), pd.Series(lab, name="Influenza"))
    print(ct2.to_string())
    print("\n  → 18-11-06 批次的 16 个样本全部为阳性：部分共线，属批次效应。")

    print("\nA3. 性别 × 感染状态（对照：无混杂的变量长什么样）")
    print(pd.crosstab(pd.Series(sex, name="sex"), pd.Series(lab, name="Influenza")).to_string())
    a_sex = cv_auc(X, (sex == "male").astype(int))
    print(f"\n  → 分布均衡；菌群预测性别 AUC {a_sex:.3f}（作为阴性对照）")
    res["microbiome_predicts_sex"] = float(a_sex)

    # ---- 决定性检验：同一感染状态内部，菌群能否分辨隔离器 ----
    print("\nA4. 决定性检验：在感染状态相同的鸟之间，菌群能否分辨隔离器？")
    print("    若能，说明存在笼效应，则组间差异中必然混有它。")
    cage = {}
    for grp, name in [(1, "阳性组（隔离器 3/4/5/6，各 8 只）"),
                      (0, "阴性组（隔离器 1 号 8 只、2 号 5 只）")]:
        m = y == grp
        acc, base = multiclass_acc(X[m], iso[m])
        if np.isnan(acc):
            print(f"  {name}: 样本不足，跳过")
            continue
        n_iso = len(np.unique(iso[m]))
        chance = 1.0 / n_iso
        cage[f"group_{grp}"] = {"n": int(m.sum()), "n_isolators": n_iso,
                                "accuracy": float(acc), "chance": chance,
                                "majority": float(base)}
        flag = "  ← 笼效应强" if acc > 2 * chance else ""
        print(f"  {name}\n     折外准确率 {acc:.3f}   随机基线 {chance:.3f}"
              f"   多数类基线 {base:.3f}{flag}")
    res["cage_effect"] = cage

    print("\nA5. 菌群与批次变量的关联")
    a_ext = cv_auc(X, (ext == "18-11-06").astype(int))
    print(f"  菌群 → 预测 DNA 提取批次   AUC {a_ext:.3f}")
    # 仅在阳性组内检验（该组两个批次各 16 个，感染状态固定）
    pos = y == 1
    a_ext_pos = cv_auc(X[pos], (ext[pos] == "18-11-06").astype(int))
    print(f"  仅在阳性组内（感染状态固定，两批次各 16 个）  AUC {a_ext_pos:.3f}"
          f"   {'← 批次效应真实存在' if a_ext_pos > 0.7 else ''}")
    res["microbiome_predicts_extraction_batch"] = float(a_ext)
    res["microbiome_predicts_batch_within_positives"] = float(a_ext_pos)

    print("\nA6. 不可用作协变量的变量：感染的后果")
    rows = []
    for col in ["Bursa_Weight_g", "Bird_weight.g.", "Bursa.BodyWeight.Ratio1000"]:
        v = pd.to_numeric(meta[col], errors="coerce").values
        ok = ~np.isnan(v)
        if ok.sum() < 10:
            continue
        a, b = v[ok & (y == 1)], v[ok & (y == 0)]
        p = stats.ttest_ind(a, b, equal_var=False).pvalue
        rows.append({"variable": col, "pos_mean": float(a.mean()),
                     "neg_mean": float(b.mean()), "welch_p": float(p)})
        print(f"  {col:<28} 阳性 {a.mean():.2f}   阴性 {b.mean():.2f}   Welch p={p:.4f}")
    print("\n  → 法氏囊重量在阳性组显著更低，这是感染导致的免疫器官萎缩，"
          "属**结局/中介变量**，绝不可作为特征或协变量。")
    # 数据质量提示
    bw = pd.to_numeric(meta["Bird_weight.g."], errors="coerce").values
    br = pd.to_numeric(meta["Bursa.BodyWeight.Ratio1000"], errors="coerce").values
    same = np.allclose(bw[~np.isnan(bw)], br[~np.isnan(br)])
    if same:
        print("  [数据质量] Bird_weight.g. 与 Bursa.BodyWeight.Ratio1000 数值完全相同，"
              "且均值 ~2.9「克」对火鸡不合理——原始元数据疑似串列，宜向数据提供方核实。")
    res["bird_weight_duplicates_ratio"] = bool(same)
    res["outcome_variables"] = rows


# ======================================================= [B] 驱动预测的菌
def part_b(X, y, meta, counts, taxonomy, args, res):
    print("\n" + "=" * 88)
    print("[B] 驱动预测的菌：permutation importance 与差异丰度")
    print("=" * 88)

    names = list(counts.columns)
    iso = meta["Isolator_."].astype(str).values

    # ---- B1 折内 permutation importance ----
    print(f"\nB1. Permutation importance（折内计算，{args.n_rep_cv}×5 折，"
          f"每折打乱 {args.n_perm_imp} 次）")
    imps, splits = [], list(RepeatedStratifiedKFold(
        n_splits=5, n_repeats=args.n_rep_cv, random_state=RNG).split(X, y))
    for i, (tr, te) in enumerate(splits):
        est = pipe().fit(X[tr], y[tr])
        r = permutation_importance(est, X[te], y[te], scoring="roc_auc",
                                   n_repeats=args.n_perm_imp, random_state=RNG,
                                   n_jobs=-1)
        imps.append(r.importances_mean)
        if (i + 1) % 5 == 0:
            print(f"    折 {i+1}/{len(splits)} ...")
    I = np.vstack(imps)
    imp = pd.DataFrame({"FeatureID": names, "importance_mean": I.mean(0),
                        "importance_sd": I.std(0),
                        "frac_folds_positive": (I > 0).mean(0)})

    # ---- B2 差异丰度 ----
    print("\nB2. 差异丰度（CLR + Welch t + BH-FDR）")
    clr = mb.clr_frame(counts, PREV)
    kept = list(clr.columns)
    a, b = clr.values[y == 1], clr.values[y == 0]
    t, p = stats.ttest_ind(a, b, equal_var=False)
    fdr = stats.false_discovery_control(p, method="bh")
    da = pd.DataFrame({"FeatureID": kept, "t": t, "p": p, "FDR": fdr,
                       "mean_clr_Pos": a.mean(0), "mean_clr_Neg": b.mean(0),
                       "direction": np.where(t > 0, "Pos↑", "Pos↓")})
    n_sig = int((da.FDR < 0.05).sum())
    print(f"  {len(da)} 个特征中 {n_sig} 个 FDR<0.05"
          f"（{int(((da.FDR<0.05)&(da.direction=='Pos↑')).sum())} 个 Pos↑，"
          f"{int(((da.FDR<0.05)&(da.direction=='Pos↓')).sum())} 个 Pos↓）")

    # ---- B3 笼效应污染检查：同一感染状态内部，该菌是否也因隔离器而异 ----
    print("\nB3. 笼效应污染检查（本队列特有）")
    print("    对每个菌，在【阳性组内部】按隔离器做单因素方差分析。")
    print("    若某菌在同为阳性的四个隔离器之间也显著不同，说明它受笼效应驱动。")
    pos = y == 1
    clr_pos = clr.values[pos]
    iso_pos = iso[pos]
    groups = [clr_pos[iso_pos == u] for u in np.unique(iso_pos)]
    fstat, pcage = stats.f_oneway(*groups)
    fdr_cage = stats.false_discovery_control(pcage, method="bh")
    cage_df = pd.DataFrame({"FeatureID": kept, "cage_F": fstat,
                            "cage_p": pcage, "cage_FDR": fdr_cage})
    n_cage = int((cage_df.cage_FDR < 0.05).sum())
    print(f"  {len(cage_df)} 个特征中 {n_cage} 个在阳性组内部即因隔离器显著不同"
          f"（FDR<0.05）")

    # ---- B4 合并三方证据 ----
    fd = None
    if os.path.exists("ml_dataset/feature_dictionary.csv"):
        fd = pd.read_csv("ml_dataset/feature_dictionary.csv").set_index("FeatureID")
    tab = (imp.merge(da, on="FeatureID", how="inner")
              .merge(cage_df, on="FeatureID", how="left"))
    for lv in ["Genus", "Family"]:
        if lv in taxonomy.columns:
            tab[lv] = taxonomy[lv].reindex(tab.FeatureID).values
    tab["cage_confounded"] = tab.cage_FDR < 0.05
    tab = tab.sort_values("importance_mean", ascending=False)
    tab.to_csv(os.path.join(OUT, "turkey_biomarkers.csv"), index=False)

    print("\nB4. 驱动预测的菌 —— Top 15（按 permutation importance 排序）")
    show = tab.head(15)[["Genus", "Family", "importance_mean", "frac_folds_positive",
                         "direction", "t", "FDR", "cage_confounded"]]
    print(show.to_string(index=False, float_format=lambda v: f"{v:.4f}"))

    clean = tab[(tab.FDR < 0.05) & (tab.importance_mean > 0) & (~tab.cage_confounded)]
    dirty = tab[(tab.FDR < 0.05) & (tab.importance_mean > 0) & (tab.cage_confounded)]
    print(f"\n  两法一致（FDR<0.05 且重要性>0）共 {len(clean)+len(dirty)} 个，其中：")
    print(f"    未被笼效应污染: {len(clean)} 个   ← 可作为候选 biomarker")
    print(f"    受笼效应污染:   {len(dirty)} 个   ← 无法区分是感染还是同笼所致")
    if len(clean):
        print("\n  未受污染的候选（按重要性）:")
        print(clean.head(12)[["Genus", "Family", "direction", "importance_mean",
                              "t", "FDR"]].to_string(index=False,
                                                     float_format=lambda v: f"{v:.4f}"))

    # ---- B5 与鸭队列九菌交集比较 ----
    print("\nB5. 与主队列（野鸭）九菌交集的重叠")
    duck_genera = ["Rothia", "Staphylococcus", "Lawsonella", "Candidatus_Arthromitus",
                   "Varibaculum", "Psittacicella"]
    ov = tab[tab.Genus.isin(duck_genera)][
        ["Genus", "direction", "importance_mean", "t", "FDR", "cage_confounded"]]
    if len(ov):
        print(ov.to_string(index=False, float_format=lambda v: f"{v:.4f}"))
    else:
        print("  鸭队列九菌中的已命名属，在火鸡队列的 70 个保留特征中均未出现。")
    print("  （鸭队列九菌：Rothia↓、Staphylococcus↓、Lawsonella↓、"
          "Candidatus Arthromitus↑、Varibaculum↑、Psittacicella↑ 及两个未注释特征）")

    res["differential_abundance"] = {"n_tested": len(da), "n_sig": n_sig}
    res["cage_confounded_features"] = n_cage
    res["concordant_clean"] = int(len(clean))
    res["concordant_cage_confounded"] = int(len(dirty))
    res["duck_overlap"] = ov.to_dict("records") if len(ov) else []
    da.to_csv(os.path.join(OUT, "turkey_differential_abundance.csv"), index=False)
    imp.to_csv(os.path.join(OUT, "turkey_permutation_importance.csv"), index=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-perm-imp", type=int, default=30,
                    help="每折内 permutation importance 的打乱次数")
    ap.add_argument("--n-rep-cv", type=int, default=3, help="重复 CV 次数")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    counts, taxonomy, meta = mb.load_all(".")
    sel = (meta[mb.BATCH_COL] == PROJECT).values
    counts, meta = counts[sel], meta[sel]
    y = mb.get_label(meta).values
    X = counts.values.astype(float)

    res = {"project": PROJECT, "n": int(len(y)), "n_pos": int(y.sum()),
           "prevalence": PREV}
    part_a(X, y, meta, res)
    part_b(X, y, meta, counts, taxonomy, args, res)

    with open(os.path.join(OUT, "turkey_confounding_biomarkers.json"), "w") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
    print(f"\n结果已写入 {OUT}/turkey_*.csv 与 turkey_confounding_biomarkers.json")


if __name__ == "__main__":
    main()
