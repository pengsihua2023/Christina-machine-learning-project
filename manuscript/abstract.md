# Abstract

*Structured abstract, ~330 words. Every figure traces to `results/`; see
`abstract_number_sources.md` for the mapping.*

---

## English

**Background.** Avian influenza surveillance in wild waterfowl relies on direct
viral detection. Whether the gut microbiome carries a parallel signal of infection
status remains unclear, and any such signal is difficult to separate from the
strong seasonal and site structure inherent to field sampling.

**Methods.** We analysed 16S rRNA gene profiles from 260 wild ducks (151
influenza-positive, 109 negative; cloacal swabs; BioProject PRJNA464410). Counts
for 275 reference features were restricted to those present in ≥10% of samples
(70 retained) and centred log-ratio transformed; both steps were refitted inside
every cross-validation training fold so that no validation sample influenced
feature selection. Seventeen classifiers were compared under nested
cross-validation (outer 5-fold × 5 repeats = 25 folds; inner 4-fold) on identical
splits. Validity was assessed by label permutation (100 shuffles), by covariate
ablation, and by refitting within single sampling months.

**Results.** Microbiome-based classification exceeded chance (SVM-RBF AUC
0.839 ± 0.060; permutation p = 0.0099 against a null of 0.501 ± 0.049). Sampling
month was a strong confounder: covariates alone (season, site, species, sex)
reached AUC 0.881, and the microbiome itself predicted November–December sampling
at AUC 0.777. Because season is a confounder rather than an exposure of
interest, the primary estimate was obtained by stratification, keeping only microbiome
features in the model: within single months, AUC ranged from 0.734 in October
(accuracy 0.676, specificity 0.533) to 0.965 in July (accuracy 0.949, specificity
0.929), with July and August combined reaching 0.959. Only 165 of 260 samples could
enter a stratified analysis, as November and December were entirely positive. Under
covariate adjustment instead, the microbiome added between 0.043 and 0.105 AUC
depending on the model. Model choice could not be resolved by
discrimination: the two leading models were statistically indistinguishable
(ExtraTrees AUC 0.859 vs SVM-RBF 0.839, Wilcoxon p = 0.085), and three of the top
four formed a mutually indistinguishable group (pairwise p = 0.360–0.609), so no
consistent ranking exists among the leaders. By contrast, a controlled kernel ablation was
unambiguous — a radial basis kernel outperformed a linear one on 25 of 25 folds
(ΔAUC = +0.073, p = 1 × 10⁻⁵) — indicating genuine nonlinear structure, consistent
with several taxa carrying substantial permutation importance despite
non-significant univariate tests. Nine taxa were selected concordantly by
permutation importance, L1 stability selection and differential abundance,
including depletion of *Rothia*, *Staphylococcus* and *Lawsonella*, and enrichment
of *Candidatus* Arthromitus (segmented filamentous bacteria), *Varibaculum* and
*Psittacicella* in infected birds.

**Conclusions.** Wild duck gut microbiota carry a reproducible, partly nonlinear
signal of influenza infection status that survives adjustment for seasonal
confounding, but its strength is markedly heterogeneous across seasons and its
incremental value over routinely recorded sampling covariates is modest. Findings are specific to this cohort; cross-study
generalisation failed (AUC 0.54 ± 0.29 across four host species).

**Keywords:** avian influenza; gut microbiome; 16S rRNA; compositional data;
machine learning; confounding; wild waterfowl

---

## 中文

**背景。** 野生水禽的禽流感监测依赖病毒的直接检测。肠道菌群是否携带与感染状态平行的
信号尚不清楚；而且野外采样固有的强季节性与地点结构，使得任何此类信号都难以与混杂
因素分离。

**方法。** 我们分析了 260 只野鸭的 16S rRNA 基因图谱（151 例流感阳性，109 例阴性；
泄殖腔拭子；BioProject PRJNA464410）。275 个参考特征的计数被限制为在 ≥10% 样本中
出现者（保留 70 个）并做中心对数比（CLR）变换；两个步骤均在每一个交叉验证训练折
内部重新拟合，以确保没有任何验证样本影响特征选择。在完全相同的折划分上，采用嵌套
交叉验证（外层 5 折 × 5 次重复 = 25 折；内层 4 折）比较了 17 种分类器。有效性通过
标签置换检验（100 次打乱）、协变量消融以及在单一采样月份内部重新拟合来评估。

**结果。** 基于菌群的分类显著优于随机（SVM-RBF AUC 0.839 ± 0.060；置换检验
p = 0.0099，零分布 0.501 ± 0.049）。采样月份是强混杂因子：仅协变量（季节、地点、
物种、性别）即达 AUC 0.881，且菌群本身预测"是否采样于 11–12 月"的 AUC 为 0.777。
尽管如此，该关联在单一月份内部依然存在（7–8 月 AUC 0.944；10 月 0.860），但在
1 月与 10 月合并的分层中明显减弱（0.668）；菌群特征相对仅协变量带来 0.043 的 AUC
增量。模型选择无法由判别能力决定：两个领跑
模型在统计上无法区分（ExtraTrees AUC 0.859 对 SVM-RBF 0.839，Wilcoxon p = 0.085），
且前四名中有三个构成互相无法区分的一组（两两 p = 0.360–0.609），因此领先者之间不存在
一致的排名。相反，一次受控的核函数消融给出了明确
结论——径向基核在 25 折中 25 折全部优于线性核（ΔAUC = +0.073，p = 1 × 10⁻⁵）——
提示存在真实的非线性结构；这与若干菌属虽在单变量检验中不显著、却具有可观的置换
重要性相一致。九个菌属被置换重要性、L1 稳定性选择与差异丰度三种方法一致选中，
包括感染个体中 *Rothia*、*Staphylococcus*、*Lawsonella* 的降低，以及
*Candidatus* Arthromitus（分节丝状菌）、*Varibaculum*、*Psittacicella* 的富集。

**结论。** 野鸭肠道菌群携带可复现、部分为非线性的流感感染状态信号，该信号经季节
混杂校正后依然存在；但其强度在不同季节间高度异质，且相对于常规记录的采样协变量，
其增量价值有限。本研究结论仅适用
于该队列；跨研究泛化失败（四个宿主物种间 AUC 0.54 ± 0.29）。

**关键词：** 禽流感；肠道菌群；16S rRNA；成分数据；机器学习；混杂；野生水禽
