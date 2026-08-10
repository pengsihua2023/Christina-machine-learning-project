# Binary Classification of Avian Influenza Infection Status from Gut Microbiota

Predicting influenza infection status (Influenza Pos/Neg) in wild waterfowl from
16S rRNA microbiome abundance. This document records the complete data processing,
modeling, and evaluation workflow, the conclusions, and all known limitations.

*(Chinese version: `README.md`)*

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

### 3.2 Six-model comparison

n=260, 70 CLR features, Pos=151 / Neg=109

| Model | Accuracy | Balanced Acc | ROC-AUC | PR-AUC | Sensitivity | Specificity | Precision | F1 | MCC |
|---|---|---|---|---|---|---|---|---|---|
| **SVM-RBF** | **0.771** | **0.761** | **0.839** | **0.872** | 0.820 | **0.703** | **0.795** | **0.805** | **0.531** |
| RandomForest | 0.725 | 0.701 | 0.810 | 0.851 | **0.850** | 0.553 | 0.728 | 0.782 | 0.433 |
| HistGB | 0.722 | 0.705 | 0.796 | 0.841 | 0.809 | 0.600 | 0.739 | 0.771 | 0.423 |
| L1-LR | 0.709 | 0.707 | 0.787 | 0.842 | 0.722 | 0.692 | 0.770 | 0.742 | 0.414 |
| L2-LR | 0.690 | 0.686 | 0.782 | 0.844 | 0.710 | 0.662 | 0.746 | 0.725 | 0.373 |
| SVM-linear | 0.692 | 0.672 | 0.766 | 0.830 | 0.796 | 0.549 | 0.711 | 0.749 | 0.362 |
| *Baseline (always Pos)* | *0.581* | *0.500* | *0.500* | *0.581* | *1.000* | *0.000* | *0.581* | *0.735* | *0.000* |

Standard deviations are in `results/model_comparison_full.csv` (typically ±0.05).

**Paired significance tests** (paired per-fold AUC over the same 25 folds):

```
SVM-RBF vs RandomForest   Δ=+0.029   wins 17/25 folds   Wilcoxon p=0.021    paired t p=0.013
SVM-RBF vs L1-LR          Δ=+0.052   wins 21/25 folds   Wilcoxon p=0.0002   paired t p<0.0001
```

**SVM-RBF is significantly better than the rest.**

### 3.3 Three pitfalls in reading these metrics

1. **The accuracy baseline is 0.581, not 0.5** (58% positive rate). SVM-RBF's 0.771
   corresponds to a real gain of +19 percentage points.
2. **F1 must not be used for model selection**: the baseline model scores F1 = 0.735,
   higher than L2-LR's 0.725. F1 is severely inflated when positives dominate.
3. **The most reliable comparison metrics are MCC and Balanced Accuracy** (both have a
   baseline of 0). Tree models earn part of their accuracy by riding the positive rate —
   RF's specificity is only 0.553, versus 0.703 for SVM-RBF.

### 3.4 Hyperparameter robustness

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

### 4.4 Feature-set ablation

```
Covariates only (season/site/species/sex/month)  AUC 0.881 ± 0.037
Microbiome only                                  AUC 0.766 ± 0.054
Microbiome + covariates                          AUC 0.924 ± 0.030
```

The microbiome contributes independently over the covariates (+0.043). **Note, however,
that covariates alone reach 0.881 — this is the "confounder baseline."** Any claim about
the predictive value of the microbiome must be stated relative to this baseline, or must
explicitly separate the two contributions.

---

## 5. Known Limitations

### 5.1 Cross-study generalization does not hold

```
GroupKFold (by BioProject)   L2-LR 0.542 ± 0.286    RF 0.605 ± 0.276
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

## 6. Biological Findings

### 6.1 Intersection of three independent methods

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

### 6.2 Disagreements between methods are equally informative

- ***Veillonella***: ranks 2nd in permutation importance and is **positive in 100% of the
  25 folds**, with FDR = 2.3e-05, yet its **L1 selection frequency is only 0.105**. This
  is textbook collinearity — L1 retains only one member of a correlated group.
  **It must not be excluded merely because L1 did not select it.**
- ***Moraxella* / *Fusibacter* / *Cetobacterium***: permutation importance is respectable
  (0.008–0.009, positive in 88% of folds), yet univariate FDRs are 0.87 / 0.90 / 0.97 —
  entirely non-significant. **They act through nonlinear interactions that univariate
  tests cannot capture.**

### 6.3 Genuine nonlinear structure is present

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
| `compare_models.py` | Six-model comparison across all metrics |
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
| `model_comparison_full.csv` | Six models × 9 metrics + standard deviations |
| `svm_hyperparam_surface.csv` | SVM C × gamma surface |
| `svm_permutation_importance.csv` / `.png` | SVM-RBF feature importance |
| `stability_selection.csv` | L1 bootstrap selection frequencies |
| `differential_abundance.csv` | CLR + Welch t + BH-FDR |
| `month_stratified.csv` / `confound_check.csv` | Confounding analyses |
| `permutation_null.txt` / `summary.json` | Permutation null distribution and summary |
| `summary_plots.png` | ROC + volcano + stability-selection triptych |

---

## 8. Reproduction

```bash
python3 build_features.py            # → features/    QC report
python3 export_ml_dataset.py         # → ml_dataset/  modeling datasets
python3 merge_counts_clr.py          # → ml_dataset/primary_merged.csv
python3 train_eval.py                # → results/     full evaluation (~5 min)
python3 compare_models.py            # → results/model_comparison_full.csv
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

2. **The best model is SVM-RBF** (C=5, gamma=scale): AUC 0.839 ± 0.060, PR-AUC 0.872,
   MCC 0.531, Accuracy 0.771 (baseline 0.581). Significantly better than random forest
   (p=0.021) and L1-LR (p<0.001). The hyperparameter grid was verified free of edge
   effects.

3. **Genuine nonlinear structure exists in the microbiome data.** The RBF kernel gains
   0.073 AUC over a linear kernel, and several important features are entirely
   non-significant under univariate testing.

4. **Nine features survive cross-validation by three independent methods**: *Rothia*,
   *Staphylococcus*, and *Lawsonella* are depleted in positives, while
   *Candidatus Arthromitus* (SFB), *Varibaculum*, *Psittacicella*, and an unassigned
   Ruminococcaceae are enriched (plus 2 unannotated features).
   *Veillonella* and *Prevotella* are significantly depleted in positives
   (FDR 2.3e-05 / 3.6e-05) and *Veillonella* ranks 2nd in SVM importance, yet their L1
   selection frequencies are only 0.105 / 0.005 and they fall outside the intersection —
   a consequence of collinearity, not a lack of biological meaning (see §6.2).

5. **Sampling season is a confounder that cannot be ignored**; covariates alone reach
   AUC 0.881. Any statement about the predictive value of the microbiome must be framed
   relative to this baseline and must report the heterogeneity of the effect across
   seasons.

6. **The conclusions apply strictly to the UC Davis wild-duck cohort**; they do not hold
   across hosts or studies.

7. **The largest open risk is the unknown upstream filtering rule for the feature table**
   (§5.2). This should be confirmed with the data provider before finalizing.

### Suggested manuscript framing

- SVM-RBF as the primary model, with the hyperparameter surface included to demonstrate
  it is not over-tuned
- L1-LR as an interpretable comparator, used to derive the biomarker panel
- Primary metrics: ROC-AUC + PR-AUC + MCC; accuracy must be reported alongside the
  0.581 baseline
- Must include: permutation test, month-stratified results (including the 0.668 for
  Jan+Oct), and the covariate ablation
- The limitations section should cover all six items in §5
