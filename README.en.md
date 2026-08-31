# Binary Classification of Avian Influenza Infection Status from Gut Microbiota

Predicting influenza infection status (Influenza Pos/Neg) in wild waterfowl from
16S rRNA microbiome abundance. This document records the complete data processing,
modeling, and evaluation workflow, the conclusions, and all known limitations.

*(Chinese version: `README.md`)*

> **Unfamiliar with the statistical terms used here?** See **[§10 Glossary](#10-glossary)** at the end — CLR, Welch t, BH-FDR, L1 stability selection, MCC, label leakage and others, each in one line with a measured value from this project.

---

## 1. Data

### 1.1 Raw inputs

| File | Contents |
|---|---|
| `genus_raw_counts_by_featureID.csv` | Feature matrix, 326 samples × 275 FeatureIDs, integer counts |
| `taxonomy_key.csv` | Seven-level taxonomic annotation for the 275 FeatureIDs |
| `metadata_all_samples-0810.csv` | Sample metadata, 326 samples × 102 columns |
| `sample_counts_by_study_host_infection(in).csv` | Summary table (not used for modeling; suitable for a Table 1) |

SampleIDs match **326/326** across all three files, and FeatureIDs match **275/275**.
No missing values, no duplicates.

### 1.2 Cohort composition

Data come from four BioProjects that differ greatly in host and size:

| BioProject | Center | Host | Samples | Neg | Pos |
|---|---|---|---|---|---|
| **PRJNA464410** | UC Davis | Wild ducks (cloacal swabs) | **260** | 109 | 151 |
| PRJNA644054 | Ohio State | Turkey | 45 | 13 | 32 |
| PRJNA347583 | Chinese Academy of Sciences | Whooper swan | 15 | 5 | 10 |
| PRJNA379944 | South China Agricultural Univ. | Chicken | 6 | 3 | 3 |

**The primary analysis cohort is restricted to PRJNA464410 (n=260)**; rationale in §5.1.

### 1.3 Data characteristics

```
Sequencing depth   208 samples at exactly 5000, 118 below 5000, minimum 1787  → already rarefied upstream
Sparsity           90.2% of cells are zero
Prevalence         >=5%→117 features   >=10%→79   >=20%→36   >=50%→10
Taxonomy           275 FeatureIDs → 155 genera; Species level entirely empty, Family missing for 13
```

---

## 2. Data Processing

### 2.1 Identifying and removing label-leaking columns

Among the 102 metadata columns, many are the label itself or deterministic functions
of it. Retaining any one of them lets a model reach 100% accuracy while learning
nothing. The full list lives in `mb_common.py: LEAKAGE_COLS`:

| Column | Mode of leakage |
|---|---|
| `Infection` | Identical to `Influenza` |
| `CoreGroup` | `HostGroup_label`, e.g. `Duck_Pos` |
| `HASubType` / `NASubType` / `HASubType_NASubType` | Neg is always the string `"neg"`; Pos always carries a subtype number |
| `Log10_Virus_titer_...` | Viral titer is a direct measurement of infection |
| `True_or_Neg` / `Infection_Status` / `Infecting_Agent` / `experimental_group` | Infection group annotations |
| `isolation_source` | `mock` vs `Intestine N` |

Also removed: 10 sample-identifier columns (`SampleID`, `Library.Name`, `Sample.Name`,
etc. — all 326 unique and carrying naming conventions), and 17 batch-proxy columns
that map one-to-one onto BioProject (`Center.Name`, `Instrument`, `ReleaseDate`, etc.).

`build_features.py` prints the label-separability of each of these columns so they can
be inspected rather than trusted blindly.

### 2.2 Compositional data transformation

Microbiome abundances are **compositional** (each sample sums to a fixed total);
feeding raw counts to a linear model is a methodological error. The processing chain:

```
prevalence filter (present in >=10% of samples)  →  pseudocount +0.5  →  relative abundance  →  CLR (centered log-ratio)
```

275 features → **70 features** (primary cohort). p/n ≈ 0.27, a manageable regime.

### 2.3 Key design that prevents selection bias

The prevalence filter and CLR are wrapped in the sklearn transformer
`mb_common.PrevalenceCLR` and are **fitted inside the training split of every
cross-validation fold**:

```python
Pipeline([('clr', PrevalenceCLR(0.10)), ('sc', StandardScaler()), ('clf', ...)])
```

Filtering on the full dataset before CV would leak validation-fold information through
the choice of which features survive, inflating AUC by roughly 0.01–0.02. CLR itself is
a within-row operation per sample, so it carries no cross-sample leakage.

### 2.4 On genus-level aggregation

When collapsing to the genus level, the 55 features without a genus annotation are kept
as `Genus_unassigned_<FeatureID>` rather than **discarded** — discarding them would lose
abundance, break the closure property of compositional data, and distort the CLR. Hence
275 → 210, not → 155.

---

## 3. Model Training and Evaluation

### 3.1 Evaluation protocol

```
Outer   RepeatedStratifiedKFold(5 folds × 5 repeats = 25 folds)   → performance estimation
Inner   StratifiedKFold(4 folds)                                  → hyperparameter search
All models share the same fold partition to ensure comparability
Metrics ROC-AUC / PR-AUC / Accuracy / Balanced Acc / Sensitivity / Specificity / Precision / F1 / MCC
```

Nested CV ensures the reported performance is free of tuning bias.

### 3.2 Seventeen-model comparison

n=260, 70 CLR features, Pos=151 / Neg=109

**17 models** were compared (16 individual + 1 soft-voting ensemble) in two rounds. Round one covered five families — linear, sparse, tree, boosting, kernel. Round two followed the lead that round one exposed (the RBF kernel significantly beat the linear one, so distance structure matters) and added kernel methods, nearest neighbours, discriminant analysis, and the field-standard PLS-DA.

| Model | Accuracy | Balanced Acc | ROC-AUC | PR-AUC | Sens. | Spec. | F1 | MCC |
|---|---|---|---|---|---|---|---|---|
| **ExtraTrees** | **0.778** | 0.756 | **0.858** | **0.891** | **0.887** | 0.626 | **0.822** | **0.542** |
| **SVM-RBF** | 0.773 | **0.764** | 0.835 | 0.871 | 0.820 | **0.708** | 0.807 | 0.535 |
| Ensemble (soft-vote) | 0.767 | 0.757 | 0.834 | 0.874 | 0.816 | 0.699 | 0.802 | 0.523 |
| SVM-poly | 0.740 | 0.718 | 0.825 | 0.851 | 0.857 | 0.579 | 0.792 | 0.463 |
| GP-RBF | 0.749 | 0.733 | 0.821 | 0.868 | 0.834 | 0.631 | 0.794 | 0.482 |
| GP-Matérn | 0.746 | 0.728 | 0.818 | 0.866 | 0.841 | 0.615 | 0.793 | 0.475 |
| RandomForest | 0.718 | 0.693 | 0.806 | 0.845 | 0.850 | 0.535 | 0.777 | 0.416 |
| XGBoost | 0.727 | 0.716 | 0.800 | 0.846 | 0.786 | 0.646 | 0.768 | 0.441 |
| HistGB | 0.709 | 0.695 | 0.794 | 0.843 | 0.783 | 0.608 | 0.757 | 0.399 |
| kNN-Aitchison | 0.710 | 0.679 | 0.790 | 0.830 | 0.870 | 0.488 | 0.776 | 0.402 |
| L2-LR | 0.665 | 0.664 | 0.772 | 0.842 | 0.673 | 0.655 | 0.699 | 0.327 |
| L1-LR | 0.687 | 0.685 | 0.772 | 0.838 | 0.697 | 0.673 | 0.720 | 0.369 |
| ElasticNet-LR | 0.685 | 0.682 | 0.770 | 0.837 | 0.697 | 0.668 | 0.717 | 0.365 |
| PLS-DA | 0.706 | 0.697 | 0.769 | 0.834 | 0.755 | 0.638 | 0.748 | 0.400 |
| LDA-shrinkage | 0.682 | 0.668 | 0.766 | 0.838 | 0.756 | 0.580 | 0.733 | 0.344 |
| SVM-linear | 0.678 | 0.661 | 0.755 | 0.827 | 0.771 | 0.551 | 0.735 | 0.335 |
| MLP | 0.605 | 0.597 | 0.629 | 0.717 | 0.655 | 0.538 | 0.645 | 0.202 |
| *Baseline (always Pos)* | *0.581* | *0.500* | *0.500* | *0.581* | *1.000* | *0.000* | *0.735* | *0.000* |

Standard deviations are in `results/model_comparison_all16.csv` (typically ±0.05; MLP reaches ±0.12).

**Paired significance tests** (paired per-fold AUC over the same 25 folds):

```
SVM-RBF vs RandomForest   Δ=+0.029   wins 18/25   Wilcoxon p=0.0173   paired t p=0.0085
SVM-RBF vs XGBoost        Δ=+0.035   wins 20/25   Wilcoxon p=0.0051   paired t p=0.0042
SVM-RBF vs L1-LR          Δ=+0.063   wins 23/25   Wilcoxon p=0.0001   paired t p<0.0001
SVM-RBF vs SVM-linear     Δ=+0.080   wins 24/25   Wilcoxon p<0.0001   paired t p<0.0001
ExtraTrees vs SVM-RBF     Δ=+0.023   wins 14/25   Wilcoxon p=0.0409   paired t p=0.0295
```

**Note: comparing the winner against a clearly weaker model (e.g. SVM-RBF vs L1-LR, p<0.0001) carries almost no information.** The question that matters is whether the leading models can be told apart. All 15 pairwise tests among the top six (`results/top_cluster_pairwise.csv`):

| Wilcoxon p | SVM-RBF | Ensemble | SVM-poly | GP-RBF | GP-Matérn |
|---|---|---|---|---|---|
| **ExtraTrees** | **0.041** | **0.012** | **0.000** | **0.003** | **0.001** |
| **SVM-RBF** | — | 0.539 | 0.270 | 0.069 | **0.035** |
| **Ensemble** | — | — | 0.331 | **0.023** | **0.003** |
| **SVM-poly** | — | — | — | 0.925 | 0.809 |
| **GP-RBF** | — | — | — | — | **0.044** |

(bold = p<0.05, distinguishable)

**Note that indistinguishability is not transitive.** The two leaders, ExtraTrees and SVM-RBF, cannot be separated (p=0.085); SVM-RBF, the ensemble and SVM-poly are mutually indistinguishable (p=0.360–0.609); but ExtraTrees does separate from the ensemble and SVM-poly (p=0.005 / 0.003). **No consistent ranking therefore exists among the leaders**, whose AUCs span 0.825–0.858, inside the ±0.04–0.06 fold-to-fold spread. **Model choice therefore cannot be decided by AUC** — only by error structure and robustness on weak strata (§3.3).

The one genuinely controlled and genuinely decisive comparison is the kernel ablation: **SVM-RBF vs SVM-linear, Δ=+0.080, winning 24 of 25 folds, Wilcoxon p<0.0001** — same model family, only the kernel differs (§6.4).

### 3.3 On ExtraTrees and the choice of primary model

ExtraTrees beats SVM-RBF on AUC (0.858), PR-AUC (0.891), and MCC (0.542), with the smallest fold-to-fold SD of any model (±0.041 vs ±0.060). It differs from a random forest in that **split points are chosen at random rather than greedily optimised** — extra randomisation that acts as strong regularisation at n=260.

The primary model nonetheless remains **SVM-RBF**:

1. **The statistical evidence does not support replacement**: p=0.041 against SVM-RBF is nominally significant but fails the Bonferroni threshold for 15 pairwise tests (0.0033), and it wins only 14/25 folds; it is also the maximum over 17 models and is inflated by that selection (§5.7).
2. **Worse error structure**: ExtraTrees runs 0.887 sensitivity / 0.626 specificity against SVM-RBF's 0.820 / 0.708. **ExtraTrees still carries the tree-model tendency to guess positive**, and its balanced accuracy is actually lower (0.756 vs 0.764).
3. **The supporting analyses are already built around SVM-RBF**: hyperparameter surface, permutation importance, three-method biomarker intersection.

`validate_extratrees.py` subjects ExtraTrees to exactly the same validation as SVM-RBF (month stratification, permutation test, permutation importance, rank agreement with SVM); results in `results/et_*`.

**Validation outcome (completed, `results/et_*`)**:

| Stratum | n | Pos | ExtraTrees | SVM-RBF | Δ |
|---|---|---|---|---|---|
| July | 86 | 52 | 0.988 | 0.975 | +0.013 |
| Jul+Aug | 123 | 77 | 0.970 | 0.961 | +0.008 |
| October | 42 | 24 | 0.827 | 0.819 | +0.008 |
| **Jan+Oct (weakest)** | 92 | 29 | **0.715** | **0.774** | **−0.060** |

**This is decisive: ExtraTrees leads slightly on the easy strata (+0.008 to +0.013) but falls clearly behind on the hardest one, Jan+Oct (−0.060).** Its overall AUC advantage comes from scenarios that were already easy, while it is worse precisely where the signal is weakest and model capability matters most. This is consistent with the explanation that ExtraTrees gains from extra randomisation acting as strong regularisation — harmless when signal is strong, destructive when it is weak.

All other checks pass:

```
Permutation test   observed 0.856 | null 0.496 ± 0.046 (max 0.598) | p = 0.0099   OK
Rank agreement     Spearman rho = 0.738 (p=3.3e-13) against SVM-RBF importance
                   Top-15 overlap 10/15                                           OK
```

The rank agreement shows the **biomarker conclusions do not depend on model choice** — under ExtraTrees, *Veillonella*, *Rothia*, *Candidatus Arthromitus*, *Staphylococcus*, and *Lawsonella* still rank near the top. That strengthens §6.2.

**Final decision: SVM-RBF remains the primary model.** The grounds are no longer merely "p=0.085 is not significant" but the measured fact that ExtraTrees performs worse on the weakest stratum.


### 3.4 Three pitfalls in reading these metrics

1. **The accuracy baseline is 0.581, not 0.5** (58% positive rate). SVM-RBF's 0.771
   corresponds to a real gain of +19 percentage points.
2. **F1 must not be used for model selection**: the baseline model scores F1 = 0.735,
   higher than L2-LR's 0.699. F1 is severely inflated when positives dominate.
3. **The most reliable comparison metrics are MCC and Balanced Accuracy** (both have a
   baseline of 0). Greedy-split tree models earn part of their accuracy by riding the
   positive rate — RF's specificity is only 0.535, versus 0.708 for SVM-RBF. ExtraTrees
   improves on this (0.626) without eliminating it.

### 3.5 Hyperparameter robustness

The SVM-RBF grid was expanded from `C=[0.1…10]` to `[0.01…500]` and `gamma` to
`[1e-4…0.1]+scale`, then rerun:

```
Expanded-grid AUC 0.838 ± 0.052 (was 0.839 — unchanged)
Selected values   C: 1.0(3 folds) 5.0(9) 10.0(2) 50.0(1)   gamma: scale(11) 0.01(4)
Folds hitting a grid edge: 0/15  → range is adequate; C=5 is an interior optimum
```

The hyperparameter surface (`results/svm_hyperparam_surface.csv`) is flat, spanning only
0.73–0.81, indicating performance does not depend on fine-grained tuning.

---

## 4. Validity Checks

This section is the most important part of the work — a high AUC means nothing on its
own until overfitting and confounding have been ruled out.

### 4.1 Permutation test: the signal is real

```
Observed AUC 0.743  |  null 0.501 ± 0.049 (100 label shuffles, max 0.614)  |  p = 0.0099
```

### 4.2 Identifying the confounder

Sampling month is strongly associated with the label and is the dataset's largest source
of confounding:

| month | 1 | 7 | 8 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|
| Neg | 45 | 34 | 12 | 18 | **0** | **0** |
| Pos | 5 | 52 | 25 | 24 | 27 | 18 |

November–December is 100% positive; January is 90% negative. The microbiome itself
encodes sampling information:

```
Microbiome → predict "sampled in Nov–Dec"    AUC 0.777
Microbiome → predict sampling site (largest) AUC 0.795
```

### 4.3 Month-stratified analysis: confounding does not explain the whole signal

Re-running the model **within a single sampling month**:

| Stratum | n | Pos | AUC |
|---|---|---|---|
| July | 86 | 52 | **0.964** |
| Jul+Aug | 123 | 77 | **0.944** |
| October | 42 | 24 | 0.860 |
| Jan+Oct | 92 | 29 | **0.668** |
| January / Nov+Dec | 50 / 45 | 5 / 45 | minority class too small to model |

**Conclusion: the microbiome–infection association is not an artifact of seasonal
confounding.** However, the effect is highly heterogeneous across seasons (0.668 to
0.964); this heterogeneity must be reported honestly rather than cherry-picking the
0.944 from Jul+Aug.

### 4.4 The primary estimate of the microbiome effect: stratification, not model adjustment

**The research question is the effect of the microbiome on infection. The covariates (season, site, species, sex) are not the exposure of interest and therefore do not belong in the model.** They are, however, confounders — season influences both microbiome composition and infection risk — and cannot simply be ignored.

There are two ways to handle a confounder:

| Approach | What is in the model | Result here |
|---|---|---|
| Model adjustment | microbiome + covariates | increment +0.043 (L2-LR) to +0.105 (SVM-RBF), **depends on model choice** |
| **Stratification** ✅ | **microbiome only** | see below, **independent of model choice** |

The primary analysis uses **stratification**: fix the sampling month and compare only within strata. The model contains nothing but the 70 CLR features throughout.

#### Per-stratum results (SVM-RBF, microbiome only)

| Stratum | n | Pos rate | AUC | Accuracy | Baseline acc | Gain | Sens. | Spec. | MCC |
|---|---|---|---|---|---|---|---|---|---|
| *All samples (unstratified)* | *260* | *0.58* | *0.833* | *0.772* | *0.581* | *+0.192* | *0.823* | *0.703* | *0.530* |
| **July** | 86 | 0.60 | **0.965** | **0.949** | 0.605 | +0.344 | 0.962 | 0.929 | **0.893** |
| August | 37 | 0.68 | 0.910 | 0.838 | 0.676 | +0.162 | 0.920 | 0.667 | 0.618 |
| **October** | 42 | 0.57 | **0.734** | **0.676** | 0.571 | +0.105 | 0.783 | **0.533** | **0.328** |
| Jul+Aug (same season) | 123 | 0.63 | 0.959 | 0.930 | 0.626 | +0.304 | 0.951 | 0.896 | 0.850 |

**This is how it should be reported:**

```
AUC        0.734 (October) - 0.965 (July)
Accuracy   0.676 - 0.949        (against baselines 0.571 - 0.676)
MCC        0.328 - 0.893
```

#### Three things that must be stated alongside

**1. Stratifying raises the AUC rather than lowering it** (0.833 unstratified → 0.73–0.97 within strata). This is not a contradiction but Simpson-style attenuation: pooling strata with different base rates dilutes within-stratum discrimination. Part of the unstratified 0.833 is spent distinguishing seasons — the microbiome alone predicts November–December sampling at AUC 0.840. **So 0.833 is neither a clean microbiome effect nor the best estimate.**

**2. Do not report the weighted average.** Weighting the three strata by sample size gives AUC 0.894 / accuracy 0.855, but **the strata differ by 0.231 AUC and the average hides October's failure**; the weights are set by sampling effort (July is large only because that field campaign was large), not by scientific relevance. The value is retained in `results/stratified_effect.json` for reference only.

**3. Only 165 of 260 samples can enter a stratified analysis.** November (n=27) and December (n=18) are entirely positive, leaving no negatives within the stratum and AUC mathematically undefined; January (n=50) has only 5 positives and is unstable. **95 samples cannot enter any stratified analysis.**

#### The weakest stratum: October

AUC 0.734, accuracy 0.676 (baseline 0.571), **specificity only 0.533**, MCC 0.328. **In October the model has almost no ability to identify negatives.** This stratum must be reported next to July's 0.965; quoting only the strongest stratum would be selective reporting.

#### Secondary analysis: covariate adjustment

If the question instead becomes "given that season and site are already known, how much does the microbiome add?" — a practical question for surveillance deployment, where those covariates are free — then model adjustment applies:

| Model | Covariates only | Microbiome only | Both | Increment |
|---|---|---|---|---|
| L2-LR | 0.881 | 0.766 | 0.924 | +0.043 |
| SVM-RBF | 0.849 | 0.835 | 0.954 | **+0.105** |
| ExtraTrees | 0.903 | 0.858 | 0.980 | +0.077 |

The increment is positive under all three models, so its direction is robust, but its magnitude depends on model choice (+0.043 to +0.105). **That dependence is precisely why the primary analysis uses stratification instead.** Note that L2-LR, being linear, is penalised on microbiome features that carry nonlinear structure while losing nothing on one-hot covariates, and therefore systematically understates the increment.


### 4.5 Deconfounding sensitivity analysis: excluding November, December and January

In the full cohort, November–December is 100% positive and January 90% negative. On those 95 samples a model scores well simply by learning which month it is, and the microbiome signal is drowned out. Excluding those three months (n = 260 → 165) and re-running (`deconfound_analysis.py`):

**Did deconfounding work?** Predicting the label from month alone:

```
full cohort AUC 0.775   →   subset AUC 0.426     month is fully neutralised
```

Positive rates across the three retained months are 60% (July), 68% (August) and 57% (October) — close to uniform.

**Feature-set ablation** (L2-LR throughout, comparable to §4.4):

| | Full n=260 | Subset n=165 | Change |
|---|---|---|---|
| Covariates only | 0.881 | 0.774 | −0.107 |
| Microbiome only (LR) | 0.766 | **0.933** | +0.168 |
| Microbiome only (SVM-RBF) | 0.835 | 0.937 | +0.10 |
| Microbiome + covariates | 0.924 | 0.951 | +0.027 |
| **Independent contribution** | **+0.043** | **+0.177** | **×4** |

Permutation test: observed 0.943, null 0.500 ± 0.064 (max 0.669), **p = 0.0099**.

**The biomarkers do not change — they get stronger.** This is the most important result in this section:

```
Features at FDR<0.05     full 19/70   →   subset 34/65
Spearman rho on t-statistics = 0.879 (p = 2.7e-21)
Features significant in both   18
```

The strongest hits in the subset are *Veillonella* (t = −14.4, FDR = 3.7e-29), *Rothia* (t = −12.6), Mycoplasmataceae, *Prevotella* and *Streptococcus*. **Note that *Veillonella* and *Prevotella* are precisely the two genera that collinearity had pushed out of the nine-taxon intersection** (§6.3) — after deconfounding they become the strongest signals, confirming that their exclusion was a methodological artefact rather than a biological conclusion.

**Two limits that must be reported alongside this:**

1. **The subset AUC is not comparable to the full-cohort AUC.** The 95 excluded samples are also the hardest to classify — the stratified analysis puts Jan+Oct at AUC 0.668. What was removed is both confounding and difficulty.
2. **Spatial confounding is untouched.** A complete confounding path persists inside the subset:

```
sampling site → label      AUC 0.740
microbiome → site          AUC 0.753
microbiome → is-it-July    AUC 0.731
```

**This section is a sensitivity analysis, not the primary analysis.** The primary analysis still uses all 260 samples and reports AUC 0.839. Its value is in bracketing how much independent information the microbiome carries: **conservatively +0.043, and +0.177 once temporal confounding is removed; the truth lies between them.**

### 4.6 Cross-site generalization: would the model work at a new wetland?

Random cross-validation puts samples from the same site in both the training and validation folds, so a model can score well simply by recognising the site. Grouping by site (leave-one-location-out, LOLO) removes that shortcut (`site_generalization.py`).

Three of seven sites qualify as test folds (n≥15, minority class ≥5), covering 219/260 samples.

**The naive LOLO result looks catastrophic:**

| Model | LOLO mean AUC | Random CV, same samples | Drop |
|---|---|---|---|
| SVM-RBF | 0.443 | 0.853 | −0.409 |
| ExtraTrees | 0.443 | 0.842 | −0.399 |
| L1-LR | 0.469 | 0.777 | −0.308 |

**But the diagnosis shows the failure is temporal extrapolation, not spatial generalization.**

Site and month are almost interchangeable in this cohort:

```
Sacramento NWR   46 of 80 samples in January
GIWA             82 of 96 in July–August
ConawayRanch     sampled only in Oct/Nov/Dec
```

So "leave one site out" is simultaneously "leave one season out". Breaking down the Sacramento fold:

```
its January samples: n=46 with only 1 positive   ->  AUC 0.044
training set retains only 4 January samples      ->  the model has barely seen winter
```

That AUC is effectively **the percentile rank of a single bird** — far too unstable to interpret.

**Re-running LOLO with season held fixed (July–August only):**

| Held-out site | n | Pos | AUC |
|---|---|---|---|
| GIWA | 82 | 51 | **0.919** |
| MandevilleIsland | 14 | 9 | **0.844** |
| SuisunMarsh/Balboa | 11 | 1 | 1.000 |
| | | **mean** | **0.921** |

**Conclusion: with season comparable, the model transfers well across sampling sites (AUC 0.84–0.92).** The naive 0.443 is an artefact of space and time being entangled, and must not be read as spatial generalization failure.

For reference, site one-hot alone predicts the label at random-CV AUC 0.670 (under LOLO this baseline necessarily degenerates to 0.5, since the held-out site's column is constant zero in training).

---

## 5. Known Limitations (eight)

### 5.1 Cross-study generalization does not hold

```
GroupKFold (by BioProject)   L2-LR 0.565 ± 0.280    RF 0.555 ± 0.281
```

A standard deviation of 0.28 is equivalent to chance. The four studies differ completely
in host (duck/turkey/chicken/swan), tissue, and geography, and three of them have only
6/15/45 samples. **The conclusions hold only within the UC Davis wild-duck cohort and
must not be extrapolated.** The `allstudies_*` datasets are suitable only for internal CV
on the pooled cohort, and even then results will be contaminated by batch effects.

### 5.2 The feature table may have been pre-filtered upstream (unresolved)

275 features is unusually few for avian gut 16S data (typically thousands to tens of
thousands of ASVs). The table has most likely been pre-filtered upstream, **but the
filtering rule is unknown**. If label information was used during filtering, every
performance figure in this document must be discounted. **This is currently the largest
unresolved risk; confirm with the data provider.**

### 5.3 Rarefaction is not rigorous

208 samples sit at exactly 5000 while 118 fall below, indicating "rarefy to 5000, keep
as-is if insufficient." This document uses CLR throughout, which sidesteps the issue, but
any depth-dependent metric (e.g. alpha diversity) would require reprocessing.

### 5.4 Decision threshold was not optimized

All accuracy figures use a fixed threshold of 0.5. A threshold of 0.55 raises RF accuracy
to 0.735 with better sensitivity/specificity balance, **but that threshold was chosen on
the test data and constitutes post-hoc tuning.** Using it would require folding threshold
selection into the inner CV loop.

### 5.5 Limited taxonomic resolution

The species level is entirely unannotated and 55 features lack a genus assignment.
Biological interpretation is limited to genus or family level.

---

### 5.6 The confounder baseline is high

Covariates alone (season, site, species, sex) reach AUC 0.881 — higher than the microbiome
alone at 0.766. Any statement about the predictive value of the microbiome must be framed
relative to that baseline rather than to 0.50 (see §4.4).

### 5.7 Multiple comparison: the best model's performance is overestimated

Seventeen models were compared, and the reported "best" performance is the maximum over
those seventeen. **The act of selecting introduces optimistic bias** — the same mechanism as
hyperparameter selection bias, one level up.

Concretely:

- ExtraTrees' AUC of 0.858 is a best-of-17 figure; its **unbiased** expectation is lower
- The paired p=0.085 carries no multiple-comparison correction; a Bonferroni threshold over
  17 comparisons would be ~0.003
- This is part of why SVM-RBF remains the primary model (§3.3)

**The manuscript must report the full 17-model table, not only the winner** — reporting the
maximum while hiding the search is selective reporting. An unbiased estimate of best-model
performance would require another cross-validation layer (an outer loop for model selection,
an outermost loop for evaluation); this project does not do that.

### 5.8 The sampling design binds space to time

Spatial confounding initially looked like an independent problem; §4.6 shows it is not. In this cohort, sampling site and sampling month are nearly interchangeable (Sacramento concentrated in January, GIWA in July–August, ConawayRanch only in autumn/winter). Consequently:

- **Spatial generalization itself is good**: with season fixed, cross-site AUC is 0.84–0.92 (§4.6)
- **But temporal extrapolation cannot be tested fairly**: holding out Sacramento leaves only 4 January samples in training, so the model never has a chance to learn the winter microbiome–infection relationship

This is a limitation of the **sampling design, not of the model**. Answering "will this work in a new season?" requires data with multiple sites sampled in every season; this cohort does not have that structure.

Until then, any claim about cross-season deployment — positive or negative — is unsupported by evidence.

---

## 6. Biological Findings

### 6.1 The three steps behind differential abundance

"Differential abundance" is not a single step but the table produced by the pipeline below. Each stage solves one problem:

```
raw counts, 70 taxa x 260 samples
   │
   │  (1) CLR transform -- makes "how much difference" a meaningful question
   │      Raw counts are distorted by sequencing depth and by the other taxa
   │      competing for a fixed total; after CLR each value is a log deviation
   │      from that sample's own average
   ▼
70 taxa x 260 CLR values
   │
   │  (2) Welch t-test -- one test per taxon (positive vs negative group)
   │      Does not assume equal variances (151 vs 109 here, with differing
   │      within-group dispersion). Returns t and p; the sign of t is the direction
   ▼
70 t-values + 70 p-values
   │
   │  (3) BH-FDR correction -- accounts for having run 70 tests
   │      Pure noise alone would yield about 3.5 hits at p<0.05
   ▼
70 FDR values  --  keep FDR < 0.05  -->  19 differentially abundant taxa
                                          (9 up in positives, 10 down)
```

**Worked example, *Rothia*:**

| Step | Value |
|---|---|
| (1) Raw counts | Positive group mean 12.0, negative 78.9 (depth-distorted, not directly comparable) |
| (1) After CLR | Positive **−0.383**, negative **+1.251**, difference **−1.633** |
| (2) Welch t | t = −5.83, p = 2.5e-08 |
| (3) BH-FDR | FDR = 1.8e-06 |
| **Verdict** | **FDR < 0.05 → differentially abundant, direction Pos↓** |

**The correction does real work**: 5 of the 70 taxa have p<0.05 but FDR≥0.05. Uncorrected they would be reported as findings; they are far more likely to be the luck of running 70 tests, and are discarded.

BH-FDR is used rather than Bonferroni because microbiome features are strongly correlated and Bonferroni (threshold 0.0007 over 70 tests) would be strict enough to find almost nothing. FDR controls the proportion of false positives *among the reported hits* — roughly 1 of the 19 is expected to be a false positive.

The result table `results/differential_abundance.csv` has one row per taxon with `t / p / FDR / direction / mean_clr_Pos / mean_clr_Neg / prevalence`.

**A note on method choice**: this project uses the basic CLR + Welch t + BH-FDR combination rather than the more specialised ANCOM-BC, MaAsLin2 or ALDEx2. The basic route is fully transparent and reproducible, and differential abundance is only one of three selection methods here (§6.2–6.3), so no conclusion rests on it alone. Re-running with ANCOM-BC would be a reasonable supplementary analysis if a reviewer asks for it.

### 6.2 Intersection of three independent methods

Cross-referencing SVM permutation importance, L1 stability selection (200 bootstraps,
C=0.1), and differential abundance (CLR + Welch t + BH-FDR), **nine features are hit by
all three**, forming the most defensible biomarker set:

| Genus | Family | SVM importance | L1 freq. | Direction | FDR |
|---|---|---|---|---|---|
| *(unassigned)* | Ruminococcaceae | 0.0198 | 0.925 | Pos↑ | 0.012 |
| *Varibaculum* | Actinomycetaceae | 0.0131 | 0.985 | Pos↑ | 2e-04 |
| *Rothia* | Micrococcaceae | 0.0100 | 0.995 | Pos↓ | 2e-06 |
| *Psittacicella* | Pasteurellaceae | 0.0079 | 0.925 | Pos↑ | 9e-04 |
| *Staphylococcus* | Staphylococcaceae | 0.0060 | 0.940 | Pos↓ | 1e-03 |
| *Lawsonella* | Corynebacteriaceae | 0.0055 | 0.930 | Pos↓ | 0.017 |
| *Candidatus_Arthromitus* (SFB) | Clostridiaceae | 0.0050 | 0.995 | Pos↑ | 4e-05 |
| 2 unannotated features | — | — | ≥0.915 | Pos↑ | ≤1e-04 |

Overall differential abundance: **19 of 70 features at FDR < 0.05**.

*Candidatus Arthromitus* (segmented filamentous bacteria, SFB) is elevated in the
positive group — this genus induces Th17 and IgA responses, an independent line of
immunological support.

> **The protocol has grown from three layers to four.** The three methods above all
> test **statistical robustness**. In a cohort with collinear confounding, a fourth
> layer is needed to test **attributability**:
>
> | Layer | Method | What it tests | Where it applies |
> |---|---|---|---|
> | ①②③ | Differential abundance · permutation importance · L1 stability selection | statistical robustness | every cohort |
> | ④ | **Confounder screen** (here, the cage screen) | **attributability to infection** | experimental-infection cohorts only |
>
> The duck cohort is field surveillance with no cages, so layer ④ cannot be applied
> and the nine genera rest on ①②③ alone. The turkey cohort (PRJNA644054) runs all
> four: ①②③ give 4 features, and layer ④ leaves **2** — `HT002` (Pos↓) and
> `Escherichia-Shigella` (Pos↑). See `summary_Turkey_45_sample_EN.md` §2.
>
> **Why layer ④ cannot be dropped**: turkey's *Negativibacillus* is the strongest
> feature in the cohort under ①②③ (importance 0.0133, t=+5.87, stable L1 selection
> at all three C values), yet it also differs significantly across four isolators
> that are all positive — **statistically unimpeachable and entirely unattributable
> to infection.**
>
> **The L1 penalty does not carry across cohorts.** The duck C=0.1 was chosen by
> giving up about 0.03 of CV-AUC for sparsity; with a sixth of the sample size, the
> same C zeroes every coefficient in turkey. Turkey uses a sensitivity axis instead
> (C=0.2/1.0/10.0, intersected). Any new cohort should re-scan.

### 6.3 Disagreements between methods are equally informative

- ***Veillonella***: ranks 2nd in permutation importance and is **positive in 100% of the
  25 folds**, with FDR = 2.3e-05, yet its **L1 selection frequency is only 0.105**. This
  is textbook collinearity — L1 retains only one member of a correlated group.
  **It must not be excluded merely because L1 did not select it.**
- ***Moraxella* / *Fusibacter* / *Cetobacterium***: permutation importance is respectable
  (0.008–0.009, positive in 88% of folds), yet univariate FDRs are 0.87 / 0.90 / 0.97 —
  entirely non-significant. **They act through nonlinear interactions that univariate
  tests cannot capture.**

### 6.4 Genuine nonlinear structure is present

Two independent lines of evidence:

1. SVM-RBF (0.839) significantly outperforms SVM-linear (0.766), a gap of 0.073 —
   **the kernel is what wins, not the SVM itself**
2. The "important but univariately non-significant" feature group above

This also corrects an earlier judgment ("nonlinearity is weak") that was based on linear
and tree models performing comparably.

---

## 7. File Guide

### 7.1 Code

| File | Purpose |
|---|---|
| `mb_common.py` | Shared module: data loading, leakage-column list, `PrevalenceCLR` transformer |
| `build_features.py` | Build the feature matrix + QC report |
| `export_ml_dataset.py` | Export ready-to-use modeling datasets |
| `merge_counts_clr.py` | Merge count and CLR representations into a single file |
| `train_eval.py` | Full evaluation: nested CV, permutation test, confounder checks, month stratification, differential abundance, stability selection |
| `compare_models.py` | Round-one 7-model comparison (includes XGBoost, auto-detected) |
| `explore_models.py` | Round-two 9 models + ensemble (kernels, kNN, discriminant analysis, PLS-DA) |
| `validate_extratrees.py` | Subjects ExtraTrees to the same validation as SVM-RBF |
| `deconfound_analysis.py` | Deconfounding sensitivity analysis (drops Nov/Dec/Jan) |
| `site_generalization.py` | Leave-one-site-out generalization + season-fixed control |
| `stratified_effect.py` | **Stratified effect estimate (primary microbiome estimate)** |
| `check_consistency.py` | Numeric consistency check across the five deliverables (see `hooks/pre-commit`) |
| `svm_analysis.py` | SVM grid expansion + permutation importance |
| `dna_embedding.py` | DNABERT-2 / NT-v2 sequence embedding (alternative feature route, not used here) |

### 7.2 Modeling datasets — `ml_dataset/`

| File | Contents |
|---|---|
| **`primary_merged.csv`** | **Main file**: 260 × 152 = 12 metadata + 70 `__count` + 70 `__clr` |
| `primary_clr.csv` | 260 × 70, CLR only |
| `primary_counts.csv` | 260 × 70, raw counts only (use with a pipeline for stricter evaluation) |
| `allstudies_clr.csv` / `allstudies_counts.csv` | 326 × 79, all studies (**not recommended for cross-study generalization**) |
| `feature_dictionary.csv` | Column name → FeatureID → full taxonomy + prevalence |
| `README.txt` | Column meanings and usage notes |

Dataset layout:

```
SampleID(index) | label | Influenza | BioProject | HostGroup | HostType |
Season | Age | Sex | Feeding | Species | Location | month | <feature columns>
```

- `label`: 0=Neg, 1=Pos, integer — **this is the modeling target**
- Feature columns are named `<Genus>__<first 8 chars of FeatureID>`, e.g. `Bacteroides__a13d2ac8`
- No NaNs in the feature block; no imputation needed
- **Do not use the `__count` and `__clr` blocks together** — they are two encodings of the
  same features and are perfectly collinear

### 7.3 Results — `results/`

| File | Contents |
|---|---|
| `model_comparison_all16.csv` | **17 models × 9 metrics + SDs (authoritative summary)** |
| `model_comparison_full.csv` | Round one, 7 models |
| `model_exploration.csv` | Round two, 9 models + ensemble |
| `exploration_fold_aucs.npz` / `svm_fold_aucs.npy` | Per-fold AUCs for paired testing |
| `et_*.csv` / `et_validation.json` | ExtraTrees validation results |
| `svm_hyperparam_surface.csv` | SVM C × gamma surface |
| `svm_permutation_importance.csv` / `.png` | SVM-RBF feature importance |
| `stability_selection.csv` | L1 bootstrap selection frequencies |
| `differential_abundance.csv` | CLR + Welch t + BH-FDR |
| `month_stratified.csv` / `confound_check.csv` | Confounding analyses |
| `deconfound_summary.json` / `deconf_*.csv` | Deconfounding sensitivity analysis |
| `site_generalization.json` / `site_*.csv` | Cross-site generalization |
| `stratified_effect.csv` / `.json` | Per-stratum effect (AUC/acc/sens/spec/MCC) |
| `permutation_null.txt` / `summary.json` | Permutation null distribution and summary |
| `summary_plots.png` | ROC + volcano + stability-selection triptych |

---

## 8. Reproduction

```bash
python3 build_features.py            # → features/    QC report
python3 export_ml_dataset.py         # → ml_dataset/  modeling datasets
python3 merge_counts_clr.py          # → ml_dataset/primary_merged.csv
python3 train_eval.py                # → results/     full evaluation (~5 min)
python3 compare_models.py            # → results/model_comparison_full.csv (round one)
python3 explore_models.py            # → results/model_exploration.csv (round two)
python3 validate_extratrees.py       # → results/et_* (ExtraTrees validation)
python3 deconfound_analysis.py       # → results/deconf_* (deconfounding sensitivity)
python3 site_generalization.py       # → results/site_* (cross-site generalization)
python3 stratified_effect.py         # → results/stratified_effect.* (primary estimate)
python3 svm_analysis.py              # → results/svm_*
```

Common options:

```bash
python3 train_eval.py --quick             # skip permutation/bootstrap, ~1 min
python3 train_eval.py --level genus       # genus-level features
python3 train_eval.py --study all         # all 326 samples + cross-study GroupKFold
python3 train_eval.py --scan-l1C          # scan L1 penalty strength
python3 svm_analysis.py --only grid       # grid expansion only
```

Quick three-line verification:

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

## 9. Conclusions

1. **Wild-duck gut microbiota carry a discriminative signal for influenza infection
   status, and the signal is real.** Permutation test p=0.0099; month-stratified analysis
   retains AUC 0.86–0.96 in the Jul–Aug cohort.

2. **The primary model is SVM-RBF** (C=5, gamma=scale): AUC 0.835 ± 0.060, PR-AUC 0.871,
   MCC 0.535, Accuracy 0.773 (baseline 0.581). Across 17 models it significantly beats
   random forest (p=0.017), XGBoost (p=0.005), and L1-LR (p<0.001).
   The hyperparameter grid was verified free of edge effects.
   **ExtraTrees scores higher (AUC 0.858) and is nominally significant (p=0.041) but fails
   multiple-comparison correction and wins only 14/25 folds; it also measures worse on the
   weakest Jan+Oct stratum (0.715 vs 0.774)** — its lead comes only from
   strata that were already easy — so it does not replace the primary model (§3.3).

3. **Genuine nonlinear structure exists in the microbiome data.** The RBF kernel gains
   0.080 AUC over a linear kernel (24/25 folds, p<0.0001 — the strongest single result here), and several important features are entirely
   non-significant under univariate testing.

4. **Nine features survive cross-validation by three independent methods**: *Rothia*,
   *Staphylococcus*, and *Lawsonella* are depleted in positives, while
   *Candidatus Arthromitus* (SFB), *Varibaculum*, *Psittacicella*, and an unassigned
   Ruminococcaceae are enriched (plus 2 unannotated features).
   *Veillonella* and *Prevotella* are significantly depleted in positives
   (FDR 2.3e-05 / 3.6e-05) and *Veillonella* ranks 2nd in SVM importance, yet their L1
   selection frequencies are only 0.105 / 0.005 and they fall outside the intersection —
   a consequence of collinearity, not a lack of biological meaning (see §6.3).

5. **The primary estimate of the microbiome effect uses stratification, not model
   adjustment** (§4.4): with only microbiome features in the model and sampling month
   held fixed, AUC ranges 0.734 (October) to 0.965 (July) and accuracy 0.676 to 0.949.
   Sampling season remains a confounder that cannot be ignored; covariates alone reach
   AUC 0.881. Any statement about the predictive value of the microbiome must be framed
   relative to this baseline and must report the heterogeneity of the effect across
   seasons.

6. **The conclusions apply strictly to the UC Davis wild-duck cohort**; they do not hold
   across hosts or studies. Within it, however, the model transfers well across sampling
   sites once season is comparable (AUC 0.84–0.92, §4.6) — spatial generalization is not
   the bottleneck; the binding of space to time in the sampling design is.

7. **Tree models are not uniformly weak**: the greedy-split family (RF/XGBoost/HistGB) all
   trail SVM-RBF, but the randomised-split ExtraTrees posts the highest AUC of any model.
   The earlier judgment that "tree models are uniformly weak at this sample size" is
   corrected accordingly.

8. **The largest open risk is the unknown upstream filtering rule for the feature table**
   (§5.2). This should be confirmed with the data provider before finalizing.

### Suggested manuscript framing

- SVM-RBF as the primary model, with the hyperparameter surface included to demonstrate
  it is not over-tuned; report ExtraTrees alongside it and state why it was not chosen
- L1-LR as an interpretable comparator, used to derive the biomarker panel
- Primary metrics: ROC-AUC + PR-AUC + MCC; accuracy must be reported alongside the
  0.581 baseline
- Must include: permutation test, month-stratified results (including the 0.668 for
  Jan+Oct), and the covariate ablation
- The limitations section should cover all eight items in §5, especially §5.7 (multiple comparison) and §5.8 (spatial confounding)
- The full 17-model table must be given; reporting only the winner is selective reporting

---

## 10. Glossary

Each entry is anchored to a measured value from this project where possible. Sections in brackets give the fuller treatment.

### 10.1 Data and transformation

| Term | One line | Value here |
|---|---|---|
| **Compositional data** | Every sample sums to a fixed total (rarefied to 5000 reads), so a taxon "increasing" may only mean others decreased and pushed it up — raw abundances are not independent | 90.2% of cells are zero |
| **Prevalence filter** | Drop taxa present in only a handful of samples. **Label-blind** — denoising, not feature selection | ≥10% takes 275 features to 70 (§2.2) |
| **CLR transform**<br>Centered Log-Ratio | Log each abundance, subtract that sample's mean log, giving a log deviation from the sample's own average so taxa become independently comparable | *Rothia* count 12 → CLR −0.383 (§6.1) |
| **Pseudocount** | `log(0)` is undefined, so a small constant is added first. 0.5 comes from continuity correction and stays below the smallest observable count of 1 | Sensitivity: AUC moves <0.007 across 0.1–2.0 |
| **p/n** | Feature-to-sample ratio; indicates whether this is a high-dimensional problem | 70/260 ≈ 0.27, so no PCA needed |
| **Genus abundance** | **Not one parameter but a whole matrix**: rows are samples, columns are bacterial taxa, cells are read counts.<br>Note that the columns of `genus_raw_counts_by_featureID.csv` are **FeatureIDs, not genus names** — the genus is looked up through `taxonomy_key.csv`, and several FeatureIDs can map to one genus | 326×275; 275 FeatureIDs → 155 genus names (55 unannotated). After filtering, 70 columns in duck and 62 in turkey |

### 10.2 Statistical testing

| Term | One line | Value here |
|---|---|---|
| **Differential abundance** | Test each taxon for a between-group difference. **Not one step but the output of the CLR + Welch t + BH-FDR pipeline** (§6.1) | 19 of 70 taxa at FDR<0.05 |
| **Welch t-test** | A t-test that **does not assume equal variances**. Should be the default whenever group sizes differ | 151 positive vs 109 negative, so required |
| **p-value** | Probability of seeing a difference this large when there is none. **Governs a single test** | 5% error allowed per test |
| **FDR**<br>False Discovery Rate | **The share of false positives among the results you call significant. Governs a batch.**<br>With 70 taxa, pure noise still yields about 3.5 hits at p<0.05 — FDR exists to handle exactly that | Of the 19 hits at FDR<0.05, about 1 (19×5%) is expected to be false |
| **BH procedure**<br>Benjamini–Hochberg | The **algorithm** that controls FDR (FDR is the quantity, BH the method). Sort the 70 p-values ascending, compare the *i*-th to *i*/70 × 0.05, take the largest *i* that passes | Discards 5 taxa with p<0.05 but FDR≥0.05 |
| **Bonferroni** | Stricter correction controlling the chance of any error at all; too strict when features correlate | Threshold falls to 0.0007 over 70 tests |
| **Permutation test** | Shuffle labels, rerun the whole pipeline, build a null. **Rules out overfitting, not confounding** | Observed 0.743 vs null 0.501, p=0.0099 (§4.1) |

### 10.3 Models and regularisation

| Term | One line | Value here |
|---|---|---|
| **SVM-RBF** | Support vector machine with a radial basis kernel. **The primary model here.** The kernel lets it capture nonlinear interactions between taxa — the same model with a linear kernel reaches only 0.755 | AUC 0.835; 0.734–0.965 when stratified (§3.3) |
| **ExtraTrees**<br>Extremely Randomized Trees | A random-forest variant whose only difference is that **split thresholds are drawn at random rather than optimised greedily**. That extra randomisation acts as strong regularisation and often beats a random forest on small samples.<br>It posts the highest AUC here but is **not** the primary model: p=0.041 against SVM-RBF fails multiple-comparison correction, and it is *worse* on the weakest Jan+Oct stratum (0.715 vs 0.774) — its lead comes only from strata that were already easy (§3.3) | AUC 0.858, MCC 0.542, fold SD ±0.041 (best on all three) |
| **GP-RBF / GP-Matérn**<br>Gaussian Process classifier | A Bayesian non-parametric method: rather than fitting fixed parameters it places a prior over functions and takes the posterior after seeing data. **Same kernel as SVM-RBF, different framework** — SVM maximises a margin (discriminative), GP computes a posterior (probabilistic), the latter yielding uncertainty estimates for free.<br>Matérn differs from RBF only in the smoothness assumption (Matérn permits rougher functions); the two land within 0.003 of each other, so **smoothness is not the bottleneck here** | GP-RBF 0.821, GP-Matérn 0.818 |
| **Why GP lost to SVM** | Same kernel, different framework: SVM-RBF wins 20 of 25 folds (p=0.003), **significantly better**. The reason is class imbalance — SVM's hinge loss takes `class_weight='balanced'` directly, whereas the GP probabilistic framework has no equivalent.<br>This also overturned the expectation behind adding GP at all: "the Bayesian version of an RBF kernel is steadier on small samples" does not hold on this data | Δ=+0.014, Wilcoxon p=0.003 |
| **Greedy-split tree models**<br>RandomForest / XGBoost / HistGB | Split points chosen by greedy search. All three trail SVM-RBF here and run low on specificity (0.535–0.646), i.e. they ride the 58% positive rate | AUC 0.806 / 0.800 / 0.794 |
| **Ensemble** | Combining several models' predictions so the collective decides rather than one model. **Four entries in the table are already ensembles in the broad sense**: RandomForest and ExtraTrees combine same-type trees in parallel (bagging), XGBoost and HistGB fit residuals sequentially (boosting).<br>The row labelled `Ensemble (soft-vote)` is a soft vote across **different model types** — SVM-RBF + XGBoost + L1-LR each emit a probability and these are averaged; the members were chosen as three complementary inductive biases (kernel / tree / sparse linear) | AUC 0.834, **0.001 *below* SVM-RBF alone (0.835)** |
| **Why the ensemble did not help** | Ensembling pays off when members are **comparably strong and make different mistakes**. Here they are not: 0.835 / 0.800 / 0.772, so averaging drags the strongest down. **Do not assume an ensemble is automatically better** | Δ = −0.001, paired p=0.539 — indistinguishable from SVM-RBF |
| **PLS-DA** | Partial least squares discriminant analysis, the de facto standard in metabolomics and microbiome papers. Included because reviewers will ask | AUC 0.769, clearly below SVM-RBF |
| **L1 regularisation** (Lasso) | Penalises the **sum of absolute coefficients**, driving unimportant ones to **exactly zero** — hence usable as a feature selector | At C=0.1, only 18 of 70 stay non-zero |
| **L2 regularisation** (Ridge) | Penalises the **sum of squares**; shrinks but never zeroes, so all features survive | 70/70 non-zero |
| **Elastic Net** | Weighted mix of L1 and L2, with a grouping effect on collinear features | AUC 0.770, no better than L1-LR's 0.772 |
| **L1 stability selection** | Refit L1 on 200 bootstrap subsamples (80% each) and count how often each taxon is selected, yielding a list robust to sample perturbation | 13 taxa at frequency ≥0.7 (§6.2) |
| **Selection frequency**<br>("L1 frequency") | Share of those 200 runs selecting the taxon. **Measures stability of inclusion, not importance or effect size** | *Rothia* 0.995 (199/200) |
| **Permutation importance** | Shuffle one feature in the validation fold and measure the AUC drop. **Gives no direction of effect** | *Veillonella* ranks 2nd, positive in 100% of 25 folds |

### 10.4 Evaluation and metrics

| Term | One line | Value here |
|---|---|---|
| **AUC** | Generic term for "area under the curve" — always ask *which* curve. **Throughout this document, a bare "AUC" means ROC-AUC** | — |
| **ROC-AUC** | Probability that a random positive scores above a random negative. **Threshold-independent**, baseline 0.5 | Primary model 0.835; stratified 0.734–0.965 |
| **PR-AUC** | Area under precision-recall; ignores TN, more sensitive when positives are rare. **Baseline is the positive rate**, not 0.5 | 0.871 (baseline 0.581) |
| **MCC**<br>Matthews Correlation<br>Coefficient | A Pearson correlation between predicted and true labels computed from **all four cells** of the confusion matrix (neither accuracy nor F1 uses all four). Ranges −1 to +1 with a **fixed baseline of 0**, making it the most reliable single metric under class imbalance.<br>The decisive contrast: the always-Pos baseline scores F1 = 0.735 (above L2-LR's 0.699) yet MCC correctly returns 0.000.<br>Rules of thumb: 0.2–0.4 weak, **0.4–0.6 moderate**, >0.7 rare in biological data (check for leakage first) | Primary model 0.535<br>July stratum 0.893 (best)<br>October stratum 0.328 (worst) |
| **Balanced accuracy** | (sensitivity + specificity) / 2, baseline 0.5 | Primary model 0.764 |
| **Nested CV** | Outer loop estimates performance, inner loop tunes; they never share folds. **The reported AUC carries no tuning bias** | Outer 5×5=25, inner 4 (§3.1) |
| **GroupKFold / LOLO** | Split by a grouping variable so no group spans train and test; tests cross-group generalisation | By site: AUC 0.443 (§4.6) |

### 10.5 Bias and confounding

| Term | One line | Example here |
|---|---|---|
| **Label leakage** | In one line: **the model peeked at the answer**. Four kinds, each needing a different detector | see below |
| ├ (1) Content leakage | A feature *is* the label or a deterministic function of it | `CoreGroup`=`Duck_Pos` → AUC 1.000. **Invisible to permutation testing**; caught by column audit (§2.1) |
| ├ (2) Supervised process leakage | Labels were used in preprocessing done outside the folds | Measured: null distribution rises to 0.589, max 0.702 |
| ├ (3) Unsupervised process leakage | Preprocessing ignores labels but still sees validation-fold data | Global prevalence filter → 0.004–0.015 inflation (note in §3.2) |
| └ (4) Selection bias | The leak is in the act of *choosing* | Best-of-17 model, flat-CV tuning (§5.7) |
| **Confounder** | A third variable affecting both exposure and outcome. **Not leakage** — it is genuinely available at prediction time | Sampling month: covariates alone reach AUC 0.881 (§4.2) |
| **Stratification** | Hold the confounder fixed and compare within strata. **Only microbiome stays in the model** — this project's primary estimate | July AUC 0.965, October 0.734 (§4.4) |
| **Cage effect** | Animals in one housing unit converge microbially, far enough that the unit itself becomes predictable from the microbiome.<br>**The unit here is an isolator holding 8 birds**, not a per-animal cage — what is shared is the environmental pool of litter, water and feed. The term follows the mouse literature.<br>Quantified by contrasts where strain, batch and infection status are all fixed and only the cage varies | Turkey cohort: pure cage AUC 0.908 (3/3 significant) against an infection effect of 0.967 — indistinguishable |

### 10.6 Ecological feature spaces and cross-host transfer

| Term | One line | Value here |
|---|---|---|
| **Alpha diversity** | Within-sample diversity reduced to a few numbers: richness, evenness, dominance. **Computed per sample, with no cross-sample fitting** | 6 indices; duck AUC 0.538 (p=0.333, fails its own null) |
| **Core retention** | Define a host's "baseline core microbiome" from its **negative** individuals, then measure what share of it each sample still holds.<br>**Must be redefined inside every training fold from that fold's negatives only**, or held-out samples help define the very baseline they are scored against | Baseline core: 14 genera in duck, 32 in turkey; turkey AUC 0.799 |
| **Bray–Curtis distance** | Compositional dissimilarity between two samples, a function of those two alone — **no cross-sample fitting, therefore leak-free by construction** | Kernel method, duck AUC 0.695 |
| **Aitchison distance** | Euclidean distance in CLR space. **This *is* the genus abundance data in different geometry, not an ecological alternative to taxonomy** | Duck 0.848 against genus abundance 0.836 — near-tautological |
| **PCoA**<br>Principal Coordinates Analysis | Reduces a distance matrix to a few axes. **The axes are determined by every sample in the calculation, which makes it unsupervised process leakage** (§10.5 (3)); it must be fitted in-fold and held-out samples projected in | Fitted in-fold, projected by Gower interpolation, top 10 axes |
| **Cross-host transfer**<br>external validation | **Train on one host, predict another directly.** None of the target cohort enters training — no fine-tuning, and even the standardisation mean and variance come from the source.<br>This is the strictest validation there is (the highest evidence level under TRIPOD) and answers whether a finding survives outside its own cohort | Pure ecological, duck → turkey AUC 0.800 against a null maximum of 0.740, p=0.0050 |
| **Degenerate** | The model gives **every** target sample the same score, the ROC collapses to the diagonal, and AUC is exactly 0.500.<br>**This is not "chance-level" but "no discrimination at all"** — the two must be reported separately | 3 of 4 genus transfer directions degenerate: the source-fitted filter puts target CLR values outside the training range and the RBF kernel underflows |

> **Why transfer is far harder than cross-validation**: in cross-validation every test sample has counterparts in the training set from the same cohort, species and batch. In transfer it has none. Of the duck cohort's nine genera only *Staphylococcus* survived the turkey prevalence filter, and it pointed the opposite way — **taxonomic findings simply do not cross species**. What does cross is a dimensionless summary: duck's core is 14 genera and turkey's is 32, with almost no overlap, yet "what proportion was lost" means the same thing and moves the same way in both.


> **Which ecological model to use** (detail in `summary_ecological_models.md` §7)
>
> **Do not rank them by within-host AUC.** Within host, genus abundance reaches 0.836 (duck) and 0.972 (turkey), beating every ecological space — the best, the Bray kernel, manages only 0.695 / 0.850. So:
>
> - If the question is "how well can infection be detected **in this cohort**" → use **genus abundance**, not ecological features
> - If the question is "does the finding hold **in another host**" → use **core retention with a linear model**
>
> **Core retention is the pick among the ecological spaces**, for three independent reasons:
>
> 1. **It is the only one that can transfer.** Every Bray-based space is *structurally* unable to cross cohorts (PCoA axes and kernel bandwidths are defined within one). Among the three that can: core alone 0.870 > α + core 0.834 > α alone 0.714 (whose null maximum of 0.779 exceeds the observed value, so it is not established). **Adding α makes it worse.**
> 2. **It detects infection but not the isolator.** Cage/infection ratio 0.77 with 0/3 contrasts significant, against 0.94 and 3/3 for genus abundance.
> 3. **The mechanism is reportable.** Direction agrees across hosts: `CoreRetentionProportion` lower in infected birds (duck 0.397, turkey 0.154), `CoreTaxaLost` higher (duck 0.603, turkey 0.846). That single feature transfers at 0.846 (selection-corrected p=0.0040).
>
> **One figure that invites misreading**: α diversity's cage/infection ratio of 0.67 looks better than core retention's 0.77, but **a ratio is only readable when the numerator is real signal** — α fails its permutation null in both cohorts (p=0.333 and 0.070), so its ratio means nothing.
>
> **Three usage rules**: (1) use a linear model rather than RBF (same features: RBF transfers at 0.469, linear at 0.870); (2) do not add α diversity; (3) **do not merge with genus abundance** — transfer falls from 0.800 to 0.490 and the cage ratio returns to 0.95.

### 10.7 The line between leakage and confounding

> **Leaked information does not exist at prediction time** (you cannot know `CoreGroup` before deciding whether a bird is infected);
> **confounded information does** (you obviously know what month it is).
>
> The first must be deleted; the second must be handled — by stratification or adjustment, not deletion.
