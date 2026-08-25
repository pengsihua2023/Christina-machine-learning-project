# Ecological analysis results

Sample-level ecological descriptors of the gut microbiome, produced as an alternative feature space to the genus-abundance matrix used in the existing models. All files cover the same **326 samples** and share the `SampleID` key.

---

## Contents

| File | Rows | What it holds |
|---|---|---|
| `ecological_ML_features_clean.tsv` | 326 | Sample-level alpha diversity |
| `bray_curtis_distance_matrix.tsv` | 326 × 326 | Pairwise Bray–Curtis community dissimilarities |
| `aitchison_distance_matrix.tsv` | 326 × 326 | Pairwise Aitchison distances on CLR-transformed genus abundances |
| `bray_pcoa_coordinates.tsv` | 326 | Bray–Curtis PCoA axes 1–10 |
| `aitchison_pcoa_coordinates.tsv` | 326 | Aitchison PCoA axes 1–10 |
| `sample_level_core_retention_EXPLORATORY.tsv` | 326 | Retention/loss of the host-specific baseline core |
| `baseline_core_taxa_by_host.tsv` | 101 | The host-specific baseline core definitions behind those measures |
| `EcologicalFeatures_rscript.R` | — | Generates files 1–5 |
| `CoreRetentionMetrics_rscript.R` | — | Generates files 6–7 |

The two PCoA files are included in case ordination axes are more convenient than raw distance matrices for feeding community structure into a model.

---

## Sample composition

| HostGroup | HostSpecies | Context | Neg | Pos | n |
|---|---|---|---|---|---|
| Duck | Duck | Wild | 109 | 151 | 260 |
| Poultry | Turkey | Experimental | 13 | 32 | 45 |
| Poultry | Chicken | Experimental | 3 | 3 | 6 |
| Swan | WhooperSwan | Wild | 5 | 10 | 15 |
| **Total** | | | **130** | **196** | **326** |

> **Note**: the 15 whooper swan samples are **not** part of any model built so far. The existing work covers the duck cohort (n=260) and the poultry cohort (n=45 turkey, or 51 merged). With 5 negatives, the swan group is too small to model on its own, but it adds a third host to the cross-host comparison.

---

## Columns

**`ecological_ML_features_clean.tsv`** — `SampleID`, `HostGroup`, `HostSpecies`, `SampleContext`, `Infection`, then:

`Observed_Genera`, `Chao1_Genus`, `Shannon_Genus`, `Simpson_Genus`, `InvSimpson_Genus`, `Pielou_Genus`, `SequencingDepth`

Counts were **not** rarefied; `SequencingDepth` is carried alongside so depth can be handled at modelling time. This matters for `Observed_Genera` and `Chao1_Genus`, which are the two richness metrics most sensitive to depth.

**`sample_level_core_retention_EXPLORATORY.tsv`** — same five identifier columns, then:

`BaselineCoreSize`, `CoreTaxaPresent`, `CoreTaxaLost`, `CoreRetentionProportion`, `CoreAbundanceRetention`, `NonCoreTaxaPresent`, `TotalTaxaPresent`, `CoreMembershipProportion`

**`baseline_core_taxa_by_host.tsv`** — `HostSpecies`, `TaxonID`. Core membership required ≥0.1% relative abundance in ≥50% of that host's baseline samples.

| HostSpecies | Baseline core size |
|---|---|
| Turkey | 32 |
| WhooperSwan | 31 |
| Chicken | 24 |
| Duck | 14 |

---

## Two leakage cautions

### 1. Core retention (flagged by the author of the files)

In this exploratory file the baseline core was defined using **all AIV-negative samples within each host**, including samples that would later sit in a held-out fold.

If these features are used to evaluate predictive performance, the baseline core must instead be **defined using only the negative samples in each training fold** and then applied to the held-out samples. Otherwise the held-out samples have contributed to the definition of the very reference they are scored against.

The `_EXPLORATORY` suffix marks the file as suitable for description, not for reported performance. `CoreRetentionMetrics_rscript.R` states the same requirement in its comments.

### 2. PCoA coordinates (same category, worth stating explicitly)

The PCoA axes come from `cmdscale()` applied to the **full 326 × 326 distance matrix**. The axes are therefore defined by all samples, held-out ones included — the same class of unsupervised process leakage as fitting a prevalence filter or a scaler on the whole dataset. Under a strict protocol the ordination has to be fitted inside each training fold and the held-out samples projected onto it.

**The distance matrices themselves are clean.** Bray–Curtis is a pairwise function of two samples only, and the CLR here is computed per sample (`log(x) − mean(log(x))` within a row, pseudocount 0.5) with no global prevalence filter beforehand — so neither matrix borrows information across samples. A kNN or kernel model consuming distances directly is fine; it is the ordination step that needs to move inside the fold.

The alpha diversity metrics are per-sample by construction and carry no leakage.

---

## The comparison this is for

Four feature spaces to put side by side against the existing genus-abundance model:

1. **Alpha diversity** — richness, evenness, and diversity indices
2. **Core retention / stability** — how much of the host's baseline core survives
3. **Community structure** — Bray–Curtis and Aitchison distances or their ordinations
4. **Combined ecological model** — all of the above

**The question is not primarily whether these beat the taxonomic model.** It is whether broader ecological predictors are **more consistent between hosts** even when the specific bacterial genera associated with AIV differ.

That question is well posed for this project, because taxonomic consistency across hosts has so far failed to hold: of the duck cohort's nine genera, only *Staphylococcus* survived prevalence filtering in turkey, and it pointed the opposite way and was not significant (`summary_Turkey_45_sample.md` §3). If ecological descriptors transfer where genera do not, that is a finding in its own right regardless of absolute AUC.

A caution carried over from the existing analyses: in the turkey cohort, isolator is perfectly collinear with infection status and the pure cage effect reaches a mean AUC of 0.908 against an infection effect of 0.967 (`summary_Turkey_45_sample.md` §4). Any ecological feature that separates infected from control turkeys is subject to the same ambiguity, so a cross-host consistency claim resting on the turkey cohort needs the cage effect reported alongside it.

---

## Provenance

Both R scripts read the project's phyloseq object and are self-contained. `EcologicalFeatures_rscript.R` notes in its header that infection-dependent variables — distance to the uninfected centroid, baseline-core retention — are deliberately excluded from it because they have to be generated inside cross-validation folds.
