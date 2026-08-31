# Turkey Cohort (PRJNA644054, n=45): Confounding Structure and the Taxa That Drive Prediction

**Cohort**: PRJNA644054, Ohio State, turkey experimental infection study, 45 samples (13 negative / 32 positive)
**Scripts**: `turkey_confounding_biomarkers.py`, `turkey_strain_cage.py` ｜ **Results**: `results/turkey_*.csv`, `turkey_confounding_biomarkers.json`, `turkey_strain_cage.json`
**Related file**: `summary_Chicken_51_sample.md` (modelling results for the merged cohort)
**Date**: 2026-08-11

> **One-sentence conclusion: isolator is perfectly collinear with infection status, and the pure cage effect — strain, batch and infection status all held fixed, only the cage varying, mean AUC 0.908 — is nearly the same magnitude as the infection effect (0.967). How much of AUC 0.930 comes from infection and how much from cage assignment cannot be separated. Two candidate genera survive all four layers (differential abundance, permutation importance, L1 stability and the cage screen): *HT002* and *Escherichia-Shigella*. The strain effect cannot be tested at all, because of a three-way collinearity.**

---

## 0. Why confounding in this cohort differs completely from the primary cohort

The primary cohort (PRJNA464410) is **field surveillance**: confounding comes from sampling season and location.

This cohort is an **experimental infection study**: controls were injected with PBS, infected birds with H5N2 (two strains, CK/PA and TK/MN, 16 birds each). Confounding therefore comes from the **housing isolator** and the **DNA extraction batch** — neither of which exists in a field cohort.

**The primary cohort's analytical framework cannot simply be carried over.**

---

## 1. Confounding structure

### 1.1 Isolator is perfectly collinear with infection status

| Isolator | Neg | Pos |
|---|---|---|
| 1 | 8 | 0 |
| 2 | 5 | 0 |
| 3 | 0 | 8 |
| 4 | 0 | 8 |
| 5 | 0 | 8 |
| 6 | 0 | 8 |

> **What an isolator is**: a negative-pressure housing unit used in avian influenza work, separately ventilated to block aerosol transmission between groups. **Each isolator in this cohort holds 8 birds** (5 in isolator 2) — this is not one bird per cage; the whole group shares the same litter, water and feed. `Isolator_.` is the only spatial grouping variable in the metadata; nothing finer is recorded.
>
> The term "cage effect" is used below because that is the established name in the literature (from the classic observation that co-housed mice converge microbially), but note that the physical unit here is an isolator, not a cage — **what is shared is the environmental microbial pool, not the container**.

**Each isolator holds exactly one infection status.** That follows from the experimental design (controls and infected birds must be housed in separate isolators to prevent cross-infection), but the price is that **isolator effect and infection effect are statistically inseparable** — no sample exists in an isolator containing both positives and negatives to break the pattern.

### 1.2 The decisive test: the cage effect is real, and strong

Collinearity does not preclude quantification. The way in is this: **within the positives there are four isolators (3/4/5/6, 8 birds each), all sharing the identical infection status.**

> Among these 32 birds, all positive, can the microbiome tell which isolator they came from?

| Group | Isolators | Out-of-fold accuracy | Chance baseline | Ratio |
|---|---|---|---|---|
| **Positives** (n=32) | 4 | **0.719** | 0.250 | **2.9×** |
| **Negatives** (n=13) | 2 | **0.923** | 0.500 | 1.8× |

**With infection status held perfectly constant, the microbiome still identifies the cage far above chance.**

Biologically this is unsurprising: cage-mates share litter, water and feed, and poultry practise coprophagy, so their communities converge. But the implication for this analysis is unambiguous — **any between-group microbiome difference necessarily carries a cage component, and no statistical adjustment can remove it.**

> The 0.719 here spans two strains and two extraction batches, so it remains a mixed "cage + strain + batch" estimate. §4.2 gives the stricter version: with strain, batch and infection status all fixed and only the cage varying, the mean AUC is 0.908.

### 1.3 DNA extraction batch: independent and partly collinear

| Extraction date | Neg | Pos |
|---|---|---|
| 18-10-30 | 13 | 16 |
| 18-11-06 | **0** | **16** |

All 16 samples in the 11-06 batch are positive — partial collinearity.

```
Microbiome → predict extraction batch                       AUC 0.921
Within positives only (label fixed, 16 per batch)           AUC 0.940
```

**The second figure is the telling one**: with infection status held constant the batch remains highly predictable, showing this is a genuine technical batch effect rather than a by-product of infection.

### 1.4 Negative control: sex

| sex | Neg | Pos |
|---|---|---|
| female | 7 | 13 |
| male | 6 | 19 |

The distribution is balanced, and **the microbiome predicts sex at AUC 0.454** (≈ chance).

This control matters: **it shows the high AUCs above are not a methodological artefact** — the same pipeline applied to an unconfounded variable yields no signal.

### 1.5 Variables that cannot serve as features or covariates

| Variable | Positive | Negative | Welch p |
|---|---|---|---|
| `Bursa_Weight_g` | 0.41 | 0.58 | **0.0001** |
| `Bird_weight.g.` | 2.93 | 3.44 | 0.0288 |
| `Bursa.BodyWeight.Ratio1000` | 2.93 | 3.44 | 0.0288 |

Bursa weight is significantly lower in the positives — this is **immune-organ atrophy caused by infection**, an outcome or mediator variable. It is a downstream consequence of infection, so using it as a feature amounts to predicting the outcome from the outcome.

**These columns are already excluded in `mb_common.py: LEAKAGE_COLS` / `ID_COLS` and were not used in this analysis.**

### 1.6 A data quality problem (to be confirmed with the data provider)

`Bird_weight.g.` and `Bursa.BodyWeight.Ratio1000` **hold identical values**, and a mean of 2.93 "grams" is implausible for a turkey (normal body weight runs from hundreds to thousands of grams). The original metadata appears to have a column misalignment.

This column is unused in the present project and therefore affects no result, but anyone reusing this BioProject's metadata should be aware of it.

---

## 2. The taxa that drive prediction

### 2.1 A single protocol: the duck cohort's three methods, plus one layer unique to this cohort

**Script**: `turkey_biomarkers_3method.py` ｜ **Results**: `results/turkey_biomarkers_3method.json`

A prevalence threshold of ≥10% retains **62 features**. Selection uses **one protocol** — the same three-method intersection as the duck cohort (README §6.2), with a cage screen layered on top:

| Layer | Method | What it tests | Hits here |
|---|---|---|---|
| ① | Differential abundance (CLR + Welch t + BH-FDR) | is the between-group difference real | 19 |
| ② | Permutation importance (within-fold, 3×5 folds) | does it contribute to the model | 24 |
| ③ | L1 stability selection (200 bootstraps) | is it **reproducibly** chosen by a sparse model | **4** |
| ④ | **Cage screen** (unique to this cohort) | can it be **attributed to infection** rather than shared housing | **2** of the 4 pass |

Layers ①–③ match the duck cohort exactly, which is what makes the two cohorts comparable. Layer ④ is something the duck cohort cannot do — wild ducks have no cages — and works by a one-way ANOVA across isolators **within the positives only** (BH-FDR corrected).

> **①②③ test statistical robustness; ④ tests attributability.** Neither substitutes for the other: a genus can be rock-solid under all three methods and still be entirely unattributable to infection. *Negativibacillus* in §2.3 is exactly that.

### 2.2 The L1 penalty cannot be carried over, so it becomes a sensitivity axis

The duck cohort used C=0.1 (18 of 70 features, about 0.03 of CV-AUC given up for sparsity). With n=45 and 62 features in turkey, the two ways of matching it contradict each other:

| Way of matching | C required | Consequence |
|---|---|---|
| Match the **sparsity fraction** (≈1/4 of features) | ≈10 | the penalty is barely active |
| Match the **rule** (give up ~0.03 CV-AUC) | ≈0.2 | only 7 non-zero coefficients remain |

With no single correct choice, C becomes a sensitivity axis: **200 bootstraps at each of 0.2 / 1.0 / 10.0, and a feature counts as an L1 hit only if it reaches ≥70% selection frequency at all three** (4 / 8 / 9 hits respectively; the intersection is taken). The conclusion then rests on no arbitrary choice.

### 2.3 Result: four clear the three methods, two of those are attributable to infection

| Genus | Family | Permutation importance | L1 freq (lowest) | Direction | t | FDR | Cage screen |
|---|---|---|---|---|---|---|---|
| *Negativibacillus* | Ruminococcaceae | 0.0133 | 0.865 | Pos↑ | +5.87 | 3.84e-05 | **fails** |
| ***HT002*** | Lactobacillaceae | 0.0130 | 0.935 | **Pos↓** | −3.89 | 5.72e-03 | **passes** |
| *Tissierella* | Family_XI | 0.0079 | 0.885 | Pos↑ | +4.82 | 3.75e-04 | **fails** |
| ***Escherichia-Shigella*** | Enterobacteriaceae | 0.0015 | 1.000 | **Pos↑** | +5.64 | 3.75e-04 | **passes** |

**L1 is by far the strictest gate**: 19 genera reach FDR<0.05 and four survive L1. The duck cohort behaves the same way — L1 is the step that narrowed 19 to 9 there.

**Two are reportable as candidate biomarkers**:

- ***HT002*** (Lactobacillaceae) **falls** in infected birds
- ***Escherichia-Shigella*** (Enterobacteriaceae) **rises** in infected birds

The direction matches immunological expectation: commensal lactic acid bacteria depleted, opportunistic pathogens expanding — the classic dysbiosis pattern.

### 2.4 A cautionary case: why layer ④ cannot be dropped

***Negativibacillus*** has the highest permutation importance in the cohort (0.0133), differential abundance of t=+5.87 at FDR<0.0001, and stable L1 selection at all three C values (lowest 0.865) — **all three methods agree it is the strongest biomarker available.**

**But it also differs significantly across the four isolators that are all positive**, so whether it reflects infection or the shared cage environment cannot be determined. The same holds for *Tissierella* (t=+4.82, FDR=3.75e-04).

> **Located more precisely in §4.5**: re-checked against the pure-cage contrasts (strain, batch and infection status all fixed), *Negativibacillus* has a minimum FDR of 0.109 and *Tissierella* 0.172 — neither significant, which means the contaminating source is **strain or batch** rather than the cage as such. The conclusion is unchanged: **not attributable to infection under this design.**

**Without layer ④ the reported set would be these four rather than two, half of them unattributable.**

### 2.5 Comparison with the duck cohort (same protocol, therefore comparable)

Rebuilding the duck three-method intersection gives **9 features**, matching README §6.2 — a check that the reconstruction is faithful before any comparison is drawn.

| Rank | Overlap |
|---|---|
| Genus | **none** |
| Family | **Ruminococcaceae** |

```
Ruminococcaceae
    Duck     (unnamed genus)      Pos↑
    Turkey   Negativibacillus     Pos↑    ← but strain/batch confounded
```

**The direction agrees on both sides, the first taxonomic cross-host consistency anywhere in this project.** But the turkey member is the cautionary case of §2.4, **not attributable to infection**, so it stands as a lead worth testing in a third cohort and nothing more.

> **Note: earlier versions reported "seven candidates".** That set was "differential abundance ∩ permutation importance ∩ cage screen" — a non-standard combination that existed only because L1 stability selection had not yet been run. With L1 added, that reading is retired and the four-layer protocol above replaces it. The difference between the two counts is **not** a change in result but a completed protocol: five of the seven (*Pediococcus*, the unnamed Lactobacillaceae genus, *Incertae_Sedis*, *Weissella*, *Pseudomonas*) fail L1.

---

## 3. Comparison with the primary cohort's nine genera (wild duck)

Of the duck cohort's nine genera, only ***Staphylococcus*** appears among the 62 features retained in turkey:

| | Duck cohort | Turkey cohort |
|---|---|---|
| Direction | Pos↓ (FDR 0.001) | Pos↑ |
| Significance | significant | **t=+0.97, FDR=0.53, not significant** |

**Opposite direction and not significant — cross-host consistency is not supported.**

One technical reason must be noted, however: prevalence filtering was run independently in each cohort, turkey retains only 62 features, and **most of the duck cohort's nine genera never entered the turkey candidate pool at all** (prevalence below 10% in turkey). This more likely reflects "the two hosts simply have different core microbiota" than "the signal was refuted in turkey".

A strict test of cross-host consistency would have to be **redone on the intersection of the two feature sets** — but that would shrink the feature space substantially, and the sample sizes (45 vs 260) are too far apart. It was not attempted in this project.

---

## 4. Whether the strain effect can be tested, and how strong the pure cage effect is

**Script**: `turkey_strain_cage.py` ｜ **Results**: `results/turkey_strain_cage.json`

### 4.1 The strain effect cannot be tested: a three-way collinearity

The original plan was to test the microbiome difference between the two infecting strains (CK/PA H5N2 and TK/MN H5N2, 16 birds each). The metadata shows this is impossible:

| Experimental group | Isolators | Extraction batch |
|---|---|---|
| CKPA (16) | 3, 4 | 18-10-30 |
| TKMN (16) | 5, 6 | 18-11-06 |
| Mock (13) | 1, 2 | 18-10-30 |

**Each isolator holds only one strain, and each strain used only one extraction batch.** "CKPA vs TKMN" is therefore numerically identical to both "isolators {3,4} vs {5,6}" and "batch 10-30 vs 11-06" — all three are the same partition.

Measuring that partition:

```
CKPA vs TKMN (n=32)   AUC 0.912   null 0.498 ± 0.136 (max 0.852)   p = 0.0033
```

**This number cannot be interpreted as a strain effect.** It carries strain, cage and library-batch signal simultaneously, and under this design the three can never be separated.

### 4.2 But the collinear structure points to a cleaner experiment

Since CKPA occupies isolators 3 and 4, **the 3-vs-4 contrast holds strain, batch and infection status all constant, and varies only the cage**. That yields an estimate of the pure cage effect uncontaminated by any other factor — far stricter than the 0.719 of §1.2, which spanned four isolators across two strains and two batches.

Three such contrasts, each paired with 300 permutations (at a sample size of 8 vs 8, a figure without a permutation test is meaningless):

| Contrast | Held constant | n | **AUC** | Null mean | Null max | p |
|---|---|---|---|---|---|---|
| Isolator 3 vs 4 | CKPA, batch 10-30, all positive | 16 | **0.919** | 0.506 ± 0.191 | 0.938 | **0.0066** |
| Isolator 5 vs 6 | TKMN, batch 11-06, all positive | 16 | **0.906** | 0.497 ± 0.200 | 1.000 | **0.0166** |
| Isolator 1 vs 2 | Mock, batch 10-30, all negative | 13 | **0.900** | 0.491 ± 0.221 | 0.969 | **0.0332** |
| **Mean** | | | **0.908** | | | **3/3 significant** |

### 4.3 The pure cage effect nearly matches the infection effect

```
Infection vs control (n=45)   AUC 0.967
Mean pure cage effect               0.908
```

**Separating two cages of birds that share infection status, strain and batch is about as easy as separating infected birds from controls.**

This does not mean the infection signal is spurious — it means that **under this design the model cannot distinguish the microbiome differences produced by "infection" from those produced by "cage assignment"**. The perfect collinearity noted in §1.1 is here quantified: each of the two collinear factors alone generates a signal on the order of AUC 0.9.

> **Sample-size caveat**: the infection effect rests on n=45, the cage effects on n=16 or 13, and the latter AUC estimates are far noisier (null SDs of 0.19–0.22, with maxima of 0.938 / 1.000 / 0.969 respectively). All three p-values are below 0.05, but the gap between 0.908 and 0.967 should not be treated as a precise comparison. **What can be stated is that they are the same order of magnitude; which is larger cannot be determined.**

### 4.4 The cage effect is multivariate, not driven by a few taxa

Per-taxon differential abundance within the same contrasts:

| Contrast | Features at FDR<0.05 |
|---|---|
| 3 vs 4 within CKPA | **0** / 62 |
| 5 vs 6 within TKMN | 1 / 62 (*Faecalibacterium*, t=−5.65) |
| 1 vs 2 within Mock | 3 / 62 (*Faecalibacterium*, *Pseudoflavonifractor*, *UCG-009*) |

**Almost no individual genus is significant, yet the multivariate model reaches AUC 0.90.** The cage effect is therefore distributed across the whole community composition — cage-mates converge as entire communities rather than through one genus being especially abundant or depleted.

This also explains why **univariate differential abundance cannot see the cage effect at all; only a multivariate model reveals it**.

### 4.5 A correction to one judgement in §2.4

§2.4 used "ANOVA across four isolators within the positives" to flag 4 cage_confounded genera. But that test spans two strains and two batches, so what it actually flagged was "cage **or** strain **or** batch". Re-checking against the pure-cage contrasts:

| Genus | Minimum FDR in pure-cage contrasts | Verdict |
|---|---|---|
| *Faecalibacterium* | **0.0047** | **genuine cage effect** |
| *Negativibacillus* | 0.109 | strain/batch driven, not pure cage |
| *Tissierella* | 0.172 | strain/batch driven, not pure cage |
| *Incertae_Sedis* | 0.421 | strain/batch driven, not pure cage |

**The §2.4 screen was over-strict: only 1 of the 4 is a true cage effect.** But it did not err in direction — the two candidates reported in §2.3 passed under the stricter standard, so they pass under the looser one as well, and **the conclusion is unchanged**.

The wording on *Negativibacillus* should be corrected accordingly: it is not contaminated by the cage effect but **by strain or batch** — and under this design it equally cannot be attributed to infection.

---

## 5. Conclusions

### 5.1 This cohort is not suitable as a standalone source of biomarker discovery

Three reasons:

1. **Isolator is perfectly collinear with infection status, and the pure cage effect nearly matches the infection effect.** Across the three contrasts in which strain, batch and infection status are all fixed and only the cage varies, AUC is 0.919 / 0.906 / 0.900 (mean 0.908, 3/3 significant), against an infection effect of 0.967 (§4). Of the AUC 0.930 reported in `summary_Chicken_51_sample.md`, how much comes from infection and how much from cage assignment cannot be separated.
2. **The DNA extraction batch is partly collinear and its effect is real** (AUC 0.940 within the positives).
3. n=45, with only 13 in the minority class.

### 5.2 But the cage screen is itself a valuable, independent perspective

Those two candidates (*HT002* and *Escherichia-Shigella*) **survive a test the primary cohort has no way of applying**. The combination of rising *Escherichia-Shigella* with falling Lactobacillaceae is mechanistically interpretable, and is worth validating in other cohorts.

### 5.3 Hard requirements when reporting results from this cohort

1. **The perfect isolator collinearity must be reported alongside every figure** — otherwise AUC 0.930 will be misread as a pure infection signal
2. **The quantified pure cage effect must be reported** (mean AUC 0.908 across three contrasts, against an infection effect of 0.967) — this is the only quantifiable evidence of the degree of collinearity, and it shows the two are of comparable magnitude
3. **Every biomarker must be labelled with whether it passed the cage screen** — *Negativibacillus* is the strongest counter-example (t=5.87, FDR<0.0001, yet not attributable to infection; §4.5 further shows its contaminating source is strain/batch rather than cage)
4. **No claim of cross-host consistency may be made** — there is almost no overlap with the duck cohort, and a technical explanation has not been ruled out
5. **The sex AUC of 0.454 should be reported as a negative control** — it demonstrates that the pipeline itself does not manufacture spurious signal
6. **No strain effect may be reported** — CKPA and TKMN share a three-way collinearity with isolator and batch, so that AUC of 0.912 cannot be attributed to strain (§4.1)

---

## 6. Reproduction

```bash
python3 turkey_confounding_biomarkers.py
python3 turkey_confounding_biomarkers.py --n-perm-imp 50 --n-rep-cv 5   # steadier importance estimates

python3 turkey_biomarkers_3method.py             # §2.5: three-method intersection, duck protocol
python3 turkey_strain_cage.py                    # §4: strain collinearity + pure cage effect
python3 turkey_strain_cage.py --n-perm 500       # finer p-value resolution
```

| File | Contents |
|---|---|
| `results/turkey_confounding_biomarkers.json` | all confounding-check results |
| `results/turkey_biomarkers_3method.json` | three-method intersection, L1 sensitivity, cross-host comparison |
| `results/turkey_l1_scan.csv` | L1 penalty scan (non-zero coefficients and CV-AUC) |
| `results/turkey_strain_cage.json` | strain collinearity structure, three pure-cage contrasts, infection-effect reference, per-contrast differential abundance |
| `results/turkey_biomarkers.csv` | merged three-evidence table for all 62 features (includes the `cage_confounded` column) |
| `results/turkey_differential_abundance.csv` | differential abundance (t / p / FDR / direction / per-group CLR means) |
| `results/turkey_permutation_importance.csv` | within-fold permutation importance |
| `results/turkey_analysis.log` | full run log |

---

## 7. Outstanding

- [ ] Redo the cross-host consistency test on the intersection of the two feature sets (first decide whether it is worth it — the feature space would shrink substantially)
- [ ] Bring this cohort's consistency checks into `check_consistency.py`
- [x] ~~Microbiome difference between the two infecting strains (CK/PA and TK/MN, 16 birds each)~~ → done (§4): **not testable**. Strain is three-way collinear with isolator and extraction batch, so that AUC of 0.912 cannot be attributed to strain. The pure cage effect was quantified instead, giving a mean AUC of 0.908, the same magnitude as the infection effect of 0.967
- [ ] Separating cage effect from infection effect requires redoing the experiment with a **stratified design** — each isolator housing both positive and negative birds. This is a design problem, not an analysis problem, and the existing data cannot be repaired
- [ ] Confirm the duplicated values in `Bird_weight.g.` and `Bursa.BodyWeight.Ratio1000` (§1.6, requires contacting the data provider)
