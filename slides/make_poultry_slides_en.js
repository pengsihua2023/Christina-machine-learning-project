/**
 * Poultry cohort results deck (English).
 *   node slides/make_poultry_slides_en.js
 * Output: slides/Poultry_Cohort_Results_EN.pptx
 *
 * Contents: PRJNA644054 (turkey, n=45) modelled alone, contrasted with the
 * same cohort merged with PRJNA379944 (chicken, n=6); plus the confounding
 * structure inside the turkey cohort (isolator / extraction batch / pure cage
 * effect) and the genera that drive prediction.
 * Every number comes from results/poultry_cohort.json,
 * turkey_confounding_biomarkers.json and turkey_strain_cage.json, and matches
 * summary_Chicken_51_sample.md and summary_Turkey_45_sample.md.
 *
 * Chinese counterpart: make_poultry_slides.js (keep the two in sync).
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

// ---------------------------------------------------------------- palette
// Same palette as the main deck: deep teal water, moss, warm sand;
// coral is reserved for cautions.
const DARK = "0B3C49";
const DARK2 = "12505F";
const TEAL = "18707F";
const TEALL = "4E9FAD";
const MOSS = "8FB996";
const CREAM = "FCFAF6";
const CORAL = "D2603A";
const INK = "16252C";
const MUTED = "5F7580";
const W = "FFFFFF";

const HEAD = "Georgia";
const BODY = "Calibri";
const SW = 13.333, SH = 7.5;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Sihua Peng";
pres.company = "University of Georgia, College of Public Health";
pres.title = "Poultry Cohort Results: Turkey Alone vs Turkey + Chicken";

const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.10 });
let pageNo = 0;

function slide(title, kicker) {
  const s = pres.addSlide();
  s.background = { color: CREAM };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.06, fill: { color: TEAL } });
  if (kicker) {
    s.addText(kicker, { x: 0.6, y: 0.34, w: 8, h: 0.28, margin: 0,
      fontFace: BODY, fontSize: 11, bold: true, color: TEAL, charSpacing: 2 });
  }
  s.addText(title, { x: 0.6, y: kicker ? 0.62 : 0.45, w: 12.1, h: 0.75, margin: 0,
    fontFace: HEAD, fontSize: 28, bold: true, color: INK });
  s.addText(String(pageNo), { x: 12.5, y: 6.95, w: 0.45, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 10, color: MUTED, align: "right" });
  return s;
}

function divider(num, title, subtitle) {
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.28, h: SH, fill: { color: MOSS } });
  s.addText(num, { x: 1.1, y: 2.25, w: 2.2, h: 1.6, margin: 0,
    fontFace: HEAD, fontSize: 96, bold: true, color: TEALL });
  s.addText(title, { x: 3.1, y: 2.5, w: 9.2, h: 0.95, margin: 0,
    fontFace: HEAD, fontSize: 36, bold: true, color: W });
  s.addText(subtitle, { x: 3.15, y: 3.5, w: 9.0, h: 0.9, margin: 0,
    fontFace: BODY, fontSize: 15, color: MOSS });
  return s;
}

function card(s, { x, y, w, h, accent = TEAL, fill = W, title, titleSize = 15,
                   body, bodySize = 12, bodyColor = MUTED }) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, shadow: shadow() });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.075, h, fill: { color: accent } });
  if (title) {
    s.addText(title, { x: x + 0.28, y: y + 0.16, w: w - 0.5, h: 0.36, margin: 0,
      fontFace: HEAD, fontSize: titleSize, bold: true, color: INK, valign: "top" });
  }
  if (body) {
    s.addText(body, { x: x + 0.28, y: y + (title ? 0.58 : 0.18), w: w - 0.5,
      h: h - (title ? 0.72 : 0.36), margin: 0, fontFace: BODY, fontSize: bodySize,
      color: bodyColor, lineSpacingMultiple: 1.12, valign: "top" });
  }
}

function stat(s, { x, y, w, value, label, color = TEAL, valueSize = 40, sub }) {
  s.addText(value, { x, y, w, h: 0.72, margin: 0,
    fontFace: HEAD, fontSize: valueSize, bold: true, color, align: "center" });
  s.addText(label, { x, y: y + 0.74, w, h: 0.34, margin: 0,
    fontFace: BODY, fontSize: 11.5, bold: true, color: INK, align: "center" });
  if (sub) {
    s.addText(sub, { x, y: y + 1.06, w, h: 0.34, margin: 0,
      fontFace: BODY, fontSize: 10, color: MUTED, align: "center" });
  }
}

function caveat(s, { x, y, w, h = 0.72, text, size = 12 }) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: "FBEDE7" } });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.075, h, fill: { color: CORAL } });
  s.addText(text, { x: x + 0.28, y: y + 0.1, w: w - 0.5, h: h - 0.2, margin: 0,
    fontFace: BODY, fontSize: size, color: "7A2E14", lineSpacingMultiple: 1.1, valign: "top" });
}

function table(s, rows, opts = {}) {
  s.addTable(rows, {
    x: 0.6, y: 1.7, w: 12.1, fontFace: BODY, fontSize: 11.5, color: INK,
    border: { type: "solid", pt: 0.5, color: "DDE5E8" },
    align: "center", valign: "middle", autoPage: false, ...opts,
  });
}
const th = (t) => ({ text: t, options: { fill: { color: DARK }, color: W, bold: true, fontSize: 11 } });
const hi = { fill: { color: "E4F0F0" }, bold: true };
const warn = { fill: { color: "FBEDE7" }, bold: true, color: CORAL };

// ================================================================ 1 title
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: SH - 0.9, w: SW, h: 0.9, fill: { color: DARK2 } });
  s.addText("POULTRY COHORT · SVM-RBF", { x: 1.0, y: 1.75, w: 11.3, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 15, bold: true, color: MOSS, charSpacing: 3 });
  s.addText("Turkey alone, or\nturkey plus chicken?", { x: 1.0, y: 2.35, w: 11.3, h: 1.9, margin: 0,
    fontFace: HEAD, fontSize: 42, bold: true, color: W, lineSpacingMultiple: 1.05 });
  s.addText("A head-to-head analysis of PRJNA644054 (turkey, 45) and PRJNA379944 (chicken, 6)", {
    x: 1.0, y: 4.35, w: 11.3, h: 0.45, margin: 0, fontFace: BODY, fontSize: 16, color: TEALL });
  s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 5.05, w: 3.6, h: 0.04, fill: { color: MOSS } });
  s.addText("Merging costs performance on all five metrics — and inside the turkey cohort the cage effect rivals the infection effect", {
    x: 1.0, y: 5.25, w: 11.3, h: 0.5, margin: 0, fontFace: BODY, fontSize: 13.5, color: MOSS });
  s.addText("University of Georgia · College of Public Health", { x: 1.0, y: 6.72, w: 7, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 12, color: W });
  s.addText("summary_Chicken_51_sample.md ｜ summary_Turkey_45_sample.md", {
    x: 5.5, y: 6.72, w: 6.8, h: 0.4, margin: 0, fontFace: BODY, fontSize: 11,
    color: TEALL, align: "right" });
}

// ================================================================ 2 executive summary
{
  const s = slide("Headline results", "EXECUTIVE SUMMARY");
  stat(s, { x: 0.6, y: 1.5, w: 2.85, value: "0.930", label: "Turkey alone, n=45", sub: "AUC — best in this cohort" });
  stat(s, { x: 3.6, y: 1.5, w: 2.85, value: "0.895", label: "Merged, n=51", sub: "AUC — lower, not higher", color: CORAL });
  stat(s, { x: 6.6, y: 1.5, w: 2.85, value: "−0.035", label: "Cost of merging", sub: "all five metrics fall", color: CORAL, valueSize: 36 });
  stat(s, { x: 9.6, y: 1.5, w: 3.1, value: "p=0.0050", label: "Permutation test", sub: "real signal, thin margin", valueSize: 30, color: MOSS });

  s.addText("The AUC is deliberately not set in the largest type: at n=51 the permutation null reaches 0.798, so no single score can be read on its own.", {
    x: 0.6, y: 2.92, w: 12.1, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 11.5, color: MUTED, italic: true, valign: "top" });

  card(s, { x: 0.6, y: 3.38, w: 6.0, h: 1.72, accent: TEAL, bodySize: 11.5,
    title: "What we did",
    body: "Modelled the turkey cohort PRJNA644054 (n=45) on its own, then the 51-sample cohort formed by adding the chicken cohort PRJNA379944 (n=6). Both use the identical leak-free pipeline: raw counts plus PrevalenceCLR fitted inside each fold, nested CV (outer 5×10, inner 4-fold)." });
  card(s, { x: 6.9, y: 3.38, w: 5.8, h: 1.72, accent: MOSS, bodySize: 11.5,
    title: "Two conclusions",
    body: "(1) Merging buys nothing — the 6 chicken samples are pure noise to the model.\n(2) But turkey alone cannot be read at face value either: isolator is perfectly collinear with infection status, and the pure cage effect averages AUC 0.908 against an infection effect of 0.967." });

  caveat(s, { x: 0.6, y: 5.25, w: 12.1, h: 1.15, size: 11.5,
    text: "Three boundaries. (1) With n=51 and only 16 in the minority class, the confidence interval on a specificity of 0.581 is very wide. (2) At a prevalence threshold of 10% the p/n ratio is 1.33 — already a p > n problem, not comparable to the duck primary cohort. (3) How much of AUC 0.930 comes from infection and how much from cage assignment cannot be separated under this design." });
}

// ================================================================ 3 cohort composition
{
  const s = slide("What the two cohorts contain", "DATA");
  table(s, [
    [th("BioProject"), th("Host"), th("Centre"), th("Neg"), th("Pos"), th("n"), th("Positive rate")],
    [{ text: "PRJNA644054", options: hi }, { text: "Turkey", options: hi }, { text: "Ohio State", options: hi },
     { text: "13", options: hi }, { text: "32", options: hi }, { text: "45", options: hi }, { text: "71.1%", options: hi }],
    ["PRJNA379944", "Chicken", "South China Agricultural Univ.", "3", "3", "6", "50.0%"],
    [{ text: "Merged", options: { bold: true } }, { text: "—", options: { color: MUTED } }, { text: "—", options: { color: MUTED } },
     { text: "16", options: { bold: true } }, { text: "35", options: { bold: true } }, { text: "51", options: { bold: true } }, { text: "68.6%", options: { bold: true } }],
  ], { y: 1.75, colW: [2.3, 1.4, 3.6, 1.1, 1.1, 1.1, 1.5], rowH: 0.5 });

  card(s, { x: 0.6, y: 4.0, w: 12.1, h: 1.5, accent: CORAL, fill: "FBEDE7", bodySize: 11.5,
    title: "The two projects are technically incomparable",
    body: "Four attributes are perfectly collinear with BioProject — not one sample breaks the correspondence:\n\n    Host  turkey 45 / chicken 6        Centre  Ohio State / SCAU\n    Assay.Type  OTHER / CTS               LibrarySource  OTHER / METAGENOMIC\n\nMerging therefore pools two batches sequenced with different library preparations, in different laboratories, from different species.",
    bodyColor: "7A2E14" });

  s.addText("The filename keeps the word Chicken from summary_Chicken_51_sample.md, but the cohort is overwhelmingly turkey (45/51 = 88%); only 6 samples are chicken.", {
    x: 0.6, y: 5.7, w: 12.1, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, italic: true });
}

// ================================================================ 4 vs primary cohort
{
  const s = slide("Why the primary cohort's reading does not carry over", "DATA · STRUCTURAL DIFFERENCES");
  table(s, [
    [th("Dimension"), th("Primary cohort (duck)"), th("This cohort (poultry)"), th("Consequence")],
    ["Sample size n", "260", { text: "51", options: warn }, "far larger estimation variance"],
    ["Minority class", "109", { text: "16", options: warn }, "about 3 negatives per test fold"],
    ["Baseline accuracy", "0.581", "0.686", "a higher bar for real gain"],
    [{ text: "p/n (prevalence ≥10%)", options: { bold: true } }, "70/260 = 0.27",
     { text: "68/51 = 1.33", options: warn }, { text: "p > n, high-dimensional", options: { bold: true, color: CORAL } }],
    ["Permutation null maximum", "0.614", { text: "0.798", options: warn }, "ceiling reachable by noise"],
  ], { y: 1.75, colW: [3.0, 3.0, 3.0, 3.1], rowH: 0.5 });

  card(s, { x: 0.6, y: 4.85, w: 5.9, h: 1.6, accent: CORAL, fill: "FBEDE7",
    title: "p/n flips from 0.27 to 1.33", titleSize: 14, bodySize: 11,
    body: "There are more features than samples, so the model can fit the training set perfectly. The primary cohort's verdict — no PCA, no aggressive feature selection needed — does not hold here.",
    bodyColor: "7A2E14" });
  card(s, { x: 6.8, y: 4.85, w: 5.9, h: 1.6, accent: CORAL, fill: "FBEDE7",
    title: "Noise ceiling 0.798", titleSize: 14, bodySize: 11,
    body: "At n=51 pure chance can reach an AUC near 0.8 (only 0.614 in the primary cohort). Any AUC below 0.80 in this cohort is therefore close to uninterpretable.",
    bodyColor: "7A2E14" });
}

// ================================================================ 5 divider
divider("01", "Modelling results", "Two cohorts side by side, one leak-free pipeline");

// ================================================================ 6 main table
{
  const s = slide("All metrics, both cohorts", "RESULTS · MAIN TABLE");
  s.addText("Nested CV: outer RepeatedStratifiedKFold (5 folds × 10 repeats = 50 folds), inner 4-fold tuning; prevalence threshold 0.10. Both cohorts selected C = 1.0, gamma = scale.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.45, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, valign: "top" });
  table(s, [
    [th("Metric"), th("Turkey alone, n=45"), th("Merged, n=51"), th("Δ"), th("Note")],
    [{ text: "ROC-AUC", options: { bold: true } }, { text: "0.930", options: hi }, "0.895",
     { text: "−0.035", options: { color: CORAL } }, { text: "noise ceiling 0.798", options: { fontSize: 10, color: MUTED } }],
    ["PR-AUC", { text: "0.971", options: hi }, "0.952", { text: "−0.019", options: { color: CORAL } },
     { text: "baseline = positive rate", options: { fontSize: 10, color: MUTED } }],
    ["Accuracy", { text: "0.860", options: hi }, "0.825", { text: "−0.035", options: { color: CORAL } },
     { text: "baseline 0.711 / 0.686", options: { fontSize: 10, color: MUTED } }],
    ["Balanced accuracy", { text: "0.806", options: hi }, "0.759", { text: "−0.047", options: { color: CORAL } },
     { text: "baseline 0.500", options: { fontSize: 10, color: MUTED } }],
    ["Sensitivity", "0.934", "0.937", { text: "+0.003", options: { color: MUTED } },
     { text: "inflated by class imbalance", options: { fontSize: 10, color: MUTED } }],
    [{ text: "Specificity", options: { bold: true } }, { text: "0.677", options: hi }, { text: "0.581", options: warn },
     { text: "−0.096", options: { color: CORAL, bold: true } }, { text: "both weak — see slide 8", options: { fontSize: 10, color: CORAL } }],
    ["Precision", { text: "0.877", options: hi }, "0.830", { text: "−0.047", options: { color: CORAL } }, ""],
    ["F1", { text: "0.905", options: hi }, "0.881", { text: "−0.024", options: { color: CORAL } },
     { text: "baseline F1 0.831 / 0.814", options: { fontSize: 10, color: MUTED } }],
    [{ text: "MCC", options: { bold: true } }, { text: "0.647", options: hi }, "0.576",
     { text: "−0.071", options: { color: CORAL, bold: true } }, { text: "baseline 0 — most reliable", options: { fontSize: 10, color: MUTED } }],
  ], { y: 2.0, colW: [2.4, 2.5, 2.0, 1.7, 3.5], rowH: 0.4, fontSize: 11 });

  card(s, { x: 0.6, y: 6.2, w: 12.1, h: 0.75, accent: TEAL, titleSize: 13,
    title: null, bodySize: 11.5,
    body: "Turkey alone beats the merged cohort on every metric except sensitivity, and the +0.003 there is not a genuine exception — sensitivity rises with the positive rate, which actually fell from 71.1% to 68.6% on merging, so it should have dipped slightly." });
}

// ================================================================ 7 confusion matrices
{
  const s = slide("Confusion matrices: where the errors are", "RESULTS · ERROR STRUCTURE");
  s.addText("Out-of-fold predictions pooled over 50 folds, counts divided by the 10 repeats — so these read directly as \"one average cross-validation run\".", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED });

  s.addText("Turkey alone, n=45", { x: 1.2, y: 2.0, w: 4.8, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: INK });
  table(s, [
    ["", th("Pred. Neg"), th("Pred. Pos")],
    [th("True Neg"), { text: "8.8", options: { fill: { color: "E4F0F0" }, bold: true } }, { text: "4.2", options: { color: CORAL } }],
    [th("True Pos"), { text: "2.1", options: { color: CORAL } }, { text: "29.9", options: { fill: { color: "E4F0F0" }, bold: true } }],
  ], { x: 1.2, y: 2.45, w: 4.6, colW: [1.6, 1.5, 1.5], rowH: 0.5, fontSize: 12 });

  s.addText("Merged, n=51", { x: 7.3, y: 2.0, w: 4.8, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: INK });
  table(s, [
    ["", th("Pred. Neg"), th("Pred. Pos")],
    [th("True Neg"), { text: "9.3", options: { fill: { color: "E4F0F0" }, bold: true } }, { text: "6.7", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
    [th("True Pos"), { text: "2.2", options: { color: CORAL } }, { text: "32.8", options: { fill: { color: "E4F0F0" }, bold: true } }],
  ], { x: 7.3, y: 2.45, w: 4.6, colW: [1.6, 1.5, 1.5], rowH: 0.5, fontSize: 12 });

  card(s, { x: 0.6, y: 4.35, w: 5.9, h: 1.9, accent: CORAL, fill: "FBEDE7",
    title: "The errors sit on the negatives", titleSize: 14, bodySize: 11,
    body: "Turkey: 4.2 of 13 negatives misclassified (32%)\nMerged: 6.7 of 16 negatives misclassified (42%)\n\nPositives are almost never missed (2.2 of 35), because positives are 68.6% of the data to begin with — following the majority class already yields high sensitivity.",
    bodyColor: "7A2E14" });
  card(s, { x: 6.8, y: 4.35, w: 5.9, h: 1.9, accent: TEAL,
    title: "Why the matrix has to be shown", titleSize: 14, bodySize: 11,
    body: "TP rising from 29.9 to 32.8 on merging looks like progress, but it only reflects the larger sample. What actually changed is FP: 4.2 to 6.7.\n\nAccuracy alone (0.860 → 0.825) says the model got 0.035 worse; only the matrix says where." });
}

// ================================================================ 8 specificity
{
  const s = slide("The number to watch: specificity", "RESULTS · LIMITATIONS");
  stat(s, { x: 0.9, y: 1.6, w: 3.4, value: "0.677", label: "Turkey alone, n=45", sub: "8.8 of 13 negatives correct" });
  stat(s, { x: 4.9, y: 1.6, w: 3.4, value: "0.581", label: "Merged, n=51", sub: "9.3 of 16 negatives correct", color: CORAL });
  stat(s, { x: 8.9, y: 1.6, w: 3.4, value: "0.937", label: "For contrast: sensitivity", sub: "looks strong, but…", color: MUTED });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.5, accent: CORAL, fill: "FBEDE7",
    title: "Why this number is unreliable",
    body: "The minority class holds only 13 samples (turkey) or 16 (merged). Under 5-fold CV each test fold contains roughly 3 negatives — one extra mistake moves that fold's specificity by 33 percentage points.\n\nThe gap between 0.581 and 0.677 is therefore directionally clear, but both figures carry very wide confidence intervals.",
    bodyColor: "7A2E14" });

  card(s, { x: 0.6, y: 5.2, w: 12.1, h: 1.25, accent: TEAL,
    title: "A hard reporting requirement",
    body: "Sensitivity 0.937 and specificity 0.581 must always appear together. Reporting sensitivity alone would suggest a nearly usable model, when in fact it discriminates negatives barely better than a coin flip — the same problem as the October stratum of the primary cohort (specificity 0.533)." });
}

// ================================================================ 9 permutation test
{
  const s = slide("Is the signal real? Permutation test", "VALIDATION · OVERFITTING");
  s.addText("Labels were shuffled 200 times and the whole pipeline re-run each time. If the model can find structure in noise, the observed score means nothing.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  stat(s, { x: 0.9, y: 2.0, w: 3.4, value: "0.967", label: "Observed AUC", sub: "single-layer CV, fixed hyperparameters" });
  stat(s, { x: 4.9, y: 2.0, w: 3.4, value: "0.492", label: "Null mean", sub: "± 0.121", color: MUTED });
  stat(s, { x: 8.9, y: 2.0, w: 3.4, value: "p = 0.0050", label: "Empirical p-value", sub: "0 of 200 reached the observed value", valueSize: 32, color: MOSS });

  card(s, { x: 0.6, y: 3.85, w: 5.9, h: 1.75, accent: MOSS,
    title: "It passes", titleSize: 14, bodySize: 11,
    body: "The null mean is 0.492, sitting right on the theoretical 0.5 — evidence that the pipeline itself does not leak.\n\nThe observed 0.967 lies far above the null, p = 0.0050." });
  card(s, { x: 6.8, y: 3.85, w: 5.9, h: 1.75, accent: CORAL, fill: "FBEDE7",
    title: "But the margin is far thinner than the primary cohort's", titleSize: 13.5, bodySize: 11,
    body: "The null has SD 0.121 (0.049 in the primary cohort) and a maximum of 0.798.\n\nIn other words, at n=51 pure noise can reach an AUC near 0.8 — results below 0.80 in this cohort are essentially uninterpretable.",
    bodyColor: "7A2E14" });

  caveat(s, { x: 0.6, y: 5.8, w: 12.1, h: 0.75, size: 11.5,
    text: "Note that the observed 0.967 here comes from single-layer CV with fixed hyperparameters, a different protocol from the 0.895 in the main table. The nested-CV 0.895 is the defensible performance estimate; 0.967 is used only for comparison against the null, which was generated under the same protocol." });
}

// ================================================================ 10 robustness
{
  const s = slide("How robust is the conclusion? Two checks", "VALIDATION · ROBUSTNESS");
  s.addText("① Prevalence threshold sweep (fixed C=5, single-layer CV — for trend comparison only)", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 13.5, bold: true, color: INK });
  table(s, [
    [th("Threshold"), th("Features"), th("p/n"), th("AUC")],
    ["≥ 0.05", "92", { text: "1.80", options: { color: CORAL } }, "0.976"],
    [{ text: "≥ 0.10 (used)", options: hi }, { text: "68", options: hi }, { text: "1.33", options: hi }, { text: "0.976", options: hi }],
    ["≥ 0.15", "55", "1.08", "0.940"],
    ["≥ 0.20", "51", "1.00", "0.945"],
    ["≥ 0.30", "45", "0.88", "0.949"],
    ["≥ 0.40", "39", "0.76", "0.955"],
  ], { x: 0.6, y: 1.8, w: 6.0, colW: [2.1, 1.3, 1.3, 1.3], rowH: 0.38, fontSize: 11 });

  card(s, { x: 7.0, y: 1.8, w: 5.7, h: 1.35, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "The threshold does not drive the result",
    body: "AUC moves between 0.940 and 0.976 with no systematic relation to the threshold. The main result keeps 0.10 for consistency with the primary cohort." });

  s.addText("② Leave-one-out versus 5-fold", {
    x: 7.0, y: 3.35, w: 5.7, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 13.5, bold: true, color: INK });
  card(s, { x: 7.0, y: 3.72, w: 5.7, h: 1.55, accent: CORAL, fill: "FBEDE7", titleSize: 14, bodySize: 11,
    title: "A 0.078 gap — that is split variance",
    body: "Leave-one-out         AUC 0.973\n5-fold × 10 repeats   AUC 0.895\n\nLOO trains on more data and is therefore more optimistic. Neither should be quoted alone; the nested 5-fold 0.895 is the conservative, defensible figure.",
    bodyColor: "7A2E14" });

  caveat(s, { x: 0.6, y: 4.45, w: 6.0, h: 1.35, size: 11.5,
    text: "p/n stays at or above 1 across every threshold. Even at ≥0.40 the sample size is still 51 — high dimensionality is not something a threshold can fix, only more samples can." });
}

// ================================================================ 11 batch check
{
  const s = slide("Why merging did not help: batch checks", "VALIDATION · BATCH");
  s.addText("If the model were merely learning \"turkey or chicken\", a high AUC would be meaningless. Two tests settle the question.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Test"), th("AUC"), th("Reading")],
    ["Microbiome → predict project (chicken vs turkey)", { text: "1.000", options: warn }, "the two projects are fully separable"],
    ["Project → predict infection status", { text: "0.499", options: { fill: { color: "E4F0F0" }, bold: true } }, "project membership carries no label information"],
  ], { y: 1.9, colW: [5.6, 2.0, 4.5], rowH: 0.52 });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.35, accent: MOSS,
    title: "Together these say the batch effect dilutes rather than confounds",
    body: "The microbiome tells chicken from turkey perfectly (different host, different laboratory — unsurprising), yet project membership is unrelated to infection status. The batch therefore does not inflate the AUC; it only adds irrelevant variation the model must work around. To the model, those 6 chicken samples are pure noise." });

  card(s, { x: 0.6, y: 5.05, w: 12.1, h: 1.4, accent: TEAL,
    title: "Contrast with confounding in the primary cohort",
    body: "There, sampling month affects both the microbiome and the label (covariates alone reach AUC 0.881) — genuine confounding, which has to be handled by stratification.\nHere the batch affects only the features, not the label. Different problem, different remedy: confounding calls for stratification, dilution calls for exclusion." });
}

// ================================================================ 12 divider
divider("02", "Confounding inside the cohort", "Taking the turkey cohort on its own raises a new problem");

// ================================================================ 13 isolator collinearity
{
  const s = slide("Isolator is perfectly collinear with infection status", "CONFOUNDING · PRJNA644054");
  s.addText("The first ten slides only checked the batch effect between the two projects. Inside the turkey cohort there is another layer: the housing isolator.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Isolator"), th("Neg"), th("Pos")],
    ["1", { text: "8", options: hi }, "0"],
    ["2", { text: "5", options: hi }, "0"],
    ["3", "0", { text: "8", options: warn }],
    ["4", "0", { text: "8", options: warn }],
    ["5", "0", { text: "8", options: warn }],
    ["6", "0", { text: "8", options: warn }],
  ], { x: 0.6, y: 1.9, w: 5.1, colW: [1.7, 1.7, 1.7], rowH: 0.42 });

  card(s, { x: 6.2, y: 1.9, w: 6.5, h: 1.72, accent: CORAL, fill: "FBEDE7",
    title: "DNA extraction batch: independent and partly collinear", titleSize: 13.5, bodySize: 11,
    body: "All 16 samples in the 18-11-06 batch are positive.\n\n    Microbiome → predict batch          AUC 0.921\n    Within positives (label fixed)      AUC 0.940\n\nThe second figure is the telling one: with the label held constant the batch is still highly predictable.",
    bodyColor: "7A2E14" });
  card(s, { x: 6.2, y: 3.82, w: 6.5, h: 1.36, accent: MOSS,
    title: "Negative control: sex, AUC 0.454", titleSize: 13.5, bodySize: 11,
    body: "Sex is balanced across the two groups and the microbiome predicts it at chance. The same pipeline applied to an unconfounded variable yields nothing — so the high AUCs above are not a methodological artefact." });

  caveat(s, { x: 0.6, y: 5.4, w: 12.1, h: 0.95, size: 11.5,
    text: "Each isolator holds exactly one infection status. That follows from the experimental design (controls and infected birds must be housed apart to prevent cross-infection), but the price is that isolator effect and infection effect are statistically inseparable — no bird exists in a cage containing both positives and negatives." });
}

// ================================================================ 14 pure cage effect
{
  const s = slide("The pure cage effect nearly matches the infection effect", "CONFOUNDING · DECISIVE TEST");
  s.addText("Collinearity does not prevent quantification: CK/PA occupies isolators 3 and 4, so the 3-vs-4 contrast fixes strain, batch and infection status and varies only the cage.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Contrast"), th("Held constant"), th("n"), th("AUC"), th("Null max"), th("p")],
    ["Isolator 3 vs 4", "CK/PA, batch 10-30, all positive", "16", { text: "0.919", options: warn }, "0.938", "0.0066"],
    ["Isolator 5 vs 6", "TK/MN, batch 11-06, all positive", "16", { text: "0.906", options: warn }, "1.000", "0.0166"],
    ["Isolator 1 vs 2", "Mock, batch 10-30, all negative", "13", { text: "0.900", options: warn }, "0.969", "0.0332"],
  ], { x: 0.6, y: 1.92, w: 12.1, colW: [2.5, 4.1, 1.0, 1.7, 1.8, 1.0], rowH: 0.46 });

  stat(s, { x: 1.1, y: 3.98, w: 3.4, value: "0.908", label: "Mean pure cage effect", sub: "three contrasts", color: CORAL });
  stat(s, { x: 5.0, y: 3.98, w: 3.4, value: "0.967", label: "Infection effect", sub: "n=45, whole cohort" });
  stat(s, { x: 8.9, y: 3.98, w: 3.4, value: "3 / 3", label: "Significant by permutation", sub: "300 draws, all p<0.05", color: MOSS, valueSize: 36 });

  card(s, { x: 0.6, y: 5.42, w: 5.9, h: 1.18, accent: TEAL,
    title: "The cage effect is multivariate", titleSize: 13.5, bodySize: 10.5,
    body: "Per-taxon differential abundance finds only 0, 1 and 3 features at FDR<0.05 across the three contrasts — barely any single genus is significant, yet the model reaches AUC 0.90. Cage-mates converge as whole communities." });
  caveat(s, { x: 6.8, y: 5.42, w: 5.9, h: 1.18, size: 10.5,
    text: "Sample-size caveat: the cage estimates rest on n=16 or 13, with null SDs of 0.19–0.22. We can say 0.908 and 0.967 are the same order of magnitude; we cannot say which is larger." });
}

// ================================================================ 15 driving taxa
{
  const s = slide("Driving taxa: one extra screen for cage effect", "BIOLOGY · DIFFERENTIAL ABUNDANCE");
  s.addText("Of 62 features, 19 reach FDR<0.05; intersecting with permutation importance leaves 11; removing those that already differ between isolators within the positives leaves 7.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Genus"), th("Family"), th("Direction"), th("Importance"), th("t"), th("FDR")],
    ["HT002", "Lactobacillaceae", { text: "Pos↓", options: hi }, "0.0130", "−3.89", "0.0057"],
    ["Pediococcus", "Lactobacillaceae", { text: "Pos↑", options: warn }, "0.0129", "+4.32", "0.0010"],
    ["(unnamed genus)", "Lactobacillaceae", { text: "Pos↓", options: hi }, "0.0064", "−4.15", "0.0017"],
    ["Incertae_Sedis", "—", { text: "Pos↓", options: hi }, "0.0022", "−2.60", "0.0499"],
    ["Weissella", "Lactobacillaceae", { text: "Pos↓", options: hi }, "0.0020", "−3.56", "0.0087"],
    [{ text: "Escherichia-Shigella", options: { bold: true } }, "Enterobacteriaceae",
     { text: "Pos↑", options: warn }, "0.0015", { text: "+5.64", options: { bold: true, color: CORAL } }, "0.0004"],
    ["Pseudomonas", "Pseudomonadaceae", { text: "Pos↑", options: warn }, "0.00004", "+3.49", "0.0057"],
  ], { x: 0.6, y: 1.9, w: 12.1, colW: [2.9, 3.0, 1.6, 1.7, 1.4, 1.5], rowH: 0.37 });

  card(s, { x: 0.6, y: 5.0, w: 5.9, h: 1.45, accent: MOSS,
    title: "The pattern matches immunological expectation", titleSize: 13.5, bodySize: 11,
    body: "Three of the four Lactobacillaceae genera fall in infected birds while the opportunistic pathogens Escherichia-Shigella and Pseudomonas rise — the classic dysbiosis signature of commensal loss and opportunist expansion." });
  caveat(s, { x: 6.8, y: 5.0, w: 5.9, h: 1.45, size: 11,
    text: "The strongest cautionary case, excluded: Negativibacillus has the highest importance (0.0133), t=+5.87 and FDR<0.0001 — on those two columns alone it would look like the best biomarker. But it also differs significantly across the four isolators that are all positive, so it cannot be attributed to infection." });
}

// ================================================================ 16 divider
divider("03", "Conclusions", "What merging costs, and what to do next");

// ================================================================ 17 recommendation
{
  const s = slide("Do not merge; model the turkey cohort alone", "CONCLUSIONS");
  const items = [
    ["All five metrics fall on merging", "AUC −0.035, accuracy −0.035, specificity −0.096, F1 −0.024, MCC −0.071. The lone rise in sensitivity (+0.003) is inflated by the positive rate and is not an exception.", CORAL],
    ["Six samples cannot support any cross-host claim", "PRJNA379944 holds 3 positives and 3 negatives. If the goal is cross-host generalisation, the right design is train-on-turkey, test-on-chicken rather than merging — but 6 samples cannot support that either, since the AUC would be decided by individual birds.", CORAL],
    ["Turkey alone is better, yet 0.930 cannot be read as an infection signal", "AUC 0.930, MCC 0.647, F1 0.905, and the cohort is internally homogeneous (one host, one centre, one library preparation). But isolator is perfectly collinear with infection status and the pure cage effect averages 0.908, so the cage figure has to be reported alongside it.", CORAL],
  ];
  items.forEach((it, i) => {
    const y = 1.6 + i * 1.72;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: 12.1, h: 1.5, fill: { color: it[2] === CORAL ? "FBEDE7" : W }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: 0.075, h: 1.5, fill: { color: it[2] } });
    s.addShape(pres.shapes.OVAL, { x: 0.95, y: y + 0.34, w: 0.62, h: 0.62, fill: { color: DARK } });
    s.addText(String(i + 1), { x: 0.95, y: y + 0.42, w: 0.62, h: 0.4, margin: 0,
      fontFace: HEAD, fontSize: 18, bold: true, color: W, align: "center" });
    s.addText(it[0], { x: 1.85, y: y + 0.2, w: 10.5, h: 0.36, margin: 0,
      fontFace: HEAD, fontSize: 14.5, bold: true, color: INK });
    s.addText(it[1], { x: 1.85, y: y + 0.6, w: 10.5, h: 0.8, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: it[2] === CORAL ? "7A2E14" : MUTED, lineSpacingMultiple: 1.1 });
  });
}

// ================================================================ 18 next steps
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addText("Outstanding before this cohort goes into a paper", {
    x: 1.0, y: 1.3, w: 11.3, h: 0.8, margin: 0,
    fontFace: HEAD, fontSize: 30, bold: true, color: W });
  s.addText("The first three items — confounding structure, driving taxa, cross-host comparison — are done; see slides 13–15. These remain.", {
    x: 1.0, y: 2.1, w: 11.3, h: 0.4, margin: 0, fontFace: BODY, fontSize: 14, color: MOSS });

  const nx = [
    ["Separating cage from infection needs a new experiment",
     "Each isolator would have to house both positive and negative birds. This is a design problem, not an analysis problem — no amount of modelling can repair the existing data"],
    ["Redo the cross-host test on the intersection of both feature sets",
     "Only 62 features survive in turkey, and most of the duck cohort's nine genera never enter the candidate pool — today's \"disagreement\" more likely reflects different feature spaces"],
    ["Bring this cohort into the consistency check",
     "Wire its results/ archive into check_consistency.py and the pre-commit hook"],
    ["Resolve the duplicated body-weight columns",
     "Bird_weight.g. and Bursa.BodyWeight.Ratio1000 hold identical values; the data provider needs to confirm"],
  ];
  nx.forEach((n, i) => {
    const y = 2.75 + i * 1.02;
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 11.3, h: 0.88, fill: { color: DARK2 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 0.075, h: 0.88, fill: { color: MOSS } });
    s.addText(n[0], { x: 1.35, y: y + 0.08, w: 10.6, h: 0.32, margin: 0,
      fontFace: HEAD, fontSize: 14, bold: true, color: W });
    s.addText(n[1], { x: 1.35, y: y + 0.42, w: 10.6, h: 0.4, margin: 0,
      fontFace: BODY, fontSize: 11, color: MOSS });
  });

  s.addText("Full results: summary_Chicken_51_sample.md, summary_Turkey_45_sample.md ｜ reproduce: poultry_cohort.py, turkey_confounding_biomarkers.py, turkey_strain_cage.py", {
    x: 1.0, y: 6.92, w: 11.3, h: 0.35, margin: 0, fontFace: BODY, fontSize: 10.5, color: TEALL });
}

pres.writeFile({ fileName: path.join(__dirname, "Poultry_Cohort_Results_EN.pptx") })
  .then((f) => console.log("Written:", f, "| slides:", pageNo));
