#!/usr/bin/env python3
"""
生态特征空间的共用构件。

四个特征空间：
    alpha       α 多样性（逐样本计算，无泄漏）
    core        基线核心菌群保留度（必须在折内用训练集阴性样本重新定义）
    structure   群落结构（Bray-Curtis / Aitchison 距离）
    eco_all     以上三者拼接

设计要点
--------
协作者提供的 sample_level_core_retention_EXPLORATORY.tsv 用**全部**阴性样本
定义基线核心，包含日后会落入测试折的样本。用它报告性能会高估。本模块的
`baseline_core` / `core_retention_features` 支持只用训练折阴性样本重新定义。

PCoA 坐标文件同理：cmdscale() 作用在完整 326×326 距离矩阵上，坐标轴由包括
测试样本在内的全部样本决定。本模块的 `pcoa_fit` / `pcoa_project` 在训练折内
拟合，再把测试样本用 Gower 插值投影上去。

距离矩阵本身是干净的（Bray-Curtis 是两两函数；CLR 逐样本计算），因此
`distance_kernel` 直接吃距离，不需要任何折内拟合。
"""
import numpy as np
import pandas as pd

ECO_DIR = "ecological_model"

DETECTION = 0.001   # 0.1% 相对丰度，与 R 脚本一致
PREVALENCE = 0.50   # 出现在 ≥50% 基线样本中，与 R 脚本一致

ALPHA_COLS = ["Observed_Genera", "Chao1_Genus", "Shannon_Genus",
              "Simpson_Genus", "InvSimpson_Genus", "Pielou_Genus"]

CORE_COLS = ["CoreRetentionProportion", "CoreAbundanceRetention",
             "CoreTaxaLost", "CoreTaxaPresent", "NonCoreTaxaPresent",
             "TotalTaxaPresent", "CoreMembershipProportion"]


# ---------------------------------------------------------------- 载入
def load_eco(root="."):
    """读入生态特征、两个距离矩阵，并与原始计数对齐。

    返回的所有对象都以同一组 SampleID 为索引，顺序一致。
    """
    import os
    d = os.path.join(root, ECO_DIR)
    alpha = pd.read_csv(os.path.join(d, "ecological_ML_features_clean.tsv"),
                        sep="\t").set_index("SampleID")
    bray = pd.read_csv(os.path.join(d, "bray_curtis_distance_matrix.tsv"),
                       sep="\t", index_col=0)
    aitch = pd.read_csv(os.path.join(d, "aitchison_distance_matrix.tsv"),
                        sep="\t", index_col=0)
    counts = pd.read_csv(os.path.join(root, "genus_raw_counts_by_featureID.csv"),
                         index_col=0)

    ids = list(alpha.index)
    assert set(ids) == set(bray.index) == set(aitch.index) == set(counts.index), \
        "SampleID 在各文件间不一致"
    bray = bray.loc[ids, ids]
    aitch = aitch.loc[ids, ids]
    counts = counts.loc[ids]
    return alpha, bray, aitch, counts


def relative_abundance(counts):
    """行归一化为相对丰度。"""
    X = np.asarray(counts, dtype=float)
    tot = X.sum(axis=1, keepdims=True)
    tot[tot == 0] = 1.0
    return X / tot


# ---------------------------------------------------------------- 核心菌群
def baseline_core(rel, y, host, detection=DETECTION, prevalence=PREVALENCE):
    """按宿主定义基线核心菌群，只用传入样本中的**阴性**个体。

    参数
    ----
    rel  : (n, p) 相对丰度矩阵
    y    : (n,)   0/1 标签，0 = 阴性
    host : (n,)   宿主物种

    返回 {宿主: 核心 taxa 的列下标数组}。折内调用时只传训练折即可。
    """
    cores = {}
    for h in np.unique(host):
        m = (host == h) & (y == 0)
        if m.sum() == 0:                      # 该宿主在本折无阴性样本
            cores[h] = np.array([], dtype=int)
            continue
        present = rel[m] >= detection
        cores[h] = np.where(present.mean(axis=0) >= prevalence)[0]
    return cores


def core_retention_features(rel, host, cores, detection=DETECTION):
    """给定基线核心，计算每个样本的保留度指标。

    与 CoreRetentionMetrics_rscript.R 的定义一致：
      CoreAbundanceRetention 取**全部**核心 taxa 的丰度之和（不限于检出的）。
    """
    n = rel.shape[0]
    out = np.zeros((n, len(CORE_COLS)), dtype=float)
    for i in range(n):
        core = cores.get(host[i], np.array([], dtype=int))
        v = rel[i]
        n_core = len(core)
        n_present = int((v[core] >= detection).sum()) if n_core else 0
        n_total = int((v >= detection).sum())
        out[i] = [
            n_present / n_core if n_core else np.nan,       # CoreRetentionProportion
            float(v[core].sum()) if n_core else np.nan,     # CoreAbundanceRetention
            n_core - n_present,                             # CoreTaxaLost
            n_present,                                      # CoreTaxaPresent
            n_total - n_present,                            # NonCoreTaxaPresent
            n_total,                                        # TotalTaxaPresent
            n_present / n_total if n_total else np.nan,     # CoreMembershipProportion
        ]
    return out


# ---------------------------------------------------------------- PCoA
def pcoa_fit(D, k=10):
    """经典 MDS。只在训练折的距离子矩阵上拟合。

    返回 (坐标, 投影所需的状态)。
    """
    D2 = np.asarray(D, dtype=float) ** 2
    n = D2.shape[0]
    J = np.eye(n) - np.ones((n, n)) / n
    B = -0.5 * J @ D2 @ J
    w, V = np.linalg.eigh(B)
    idx = np.argsort(w)[::-1]
    w, V = w[idx], V[:, idx]
    pos = w > 1e-9
    k = min(k, int(pos.sum()))
    lam, Vk = w[:k], V[:, :k]
    coords = Vk * np.sqrt(lam)
    return coords, {"lam": lam, "V": Vk, "row_mean_D2": D2.mean(axis=1), "k": k}


def pcoa_project(D_new, state):
    """把折外样本投影到已拟合的 PCoA 空间（Gower 插值）。

    D_new : (n_new, n_train) 测试样本到训练样本的距离
    """
    d2 = np.asarray(D_new, dtype=float) ** 2
    diff = state["row_mean_D2"][None, :] - d2
    return 0.5 * diff @ state["V"] / np.sqrt(state["lam"])[None, :]


def distance_kernel(D_ab, gamma):
    """由距离直接构造 RBF 型核，无需任何折内拟合。"""
    return np.exp(-gamma * np.asarray(D_ab, dtype=float) ** 2)


def median_gamma(D_train):
    """用训练折距离的中位数定核宽，避免把测试折信息引进来。"""
    d = np.asarray(D_train, dtype=float)
    iu = np.triu_indices_from(d, k=1)
    med = np.median(d[iu])
    return 1.0 / (med ** 2) if med > 0 else 1.0
