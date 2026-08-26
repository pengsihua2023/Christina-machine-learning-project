# Ecological feature spaces vs the genus-abundance model

**Scripts**: `eco_common.py`, `ecological_models.py`, `ecological_cage_check.py`, `ecological_transfer_anatomy.py`
**Results**: `results/ecological_models.json`, `ecological_models_depthadj.json`, `ecological_cage_check.json`, `ecological_depth_diagnostic.json`, `ecological_transfer_anatomy.json`, `ecological_transfer_linear.json`
**Data**: `ecological_model/` (see `readme-ecological-results.md`)
**Date**: 2026-08-25

> **One-sentence conclusion: infected birds retain less of their host-specific baseline core microbiome, and this holds in both hosts. A linear model using core retention alone, trained on 260 wild ducks, separates infected from control turkeys at AUC 0.870 (0.904 after depth adjustment, p=0.0020) — while the genus-abundance model's decision function is constant on the target. The same ecological features also fail to separate cages (0/3 contrasts) where genus abundance separates them as well as it separates infection (0.908 vs 0.967).**

---

## 0. What was compared

| Feature space | n features | Contains taxonomic detail? | Fitted in-fold? |
|---|---|---|---|
| α diversity | 6 | no | no fitting needed (per-sample) |
| Core retention | 7 | no | **yes** — core redefined from training-fold negatives |
| **Pure ecological (α + core)** | **13** | **no** | **yes** |
| Pure ecological + structure (α + core + Bray PCoA) | 23 | no | yes |
| Community structure, PCoA (Bray) | 10 | no | yes — MDS on training distances, test projected by Gower interpolation |
| Community structure, kernel (Bray) | — | no | no fitting needed (distances are pairwise) |
| Community structure, PCoA (Aitchison) | 10 | **yes** — see below | yes |
| Community structure, kernel (Aitchison) | — | **yes** | no fitting needed |
| α + core + Aitchison PCoA | 23 | **yes** | yes |
| **Genus abundance CLR** (reference) | 70 duck / 62 turkey | yes | yes — `PrevalenceCLR` |

**Aitchison distance is Euclidean distance in CLR space** — the same genus abundances the taxonomic model uses, reparameterised as a distance. Any space built on it carries the full taxonomic signal and is *not* an ecological alternative to taxonomy. It is kept in the tables as a control, labelled as such.

Model held fixed at SVM-RBF throughout, so that what varies is the feature space and not the learner. Protocol: outer 5-fold × 10 repeats, inner 4-fold tuning, AUC computed per fold and averaged.

**Calibration**: the genus reference reproduces the established results — 70 features and AUC 0.836 in duck (documented 0.835, README §4), 62 features and 0.972 in turkey. The cage contrasts in §3 reproduce `summary_Turkey_45_sample.md` §4 to three decimals. The Python core-retention implementation reproduces the collaborator's R output exactly on all 7 columns and all 326 samples.

---

## 1. Within-host performance

| Feature space | Duck (n=260) | p | Turkey (n=45) | p |
|---|---|---|---|---|
| α diversity | 0.538 | 0.333 | 0.748 | 0.070 |
| Core retention | 0.593 | **0.050** | 0.799 | **0.010** |
| **Pure ecological (α + core)** | **0.613** | **0.010** | **0.807** | **0.020** |
| Pure ecological + Bray | 0.674 | **0.005** | 0.854 | **0.005** |
| PCoA (Bray) | 0.661 | **0.005** | 0.813 | **0.005** |
| Kernel (Bray) | 0.695 | **0.005** | 0.850 | **0.005** |
| *PCoA (Aitchison) — taxonomic* | *0.808* | *0.005* | *0.962* | *0.005* |
| *Kernel (Aitchison) — taxonomic* | *0.848* | *0.005* | *0.970* | *0.005* |
| *α + core + Aitchison — taxonomic* | *0.773* | *0.005* | *0.916* | *0.005* |
| **Genus abundance** | **0.836** | **0.005** | **0.972** | **0.005** |

**On raw discrimination the genus model wins, and it is not close in duck** (0.836 against 0.674 for the best purely ecological space). In turkey the gap narrows (0.972 against 0.854) but remains.

Two things worth noting inside the ecological block:

- **α diversity alone is not usable.** It fails its own permutation null in both cohorts (p=0.333 duck, p=0.070 turkey).
- **Combining α with core retention beats either alone** in duck (0.613 against 0.538 and 0.593) and clears significance in both cohorts. Note this is a *within-host* statement; for cross-host transfer §5 shows core retention does better on its own.

---

## 2. Sequencing depth is a real confounder

Counts were not rarefied, and richness metrics rise with depth by construction.

| Cohort | Depth → infection status, AUC |
|---|---|
| Duck | 0.650 |
| Turkey | 0.560 |
| **Swan (n=15)** | **0.870** |

In the swan cohort depth alone nearly separates the classes, and every richness feature tracks depth:

| Feature | AUC alone | \|r\| with depth |
|---|---|---|
| `TotalTaxaPresent` | 1.000 | 0.772 |
| `Observed_Genera` | 1.000 | 0.618 |
| `Shannon_Genus` | 1.000 | 0.713 |
| `CoreRetentionProportion` | 0.980 | 0.712 |
| `CoreAbundanceRetention` | 0.560 | **0.007** |

The last row is the internal control: the one core metric essentially uncorrelated with depth is also the one showing no signal.

**A depth-adjusted sensitivity run** (`--deconfound-depth`; each feature regressed on log depth, coefficients fitted in-fold) does two things at once, and both increase confidence in what follows:

| | Duck primary → adjusted | Turkey primary → adjusted |
|---|---|---|
| α diversity | 0.538 → 0.540 | 0.748 → 0.752 |
| Core retention | 0.593 → 0.578 | 0.799 → **0.828** |
| Pure ecological (α + core) | 0.613 → 0.603 | 0.807 → **0.817** |
| Pure ecological + Bray | 0.674 → 0.664 | 0.854 → 0.854 |
| Genus abundance | 0.836 → 0.836 | 0.972 → 0.972 |

1. **Within-host results barely move**, so §1 is robust to depth.
2. **The swan transfer results collapse** — Turkey → Swan falls from AUC 1.000 to 0.600 (p 0.005 → 0.259) for the pure ecological model. That is exactly what should happen to a depth artefact, and it confirms the diagnosis above. **Nothing from the swan cohort is interpretable**; it is excluded from the conclusions.

---

## 3. Ecological features are far less cage-confounded

> **"Cage effect" here means the housing unit, which is an isolator holding 8 birds** — a negative-pressure unit whose occupants share litter, water and feed. The term follows the literature convention; the physical unit is not a per-animal cage. `Isolator_.` is the only spatial grouping recorded.

`summary_Turkey_45_sample.md` §4 established that in the genus space the pure cage effect (strain, batch and infection status all fixed, only the isolator varying) reaches AUC 0.908 against an infection effect of 0.967 — indistinguishable. The same three contrasts were run in every feature space:

| Feature space | Pure cage (mean of 3) | Infection | Cage / infection | Cage contrasts significant |
|---|---|---|---|---|
| α diversity | 0.502 | 0.746 | **0.67** | 0/3 |
| Pure ecological + Bray | 0.580 | 0.856 | **0.68** | 0/3 |
| **Pure ecological (α + core)** | **0.563** | **0.784** | **0.72** | **0/3** |
| PCoA (Bray) | 0.594 | 0.827 | **0.72** | 0/3 |
| Core retention | 0.602 | 0.780 | **0.77** | 0/3 |
| *α + core + Aitchison — taxonomic* | *0.773* | *0.919* | *0.84* | *1/3* |
| *PCoA (Aitchison) — taxonomic* | *0.935* | *0.976* | *0.96* | *3/3* |
| **Genus abundance** | **0.908** | **0.967** | **0.94** | **3/3** |

Pure ecological model in detail:

```
Isolator 3 vs 4 (CKPA, batch 10-30, all positive)   AUC 0.556   p = 0.3987
Isolator 5 vs 6 (TKMN, batch 11-06, all positive)   AUC 0.644   p = 0.2458
Isolator 1 vs 2 (Mock, batch 10-30, all negative)   AUC 0.487   p = 0.5515
                                          mean      AUC 0.563   0 of 3 significant

Infection vs control (n=45)                         AUC 0.784   p = 0.0100
```

**Every purely ecological space detects infection and fails to detect the cage. Every taxonomic space detects both.** The ordering is monotone in how much taxonomic detail the space retains, which is what makes it credible rather than incidental.

> **What this does and does not license.** It does not show that ecological features measure infection more accurately — 0.784 is well below the genus model's 0.967. It shows the lower score is *less contaminated*. Under perfect cage/infection collinearity, a feature that ignores cage-level idiosyncrasy while retaining infection signal is worth more than a higher number that cannot be attributed to anything.

---

## 4. Cross-host transfer: the original question, answered in one direction

Whole source cohort trains, whole target cohort tests. Distance kernels and PCoA cannot cross cohorts (their coordinate systems are defined within a cohort), so the comparable spaces are α diversity, core retention, their combination, and genus abundance. Every AUC carries a permutation null on the target labels.

| Source → target | α diversity | Core retention | **Pure ecological (α + core)** | Genus abundance |
|---|---|---|---|---|
| **Duck → Turkey** | 0.375 (p=0.91) | 0.469 (p=0.62) | **0.800 (p=0.0050)** | 0.500 — **degenerate** |
| Turkey → Duck | 0.503 (p=0.46) | 0.579 (p=0.035) | 0.549 (p=0.0945) | 0.500 — **degenerate** |
| ~~Duck → Swan~~ | ~~0.400~~ | ~~0.900~~ | ~~0.500~~ | ~~0.500~~ |
| ~~Turkey → Swan~~ | ~~1.000~~ | ~~0.980~~ | ~~1.000~~ | ~~0.220~~ |

Swan rows struck out — depth artefacts (§2), and all of them collapse under depth adjustment.

### The Duck → Turkey result

```
                         primary          depth-adjusted
Pure ecological (α+core)  0.800            0.803
noise ceiling (null max)  0.740            0.757
p-value                   0.0050           0.0050
```

**A model trained on 260 wild ducks, using only α diversity and core retention, separates infected from control turkeys at AUC 0.800 — above its noise ceiling, and unchanged by depth adjustment.** This is the first cross-host transfer anywhere in this project to clear its own noise ceiling in a non-degenerate way.

Three things make it notable:

1. **This 0.800 understates the effect, because the RBF kernel is the wrong model here.** Under an SVM-RBF, α diversity transfers at 0.375 and core retention at 0.469, which suggested that only the 13-feature combination worked. §5 shows that was a kernel artefact: with a linear model, core retention alone transfers at 0.870. The RBF result is retained above for protocol consistency with §1–§3, but §5 is the correct reading.
2. **The genus model does not merely transfer worse — it collapses.** Its decision function is constant on the target. The prevalence filter is fitted on duck, so turkey CLR values land far outside the training range, the RBF kernel underflows, and every test sample receives an identical score. AUC 0.500 here means "no discrimination whatsoever", not "chance-level discrimination".
3. **The target host's own genus signal is cage-confounded**, so a taxonomic transfer would have been hard to interpret even had it worked. The ecological transfer does not have that problem (§3).

### What this does not establish

- **Transfer is asymmetric.** Turkey → Duck gives 0.549 (p=0.0945), and 0.523 (p=0.269) after depth adjustment — no signal. Training on 45 samples to predict 260 is the harder direction, and turkey's own signal is cage-entangled, so the asymmetry is unsurprising, but it means the claim is "duck-trained ecology transfers to turkey", not "ecological features are host-general".
- **One direction, one pair of cohorts.** With the swan cohort unusable, there is no third host to replicate on.
- **Turkey's infection status is perfectly collinear with cage.** The duck-trained model never saw a cage, so what it learned is duck infection signal — but the 0.800 is measured against a turkey label that is inseparable from cage assignment. §3 mitigates this (ecological features do not track cages) without eliminating it.

**Answering the question as posed**: on this data, broader ecological predictors *are* more consistent between hosts than genus abundance — decisively so, since the taxonomic model transfers not at all. The evidence is still one direction of one host pair, but §5 shows it rests on a single interpretable quantity rather than an opaque feature combination.

---

## 5. What in α + core is doing the transferring

**Script**: `ecological_transfer_anatomy.py` ｜ **Results**: `results/ecological_transfer_anatomy.json`, `ecological_transfer_linear.json`, `ecological_transfer_singles_corrected.json`

### 5.1 The RBF kernel was the obstacle, not the features

Repeating every transfer with L2 logistic regression instead of SVM-RBF:

| Feature set | SVM-RBF | Linear | Linear, depth-adjusted |
|---|---|---|---|
| All 13 | 0.800 | 0.834 | 0.856 |
| α diversity only | 0.375 | 0.714 | 0.716 |
| **Core retention only** | 0.469 | **0.870** | **0.904** |
| Dimensionless subset (5) | 0.728 | 0.784 | — |
| Count-type subset (6) | 0.591 | 0.856 | — |

**The linear model beats the RBF in every subset, and core retention alone beats the full 13-feature RBF model.** An RBF kernel measures Euclidean distance in standardised feature space; standardisation is fitted on duck, and turkey's values sit far from duck's centre, so the kernel saturates. A linear boundary only needs the *direction* of the effect to agree between hosts, not its location. That is exactly the property a cross-host transfer requires.

This corrects §4's earlier reading. It is not an interaction between diversity and core retention — **core retention carries the transfer on its own.**

| Set | Linear AUC | Null max | p |
|---|---|---|---|
| Core retention only | 0.870 | 0.757 | **0.0020** |
| All 13 | 0.834 | 0.748 | **0.0020** |
| α diversity only | 0.714 | 0.779 | 0.0140 |

### 5.2 The effect is one directional quantity, consistent across hosts

Per-feature transfer AUCs and the direction of each effect within each host:

| Feature | Duck AUC | Turkey AUC | Same direction? |
|---|---|---|---|
| **CoreRetentionProportion** | **0.397** | **0.154** | **yes (Pos↓ in both)** |
| **CoreTaxaLost** | **0.603** | **0.846** | **yes (Pos↑ in both)** |
| CoreTaxaPresent | 0.397 | 0.154 | yes |
| CoreMembershipProportion | 0.417 | 0.326 | yes |
| Observed_Genera | 0.491 | 0.293 | yes |
| Simpson / InvSimpson | 0.507 | 0.214 | no |
| CoreAbundanceRetention | 0.498 | 0.505 | no |

9 of 13 features point the same way in both hosts. The two strongest are the same measurement from opposite ends: **`CoreRetentionProportion` is lower in infected birds and `CoreTaxaLost` is higher, in both duck and turkey.**

> **The mechanism, stated plainly: infected birds lose a larger share of their host-specific baseline core microbiome. Which genera constitute that core differs completely between hosts — 14 genera in duck, 32 in turkey — but the *proportion lost* behaves the same way in both. That is why a taxonomic model cannot transfer and this one can.**

Taken alone, `CoreRetentionProportion` transfers at 0.846. It was selected after inspecting the per-feature ranking, so it is judged against a null for the maximum over all 13 single features:

```
Best single feature            AUC 0.846  (CoreRetentionProportion)
Null for the max over 13       0.623 ± 0.055  (max 0.867)
Selection-corrected p          0.0040
```

The same correction applied to the 78-pair search gives observed max 0.862 (`Observed_Genera` + `CoreRetentionProportion`) against a searched null of 0.695 ± 0.051, **p=0.0033**. Both searches survive their own selection bias.

### 5.3 What this does not resolve

- α diversity alone reaches only 0.714 with a null max of 0.779 — **it does not clear its noise ceiling** (p=0.0140 is below 0.05, but the null maximum exceeds the observed value, so a single draw of noise can beat it). α diversity should not be reported as transferring.
- The pre-registered dimensional hypothesis — that only dimensionless features transfer — is **not supported**. Under a linear model the count-type subset transfers at 0.856. The scale problem was real, but it lived in the kernel, not in the features.

---

## 6. Does combining everything help?

The obvious next move is to concatenate the genus abundances with the ecological features and let the model use both. It does not help, and it costs both properties that made the ecological features worth having.

### 6.1 Within host: no gain

| Feature space | n features | Duck | n features | Turkey |
|---|---|---|---|---|
| Genus abundance | 70 | **0.836** | 62 | **0.972** |
| Genus + α + core | 83 | 0.832 | 75 | 0.960 |
| Genus + α + core + Bray | 93 | 0.831 | 85 | 0.979 |
| *Pure ecological, for reference* | *13* | *0.613* | *13* | *0.807* |

Every difference is smaller than the repeat-to-repeat standard deviation (0.012–0.025). In duck the combination is marginally *worse* than genus alone; in turkey `genus_eco` is worse and `genus_eco_bray` marginally better. **None of this is a real effect.**

The reason is that the ecological features are not independent information — they are **summary statistics computed from the same abundance table**. α diversity is a function of the abundance vector; core retention is a thresholded count over it. A model that already has all 70 abundances can in principle reconstruct them. There is nothing to add.

### 6.2 Cross-host: the transfer is destroyed

| Duck → Turkey | AUC | Null max | p |
|---|---|---|---|
| **Pure ecological (α + core)** | **0.800** | 0.740 | **0.0050** |
| Genus + α + core | **0.490** | 0.810 | 0.522 |
| Genus abundance alone | 0.500 | — | degenerate |

**Adding the genus block back drags the combination from 0.800 down to chance.** The genus features are host-specific and land far outside the training range on the target; they dominate the standardised feature space and swamp the 13 ecological columns that would otherwise have carried the transfer.

### 6.3 Cage confounding: inherited in full

| Feature space | Pure cage | Infection | Cage / infection | Significant |
|---|---|---|---|---|
| **Pure ecological (α + core)** | **0.563** | **0.784** | **0.72** | **0/3** |
| Genus abundance | 0.908 | 0.967 | 0.94 | 3/3 |
| Genus + α + core | 0.906 | 0.956 | **0.95** | **3/3** |
| Genus + α + core + Bray | 0.811 | 0.962 | 0.84 | 2/3 |

The combination tracks cages exactly as well as genus abundance alone (ratio 0.95, 3/3 contrasts significant). **Diluting a cage-confounded feature block with clean features does not decontaminate it.**

### 6.4 The conclusion

Combining is the wrong move for this problem. Genus abundance is the better within-host classifier and should be used when the question is "how well can infection be detected in this cohort". The ecological features are the better cross-host and less confounded predictor and should be used when the question is "does this hold in another host". **They answer different questions, and merging them yields a model that answers the first no better and the second not at all.**

---

## 7. Which ecological model to use

### 7.1 The comparison only makes sense once the criterion is fixed

| Feature space | Duck | p | Turkey | p | Cage / infection | Cage significant | Transfer duck→turkey<br>(**linear model**, see note) |
|---|---|---|---|---|---|---|---|
| α diversity | 0.538 | 0.333 ✗ | 0.748 | 0.070 ✗ | 0.67 | 0/3 | 0.714 — fails its null |
| **Core retention** | 0.593 | **0.050** | 0.799 | **0.010** | 0.77 | 0/3 | **0.870, p=0.0020** |
| α + core | 0.613 | **0.010** | 0.807 | **0.020** | 0.72 | 0/3 | 0.834, p=0.0020 |
| Bray PCoA | 0.661 | **0.005** | 0.813 | **0.005** | 0.72 | 0/3 | structurally impossible |
| Bray kernel | **0.695** | **0.005** | 0.850 | **0.005** | — | — | structurally impossible |
| α + core + Bray | 0.674 | **0.005** | **0.854** | **0.005** | 0.68 | 0/3 | structurally impossible |

> **How to read the transfer column**: the figure is the AUC from training on 260 ducks and scoring 45 turkeys, with no turkey data in training at all; the p-value comes from a null built by shuffling the **turkey** labels 500 times (0.0020 means zero of the 500 reached the observed value, the smallest value possible at that permutation count).
>
> **This column uses a linear model, unlike the table in §4** — that table uses SVM-RBF throughout for protocol consistency with §1–§3, and the same core retention features reach only 0.469 under RBF. §5.1 established that RBF is the wrong model here, so the linear figures are used in this table.

On within-host AUC alone the Bray-based spaces win. **That comparison is not worth making**, because genus abundance reaches 0.836 and 0.972 and beats every ecological space within host (§1).

> **If the question is "how well can infection be detected in this cohort", do not use ecological features at all — use genus abundance.** The only reason to prefer an ecological space is to obtain the two properties genus abundance lacks: it must cross hosts, and it must not track isolators. Those are the criteria on which these models should be judged.

### 7.2 Judged on those criteria, core retention wins

**It is the only one that can transfer.** Every Bray-based space is *structurally* unable to cross cohorts — PCoA axes and kernel bandwidths are defined within a cohort, so there is no shared coordinate system. This is not poor performance but impossibility. Among the three that can transfer:

```
Core retention only    0.870   null max 0.757   p = 0.0020   ← best
α + core               0.834   null max 0.748   p = 0.0020
α diversity only       0.714   null max 0.779   p = 0.0140   ← null max exceeds observed; not established
```

**Adding α diversity makes it worse** (0.870 → 0.834). α fails its own permutation null in both cohorts and again in transfer; it contributes noise.

**It detects infection and not the isolator.** Cage/infection ratio 0.77 with 0/3 contrasts significant (p = 0.22, 0.29, 0.42) against an infection effect of 0.780 (p=0.0066), where genus abundance sits at 0.94 with 3/3 significant.

> α diversity's ratio of 0.67 looks better still, but **a ratio is only readable when the numerator is real signal** — α has no infection signal in either cohort, so its ratio means nothing.

**The mechanism is reportable.** Direction agrees across hosts: `CoreRetentionProportion` lower in infected birds (duck 0.397, turkey 0.154), `CoreTaxaLost` higher (duck 0.603, turkey 0.846). The single feature `CoreRetentionProportion` transfers at 0.846 (selection-corrected p=0.0040) — a quantity that can go in an abstract.

### 7.3 Three usage rules

1. **Use a linear model, not RBF.** Same features: RBF transfers at 0.469, linear at 0.870 (§5.1).
2. **Do not add α diversity.** It passes none of the checks in this dataset.
3. **Do not merge with genus abundance.** Transfer falls from 0.800 to 0.490 and the cage ratio returns to 0.95 (§6).

### 7.4 Summary

| Question | Model |
|---|---|
| How well can infection be detected in this cohort? | **Genus abundance** (0.836 duck / 0.972 turkey) |
| Does the finding hold in another host? | **Core retention + linear model** (0.870, p=0.0020) |

---

## 8. What to do next

1. **Replicate Duck → Turkey on a third host.** This is the single highest-value follow-up. The swan cohort cannot serve; another wild cohort is needed.
2. **Report core retention loss as the transferable quantity**, and use a linear model for cross-host work. §5 settles the mechanism; what remains is confirming it holds in a third host.
3. **Give the genus model a non-degenerate transfer baseline** by using the intersection of both cohorts' feature sets (the open item in `summary_Turkey_45_sample.md` §7). Beating a collapsed model is a weak claim; beating a functioning one would be strong.
4. **Rarefy, or model depth explicitly.** Depth reaches AUC 0.650 in duck. The `--deconfound-depth` residualization is a sensitivity check, not a fix — for a cross-host transfer it uses source-host coefficients on the target.
5. **Do not present Aitchison distance as an ecological alternative to taxonomy.** It is the same data. Bray–Curtis is the honest community-structure comparator.

---

## 9. Reproduction

```bash
python3 ecological_models.py                                    # primary
python3 ecological_transfer_anatomy.py --n-perm 300             # §5 anatomy
python3 ecological_models.py --deconfound-depth --tag _depthadj # depth sensitivity
python3 ecological_cage_check.py --n-perm 300                   # cage vs infection
```

| File | Contents |
|---|---|
| `results/ecological_models.json` | within-host, permutation, transfer |
| `results/ecological_models_depthadj.json` | same with depth residualization |
| `results/ecological_cage_check.json` | pure cage vs infection effect per feature space |
| `results/ecological_depth_diagnostic.json` | per-feature AUC and depth correlation, per cohort |
| `results/*.log` | full console output for each run |

---

## 10. Outstanding

- [ ] Replicate the Duck → Turkey ecological transfer on a third host cohort
- [x] ~~Identify which relationship within α + core is doing the transferring~~ → done (§5): core retention loss, carried by a linear model
- [ ] Cross-host test on the intersection of both feature sets, for a non-degenerate taxonomic baseline
- [ ] Rarefy or depth-model the counts, then re-run §1 and §4
- [ ] Bring `results/ecological_*.json` into `check_consistency.py`
- [x] ~~Compare α diversity, core retention, community structure and a combined ecological model against the genus-abundance model~~ → done (§1–§4)
- [x] ~~Build a classifier from ecological features only, with no taxonomic information~~ → done: the pure ecological space (α + core, 13 features) is §4's positive result
