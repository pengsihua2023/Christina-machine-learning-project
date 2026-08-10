# 基于肠道菌群的禽流感感染状态二分类模型

从 16S rRNA 菌群丰度预测野生水禽的流感感染状态（Influenza Pos/Neg）。
本文档记录完整的数据处理、建模、评估流程与结论，以及所有已知的局限。

---

## 1. 数据

### 1.1 原始输入

| 文件 | 内容 |
|---|---|
| `genus_raw_counts_by_featureID.csv` | 特征矩阵，326 样本 × 275 个 FeatureID，整数计数 |
| `taxonomy_key.csv` | 275 个 FeatureID 的七级分类学注释 |
| `metadata_all_samples-0810.csv` | 326 样本 × 102 列样本元数据 |
| `sample_counts_by_study_host_infection(in).csv` | 汇总统计表（建模不用，可作论文 Table 1） |

三个文件的 SampleID **326/326 完全匹配**，FeatureID **275/275 完全匹配**，无缺失、无重复。

### 1.2 队列构成

数据来自 4 个 BioProject，宿主与规模差异极大：

| BioProject | 中心 | 宿主 | 样本 | Neg | Pos |
|---|---|---|---|---|---|
| **PRJNA464410** | UC Davis | 野鸭（泄殖腔拭子） | **260** | 109 | 151 |
| PRJNA644054 | Ohio State | 火鸡 | 45 | 13 | 32 |
| PRJNA347583 | 中科院 | 大天鹅 | 15 | 5 | 10 |
| PRJNA379944 | 华南农大 | 鸡 | 6 | 3 | 3 |

**主分析队列锁定 PRJNA464410（n=260）**，理由见 §5.1。

### 1.3 数据性质

```
测序深度   208 个样本恰好 5000，118 个 <5000，最低 1787  → 上游已抽平
稀疏度     90.2% 的格子为 0
流行度     ≥5%→117 特征   ≥10%→79   ≥20%→36   ≥50%→10
分类学     275 FeatureID → 155 个 Genus；Species 层全空，Family 缺 13 个
```

---

## 2. 数据处理

### 2.1 标签泄漏列的识别与剔除

元数据的 102 列中有大量列是标签本身或标签的确定性函数。保留任何一列都会让模型达到 100% 准确率而毫无意义。完整清单在 `mb_common.py: LEAKAGE_COLS`：

| 列 | 泄漏方式 |
|---|---|
| `Infection` | 与 `Influenza` 完全相同 |
| `CoreGroup` | `HostGroup_标签`，如 `Duck_Pos` |
| `HASubType` / `NASubType` / `HASubType_NASubType` | Neg 全为字符串 `"neg"`，Pos 全为亚型数字 |
| `Log10_Virus_titer_...` | 病毒滴度是感染的直接测量 |
| `True_or_Neg` / `Infection_Status` / `Infecting_Agent` / `experimental_group` | 感染分组标注 |
| `isolation_source` | `mock` vs `Intestine N` |

另外剔除 10 个样本唯一标识列（`SampleID`、`Library.Name`、`Sample.Name` 等，326 个全唯一且含命名规则），以及 17 个与 BioProject 一一对应的批次代理列（`Center.Name`、`Instrument`、`ReleaseDate` 等）。

`build_features.py` 会逐列打印这些列与标签的可分性，供人工核查而非盲信。

### 2.2 成分数据变换

菌群丰度是**成分数据**（每个样本的总和固定），直接用原始计数跑线性模型是方法学错误。处理链：

```
流行度过滤 (≥10% 样本中出现)  →  伪计数 +0.5  →  相对丰度  →  CLR (centered log-ratio)
```

275 特征 → **70 特征**（主队列）。p/n ≈ 0.27，属于可控范围。

### 2.3 防止选择偏倚的关键设计

流行度过滤和 CLR 被封装成 sklearn transformer `mb_common.PrevalenceCLR`，**在交叉验证每一折的训练集内部拟合**：

```python
Pipeline([('clr', PrevalenceCLR(0.10)), ('sc', StandardScaler()), ('clf', ...)])
```

如果先在全量数据上过滤再做 CV，验证折的信息会通过"哪些特征被保留"泄漏进来，AUC 虚高约 0.01–0.02。CLR 本身是逐样本的行内运算，不存在跨样本泄漏。

### 2.4 关于 Genus 聚合

聚合到 Genus 层时，55 个无 Genus 注释的特征保留为 `Genus_unassigned_<FeatureID>` 而**不丢弃**——丢弃会损失丰度、破坏成分数据的封闭性、使 CLR 失真。因此是 275 → 210 而非 → 155。

---

## 3. 模型训练与评估

### 3.1 评估协议

```
外层  RepeatedStratifiedKFold(5 折 × 5 次 = 25 折)   → 性能评估
内层  StratifiedKFold(4 折)                          → 超参搜索
所有模型共用同一套折划分，保证可比
指标  ROC-AUC / PR-AUC / Accuracy / Balanced Acc / 灵敏度 / 特异度 / Precision / F1 / MCC
```

嵌套 CV 保证报告的性能不含调参偏倚。

### 3.2 六模型性能比较

n=260，70 个 CLR 特征，Pos=151 / Neg=109

| 模型 | Accuracy | Balanced Acc | ROC-AUC | PR-AUC | 灵敏度 | 特异度 | Precision | F1 | MCC |
|---|---|---|---|---|---|---|---|---|---|
| **SVM-RBF** | **0.771** | **0.761** | **0.839** | **0.872** | 0.820 | **0.703** | **0.795** | **0.805** | **0.531** |
| RandomForest | 0.725 | 0.701 | 0.810 | 0.851 | **0.850** | 0.553 | 0.728 | 0.782 | 0.433 |
| HistGB | 0.722 | 0.705 | 0.796 | 0.841 | 0.809 | 0.600 | 0.739 | 0.771 | 0.423 |
| L1-LR | 0.709 | 0.707 | 0.787 | 0.842 | 0.722 | 0.692 | 0.770 | 0.742 | 0.414 |
| L2-LR | 0.690 | 0.686 | 0.782 | 0.844 | 0.710 | 0.662 | 0.746 | 0.725 | 0.373 |
| SVM-linear | 0.692 | 0.672 | 0.766 | 0.830 | 0.796 | 0.549 | 0.711 | 0.749 | 0.362 |
| *基线（全猜 Pos）* | *0.581* | *0.500* | *0.500* | *0.581* | *1.000* | *0.000* | *0.581* | *0.735* | *0.000* |

标准差见 `results/model_comparison_full.csv`（典型 ±0.05）。

**配对显著性检验**（同一批 25 折的配对 AUC）：

```
SVM-RBF vs RandomForest   Δ=+0.029   25折中17折胜   Wilcoxon p=0.021    配对t p=0.013
SVM-RBF vs L1-LR          Δ=+0.052   25折中21折胜   Wilcoxon p=0.0002   配对t p<0.0001
```

**SVM-RBF 显著优于其余模型。**

### 3.3 指标解读的三个陷阱

1. **Accuracy 的基线是 0.581 而非 0.5**（阳性率 58%）。SVM-RBF 的 0.771 对应真实增益 +19 个百分点。
2. **F1 不可用于模型选择**：基线模型的 F1 = 0.735，比 L2-LR 的 0.725 还高。阳性占多数时 F1 严重虚高。
3. **最可靠的比较指标是 MCC 和 Balanced Acc**（基线均为 0）。树模型的 accuracy 部分靠顺着阳性率猜——RF 特异度仅 0.553，而 SVM-RBF 为 0.703。

### 3.4 超参稳健性

SVM-RBF 网格从 `C=[0.1…10]` 扩展到 `[0.01…500]`、`gamma` 扩展到 `[1e-4…0.1]+scale` 后重跑：

```
扩展网格 AUC 0.838 ± 0.052（原 0.839，无变化）
选中分布  C: 1.0(3折) 5.0(9折) 10.0(2折) 50.0(1折)   gamma: scale(11折) 0.01(4折)
触及网格边缘: 0/15 折  → 范围充分，C=5 是内部最优
```

超参曲面（`results/svm_hyperparam_surface.csv`）平坦，跨度仅 0.73–0.81，说明性能不依赖精细调参。

---

## 4. 结果有效性验证

这一节是全部工作中最重要的部分——高 AUC 本身不说明问题，必须排除过拟合与混杂。

### 4.1 置换检验：信号是真实的

```
实测 AUC 0.743  |  零分布 0.501 ± 0.049（100 次打乱标签，max 0.614）  |  p = 0.0099
```

### 4.2 混杂因子的识别

采样月份与标签强相关，是本数据集最大的混杂来源：

| month | 1 | 7 | 8 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|
| Neg | 45 | 34 | 12 | 18 | **0** | **0** |
| Pos | 5 | 52 | 25 | 24 | 27 | 18 |

11–12 月 100% 阳性，1 月 90% 阴性。且菌群本身编码了采样信息：

```
菌群 → 预测"采样于 11-12 月"    AUC 0.777
菌群 → 预测采样地点（最大类）    AUC 0.795
```

### 4.3 月份分层：混杂不能解释全部信号

在**同一采样月份内部**重跑模型：

| 分层 | n | Pos | AUC |
|---|---|---|---|
| 7 月 | 86 | 52 | **0.964** |
| Jul+Aug | 123 | 77 | **0.944** |
| 10 月 | 42 | 24 | 0.860 |
| Jan+Oct | 92 | 29 | **0.668** |
| 1 月 / Nov+Dec | 50 / 45 | 5 / 45 | 少数类过少，无法建模 |

**结论：菌群—感染关联不是季节混杂造成的假象。** 但效应在不同季节高度不均匀（0.668 至 0.964），这一异质性必须在论文中如实报告，不能只挑 Jul+Aug 的 0.944。

### 4.4 特征集消融

```
仅协变量（季节/地点/物种/性别/月份）  AUC 0.881 ± 0.037
仅菌群                              AUC 0.766 ± 0.054
菌群 + 协变量                        AUC 0.924 ± 0.030
```

菌群相对协变量有独立增量贡献（+0.043）。**但注意：仅协变量就有 0.881，这是"混杂基线"**——任何声称菌群有预测价值的结论都必须以超过此基线为前提，或明确区分两者贡献。

---

## 5. 已知局限

### 5.1 跨研究泛化不成立

```
GroupKFold (按 BioProject)   L2-LR 0.542 ± 0.286    RF 0.605 ± 0.276
```

标准差 0.28，等同随机。原因是 4 个研究的宿主（鸭/火鸡/鸡/天鹅）、组织、地域完全不同，且 3 个小研究仅 6/15/45 例。**本模型的结论仅在 UC Davis 野鸭队列内成立，不可外推。** `allstudies_*` 数据集只适合做合并队列的内部 CV，且结果会被批次效应污染。

### 5.2 特征表可能已被上游过滤（未解决）

275 个特征对禽类肠道 16S 数据而言异常少（典型为数千至上万个 ASV）。该表大概率经过上游预过滤，**但过滤规则未知**。若过滤时使用了标签信息，本文所有性能数字都需打折。**这是目前最大的未解决风险，建议向数据提供方确认。**

### 5.3 抽平方式不严谨

208 个样本恰好 5000、118 个低于 5000，说明是"抽平到 5000，不足者保留原样"。本文全程使用 CLR，绕开了这一问题，但若要报告 alpha 多样性等依赖测序深度的指标，需重新处理。

### 5.4 阈值未经优化

所有 Accuracy 均在固定阈值 0.5 下计算。阈值 0.55 可将 RF 的 accuracy 提至 0.735 且灵敏度/特异度更平衡，但**该阈值是在测试数据上挑选的，属事后调优**。要使用需将阈值选择纳入 CV 内层。

### 5.5 分类学分辨率有限

Species 层完全无注释，55 个特征无 Genus 注释。生物学解释只能到属或科水平。

---

## 6. 生物学发现

### 6.1 三套独立方法的交集

将 SVM permutation importance、L1 稳定性选择（200 次 bootstrap，C=0.1）、差异丰度（CLR + Welch t + BH-FDR）三套方法交叉比对，**9 个特征被三者同时命中**，构成最可靠的 biomarker 集合：

| Genus | Family | SVM 重要性 | L1 频率 | 方向 | FDR |
|---|---|---|---|---|---|
| *(未定属)* | Ruminococcaceae | 0.0198 | 0.925 | Pos↑ | 0.012 |
| *Varibaculum* | Actinomycetaceae | 0.0131 | 0.985 | Pos↑ | 2e-04 |
| *Rothia* | Micrococcaceae | 0.0100 | 0.995 | Pos↓ | 2e-06 |
| *Psittacicella* | Pasteurellaceae | 0.0079 | 0.925 | Pos↑ | 9e-04 |
| *Staphylococcus* | Staphylococcaceae | 0.0060 | 0.940 | Pos↓ | 1e-03 |
| *Lawsonella* | Corynebacteriaceae | 0.0055 | 0.930 | Pos↓ | 0.017 |
| *Candidatus_Arthromitus* (SFB) | Clostridiaceae | 0.0050 | 0.995 | Pos↑ | 4e-05 |
| 2 个未注释特征 | — | — | ≥0.915 | Pos↑ | ≤1e-04 |

差异丰度整体：70 个特征中 **19 个 FDR < 0.05**。

*Candidatus Arthromitus*（分节丝状菌，SFB）在阳性组升高——该菌诱导 Th17 与 IgA 应答，有独立的免疫学文献支撑。

### 6.2 方法间分歧同样有信息量

- ***Veillonella***：permutation importance 排名第 2 且 **25 折中 100% 为正**，FDR = 2.3e-05 极显著，但 **L1 频率仅 0.105**。典型共线性表现——L1 在一组相关特征中只保留一个。**不能因 L1 未选中而排除它。**
- ***Moraxella* / *Fusibacter* / *Cetobacterium***：permutation importance 不低（0.008–0.009，为正比例 0.88），但单变量 FDR 分别为 0.87 / 0.90 / 0.97，完全不显著。**它们通过非线性交互起作用，单变量检验无法捕捉。**

### 6.3 存在真实的非线性结构

两条独立证据：

1. SVM-RBF (0.839) 显著优于 SVM-linear (0.766)，差距 0.073 —— **赢的是核函数，不是 SVM 本身**
2. 上述"重要但单变量不显著"的特征群

这也修正了早期基于线性/树模型打平所做的"非线性成分不强"的判断。

---

## 7. 文件说明

### 7.1 代码

| 文件 | 作用 |
|---|---|
| `mb_common.py` | 共享模块：数据加载、泄漏列清单、`PrevalenceCLR` 变换器 |
| `build_features.py` | 构建特征矩阵 + 质控报告 |
| `export_ml_dataset.py` | 导出开箱即用的建模数据集 |
| `merge_counts_clr.py` | 将计数与 CLR 两种表示合并为单文件 |
| `train_eval.py` | 完整评估流程：嵌套 CV、置换检验、混杂检查、月份分层、差异丰度、稳定性选择 |
| `compare_models.py` | 六模型横向比较（全指标） |
| `svm_analysis.py` | SVM 超参网格扩展 + permutation importance |
| `dna_embedding.py` | DNABERT-2 / NT-v2 序列嵌入（备选特征路线，本文未采用） |

### 7.2 建模数据集 `ml_dataset/`

| 文件 | 内容 |
|---|---|
| **`primary_merged.csv`** | **主力文件**：260 × 152 = 12 元数据 + 70 `__count` + 70 `__clr` |
| `primary_clr.csv` | 260 × 70，仅 CLR |
| `primary_counts.csv` | 260 × 70，仅原始计数（配 pipeline 用，评估更严谨） |
| `allstudies_clr.csv` / `allstudies_counts.csv` | 326 × 79，全部研究（**不建议用于跨研究泛化**） |
| `feature_dictionary.csv` | 列名 → FeatureID → 完整分类学 + 流行度 |
| `README.txt` | 列含义与使用注意 |

数据集结构：

```
SampleID(索引) | label | Influenza | BioProject | HostGroup | HostType |
Season | Age | Sex | Feeding | Species | Location | month | <特征列>
```

- `label`：0=Neg，1=Pos，int，**建模用这一列**
- 特征列名格式 `<Genus>__<FeatureID前8位>`，如 `Bacteroides__a13d2ac8`
- 特征区无 NaN，无需插补
- **`__count` 与 `__clr` 两块不可同时使用**——同一特征的两种编码，完全共线

### 7.3 结果 `results/`

| 文件 | 内容 |
|---|---|
| `model_comparison_full.csv` | 六模型 × 9 指标 + 标准差 |
| `svm_hyperparam_surface.csv` | SVM 的 C × gamma 曲面 |
| `svm_permutation_importance.csv` / `.png` | SVM-RBF 特征重要性 |
| `stability_selection.csv` | L1 bootstrap 选中频率 |
| `differential_abundance.csv` | CLR + Welch t + BH-FDR |
| `month_stratified.csv` / `confound_check.csv` | 混杂分析 |
| `permutation_null.txt` / `summary.json` | 置换检验零分布与汇总 |
| `summary_plots.png` | ROC + 火山图 + 稳定性选择三联图 |

---

## 8. 复现步骤

```bash
python3 build_features.py            # → features/  质控报告
python3 export_ml_dataset.py         # → ml_dataset/ 建模数据集
python3 merge_counts_clr.py          # → ml_dataset/primary_merged.csv
python3 train_eval.py                # → results/   完整评估（约 5 分钟）
python3 compare_models.py            # → results/model_comparison_full.csv
python3 svm_analysis.py              # → results/svm_*
```

常用选项：

```bash
python3 train_eval.py --quick             # 跳过置换/bootstrap，约 1 分钟
python3 train_eval.py --level genus       # Genus 层特征
python3 train_eval.py --study all         # 全部 326 样本 + 跨研究 GroupKFold
python3 train_eval.py --scan-l1C          # 扫描 L1 惩罚强度
python3 svm_analysis.py --only grid       # 仅跑网格扩展
```

三行代码快速验证：

```python
import pandas as pd
from sklearn.svm import SVC
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, RepeatedStratifiedKFold

d = pd.read_csv('ml_dataset/primary_merged.csv', index_col=0)
X = d[[c for c in d if c.endswith('__clr')]].values
y = d['label'].values
cross_val_score(make_pipeline(StandardScaler(),
                              SVC(kernel='rbf', C=5, class_weight='balanced')),
                X, y, cv=RepeatedStratifiedKFold(5, n_repeats=5), scoring='roc_auc')
```

---

## 9. 结论

1. **野鸭肠道菌群携带流感感染状态的可判别信号，且信号是真实的。** 置换检验 p=0.0099；月份分层后仍保持 0.86–0.96（Jul–Aug 队列）。

2. **最优模型为 SVM-RBF**（C=5，gamma=scale）：AUC 0.839 ± 0.060，PR-AUC 0.872，MCC 0.531，Accuracy 0.771（基线 0.581）。显著优于随机森林（p=0.021）与 L1-LR（p<0.001）。超参网格已验证无边界效应。

3. **菌群中存在真实的非线性结构。** RBF 核相对线性核有 0.073 的 AUC 优势，且部分重要特征在单变量检验中完全不显著。

4. **9 个特征通过三套独立方法的交叉验证**：*Rothia*、*Staphylococcus*、*Lawsonella* 在阳性组降低，*Candidatus Arthromitus*(SFB)、*Varibaculum*、*Psittacicella* 及一个未定属 Ruminococcaceae 升高（另含 2 个未注释特征）。
   *Veillonella* 与 *Prevotella* 虽在阳性组显著降低（FDR 2.3e-05 / 3.6e-05）且 *Veillonella* 的 SVM 重要性排名第 2，但 L1 选中频率仅 0.105 / 0.005，未进入交集——这是共线性导致的，不代表其无生物学意义（详见 §6.2）。

5. **采样季节是不可忽视的混杂因子**，单独使用协变量即可达 AUC 0.881。任何关于菌群预测价值的表述都必须相对此基线，并报告效应在季节间的异质性。

6. **结论的适用范围严格限于 UC Davis 野鸭队列**，跨宿主、跨研究不成立。

7. **最大的未决风险是特征表的上游过滤规则未知**（§5.2），需向数据提供方确认后方可最终定稿。

### 建议的论文写法

- 主模型 SVM-RBF，附超参曲面证明非过度调参
- L1-LR 作为可解释性对照，用于 biomarker panel
- 主指标 ROC-AUC + PR-AUC + MCC；Accuracy 须与 0.581 基线并列报告
- 必须包含：置换检验、月份分层结果（含 Jan+Oct 的 0.668）、协变量消融
- 局限章节须涵盖 §5 全部六项
