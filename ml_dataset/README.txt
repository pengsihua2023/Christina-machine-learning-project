二分类建模数据集 —— 流感感染 (Influenza Pos/Neg) 预测
================================================================

标签列
------
  label      0 = Neg(未感染)，1 = Pos(感染)   <-- 建模用这一列
  Influenza  原始字符串标签 Pos/Neg（冗余，便于核对）

特征列
------
  列名格式 <Genus>__<FeatureID前8位>，例如 Rothia__da821e0a
  对应关系见 feature_dictionary.csv
  已按流行度 >= 0.10 过滤（特征需在至少该比例样本中出现）

协变量列（可选特征，也是已知混杂因子）
--------------------------------------
  BioProject  研究批次。跨批次建模会引入强批次效应，务必留意
  HostGroup / HostType / Species   宿主
  Season / Age / Sex / Feeding / Location / month   生态与采样变量
  month 是采样月份，与标签强相关（11-12月 100% 阳性，1月 90% 阴性）。
  它既是真实的季节性信号，也是采样批次的代理变量 —— 单独用它 AUC 就有 0.78。
  报告结果时必须做月份分层或把它作为协变量调整。

文件
----
  primary_clr.csv               260 样本 x  70 特征  (Pos=151, Neg=109)
  primary_counts.csv            260 样本 x  70 特征  (Pos=151, Neg=109)
  allstudies_clr.csv            326 样本 x  79 特征  (Pos=196, Neg=130)
  allstudies_counts.csv         326 样本 x  79 特征  (Pos=196, Neg=130)

counts 版 vs clr 版怎么选
--------------------------
  counts 版 = 原始整数计数（已由上游抽平到约 5000）
  clr 版    = 已做 伪计数0.5 -> 相对丰度 -> centered log-ratio

  * 想直接 fit / 快速试模型      -> 用 clr 版
  * 想产出可发表的性能数字        -> 用 counts 版，把变换放进 sklearn pipeline：
        Pipeline([('clr', PrevalenceCLR(0.10)), ('sc', StandardScaler()), ('clf', ...)])
    （PrevalenceCLR 在 mb_common.py 里）

  原因：clr 版的流行度过滤是在全部样本上做的，交叉验证时验证折的信息
  会通过"哪些特征被保留"这一步轻微泄漏进来。用 pipeline 则在每折训练集
  内部重新过滤，没有这个问题。CLR 本身是逐样本的行内运算，不存在跨样本泄漏。

已经排除的内容
--------------
  标签泄漏列（Infection / CoreGroup / HASubType / 病毒滴度 等）已全部剔除，
  完整清单见 mb_common.py 的 LEAKAGE_COLS。样本 ID 类列也已剔除。

推荐的建模设置（基于已跑过的验证）
----------------------------------
  数据集    primary_*（PRJNA464410，n=260，同中心/同宿主/同组织）
  模型      RandomForest 或 L2/L1 逻辑回归，class_weight='balanced'
  验证      RepeatedStratifiedKFold(5折 x 5次)
  指标      ROC-AUC + PR-AUC（不要只报 accuracy，阳性率 58%）
  参考值    仅菌群 AUC ≈ 0.77-0.81；置换检验 p ≈ 0.01
            菌群+协变量 AUC ≈ 0.92
  不推荐    allstudies_* 做跨研究泛化：4 个研究宿主完全不同，
            GroupKFold 下 AUC 0.54 ± 0.29，等于随机
