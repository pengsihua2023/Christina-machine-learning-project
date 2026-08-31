# Turkey Cohort (PRJNA644054, n=45): Confounding Structure and the Taxa That Drive Prediction

**Cohort**: PRJNA644054, Ohio State, turkey experimental infection study, 45 samples (13 negative / 32 positive)
**Scripts**: `turkey_confounding_biomarkers.py`, `turkey_strain_cage.py` ｜ **Results**: `results/turkey_*.csv`, `turkey_confounding_biomarkers.json`, `turkey_strain_cage.json`
**Related file**: `summary_Chicken_51_sample.md` (modelling results for the merged cohort)
**Date**: 2026-08-11

> **One-sentence conclusion: isolator is perfectly collinear with infection status, and the pure cage effect — strain, batch and infection status all held fixed, only the cage varying, mean AUC 0.908 — is nearly the same magnitude as the infection effect (0.967). How much of AUC 0.930 comes from infection and how much from cage assignment cannot be separated. Seven candidate genera survive the cage screen. The strain effect cannot be tested at all, because of a three-way collinearity.**

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

### 2.1 Method: one screen more than usual

A prevalence threshold of ≥10% retains **62 features**. Three lines of evidence:

| Method | Output | Result in this cohort |
|---|---|---|
| Differential abundance (CLR + Welch t + BH-FDR) | effect direction + FDR | **19 features at FDR<0.05** (11 Pos↑, 8 Pos↓) |
| Permutation importance (within-fold, 3×5 folds) | contribution to the model | — |
| **Cage-effect screen** (unique to this cohort) | is the feature cage-driven? | **18 features already differ by isolator within the positives** |

**The third is something the primary cohort cannot do**: wild ducks have no cages, so there is nothing to test. The procedure is, for each genus, a one-way ANOVA across isolators **within the positives only** (BH-FDR corrected) — if a genus differs significantly across four isolators that are all positive, it is cage-driven rather than infection-driven.

### 2.2 Result: 11 agree across two methods, 7 of which pass the cage screen

```
FDR<0.05 in differential abundance AND permutation importance > 0: 11
  ├─ not cage-contaminated: 7   ← usable as candidate biomarkers
  └─ cage-contaminated:     4   ← infection and cage-mate effects indistinguishable
```

### 2.3 The seven candidates that pass

| Genus | Family | Direction | Permutation importance | t | FDR |
|---|---|---|---|---|---|
| *HT002* | Lactobacillaceae | **Pos↓** | 0.0130 | −3.89 | 0.0057 |
| *Pediococcus* | Lactobacillaceae | **Pos↑** | 0.0129 | +4.32 | 0.0010 |
| (unnamed genus) | Lactobacillaceae | **Pos↓** | 0.0064 | −4.15 | 0.0017 |
| *Incertae_Sedis* | — | Pos↓ | 0.0022 | −2.60 | 0.0499 |
| *Weissella* | Lactobacillaceae | **Pos↓** | 0.0020 | −3.56 | 0.0087 |
| ***Escherichia-Shigella*** | Enterobacteriaceae | **Pos↑** | 0.0015 | **+5.64** | **0.0004** |
| *Pseudomonas* | Pseudomonadaceae | **Pos↑** | 0.00004 | +3.49 | 0.0057 |

**The pattern is clear and matches immunological expectation:**

- **Three of the four Lactobacillaceae genera fall in the infected group** — *HT002*, the unnamed genus and *Weissella* are all Pos↓
- **Opportunistic pathogens rise in the infected group** — *Escherichia-Shigella* (t=+5.64, the strongest signal in the table) and *Pseudomonas*

This is the classic dysbiosis signature of **commensal depletion with opportunist expansion**.

> One exception: *Pediococcus*, also a member of Lactobacillaceae, moves the other way (Pos↑). It is a fermentative lactic acid bacterium occupying a different niche from *Lactobacillus*, and is not over-interpreted here.

### 2.4 The four excluded by the cage screen: a cautionary example

***Negativibacillus*** (Ruminococcaceae), **ranked first**, has the highest permutation importance (0.0133) and a differential abundance of t=+5.87, FDR<0.0001 — on those two columns alone it would look like the strongest biomarker available.

**But it also differs significantly across the four isolators that are all positive**, so whether it reflects infection or the shared cage environment cannot be determined.

Also excluded are *Tissierella* (t=+4.82, FDR=0.0004) and *Faecalibacterium* (t=−3.51, FDR=0.0069) — **without the cage screen, all three would have been reported as solid findings.**

> **Subsequent correction**: the screen in this section spans two strains and two batches, so what it actually flags is "cage **or** strain **or** batch". Re-checking against the pure-cage contrasts in §4.5 shows that of these four, only *Faecalibacterium* is a genuine cage effect; the other three (including *Negativibacillus*) come from strain or batch. The conclusion is unchanged — they equally cannot be attributed to infection.

### 2.5 Added: the three-method intersection, exactly as run on the duck cohort

**Script**: `turkey_biomarkers_3method.py` ｜ **Results**: `results/turkey_biomarkers_3method.json`

§2.1–2.4 used "differential abundance + permutation importance + cage screen", whereas the duck cohort's nine genera (README §6.2) came from "differential abundance + permutation importance + **L1 stability selection**". **Each was missing a different piece, so the two were not directly comparable.** This section adds L1 stability selection.

#### The L1 penalty cannot be carried over, so it is treated as a sensitivity axis

The duck cohort used C=0.1 (18 of 70 features, about 0.03 of CV-AUC given up for sparsity). With n=45 and 62 features in turkey, the two ways of "matching the duck cohort" contradict each other:

| Way of matching | C required | Consequence |
|---|---|---|
| Match the **sparsity fraction** (≈1/4 of features) | ≈10 | the penalty is barely active |
| Match the **rule** (give up ~0.03 CV-AUC) | ≈0.2 | only 7 non-zero coefficients remain |

With no single correct choice, C becomes a sensitivity axis: **200 bootstraps at each of 0.2 / 1.0 / 10.0, and a feature counts as an L1 hit only if it reaches ≥70% selection frequency at all three** (4 / 8 / 9 hits respectively; the intersection is taken). The conclusion then does not rest on an arbitrary choice.

#### Result: four features, two of which pass the cage screen

| Genus | Family | Permutation importance | L1 freq (lowest) | Direction | FDR | Cage |
|---|---|---|---|---|---|---|
| *Negativibacillus* | Ruminococcaceae | 0.0133 | 0.865 | Pos↑ | 3.84e-05 | **confounded** |
| ***HT002*** | Lactobacillaceae | 0.0130 | 0.935 | **Pos↓** | 5.72e-03 | **passes** |
| *Tissierella* | Family_XI | 0.0079 | 0.885 | Pos↑ | 3.75e-04 | **confounded** |
| ***Escherichia-Shigella*** | Enterobacteriaceae | 0.0015 | 1.000 | **Pos↑** | 3.75e-04 | **passes** |

Hits per method: differential abundance 19, permutation importance 24, L1 (all three C) 4. **L1 is by far the strictest gate** — as it was in the duck cohort, where it is also the step that narrowed 19 FDR-significant features to 9.

> **How this relates to the seven in §2.3.** Those seven are "two methods agree + passes the cage screen"; these four are "three methods agree". **The latter is the stricter subset**: once L1 is added, *Pediococcus*, the unnamed Lactobacillaceae genus, *Incertae_Sedis* and *Weissella* fail to be selected consistently across all three C values.
>
> Both sets are correct at their own strictness. **Use the four here when comparing against the duck cohort; use the seven in §2.3 when listing every candidate this cohort offers.**

#### Cross-host comparison: no genus overlap, one family overlap

Rebuilding the duck cohort's three-method intersection gives **9 features**, matching README §6.2 — a check that the reconstruction is faithful before any comparison is drawn.

| Rank | Overlap |
|---|---|
| Genus | **none** |
| Family | **Ruminococcaceae** |

```
Ruminococcaceae
    Duck     (unnamed genus)      Pos↑
    Turkey   Negativibacillus     Pos↑    ← but cage/strain/batch confounded
```

**The direction agrees (Pos↑ on both sides), the first taxonomic cross-host consistency anywhere in this project.** But it has to be reported with its caveat: the turkey member, *Negativibacillus*, is precisely the cautionary case from §2.4 — it differs significantly across four isolators that are all positive, and §4.5 traces the contamination to strain or batch. **This family-level agreement therefore cannot be attributed to infection; it is a lead worth testing in a third cohort, nothing more.**


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

**The §2.4 screen was over-strict: only 1 of the 4 is a true cage effect.** But it did not err in direction — the seven candidates of §2.3 passed under the stricter standard, so they pass under the looser one as well, and **the conclusion is unchanged**.

The wording on *Negativibacillus* should be corrected accordingly: it is not contaminated by the cage effect but **by strain or batch** — and under this design it equally cannot be attributed to infection.

---

## 5. Conclusions

### 5.1 This cohort is not suitable as a standalone source of biomarker discovery

Three reasons:

1. **Isolator is perfectly collinear with infection status, and the pure cage effect nearly matches the infection effect.** Across the three contrasts in which strain, batch and infection status are all fixed and only the cage varies, AUC is 0.919 / 0.906 / 0.900 (mean 0.908, 3/3 significant), against an infection effect of 0.967 (§4). Of the AUC 0.930 reported in `summary_Chicken_51_sample.md`, how much comes from infection and how much from cage assignment cannot be separated.
2. **The DNA extraction batch is partly collinear and its effect is real** (AUC 0.940 within the positives).
3. n=45, with only 13 in the minority class.

### 5.2 But the cage screen is itself a valuable, independent perspective

Those seven candidates **survive a test the primary cohort has no way of applying**. The combination of rising *Escherichia-Shigella* with falling Lactobacillaceae is mechanistically interpretable in particular, and is worth validating in other cohorts.

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
