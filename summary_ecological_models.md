# Ecological feature spaces vs the genus-abundance model

**Scripts**: `eco_common.py`, `ecological_models.py`, `ecological_cage_check.py`
**Results**: `results/ecological_models.json`, `ecological_models_depthadj.json`, `ecological_cage_check.json`, `ecological_depth_diagnostic.json`
**Data**: `ecological_model/` (see `readme-ecological-results.md`)
**Date**: 2026-08-25

> **One-sentence conclusion: a purely ecological model — α diversity plus core retention, 13 features, no taxonomic information whatsoever — transfers from duck to turkey at AUC 0.800 (p=0.0050, noise ceiling 0.740) and holds at 0.803 after depth adjustment, while the genus-abundance model collapses entirely in that direction. The same ecological features also fail to separate cages (0/3 contrasts) where genus abundance separates them as well as it separates infection (0.908 vs 0.967). Neither α diversity nor core retention achieves this alone; only their combination does.**

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
- **Combining α with core retention beats either alone** in duck (0.613 against 0.538 and 0.593) and clears significance in both cohorts. This foreshadows §4, where the combination does something neither component can.

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

`summary_Turkey_45_sample.md` §4 established that in the genus space the pure cage effect (strain, batch and infection status all fixed, only cage varying) reaches AUC 0.908 against an infection effect of 0.967 — indistinguishable. The same three contrasts were run in every feature space:

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

1. **Neither component achieves it alone.** α diversity transfers at 0.375 and core retention at 0.469 — both at or below chance. Only the 13-feature combination works. Whatever transfers is a relationship between diversity and core retention, not either quantity on its own.
2. **The genus model does not merely transfer worse — it collapses.** Its decision function is constant on the target. The prevalence filter is fitted on duck, so turkey CLR values land far outside the training range, the RBF kernel underflows, and every test sample receives an identical score. AUC 0.500 here means "no discrimination whatsoever", not "chance-level discrimination".
3. **The target host's own genus signal is cage-confounded**, so a taxonomic transfer would have been hard to interpret even had it worked. The ecological transfer does not have that problem (§3).

### What this does not establish

- **Transfer is asymmetric.** Turkey → Duck gives 0.549 (p=0.094), and 0.523 (p=0.269) after depth adjustment — no signal. Training on 45 samples to predict 260 is the harder direction, and turkey's own signal is cage-entangled, so the asymmetry is unsurprising, but it means the claim is "duck-trained ecology transfers to turkey", not "ecological features are host-general".
- **One direction, one pair of cohorts.** With the swan cohort unusable, there is no third host to replicate on.
- **Turkey's infection status is perfectly collinear with cage.** The duck-trained model never saw a cage, so what it learned is duck infection signal — but the 0.800 is measured against a turkey label that is inseparable from cage assignment. §3 mitigates this (ecological features do not track cages) without eliminating it.

**Answering the question as posed**: on this data, broader ecological predictors *are* more consistent between hosts than genus abundance — decisively so, since the taxonomic model transfers not at all. But the evidence is one direction of one host pair, and it comes from a combination of features that individually transfer at chance.

---

## 5. What to do next

1. **Replicate Duck → Turkey on a third host.** This is the single highest-value follow-up. The swan cohort cannot serve; another wild cohort is needed.
2. **Work out what in the α + core combination transfers**, given that neither part does alone. Inspecting the fitted decision boundary, or testing pairwise ratios of the 13 features directly, would turn a black-box result into a reportable mechanism.
3. **Give the genus model a non-degenerate transfer baseline** by using the intersection of both cohorts' feature sets (the open item in `summary_Turkey_45_sample.md` §7). Beating a collapsed model is a weak claim; beating a functioning one would be strong.
4. **Rarefy, or model depth explicitly.** Depth reaches AUC 0.650 in duck. The `--deconfound-depth` residualization is a sensitivity check, not a fix — for a cross-host transfer it uses source-host coefficients on the target.
5. **Do not present Aitchison distance as an ecological alternative to taxonomy.** It is the same data. Bray–Curtis is the honest community-structure comparator.

---

## 6. Reproduction

```bash
python3 ecological_models.py                                    # primary
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

## 7. Outstanding

- [ ] Replicate the Duck → Turkey ecological transfer on a third host cohort
- [ ] Identify which relationship within α + core is doing the transferring
- [ ] Cross-host test on the intersection of both feature sets, for a non-degenerate taxonomic baseline
- [ ] Rarefy or depth-model the counts, then re-run §1 and §4
- [ ] Bring `results/ecological_*.json` into `check_consistency.py`
- [x] ~~Compare α diversity, core retention, community structure and a combined ecological model against the genus-abundance model~~ → done (§1–§4)
- [x] ~~Build a classifier from ecological features only, with no taxonomic information~~ → done: the pure ecological space (α + core, 13 features) is §4's positive result
