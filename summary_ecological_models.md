# Ecological feature spaces vs the genus-abundance model

**Scripts**: `eco_common.py`, `ecological_models.py`, `ecological_cage_check.py`
**Results**: `results/ecological_models.json`, `ecological_models_depthadj.json`, `ecological_cage_check.json`
**Data**: `ecological_model/` (see `readme-ecological-results.md`)
**Date**: 2026-08-25

> **One-sentence conclusion: ecological predictors do *not* transfer between hosts any better than genus abundance — every transfer direction fails or is uninterpretable. But within the turkey cohort they behave very differently in a way that matters more: core retention carries a real infection signal (AUC 0.780, p=0.0066) while failing to separate cages (0/3 contrasts significant), whereas genus abundance separates cages just as well as it separates infection (0.908 vs 0.967). The coarser ecological features are markedly less cage-confounded.**

---

## 0. What was compared

| Feature space | n features | Fitted in-fold? |
|---|---|---|
| α diversity | 6 | no fitting needed (per-sample) |
| Core retention | 7 | **yes** — baseline core redefined from training-fold negatives |
| Community structure, PCoA (Bray) | 10 | **yes** — classical MDS on training distances, test projected by Gower interpolation |
| Community structure, PCoA (Aitchison) | 10 | **yes** — same |
| Community structure, kernel (Bray) | — | no fitting needed (distances are pairwise) |
| Community structure, kernel (Aitchison) | — | no fitting needed |
| Ecological combined (α + core + PCoA) | 23 | yes |
| **Genus abundance CLR** (reference) | 70 duck / 62 turkey | yes — `PrevalenceCLR` |

Model held fixed at SVM-RBF throughout, so that what varies is the feature space and not the learner. Protocol: outer 5-fold × 10 repeats, inner 4-fold tuning, AUC computed per fold and averaged.

**Calibration check**: the genus reference reproduces the established results — 70 features and AUC 0.836 in duck (documented: 70 features, 0.835 — README §4), 62 features and 0.972 in turkey (documented: 62 features). The cage contrasts in §3 reproduce `summary_Turkey_45_sample.md` §4 to three decimals. The Python core-retention implementation reproduces the collaborator's R output exactly on all 7 columns and all 326 samples.

---

## 1. Within-host performance

| Feature space | Duck (n=260) | perm p | Turkey (n=45) | perm p |
|---|---|---|---|---|
| α diversity | 0.538 | 0.333 | 0.748 | 0.070 |
| Core retention | 0.593 | **0.050** | 0.799 | **0.010** |
| PCoA (Bray) | 0.661 | **0.005** | 0.813 | **0.005** |
| PCoA (Aitchison) | 0.808 | **0.005** | 0.962 | **0.005** |
| Kernel (Bray) | 0.695 | **0.005** | 0.850 | **0.005** |
| Kernel (Aitchison) | 0.848 | **0.005** | 0.970 | **0.005** |
| Ecological combined | 0.773 | **0.005** | 0.916 | **0.005** |
| **Genus abundance** | **0.836** | **0.005** | **0.972** | **0.005** |

**Read this with one structural caveat.** Aitchison distance *is* Euclidean distance in CLR space — the same genus abundances the taxonomic model uses, reparameterised as a distance. Its near-equality with the genus model (0.848 vs 0.836 in duck; 0.970 vs 0.972 in turkey) is close to tautological and should not be reported as "community structure performs as well as taxonomy".

The genuinely independent ecological signals are **α diversity, core retention, and Bray–Curtis**. All three sit clearly below the genus model:

- Duck: 0.538 / 0.593 / 0.695 against 0.836
- Turkey: 0.748 / 0.799 / 0.850 against 0.972

α diversity does not clear its own permutation null in either cohort (p=0.333 duck, p=0.070 turkey).

---

## 2. Sequencing depth is a real confounder, and it decides what the swan cohort can say

Counts were not rarefied. Richness metrics rise with depth by construction, so depth must be checked before any of this is interpreted.

| Cohort | Depth → infection status, AUC |
|---|---|
| Duck | 0.650 |
| Turkey | 0.560 |
| **Swan** | **0.870** |

In the 15-sample swan cohort, depth alone almost separates the classes, and every richness-type feature tracks depth closely:

| Feature | AUC alone | \|r\| with depth |
|---|---|---|
| `TotalTaxaPresent` | 1.000 | 0.772 |
| `Observed_Genera` | 1.000 | 0.618 |
| `Shannon_Genus` | 1.000 | 0.713 |
| `CoreRetentionProportion` | 0.980 | 0.712 |
| `CoreAbundanceRetention` | 0.560 | **0.007** |

The last row is the internal control: `CoreAbundanceRetention` is the one core metric essentially uncorrelated with depth, and it is also the one showing no signal. **Nothing from the swan cohort is interpretable**, and the swan transfer results in §4 should be read as depth artefacts, not biology.

**Depth-adjusted sensitivity run** (`--deconfound-depth`, each feature regressed on log depth with coefficients fitted in-fold). Within-host results barely move, so §1 is robust:

| | Duck primary → adjusted | Turkey primary → adjusted |
|---|---|---|
| α diversity | 0.538 → 0.540 | 0.748 → 0.752 |
| Core retention | 0.593 → 0.578 | 0.799 → **0.828** |
| PCoA (Bray) | 0.661 → 0.654 | 0.813 → 0.796 |
| Ecological combined | 0.773 → 0.767 | 0.916 → 0.910 |

Duck core retention loses its borderline significance under adjustment (p 0.050 → 0.065); turkey core retention holds (p 0.010 → 0.015).

---

## 3. The finding that matters: ecological features are far less cage-confounded

`summary_Turkey_45_sample.md` §4 established that in the genus space the pure cage effect (strain, batch and infection status all fixed, only cage varying) reaches AUC 0.908 against an infection effect of 0.967 — the two are indistinguishable. The same three contrasts were run in every feature space:

| Feature space | Pure cage (mean of 3) | Infection | Cage / infection | Cage contrasts significant |
|---|---|---|---|---|
| α diversity | 0.502 | 0.746 | **0.67** | 0/3 |
| **Core retention** | **0.602** | **0.780** | **0.77** | **0/3** |
| PCoA (Bray) | 0.594 | 0.827 | **0.72** | 0/3 |
| Ecological combined | 0.773 | 0.919 | 0.84 | 1/3 |
| PCoA (Aitchison) | 0.935 | 0.976 | 0.96 | 3/3 |
| **Genus abundance** | **0.908** | **0.967** | **0.94** | **3/3** |

Core retention in detail:

```
Isolator 3 vs 4 (CKPA, batch 10-30, all positive)   AUC 0.631   p = 0.2226
Isolator 5 vs 6 (TKMN, batch 11-06, all positive)   AUC 0.600   p = 0.2857
Isolator 1 vs 2 (Mock, batch 10-30, all negative)   AUC 0.575   p = 0.4186
Infection vs control (n=45)                         AUC 0.780   p = 0.0066
```

**Core retention detects infection and fails to detect the cage.** Genus abundance detects both, equally well. That is a qualitative difference, not a matter of a few AUC points, and it is the strongest result in this round.

The ordering is coherent: the more a feature space compresses the taxonomic detail, the less cage signal survives. Aitchison PCoA sits with genus abundance because it *is* genus abundance; Bray–Curtis, α diversity and core retention sit far below.

> **What this does and does not license.** It does not show that core retention measures infection more accurately — its infection AUC (0.780) is well below the genus model's (0.967). It shows that its lower score is *less contaminated*. In a design where cage and infection are perfectly collinear, a feature that ignores cage-level community idiosyncrasy while retaining infection signal is worth more than a higher number that cannot be attributed.

---

## 4. Cross-host transfer: the original question, answered in the negative

Whole source cohort trains, whole target cohort tests. Distance kernels and PCoA cannot cross cohorts (their coordinate systems are defined within a cohort), so only α diversity, core retention and genus abundance are comparable. Each AUC carries a permutation null on the target labels, because at n=45 and n=15 a bare AUC means nothing.

| Source → target | α diversity | Core retention | Genus abundance |
|---|---|---|---|
| Duck → Turkey | 0.375 (p=0.91) | 0.469 (p=0.62) | 0.500 — **degenerate** |
| Turkey → Duck | 0.503 (p=0.46) | 0.579 (p=0.035) | 0.500 — **degenerate** |
| Duck → Swan | 0.400 (p=0.73) | 0.900 (p=0.005) | 0.500 — **degenerate** |
| Turkey → Swan | 1.000 (p=0.005) | 0.980 (p=0.005) | 0.220 (p=1.00) |

**Reading it honestly, direction by direction:**

- **Both swan rows are depth artefacts** (§2) and carry no weight.
- **Duck → Turkey fails for everything**, at or below chance in all three spaces.
- **Turkey → Duck core retention (0.579, p=0.035) is the only surviving candidate**, and it does not survive the depth-adjusted run (0.554, p=0.085). It is also a small effect on any reading.
- **Genus abundance does not merely transfer poorly — it collapses.** The decision function is constant on the target in three of four directions. Mechanism: the prevalence filter is fitted on the source, so target CLR values land far outside the training range, the RBF kernel underflows, and every test point receives the same score. AUC 0.500 here means "no discrimination whatsoever", not "chance-level discrimination".

**So the hypothesis is not supported by transfer performance.** Broader ecological predictors are not measurably more consistent between hosts than genus abundance on this data. The one direction with any signal does not survive depth adjustment.

Two reasons to treat this as provisional rather than settled:

1. **The comparison is not quite fair to either side.** Genus transfer is degenerate rather than informative-but-wrong, so "ecological beats taxonomic in transfer" would be comparing against a broken baseline. A feature-intersection protocol (the open item in `summary_Turkey_45_sample.md` §7) would give the taxonomic model a real chance to fail on its merits.
2. **Duck and turkey differ in more than host.** Duck is wild surveillance, turkey is experimental infection with perfect cage collinearity. A failure to transfer between them confounds "different host" with "different study design entirely". The swan cohort was the only other wild cohort available and it is unusable.

---

## 5. What to do next

1. **Report the cage result (§3), not the transfer result (§4), as the headline.** It is the finding that is both robust and useful, and it speaks directly to the problem the turkey cohort has.
2. **Rarefy, or model depth explicitly, before any further ecological work.** Depth reaches AUC 0.650 in duck and 0.870 in swan. The `--deconfound-depth` residualization here is a sensitivity check, not a fix — for the swan cohort it cannot work, because the residualization coefficients come from the source host.
3. **Drop the swan cohort** from predictive work, or obtain more samples. At n=15 with 5 negatives and depth at AUC 0.870, it cannot support any claim.
4. **Do not present Aitchison distance as an ecological alternative to taxonomy.** It is the same data. Bray–Curtis is the honest community-structure comparator.
5. **Test the cage result in a second cohort.** The claim "coarser ecological features are less cage-confounded" currently rests on one cohort with three contrasts of 13–16 samples each.

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
| `results/*.log` | full console output for each run |

---

## 7. Outstanding

- [ ] Rarefy or depth-model the counts, then re-run §1 and §4
- [ ] Cross-host test on the intersection of both feature sets, giving the taxonomic model a non-degenerate transfer baseline
- [ ] Replicate the §3 cage result in another cohort with within-cage variation
- [ ] Bring `results/ecological_*.json` into `check_consistency.py`
- [x] ~~Compare α diversity, core retention, community structure and a combined ecological model against the genus-abundance model~~ → done (§1–§4)
