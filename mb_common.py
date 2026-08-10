"""
共享模块：数据加载、泄漏列清单、成分数据变换器。
build_features.py 和 train_eval.py 都从这里导入。
"""
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

# ---------------------------------------------------------------------------
# 配置
# ---------------------------------------------------------------------------
COUNTS_FILE = "genus_raw_counts_by_featureID.csv"
TAXONOMY_FILE = "taxonomy_key.csv"
METADATA_FILE = "metadata_all_samples-0810.csv"

LABEL_COL = "Influenza"
POS_LABEL = "Pos"
SAMPLE_COL = "SampleID"
BATCH_COL = "BioProject"

# 主分析队列：UC Davis 野生鸭，同一中心/宿主/组织，n=260
PRIMARY_STUDY = "PRJNA464410"

# 缺省流行度阈值（特征需在 >= 该比例的训练样本中出现）
PREVALENCE = 0.10

# ---------------------------------------------------------------------------
# 标签泄漏列 —— 这些是标签本身或标签的确定性函数，绝不可进模型
# ---------------------------------------------------------------------------
LEAKAGE_COLS = [
    "Infection",                # 与 Influenza 完全相同
    "CoreGroup",                # HostGroup_标签，如 Duck_Pos
    "HASubType", "NASubType", "HASubType_NASubType",  # Neg 全为 "neg"
    "Log10_Virus_titer_.EID50_.mL_or_.g_tissue.",     # 病毒滴度
    "True_or_Neg", "Infection_Status", "Infecting_Agent",
    "experimental_group",
    "isolation_source",         # "mock" vs "Intestine N"
    "Isolator_.",
]

# 样本唯一标识符：326 个全唯一，含命名规则，会被树模型当作查找表
ID_COLS = [
    "SampleID", "BioSample", "Experiment", "Library.Name", "Sample.Name",
    "Nickname", "misc_param", "source_material_id", "Path", "Bird_ID",
]

# 与 BioProject 一一对应的批次代理变量（跨研究建模时会变成纯批次信号）
BATCH_PROXY_COLS = [
    "BioProject", "SRA.Study", "Center.Name", "ReleaseDate", "create_date",
    "Instrument", "Platform", "Assay.Type", "BioSampleModel", "LibrarySource",
    "LibraryLayout", "Organism", "DATASTORE.filetype", "DATASTORE.provider",
    "DATASTORE.region", "Consent", "DOI",
]

# 主分析中作为协变量/混杂因子使用的 metadata 列
COVARIATE_CAT = ["Season", "Age", "Sex", "Feeding", "Species", "Location"]
COVARIATE_NUM = ["month"]

NA_TOKENS = ["NA", "", "not collected", "missing", "not applicable", "nan", "None"]


# ---------------------------------------------------------------------------
# 变换器：流行度过滤 + CLR
# ---------------------------------------------------------------------------
class PrevalenceCLR(BaseEstimator, TransformerMixin):
    """成分数据预处理：流行度过滤 -> 伪计数 -> 相对丰度 -> centered log-ratio。

    过滤阈值在 fit 时（即 CV 的训练折内）确定，transform 时套用到验证折，
    因此不会有信息从验证折泄漏回来。CLR 本身是逐样本的行内运算，无跨样本泄漏。
    """

    def __init__(self, prevalence=PREVALENCE, pseudocount=0.5):
        self.prevalence = prevalence
        self.pseudocount = pseudocount

    def fit(self, X, y=None):
        X = np.asarray(X, dtype=float)
        self.keep_ = (X > 0).mean(axis=0) >= self.prevalence
        if self.keep_.sum() == 0:
            raise ValueError(f"流行度阈值 {self.prevalence} 过高，没有特征保留下来")
        self.n_features_in_ = X.shape[1]
        return self

    def transform(self, X):
        X = np.asarray(X, dtype=float)[:, self.keep_] + self.pseudocount
        X = X / X.sum(axis=1, keepdims=True)
        L = np.log(X)
        return L - L.mean(axis=1, keepdims=True)

    def get_feature_names_out(self, input_features=None):
        if input_features is None:
            input_features = np.array([f"f{i}" for i in range(self.n_features_in_)])
        return np.asarray(input_features)[self.keep_]


def clr_frame(counts_df, prevalence=PREVALENCE, pseudocount=0.5):
    """对整张表做一次性 CLR（仅用于描述性分析/出图，不用于模型评估）。"""
    tr = PrevalenceCLR(prevalence, pseudocount).fit(counts_df.values)
    cols = tr.get_feature_names_out(counts_df.columns.to_numpy())
    return pd.DataFrame(tr.transform(counts_df.values), index=counts_df.index, columns=cols)


# ---------------------------------------------------------------------------
# 数据加载
# ---------------------------------------------------------------------------
def load_all(root="."):
    """读取三个文件，对齐样本，返回 (counts, taxonomy, metadata)。

    counts:   DataFrame [n_samples x n_features]，index = SampleID，int 计数
    taxonomy: DataFrame，index = FeatureID
    metadata: DataFrame，index = SampleID，与 counts 同序
    """
    import os

    counts = pd.read_csv(os.path.join(root, COUNTS_FILE))
    counts = counts.set_index(SAMPLE_COL)
    counts.index = counts.index.astype(str)

    taxonomy = pd.read_csv(os.path.join(root, TAXONOMY_FILE)).set_index("FeatureID")

    meta = pd.read_csv(os.path.join(root, METADATA_FILE), dtype=str, keep_default_na=False)
    meta = meta.set_index(SAMPLE_COL)
    meta.index = meta.index.astype(str)
    meta = meta.replace({tok: np.nan for tok in NA_TOKENS})

    # 对齐：只保留三者都有的样本
    shared = counts.index.intersection(meta.index)
    missing_counts = counts.index.difference(meta.index)
    missing_meta = meta.index.difference(counts.index)
    if len(missing_counts):
        print(f"[warn] {len(missing_counts)} 个样本只在计数表中，已丢弃")
    if len(missing_meta):
        print(f"[warn] {len(missing_meta)} 个样本只在 metadata 中，已丢弃")

    counts = counts.loc[shared]
    meta = meta.loc[shared]

    # 特征列与 taxonomy 对齐
    feat_shared = [c for c in counts.columns if c in taxonomy.index]
    dropped = [c for c in counts.columns if c not in taxonomy.index]
    if dropped:
        print(f"[warn] {len(dropped)} 个特征无分类学注释，已丢弃")
    counts = counts[feat_shared]
    taxonomy = taxonomy.loc[feat_shared]

    # 派生：采样月份
    meta["month"] = pd.to_datetime(meta["collection_date"], errors="coerce").dt.month

    return counts, taxonomy, meta


def get_label(meta):
    """返回 0/1 标签（Pos=1）。"""
    return (meta[LABEL_COL] == POS_LABEL).astype(int)


def collapse_to_genus(counts, taxonomy, level="Genus"):
    """把 FeatureID 级计数聚合到指定分类学层级。

    未注释（NaN）的特征归到 '<level>_unassigned_<FeatureID>'，不丢弃 ——
    丢弃会损失丰度、破坏成分数据的封闭性。
    """
    labels = taxonomy[level].copy()
    unassigned = labels.isna()
    labels[unassigned] = [f"{level}_unassigned_{fid}" for fid in labels.index[unassigned]]
    out = counts.T.groupby(labels.reindex(counts.columns).values).sum().T
    return out.sort_index(axis=1)


def clean_metadata(meta, drop_batch=True):
    """删除泄漏列、ID 列（可选删批次代理列），返回可安全查看的 metadata。"""
    drop = set(LEAKAGE_COLS) | set(ID_COLS)
    if drop_batch:
        drop |= set(BATCH_PROXY_COLS)
    drop.discard(LABEL_COL)
    keep = [c for c in meta.columns if c not in drop]
    return meta[keep]


def build_covariates(meta, cat=None, num=None):
    """构造协变量设计矩阵的原始 DataFrame（编码留给 pipeline 做）。"""
    cat = COVARIATE_CAT if cat is None else cat
    num = COVARIATE_NUM if num is None else num
    cat = [c for c in cat if c in meta.columns]
    num = [c for c in num if c in meta.columns]
    out = meta[cat + num].copy()
    for c in cat:
        out[c] = out[c].fillna("__missing__").astype(str)
    for c in num:
        out[c] = pd.to_numeric(out[c], errors="coerce")
    return out, cat, num
