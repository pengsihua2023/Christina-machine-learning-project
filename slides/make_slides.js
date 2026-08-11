/**
 * Generates the project overview deck.
 *   node slides/make_slides.js
 * Output: slides/Influenza_Microbiome_ML_Overview.pptx
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

const IMG = path.join(__dirname, "img");

// ---------------------------------------------------------------- palette
// Wetland / waterfowl: deep teal water, moss, warm sand. Coral reserved
// exclusively for caveats and limitations so it reads as a warning signal.
const DARK = "0B3C49";
const DARK2 = "12505F";
const TEAL = "18707F";
const TEALL = "4E9FAD";
const MOSS = "8FB996";
const SAND = "F4F1EA";
const CREAM = "FCFAF6";
const CORAL = "D2603A";
const INK = "16252C";
const MUTED = "5F7580";
const W = "FFFFFF";

const HEAD = "Georgia";
const BODY = "Calibri";

const SW = 13.333, SH = 7.5;   // LAYOUT_WIDE

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Sihua Peng";
pres.company = "University of Georgia, College of Public Health";
pres.title = "Predicting Avian Influenza Infection from Gut Microbiota";

const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.10 });

// ---------------------------------------------------------------- helpers
let pageNo = 0;

/** Standard light content slide with a running header. */
function slide(title, kicker) {
  const s = pres.addSlide();
  s.background = { color: CREAM };
  pageNo++;
  // top band
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.06, fill: { color: TEAL } });
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6, y: 0.34, w: 8, h: 0.28, margin: 0,
      fontFace: BODY, fontSize: 11, bold: true, color: TEAL, charSpacing: 2,
    });
  }
  s.addText(title, {
    x: 0.6, y: kicker ? 0.62 : 0.45, w: 12.1, h: 0.75, margin: 0,
    fontFace: HEAD, fontSize: 30, bold: true, color: INK,
  });
  s.addText(String(pageNo), {
    x: 12.5, y: 6.95, w: 0.45, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 10, color: MUTED, align: "right",
  });
  return s;
}

/** Dark full-bleed section divider. */
function divider(num, title, subtitle) {
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.28, h: SH, fill: { color: MOSS } });
  s.addText(num, {
    x: 1.1, y: 2.25, w: 2.2, h: 1.6, margin: 0,
    fontFace: HEAD, fontSize: 96, bold: true, color: TEALL,
  });
  s.addText(title, {
    x: 3.1, y: 2.5, w: 9.2, h: 0.95, margin: 0,
    fontFace: HEAD, fontSize: 38, bold: true, color: W,
  });
  s.addText(subtitle, {
    x: 3.15, y: 3.45, w: 9.0, h: 0.9, margin: 0,
    fontFace: BODY, fontSize: 15, color: MOSS,
  });
  return s;
}

/** Card with a thick left accent bar — the deck's repeated motif. */
function card(s, { x, y, w, h, accent = TEAL, fill = W, title, titleSize = 15, body, bodySize = 12, bodyColor = MUTED }) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, shadow: shadow() });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.075, h, fill: { color: accent } });
  if (title) {
    s.addText(title, {
      x: x + 0.28, y: y + 0.16, w: w - 0.5, h: 0.36, margin: 0,
      fontFace: HEAD, fontSize: titleSize, bold: true, color: INK, valign: "top",
    });
  }
  if (body) {
    s.addText(body, {
      x: x + 0.28, y: y + (title ? 0.58 : 0.18), w: w - 0.5, h: h - (title ? 0.72 : 0.36), margin: 0,
      fontFace: BODY, fontSize: bodySize, color: bodyColor, lineSpacingMultiple: 1.12, valign: "top",
    });
  }
}

/** Big-number callout. */
function stat(s, { x, y, w, value, label, color = TEAL, valueSize = 40, sub }) {
  s.addText(value, {
    x, y, w, h: 0.72, margin: 0,
    fontFace: HEAD, fontSize: valueSize, bold: true, color, align: "center",
  });
  s.addText(label, {
    x, y: y + 0.74, w, h: 0.34, margin: 0,
    fontFace: BODY, fontSize: 11.5, bold: true, color: INK, align: "center",
  });
  if (sub) {
    s.addText(sub, {
      x, y: y + 1.06, w, h: 0.3, margin: 0,
      fontFace: BODY, fontSize: 10, color: MUTED, align: "center",
    });
  }
}

/** Caveat strip — coral, used only for warnings. */
function caveat(s, { x, y, w, h = 0.72, text, size = 12 }) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: "FBEDE7" } });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.075, h, fill: { color: CORAL } });
  s.addText(text, {
    x: x + 0.28, y: y + 0.1, w: w - 0.5, h: h - 0.2, margin: 0,
    fontFace: BODY, fontSize: size, color: "7A2E14", lineSpacingMultiple: 1.1, valign: "top",
  });
}

function table(s, rows, opts = {}) {
  const base = {
    x: 0.6, y: 1.7, w: 12.1,
    fontFace: BODY, fontSize: 11.5, color: INK,
    border: { type: "solid", pt: 0.5, color: "DDE5E8" },
    align: "center", valign: "middle",
    autoPage: false,
  };
  s.addTable(rows, { ...base, ...opts });
}

const th = (t) => ({ text: t, options: { fill: { color: DARK }, color: W, bold: true, fontSize: 11 } });
const rowHi = { fill: { color: "E4F0F0" }, bold: true };

// ================================================================ 1 TITLE
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: SH - 0.9, w: SW, h: 0.9, fill: { color: DARK2 } });

  s.addText("PREDICTING AVIAN INFLUENZA INFECTION", {
    x: 1.0, y: 1.75, w: 11.3, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 15, bold: true, color: MOSS, charSpacing: 3,
  });
  s.addText("Gut Microbiota as a\nDiagnostic Signal", {
    x: 1.0, y: 2.35, w: 11.3, h: 1.9, margin: 0,
    fontFace: HEAD, fontSize: 46, bold: true, color: W, lineSpacingMultiple: 1.05,
  });
  s.addText("A machine-learning study on 16S rRNA profiles from wild waterfowl", {
    x: 1.0, y: 4.3, w: 11.3, h: 0.45, margin: 0,
    fontFace: BODY, fontSize: 17, color: TEALL,
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 5.0, w: 3.6, h: 0.04, fill: { color: MOSS } });
  s.addText("260 wild ducks  ·  70 microbial features  ·  17 models compared", {
    x: 1.0, y: 5.2, w: 11.3, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 13, color: MOSS,
  });

  s.addText("University of Georgia · College of Public Health", {
    x: 1.0, y: 6.72, w: 7, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 12, color: W,
  });
  s.addText("github.com/pengsihua2023/Christina-machine-learning-project", {
    x: 5.5, y: 6.72, w: 6.8, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 11, color: TEALL, align: "right",
  });
}

// ================================================================ 2 EXEC SUMMARY
{
  const s = slide("At a Glance", "Executive summary");
  stat(s, { x: 0.6, y: 1.5, w: 2.85, value: "p=0.0099", label: "The signal is real", sub: "permutation test, 100 shuffles", valueSize: 32 });
  stat(s, { x: 3.6, y: 1.5, w: 2.85, value: "0.73–0.97", label: "Effect within a season", sub: "AUC, microbiome only", valueSize: 30, color: DARK2 });
  stat(s, { x: 6.6, y: 1.5, w: 2.85, value: "+0.04–0.11", label: "Adds over covariates", sub: "model-dependent increment", valueSize: 28, color: DARK2 });
  stat(s, { x: 9.6, y: 1.5, w: 3.1, value: "9", label: "Biomarkers", sub: "3 independent methods agree", color: MOSS });

  s.addText("Model performance is deliberately not the headline: no consistent ranking exists among the leading models (AUC 0.825–0.858, all within fold-to-fold noise), so no single score is a property of the finding.", {
    x: 0.6, y: 2.92, w: 12.1, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 11.5, color: MUTED, italic: true, valign: "top",
  });

  card(s, {
    x: 0.6, y: 3.38, w: 6.0, h: 1.62, accent: TEAL,
    title: "What we established",
    body: "Duck gut microbiota carry a genuine, reproducible signal for influenza infection status. The association survives permutation testing and month-stratified analysis, and is driven partly by nonlinear interactions between taxa.",
  });
  card(s, {
    x: 6.9, y: 3.38, w: 5.8, h: 1.62, accent: MOSS,
    title: "How we established it",
    body: "Nested cross-validation with all preprocessing fitted inside training folds; seventeen models compared on identical splits; three independent feature-ranking methods cross-checked against each other.",
  });

  caveat(s, {
    x: 0.6, y: 5.25, w: 12.1, h: 0.95,
    text: "Two boundaries on every claim in this deck:  (1) sampling season alone reaches AUC 0.881, so microbiome value must always be quoted relative to that confounder baseline;  (2) results hold only within the UC Davis wild-duck cohort — cross-study generalization fails (AUC 0.54 ± 0.29).",
  });
}

// ================================================================ 3 ROADMAP
{
  const s = slide("What This Deck Covers", "Roadmap");
  const items = [
    ["01", "Data", "Three input files, four studies, and why we model only one of them"],
    ["02", "Processing", "Label leakage, compositional transformation, and leak-free pipelines"],
    ["03", "Modeling", "Nested CV protocol and a seventeen-model comparison"],
    ["04", "Validity", "Permutation testing, confounders, stratification, and a deconfounded subset"],
    ["05", "Findings", "Biomarkers from three independent methods; evidence of nonlinearity"],
    ["06", "Limits", "Seven known limitations, stated plainly"],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.25, y = 1.6 + row * 1.62;
    card(s, {
      x, y, w: 5.9, h: 1.4, accent: i % 2 ? MOSS : TEAL,
      title: `${it[0]}   ${it[1]}`, titleSize: 16, body: it[2], bodySize: 12,
    });
  });
}

// ================================================================ 3b READING KEY
{
  const s = slide("How to Read the Numbers in This Deck", "Before we start");
  s.addText("Six conventions. Each one, if misread, changes what a result means \u2014 so they come before any data rather than after.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });

  const items = [
    ["Baselines are not 0.5", "58% of samples are positive, so always-guessing-Pos already scores accuracy 0.581 \u2014 and PR-AUC 0.581 too. Only ROC-AUC (0.50), MCC (0) and balanced accuracy (0.50) have clean baselines.", CORAL],
    ["AUC ignores the threshold, accuracy does not", "The same predictions give accuracy 0.69\u20130.77 depending on where the cut-off sits. AUC measures ranking quality, so it is the metric for comparing models.", CORAL],
    ["MCC is the one to trust under imbalance", "It uses all four cells of the confusion matrix and has a baseline of 0. Accuracy and F1 both reward simply guessing the majority class.", TEAL],
    ["p governs one test, FDR governs a batch", "Across 70 taxa, pure noise still yields ~3.5 hits at p<0.05. Of our 19 hits at FDR<0.05, about 1 is expected to be false.", TEAL],
    ["Leakage is not confounding", "Leaked information does not exist at prediction time and must be deleted. Confounded information does exist \u2014 you know the month \u2014 and must be handled by stratification instead.", MOSS],
    ["Ranges are deliberate, not averages", "Where a result varies across strata we report the range (AUC 0.734\u20130.965), never a sample-weighted mean, which would hide the weakest stratum.", MOSS],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    card(s, {
      x: 0.6 + col * 6.25, y: 1.95 + row * 1.62, w: 5.9, h: 1.45,
      accent: it[2], fill: it[2] === CORAL ? "FBEDE7" : W,
      title: `${i + 1}.  ${it[0]}`, titleSize: 13,
      body: it[1], bodySize: 10.5,
      bodyColor: it[2] === CORAL ? "7A2E14" : MUTED,
    });
  });

  s.addText("Full definitions \u2014 CLR, Welch t, L1 stability selection and the rest \u2014 are in README section 10.", {
    x: 0.6, y: 6.85, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 10.5, color: MUTED, italic: true,
  });
}

// ================================================================ 4 DIVIDER 1
divider("01", "The Data", "Three files, four studies, 326 samples — and one cohort worth modeling");

// ================================================================ 5 INPUTS
{
  const s = slide("Three Input Files, Perfectly Aligned", "Data · inputs");
  table(s, [
    [th("File"), th("Contents"), th("Role")],
    ["genus_raw_counts_by_featureID.csv", "326 samples × 275 FeatureIDs, integer counts", { text: "Feature matrix", options: rowHi }],
    ["taxonomy_key.csv", "Seven-level taxonomy for all 275 FeatureIDs", "Annotation"],
    ["metadata_all_samples-0810.csv", "326 samples × 102 metadata columns", "Labels + covariates"],
    ["sample_counts_by_study_host_infection.csv", "8-row summary of study × host × infection", "Table 1 only"],
  ], { y: 1.75, colW: [4.5, 4.9, 2.7], rowH: 0.52 });

  card(s, {
    x: 0.6, y: 4.6, w: 5.9, h: 1.5, accent: MOSS,
    title: "Alignment verified",
    body: "SampleIDs match 326/326 across all files.\nFeatureIDs match 275/275 against the taxonomy.\nNo missing values, no duplicate identifiers.",
  });
  card(s, {
    x: 6.8, y: 4.6, w: 5.9, h: 1.5, accent: TEAL,
    title: "Label distribution",
    body: "Influenza Pos = 196   ·   Neg = 130\nPositive rate 60% overall, 58% in the modeling cohort.\nMild imbalance — handled with class weighting, not resampling.",
  });
}

// ================================================================ 6 COHORT
{
  const s = slide("Four Studies, One Modeling Cohort", "Data · cohort");
  table(s, [
    [th("BioProject"), th("Center"), th("Host"), th("n"), th("Neg"), th("Pos")],
    [{ text: "PRJNA464410", options: rowHi }, { text: "UC Davis", options: rowHi }, { text: "Wild duck (cloacal)", options: rowHi }, { text: "260", options: rowHi }, { text: "109", options: rowHi }, { text: "151", options: rowHi }],
    ["PRJNA644054", "Ohio State", "Turkey", "45", "13", "32"],
    ["PRJNA347583", "Chinese Acad. of Sciences", "Whooper swan", "15", "5", "10"],
    ["PRJNA379944", "South China Agricultural U.", "Chicken", "6", "3", "3"],
  ], { y: 1.75, colW: [2.5, 3.5, 3.1, 1.0, 1.0, 1.0], rowH: 0.5 });

  card(s, {
    x: 0.6, y: 4.5, w: 12.1, h: 1.05, accent: TEAL,
    title: "Why we restrict the primary analysis to PRJNA464410",
    body: "It is the only study with enough samples to model (260 of 326), and it is internally homogeneous — one center, one host species, one tissue type. The other three differ in host, tissue, and geography, and contribute 6–45 samples each.",
  });
  caveat(s, {
    x: 0.6, y: 5.75, w: 12.1, h: 0.85,
    text: "Pooling all four is tempting but does not work: under GroupKFold by BioProject, AUC collapses to 0.54 ± 0.29 — indistinguishable from chance. See slide on limitations.",
  });
}

// ================================================================ 7 CHARACTERISTICS
{
  const s = slide("What the Feature Matrix Looks Like", "Data · characteristics");
  stat(s, { x: 0.6, y: 1.55, w: 2.9, value: "90.2%", label: "Zero cells", sub: "extreme sparsity" });
  stat(s, { x: 3.7, y: 1.55, w: 2.9, value: "5000", label: "Read depth cap", sub: "208 of 326 samples exactly", color: DARK2 });
  stat(s, { x: 6.8, y: 1.55, w: 2.9, value: "275", label: "FeatureIDs", sub: "→ 155 genera", color: DARK2 });
  stat(s, { x: 9.9, y: 1.55, w: 2.8, value: "70", label: "After filtering", sub: "prevalence ≥ 10%", color: MOSS });

  card(s, {
    x: 0.6, y: 3.2, w: 5.9, h: 1.85, accent: TEAL,
    title: "Prevalence filtering ladder",
    body: "≥ 5%  → 117 features\n≥ 10% → 79 features   (used here)\n≥ 20% → 36 features\n≥ 50% → 10 features",
  });
  card(s, {
    x: 6.8, y: 3.2, w: 5.9, h: 1.85, accent: TEAL,
    title: "Taxonomic resolution",
    body: "Phylum → Family annotated for 262–274 of 275.\nGenus annotated for 220; 55 unassigned.\nSpecies level is entirely empty.\nInterpretation is therefore capped at genus/family.",
  });
  caveat(s, {
    x: 0.6, y: 5.3, w: 12.1, h: 0.95,
    text: "275 features is unusually few for avian gut 16S data (typically thousands of ASVs). The table was almost certainly pre-filtered upstream by an unknown rule — the single largest open risk in this project.",
  });
}

// ================================================================ 8 DIVIDER 2
divider("02", "Data Processing", "Removing what leaks, transforming what is compositional, and keeping folds honest");

// ================================================================ 9 LEAKAGE
{
  const s = slide("The Biggest Trap: Label Leakage", "Processing · leakage");
  s.addText("Of 102 metadata columns, many are the label itself or a deterministic function of it. Keeping any one of them yields 100% accuracy and zero insight.", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 13, color: MUTED,
  });
  table(s, [
    [th("Column"), th("How it leaks")],
    ["Infection", "Byte-for-byte identical to the Influenza label"],
    ["CoreGroup", "Encodes HostGroup_label directly, e.g. \"Duck_Pos\""],
    ["HASubType / NASubType", "Negatives are the literal string \"neg\"; positives carry a subtype number"],
    ["Log10_Virus_titer", "Viral titer is a direct physical measurement of infection"],
    ["True_or_Neg, Infection_Status,\nInfecting_Agent, experimental_group", "Experimental infection-group annotations"],
    ["isolation_source", "\"mock\" for controls vs \"Intestine N\" for infected birds"],
  ], { y: 2.0, colW: [4.6, 7.5], rowH: 0.5, align: "left" });

  card(s, {
    x: 0.6, y: 5.6, w: 12.1, h: 1.15, accent: MOSS,
    title: "Also removed",
    body: "10 sample-identifier columns (all 326 unique, and carrying naming conventions a tree model would memorize) and 17 batch-proxy columns that map one-to-one onto BioProject. The audit is codified in mb_common.py: LEAKAGE_COLS, and build_features.py prints each column's label-separability so it can be inspected rather than trusted.",
  });
}

// ================================================================ 10 CLR
{
  const s = slide("Microbiome Data Is Compositional", "Processing · transformation");
  s.addText("Each sample sums to a fixed sequencing depth, so abundances carry only relative information. Feeding raw counts to a linear model is a methodological error.", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 13, color: MUTED,
  });

  const steps = [
    ["Prevalence filter", "Keep features present in ≥ 10% of samples", "275 → 70"],
    ["Pseudocount", "Add 0.5 to every cell so logs are defined", "no zeros"],
    ["Relative abundance", "Divide each row by its own total", "rows sum to 1"],
    ["CLR", "Log, then subtract each row's log-mean", "scale-free"],
  ];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 3.12;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.15, w: 2.85, h: 1.85, fill: { color: W }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.15, w: 2.85, h: 0.075, fill: { color: TEAL } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.24, y: 2.4, w: 0.5, h: 0.5, fill: { color: DARK } });
    s.addText(String(i + 1), { x: x + 0.24, y: 2.47, w: 0.5, h: 0.36, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: W, align: "center" });
    s.addText(st[0], { x: x + 0.24, y: 3.02, w: 2.4, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 13.5, bold: true, color: INK });
    s.addText(st[1], { x: x + 0.24, y: 3.34, w: 2.4, h: 0.5, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED });
    if (i < 3) s.addText("→", { x: x + 2.87, y: 2.9, w: 0.25, h: 0.4, margin: 0, fontFace: BODY, fontSize: 18, color: TEALL, align: "center" });
  });

  card(s, {
    x: 0.6, y: 4.5, w: 5.9, h: 1.85, accent: TEAL,
    title: "Result",
    body: "70 CLR features for 260 samples — p/n ≈ 0.27.\nNot a high-dimensional problem: no PCA, no aggressive selection needed.",
  });
  card(s, {
    x: 6.8, y: 4.5, w: 5.9, h: 1.85, accent: MOSS,
    title: "Genus aggregation keeps the unassigned",
    body: "55 features lack a genus label. They are kept as Genus_unassigned_<ID>, not dropped — discarding them would break compositional closure and distort the CLR. Hence 275 → 210, not 155.",
  });
}

// ================================================================ 11 LEAK-FREE CV
{
  const s = slide("Keeping the Folds Honest", "Processing · leak-free CV");

  card(s, {
    x: 0.6, y: 1.55, w: 5.9, h: 2.35, accent: CORAL, fill: "FBEDE7",
    title: "The common mistake",
    body: "Filter features on the full dataset, then cross-validate.\n\nThe validation fold silently influences which features survive. Reported AUC inflates by roughly 0.01–0.02 — small, but it is the difference between an honest and a dishonest number.",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 1.55, w: 5.9, h: 2.35, accent: MOSS,
    title: "What we do instead",
    body: "Prevalence filtering and CLR are wrapped in a scikit-learn transformer, PrevalenceCLR, and refitted inside every training fold.\n\nCLR itself is a within-row operation, so it carries no cross-sample leakage — only the filter needed protecting.",
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 4.15, w: 12.1, h: 1.0, fill: { color: DARK } });
  s.addText("Pipeline([('clr', PrevalenceCLR(0.10)), ('sc', StandardScaler()), ('clf', SVC(kernel='rbf'))])", {
    x: 0.9, y: 4.4, w: 11.5, h: 0.5, margin: 0,
    fontFace: "Consolas", fontSize: 14, color: MOSS,
  });

  card(s, {
    x: 0.6, y: 5.45, w: 12.1, h: 1.0, accent: TEAL,
    title: "Why this matters more than the model choice",
    body: "Most published microbiome classifiers report a single number from a pipeline where feature selection saw the whole dataset. Getting this right costs a few AUC points on paper and buys the result its credibility.",
  });
}

// ================================================================ 12 DIVIDER 3
divider("03", "Modeling & Evaluation", "A nested protocol, seventeen models, one honest comparison");

// ================================================================ 13 PROTOCOL + METRICS
{
  const s = slide("Evaluation Protocol", "Modeling · protocol");

  const proto = [
    ["Outer loop", "RepeatedStratifiedKFold\n5 folds × 5 repeats = 25\nPurpose: performance estimate", DARK2],
    ["Inner loop", "StratifiedKFold, 4 folds\nGridSearchCV on ROC-AUC\nPurpose: hyperparameter search", TEAL],
    ["Shared splits", "Every model sees the identical\nfold partition\nPurpose: fair comparison", MOSS],
  ];
  proto.forEach((p, i) => {
    card(s, { x: 0.6 + i * 4.1, y: 1.45, w: 3.9, h: 1.5, accent: p[2],
              title: p[0], titleSize: 14, body: p[1], bodySize: 11 });
  });
  s.addText("Nesting isolates tuning from evaluation, so the reported AUC carries no tuning bias.", {
    x: 0.6, y: 3.05, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 11, color: MUTED, italic: true,
  });

  card(s, {
    x: 0.6, y: 3.55, w: 5.9, h: 1.85, accent: MOSS,
    title: "Hyperparameters are not over-tuned", titleSize: 14, bodySize: 11,
    body: "The SVM-RBF grid was expanded to C ∈ [0.01, 500] and gamma ∈ [1e-4, 0.1] + scale.\n\n0 of 15 folds selected a boundary value, AUC was essentially unchanged, and the whole surface spans only 0.73–0.81.",
  });
  card(s, {
    x: 6.8, y: 3.55, w: 5.9, h: 1.85, accent: TEAL,
    title: "Metrics reported", titleSize: 14, bodySize: 11,
    body: "ROC-AUC · PR-AUC · Accuracy · Balanced Accuracy · Sensitivity · Specificity · Precision · F1 · MCC\n\nHow to read them: see the conventions on slide 4.",
  });

  caveat(s, {
    x: 0.6, y: 5.6, w: 12.1, h: 0.85,
    text: "All accuracy figures use a fixed 0.5 threshold. A 0.55 threshold performs better, but was chosen by looking at test data — using it would require folding threshold selection into the inner loop.",
    size: 11,
  });
}

// ================================================================ 14 MODEL TABLE
{
  const s = slide("Seventeen Models, No Consistent Ranking", "Modeling · comparison");
  table(s, [
    [th("Model"), th("Accuracy"), th("Bal. Acc"), th("ROC-AUC"), th("PR-AUC"), th("Sens."), th("Spec."), th("F1"), th("MCC")],
    [{ text: "ExtraTrees", options: rowHi }, { text: "0.778", options: rowHi }, { text: "0.756", options: rowHi }, { text: "0.858", options: rowHi }, { text: "0.891", options: rowHi }, { text: "0.887", options: rowHi }, { text: "0.626", options: rowHi }, { text: "0.822", options: rowHi }, { text: "0.542", options: rowHi }],
    [{ text: "SVM-RBF", options: rowHi }, { text: "0.773", options: rowHi }, { text: "0.764", options: rowHi }, { text: "0.835", options: rowHi }, { text: "0.871", options: rowHi }, { text: "0.820", options: rowHi }, { text: "0.708", options: rowHi }, { text: "0.807", options: rowHi }, { text: "0.535", options: rowHi }],
    [{ text: "Ensemble (soft-vote)", options: rowHi }, { text: "0.767", options: rowHi }, { text: "0.757", options: rowHi }, { text: "0.834", options: rowHi }, { text: "0.874", options: rowHi }, { text: "0.816", options: rowHi }, { text: "0.699", options: rowHi }, { text: "0.802", options: rowHi }, { text: "0.523", options: rowHi }],
    [{ text: "SVM-poly", options: rowHi }, { text: "0.740", options: rowHi }, { text: "0.718", options: rowHi }, { text: "0.825", options: rowHi }, { text: "0.851", options: rowHi }, { text: "0.857", options: rowHi }, { text: "0.579", options: rowHi }, { text: "0.792", options: rowHi }, { text: "0.463", options: rowHi }],
    ["GP-RBF", "0.749", "0.733", "0.821", "0.868", "0.834", "0.631", "0.794", "0.482"],
    ["GP-Matérn", "0.746", "0.728", "0.818", "0.866", "0.841", "0.615", "0.793", "0.475"],
    ["RandomForest", "0.718", "0.693", "0.806", "0.845", "0.850", "0.535", "0.777", "0.416"],
    ["XGBoost", "0.727", "0.716", "0.800", "0.846", "0.786", "0.646", "0.768", "0.441"],
    ["HistGB", "0.709", "0.695", "0.794", "0.843", "0.783", "0.608", "0.757", "0.399"],
    ["kNN-Aitchison", "0.710", "0.679", "0.790", "0.830", "0.870", "0.488", "0.776", "0.402"],
    [{ text: "Baseline (always Pos)", options: { italic: true, color: MUTED } },
     { text: "0.581", options: { italic: true, color: MUTED } }, { text: "0.500", options: { italic: true, color: MUTED } }, { text: "0.500", options: { italic: true, color: MUTED } }, { text: "0.581", options: { italic: true, color: MUTED } }, { text: "1.000", options: { italic: true, color: MUTED } }, { text: "0.000", options: { italic: true, color: MUTED } }, { text: "0.735", options: { italic: true, color: MUTED } }, { text: "0.000", options: { italic: true, color: MUTED } }],
  ], { y: 1.5, colW: [2.9, 1.15, 1.25, 1.15, 1.15, 1.05, 1.05, 1.0, 1.0], rowH: 0.33, fontSize: 10 });

  s.addText("Top 10 of 17 by ROC-AUC · shading marks the leading group · full table in results/model_comparison_all16.csv", {
    x: 0.6, y: 5.52, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 9.5, color: MUTED, italic: true,
  });

  card(s, {
    x: 0.6, y: 5.85, w: 12.1, h: 0.95, accent: TEAL,
    title: "Read the top block as a group, not as a ranking", titleSize: 14,
    body: "ExtraTrees leads only nominally (p=0.041, uncorrected); SVM-RBF, the ensemble and SVM-poly are mutually indistinguishable (next slide). Real separation starts at GP-RBF.", bodySize: 11,
  });
}

// ================================================================ 15 SIGNIFICANCE
{
  const s = slide("AUC Cannot Settle the Model Choice", "Modeling · significance");
  s.addText("Comparing the best model against a clearly weaker one proves nothing. The question that matters is whether the leading models can be told apart at all. All 15 pairwise tests among the top six, on the same 25 folds:", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.55, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("Wilcoxon p"), th("SVM-RBF"), th("Ensemble"), th("SVM-poly"), th("GP-RBF"), th("GP-Matérn")],
    [{ text: "ExtraTrees", options: { bold: true, align: "left" } }, { text: ".041", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".012", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".000", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".003", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".001", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }],
    [{ text: "SVM-RBF", options: { bold: true, align: "left" } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: ".539", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".270", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".069", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".035", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }],
    [{ text: "Ensemble", options: { bold: true, align: "left" } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: ".331", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".023", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".003", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }],
    [{ text: "SVM-poly", options: { bold: true, align: "left" } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: ".925", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".809", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }],
    [{ text: "GP-RBF", options: { bold: true, align: "left" } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: ".044", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }],
  ], { y: 2.15, colW: [2.5, 1.92, 1.92, 1.92, 1.92, 1.92], rowH: 0.42, fontSize: 11 });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 4.74, w: 0.18, h: 0.18, fill: { color: "EDEDEA" } });
  s.addText("grey = indistinguishable (p ≥ 0.05)", { x: 0.88, y: 4.71, w: 4.2, h: 0.26, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });
  s.addShape(pres.shapes.RECTANGLE, { x: 4.9, y: 4.74, w: 0.18, h: 0.18, fill: { color: "E4F0F0" } });
  s.addText("teal = distinguishable", { x: 5.18, y: 4.71, w: 4.0, h: 0.26, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });

  card(s, {
    x: 0.6, y: 5.06, w: 5.9, h: 1.45, accent: CORAL, fill: "FBEDE7",
    title: "Indistinguishability is not transitive", titleSize: 14, bodySize: 11,
    body: "ExtraTrees is nominally ahead of everything (p = 0.041 vs SVM-RBF) but fails the Bonferroni threshold for 15 tests (0.0033) and wins only 14/25 folds.\n\nSVM-RBF, ensemble and SVM-poly are mutually inseparable (p = 0.270–0.539).",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 5.06, w: 5.9, h: 1.45, accent: MOSS,
    title: "So the choice must rest on something else", titleSize: 14, bodySize: 11,
    body: "Two grounds remain: error structure at the operating threshold (specificity 0.703 for SVM-RBF vs 0.620 for ExtraTrees) and robustness where the signal is weak.\n\nThe next slide is the test that actually decides.",
  });

}

// ================================================================ 15b WHY NOT EXTRATREES
{
  const s = slide("Why ExtraTrees Does Not Take Over", "Modeling · model choice");
  s.addText("A 0.023 AUC lead at p=0.041, uncorrected for 15 comparisons, does not settle a model choice. The decisive test is where each model stands when the signal is weak — so we re-ran both inside every sampling-month stratum.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("Stratum"), th("n"), th("Pos"), th("ExtraTrees"), th("SVM-RBF"), th("Δ")],
    ["July", "86", "52", "0.988", "0.975", { text: "+0.013", options: { color: MOSS } }],
    ["Jul + Aug", "123", "77", "0.970", "0.961", { text: "+0.008", options: { color: MOSS } }],
    ["October", "42", "24", "0.827", "0.819", { text: "+0.008", options: { color: MOSS } }],
    [{ text: "Jan + Oct  (weakest)", options: { fill: { color: "FBEDE7" }, bold: true } },
     { text: "92", options: { fill: { color: "FBEDE7" } } }, { text: "29", options: { fill: { color: "FBEDE7" } } },
     { text: "0.715", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } },
     { text: "0.774", options: { fill: { color: "FBEDE7" }, bold: true } },
     { text: "−0.060", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
  ], { y: 2.0, colW: [3.3, 1.4, 1.4, 2.2, 2.0, 1.8], rowH: 0.46 });

  card(s, {
    x: 0.6, y: 4.4, w: 5.9, h: 1.9, accent: CORAL, fill: "FBEDE7",
    title: "The lead comes only from the easy strata",
    body: "ExtraTrees gains +0.008 to +0.013 where the task is already easy, and loses 0.060 on the hardest stratum.\n\nThat is the signature of heavy regularisation: harmless when signal is strong, destructive when it is weak.",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 4.4, w: 5.9, h: 1.9, accent: MOSS,
    title: "What we keep from it",
    body: "Permutation-importance ranks agree between the two models: Spearman ρ = 0.738 (p = 3.3e-13), top-15 overlap 10/15.\n\nThe biomarker panel therefore does not depend on which model is chosen — this strengthens the findings section.",
  });

  s.addText("ExtraTrees also passes its own permutation test (observed 0.856, null 0.496 ± 0.046, p = 0.0099).", {
    x: 0.6, y: 6.45, w: 12.1, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, italic: true,
  });
}

// ================================================================ 18 DIVIDER 4
divider("04", "Is the Signal Real?", "Permutation testing, confounders, and stratified re-analysis");

// ================================================================ 19 PERMUTATION
{
  const s = slide("Permutation Test", "Validity · overfitting");
  s.addText("Shuffle the labels 100 times and re-run the entire pipeline. If the model can find structure in noise, the observed score is meaningless.", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  stat(s, { x: 0.9, y: 2.15, w: 3.4, value: "0.743", label: "Observed AUC", sub: "true labels" });
  stat(s, { x: 4.7, y: 2.15, w: 3.4, value: "0.501", label: "Null mean", sub: "± 0.049, max 0.614", color: MUTED });
  stat(s, { x: 8.5, y: 2.15, w: 3.9, value: "p = 0.0099", label: "Empirical p-value", sub: "0 of 100 shuffles reached the observed score", valueSize: 34, color: MOSS });

  card(s, {
    x: 0.6, y: 4.05, w: 12.1, h: 1.15, accent: MOSS,
    title: "Interpretation",
    body: "The null distribution is centred exactly where theory says it should be (0.50), and its maximum across 100 shuffles is 0.614 — well below the observed 0.743. The pipeline is not manufacturing signal from noise.",
  });
  card(s, {
    x: 0.6, y: 5.4, w: 12.1, h: 1.05, accent: TEAL,
    title: "What this does not prove",
    body: "A permutation test rules out overfitting. It says nothing about confounding — a model that predicts sampling season perfectly would also pass it. That question is next.",
  });
}

// ================================================================ 20 CONFOUNDER
{
  const s = slide("The Confounder: Sampling Month", "Validity · confounding");
  table(s, [
    [th("Month"), th("Jan"), th("Jul"), th("Aug"), th("Oct"), th("Nov"), th("Dec")],
    ["Negative", "45", "34", "12", "18", { text: "0", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }, { text: "0", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
    ["Positive", "5", "52", "25", "24", "27", "18"],
  ], { y: 1.7, colW: [2.5, 1.77, 1.77, 1.77, 1.77, 1.77, 1.77], rowH: 0.5 });

  card(s, {
    x: 0.6, y: 3.45, w: 5.9, h: 1.62, accent: CORAL, fill: "FBEDE7",
    title: "The problem",
    body: "November–December is 100% positive. January is 90% negative. Sampling month alone reaches AUC 0.777 — before any microbe is considered.",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 3.45, w: 5.9, h: 1.62, accent: CORAL, fill: "FBEDE7",
    title: "It contaminates the features too",
    body: "Microbiome → predict \"sampled in Nov–Dec\":  AUC 0.777\nMicrobiome → predict sampling site:  AUC 0.795\n\nThe microbiome encodes when and where the bird was caught.",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 0.6, y: 5.32, w: 12.1, h: 1.2, accent: TEAL,
    title: "Why this is not simply fatal",
    body: "Seasonality in avian influenza prevalence is genuine biology, not only an artefact of sampling logistics. The question is whether anything remains once season is held constant — which requires stratified re-analysis, not a p-value.",
  });
}

// ================================================================ 21 STRATIFIED
{
  const s = slide("Re-Running Within a Single Month", "Validity · stratification");
  table(s, [
    [th("Stratum"), th("n"), th("Positive"), th("AUC")],
    [{ text: "July", options: rowHi }, { text: "86", options: rowHi }, { text: "52", options: rowHi }, { text: "0.964", options: rowHi }],
    [{ text: "Jul + Aug", options: rowHi }, { text: "123", options: rowHi }, { text: "77", options: rowHi }, { text: "0.944", options: rowHi }],
    ["October", "42", "24", "0.860"],
    [{ text: "Jan + Oct", options: { fill: { color: "FBEDE7" } } }, { text: "92", options: { fill: { color: "FBEDE7" } } }, { text: "29", options: { fill: { color: "FBEDE7" } } }, { text: "0.668", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
    [{ text: "January / Nov + Dec", options: { color: MUTED, italic: true } }, { text: "50 / 45", options: { color: MUTED, italic: true } }, { text: "5 / 45", options: { color: MUTED, italic: true } }, { text: "minority class too small", options: { color: MUTED, italic: true } }],
  ], { y: 1.7, colW: [4.4, 2.2, 2.5, 3.0], rowH: 0.48 });

  card(s, {
    x: 0.6, y: 4.65, w: 5.9, h: 1.55, accent: MOSS,
    title: "The signal survives",
    body: "Holding sampling month constant, AUC stays at 0.86–0.96 in the summer strata. Seasonal confounding does not explain the association away.",
  });
  card(s, {
    x: 6.8, y: 4.65, w: 5.9, h: 1.55, accent: CORAL, fill: "FBEDE7",
    title: "But it is uneven",
    body: "Jan + Oct drops to 0.668. The effect is strongly heterogeneous across seasons, and reporting only the 0.944 would be cherry-picking.",
    bodyColor: "7A2E14",
  });
}

// ================================================================ 22 ABLATION (stratified)
{
  const s = slide("The Microbiome Effect, With Season Held Fixed", "Validity \u00b7 primary estimate");
  s.addText("Season is a confounder, not an exposure of interest \u2014 so it does not belong in the model. Instead we fix the month and compare within strata. The model contains nothing but the 70 CLR features.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("Stratum"), th("n"), th("AUC"), th("Accuracy"), th("Baseline"), th("Spec."), th("MCC")],
    [{ text: "All samples (unstratified)", options: { italic: true, color: MUTED } },
     { text: "260", options: { italic: true, color: MUTED } }, { text: "0.833", options: { italic: true, color: MUTED } },
     { text: "0.772", options: { italic: true, color: MUTED } }, { text: "0.581", options: { italic: true, color: MUTED } },
     { text: "0.703", options: { italic: true, color: MUTED } }, { text: "0.530", options: { italic: true, color: MUTED } }],
    [{ text: "July", options: rowHi }, { text: "86", options: rowHi }, { text: "0.965", options: rowHi },
     { text: "0.949", options: rowHi }, { text: "0.605", options: rowHi }, { text: "0.929", options: rowHi }, { text: "0.893", options: rowHi }],
    ["August", "37", "0.910", "0.838", "0.676", "0.667", "0.618"],
    [{ text: "October", options: { fill: { color: "FBEDE7" }, bold: true } },
     { text: "42", options: { fill: { color: "FBEDE7" } } }, { text: "0.734", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } },
     { text: "0.676", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }, { text: "0.571", options: { fill: { color: "FBEDE7" } } },
     { text: "0.533", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }, { text: "0.328", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
    ["Jul + Aug", "123", "0.959", "0.930", "0.626", "0.896", "0.850"],
  ], { y: 2.0, colW: [3.5, 1.2, 1.5, 1.7, 1.5, 1.35, 1.35], rowH: 0.42, fontSize: 11 });

  card(s, {
    x: 0.6, y: 4.85, w: 5.9, h: 1.6, accent: TEAL,
    title: "Report the range, not an average", titleSize: 14, bodySize: 11,
    body: "AUC 0.734\u20130.965 \u00b7 accuracy 0.676\u20130.949 \u00b7 MCC 0.328\u20130.893.\n\nA sample-weighted mean (0.894) would hide October, and its weights come from field-campaign size, not scientific relevance.",
  });
  card(s, {
    x: 6.8, y: 4.85, w: 5.9, h: 1.6, accent: CORAL, fill: "FBEDE7",
    title: "Two caveats that travel with these numbers", titleSize: 14, bodySize: 11,
    body: "October specificity is 0.533 \u2014 barely better than chance on negatives.\n\nOnly 165 of 260 samples can be stratified at all: November and December are 100% positive, so AUC is undefined there.",
    bodyColor: "7A2E14",
  });

  s.addText("Under covariate adjustment instead, the increment is +0.043 (L2-LR) to +0.105 (SVM-RBF) \u2014 model-dependent, which is why stratification is the primary estimate.", {
    x: 0.6, y: 6.55, w: 11.8, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED, italic: true,
  });
}

// ================================================================ 22b DECONFOUND
{
  const s = slide("What If We Simply Drop the Confounded Months?", "Validity · sensitivity");
  s.addText("November–December is 100% positive and January 90% negative. On those 95 samples a model scores well by learning the month, not the microbiome. Excluding them (n = 260 → 165):", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("Feature set"), th("Full n=260"), th("Subset n=165"), th("Change")],
    ["Covariates only", "0.881", "0.774", { text: "−0.107", options: { color: MUTED } }],
    ["Microbiome only", "0.766", { text: "0.933", options: { bold: true } }, { text: "+0.168", options: { color: MOSS, bold: true } }],
    ["Microbiome + covariates", "0.924", "0.951", { text: "+0.027", options: { color: MOSS } }],
    [{ text: "Independent contribution", options: rowHi }, { text: "+0.043", options: rowHi }, { text: "+0.177", options: rowHi }, { text: "×4", options: rowHi }],
  ], { x: 0.6, y: 2.0, w: 6.9, colW: [2.7, 1.4, 1.5, 1.3], rowH: 0.44, fontSize: 11 });

  card(s, {
    x: 7.8, y: 2.0, w: 4.9, h: 2.2, accent: MOSS,
    title: "Deconfounding worked", titleSize: 14, bodySize: 11,
    body: "Predicting the label from month alone:\n\n   full cohort  AUC 0.775\n   subset       AUC 0.426\n\nMonth is fully neutralised. Permutation test on the subset: p = 0.0099.",
  });

  card(s, {
    x: 0.6, y: 4.45, w: 5.9, h: 1.95, accent: TEAL,
    title: "The biomarkers get stronger, not different", titleSize: 14, bodySize: 11,
    body: "Significant taxa 19/70 → 34/65; Spearman ρ = 0.879 on t-statistics; 18 significant in both.\n\nVeillonella (FDR 3.7e-29) and Prevotella — the two that collinearity had pushed out of the nine-taxon panel — are now the strongest hits.",
  });
  card(s, {
    x: 6.8, y: 4.45, w: 5.9, h: 1.95, accent: CORAL, fill: "FBEDE7",
    title: "But this is a sensitivity analysis, not the result", titleSize: 14, bodySize: 11,
    body: "The 95 excluded samples are also the hardest to classify (Jan+Oct stratum: AUC 0.668), so the two AUCs are not comparable.\n\nAnd spatial confounding is untouched: site → label AUC 0.740, microbiome → site AUC 0.753.",
    bodyColor: "7A2E14",
  });

  s.addText("Read as a bracket on the microbiome's independent information: conservatively +0.043, +0.177 once temporal confounding is removed.", {
    x: 0.6, y: 6.5, w: 11.6, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED, italic: true,
  });
}

// ================================================================ 22c SITE GENERALIZATION
{
  const s = slide("Would It Work at a New Wetland?", "Validity · generalization");
  s.addText("Random cross-validation lets a model score by recognising the site. Grouping by site removes that shortcut. The naive result looks catastrophic — and is misleading.", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("Leave-one-site-out"), th("LOLO AUC"), th("Random CV"), th("Drop")],
    ["SVM-RBF", { text: "0.443", options: { color: CORAL, bold: true } }, "0.853", { text: "−0.409", options: { color: CORAL } }],
    ["ExtraTrees", { text: "0.443", options: { color: CORAL, bold: true } }, "0.842", { text: "−0.399", options: { color: CORAL } }],
    ["L1-LR", { text: "0.469", options: { color: CORAL, bold: true } }, "0.777", { text: "−0.308", options: { color: CORAL } }],
  ], { x: 0.6, y: 2.0, w: 6.0, colW: [2.1, 1.35, 1.35, 1.2], rowH: 0.44, fontSize: 11 });

  card(s, {
    x: 6.9, y: 2.0, w: 5.8, h: 1.94, accent: CORAL, fill: "FBEDE7",
    title: "Why it is misleading", titleSize: 14, bodySize: 11,
    body: "Site and month are nearly interchangeable here: Sacramento is 46/80 January, GIWA 82/96 July–August, ConawayRanch autumn only.\n\nSo leave-one-site-out is also leave-one-season-out.",
    bodyColor: "7A2E14",
  });

  s.addText("Hold season fixed (July–August only) and repeat leave-one-site-out:", {
    x: 0.6, y: 4.2, w: 12.1, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: INK,
  });
  table(s, [
    [th("Held-out site"), th("n"), th("Pos"), th("AUC")],
    ["GIWA", "82", "51", { text: "0.919", options: { color: "2E6B3A", bold: true } }],
    ["MandevilleIsland", "14", "9", { text: "0.844", options: { color: "2E6B3A", bold: true } }],
    ["SuisunMarsh/Balboa", "11", "1", "1.000"],
    [{ text: "mean", options: rowHi }, { text: "", options: rowHi }, { text: "", options: rowHi }, { text: "0.921", options: rowHi }],
  ], { x: 0.6, y: 4.6, w: 6.0, colW: [2.55, 1.05, 1.05, 1.35], rowH: 0.42, fontSize: 11 });

  card(s, {
    x: 6.9, y: 4.6, w: 5.8, h: 1.68, accent: MOSS,
    title: "Spatial generalization is not the bottleneck", titleSize: 14, bodySize: 11,
    body: "With season comparable, the model transfers across wetlands at AUC 0.84–0.92.\n\nThe Sacramento fold that dragged the naive average down had 46 January samples with a single positive — that AUC is one bird's percentile rank, not an estimate.",
  });
}

// ================================================================ 23 DIVIDER 5
divider("05", "Biological Findings", "Which taxa carry the signal — and what the methods disagree about");

// ================================================================ 24 BIOMARKERS
{
  const s = slide("Nine Biomarkers, Three Independent Methods", "Findings · biomarker panel");
  s.addText("SVM permutation importance, L1 stability selection (200 bootstraps), and differential abundance (CLR + Welch t + BH-FDR) were run separately and intersected.", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });
  table(s, [
    [th("Genus"), th("Family"), th("SVM imp."), th("L1 freq."), th("Direction"), th("FDR")],
    ["(unassigned)", "Ruminococcaceae", "0.0198", "0.925", { text: "Pos ↑", options: { color: MOSS, bold: true } }, "0.012"],
    ["Varibaculum", "Actinomycetaceae", "0.0131", "0.985", { text: "Pos ↑", options: { color: MOSS, bold: true } }, "2e-04"],
    ["Rothia", "Micrococcaceae", "0.0100", "0.995", { text: "Pos ↓", options: { color: CORAL, bold: true } }, "2e-06"],
    ["Psittacicella", "Pasteurellaceae", "0.0079", "0.925", { text: "Pos ↑", options: { color: MOSS, bold: true } }, "9e-04"],
    ["Staphylococcus", "Staphylococcaceae", "0.0060", "0.940", { text: "Pos ↓", options: { color: CORAL, bold: true } }, "1e-03"],
    ["Lawsonella", "Corynebacteriaceae", "0.0055", "0.930", { text: "Pos ↓", options: { color: CORAL, bold: true } }, "0.017"],
    [{ text: "Candidatus Arthromitus (SFB)", options: rowHi }, { text: "Clostridiaceae", options: rowHi }, { text: "0.0050", options: rowHi }, { text: "0.995", options: rowHi }, { text: "Pos ↑", options: { fill: { color: "E4F0F0" }, color: "3F7A47", bold: true } }, { text: "4e-05", options: rowHi }],
    [{ text: "2 unannotated features", options: { italic: true, color: MUTED } }, { text: "—", options: { color: MUTED } }, { text: "—", options: { color: MUTED } }, { text: "≥ 0.915", options: { color: MUTED } }, { text: "Pos ↑", options: { color: MUTED } }, { text: "≤ 1e-04", options: { color: MUTED } }],
  ], { y: 2.0, colW: [3.5, 3.0, 1.7, 1.5, 1.5, 1.4], rowH: 0.42, fontSize: 11 });

  card(s, {
    x: 0.6, y: 5.78, w: 12.1, h: 1.08, accent: MOSS,
    title: "Candidatus Arthromitus is the most interpretable hit",
    body: "Segmented filamentous bacteria are enriched in infected birds. SFB are known inducers of Th17 and mucosal IgA responses — an independent immunological line of support for the association.",
  });
}

// ================================================================ 25 DISAGREEMENT
{
  const s = slide("Where the Methods Disagree", "Findings · interpretation");
  s.addText("The intersection is the safest list. The disagreements are where the biology is.", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED, italic: true,
  });

  card(s, {
    x: 0.6, y: 2.0, w: 5.9, h: 2.5, accent: TEAL,
    title: "Veillonella — dropped by L1, but real",
    bodySize: 11.5,
    body: "Ranks 2nd in permutation importance and is positive in 100% of 25 folds. FDR = 2.3e-05.\n\nYet its L1 selection frequency is only 0.105.\n\nTextbook collinearity: L1 keeps one member of a correlated group and discards the rest. Excluding Veillonella because L1 ignored it would be a mistake.",
  });
  card(s, {
    x: 6.8, y: 2.0, w: 5.9, h: 2.5, accent: MOSS,
    title: "Moraxella, Fusibacter, Cetobacterium",
    bodySize: 11.5,
    body: "Permutation importance 0.008–0.009, positive in 88% of folds.\n\nUnivariate FDR: 0.87, 0.90, 0.97 — entirely non-significant.\n\nThey contribute only through interactions with other taxa. No univariate test could ever find them; this is precisely what the RBF kernel is exploiting.",
  });

  card(s, {
    x: 0.6, y: 4.75, w: 12.1, h: 1.5, accent: DARK2,
    title: "Practical consequence for the manuscript",
    body: "A biomarker panel derived from any single method would be wrong in a specific, predictable way. Univariate testing misses interaction-driven taxa; L1 misses collinear ones; permutation importance alone gives no direction of effect. Reporting the intersection — plus the named exceptions — is more defensible than any one ranking, and takes only one extra analysis to produce.",
  });
}

// ================================================================ 26 NONLINEARITY
{
  const s = slide("Evidence for Genuine Nonlinear Structure", "Findings · nonlinearity");

  card(s, {
    x: 0.6, y: 1.6, w: 5.9, h: 2.1, accent: TEAL,
    title: "Line of evidence 1 — the kernel gap",
    body: "SVM-RBF     AUC 0.835\nSVM-linear  AUC 0.755\n\nΔ = +0.080, winning 24 of 25 folds, Wilcoxon p < 0.0001.\n\nA controlled comparison — same model family, only the kernel differs — and the most decisive test in this deck.",
  });
  card(s, {
    x: 6.8, y: 1.6, w: 5.9, h: 2.1, accent: TEAL,
    title: "Line of evidence 2 — invisible taxa",
    body: "Several features carry substantial permutation importance while being entirely non-significant univariately (FDR 0.87–0.97).\n\nTheir effect exists only in combination with other taxa.",
  });

  card(s, {
    x: 0.6, y: 3.95, w: 12.1, h: 1.25, accent: MOSS,
    title: "Biological reading",
    body: "This is consistent with what is known about gut communities: taxa act through consortia and metabolic cross-feeding rather than in isolation. A single genus rarely determines an immune phenotype on its own.\n\nNote the contrast with the model comparison: there, nothing separated the leaders. Here, one controlled change separates cleanly on every fold.",
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 5.45, w: 12.1, h: 1.15, fill: { color: DARK } });
  s.addText("A correction on the record", {
    x: 0.95, y: 5.62, w: 11.5, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: W,
  });
  s.addText("An earlier round of this analysis concluded that nonlinearity was weak, based on linear and tree models performing comparably. Adding the RBF kernel overturned that. The conclusion changed because the model class was incomplete, not because the data changed.", {
    x: 0.95, y: 5.92, w: 11.5, h: 0.55, margin: 0, fontFace: BODY, fontSize: 11.5, color: MOSS,
  });
}

// ================================================================ 27 LIMITATIONS
{
  const s = slide("Eight Known Limitations", "Limitations");
  const lims = [
    ["Cross-study generalization fails", "GroupKFold by BioProject: AUC 0.54 ± 0.29. Four studies differ in host, tissue, geography."],
    ["Upstream filtering rule unknown", "275 features is far too few for avian 16S. If filtering used labels, every number here is inflated."],
    ["Rarefaction is not rigorous", "208 samples at exactly 5000, 118 below. CLR sidesteps it; depth-dependent metrics would not."],
    ["Threshold not optimized", "All accuracies use a fixed 0.5. Tuning it would require nesting the choice inside CV."],
    ["Taxonomic resolution is capped", "Species level entirely empty; 55 features lack a genus. Interpretation stops at genus/family."],
    ["Confounder baseline is high", "Covariates alone reach 0.881. Microbiome claims must always be framed relative to that."],
    ["Multiple comparison inflates the winner", "17 models compared; the reported best is a best-of-17. Bonferroni over 17 tests would demand p < 0.003."],
    ["Sampling design binds space to time", "Site and month are nearly interchangeable, so cross-season deployment cannot be tested. Cross-site transfer itself is fine (0.84–0.92)."],
  ];
  lims.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.25, y = 1.5 + row * 1.33;
    card(s, {
      x, y, w: 5.9, h: 1.18, accent: CORAL, fill: "FBEDE7",
      title: `${i + 1}.  ${l[0]}`, titleSize: 12.5, body: l[1], bodySize: 10.5, bodyColor: "7A2E14",
    });
  });
  s.addText("Stated in the README as written here — not softened for presentation.", {
    x: 0.6, y: 6.9, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 11, color: MUTED, italic: true, valign: "top",
  });
}

// ================================================================ 28 CONCLUSIONS
{
  const s = slide("Conclusions", "Summary");
  const cs = [
    "Duck gut microbiota carry a real, reproducible signal for influenza infection status (permutation p = 0.0099).",
    "SVM-RBF is the primary model — AUC 0.835, MCC 0.535 — significantly beating Random Forest (p = 0.017), XGBoost (p = 0.005) and L1-LR (p < 0.001) among 17 models compared.",
    "The signal is partly nonlinear: the RBF kernel gains 0.073 AUC over a linear one, and several taxa act only in combination.",
    "Nine taxa survive three independent selection methods; Candidatus Arthromitus (SFB) has independent immunological support.",
    "Season is a confounder, so the primary estimate keeps only microbiome features and fixes the month: AUC 0.734 (October) to 0.965 (July), accuracy 0.676 to 0.949. The effect is real but strongly season-dependent.",
    "ExtraTrees scores higher (AUC 0.858, p = 0.041 uncorrected) but is worse on the weakest stratum (0.715 vs 0.774); its lead comes only from strata that were already easy.",
    "Conclusions apply to the UC Davis wild-duck cohort only; they do not transfer across hosts or studies.",
  ];
  cs.forEach((c, i) => {
    const y = 1.35 + i * 0.79;
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: y + 0.06, w: 0.5, h: 0.5, fill: { color: i < 5 ? TEAL : CORAL } });
    s.addText(String(i + 1), { x: 0.6, y: y + 0.14, w: 0.5, h: 0.34, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: W, align: "center" });
    s.addText(c, { x: 1.3, y: y + 0.02, w: 11.4, h: 0.62, margin: 0, fontFace: BODY, fontSize: 12.5, color: INK, lineSpacingMultiple: 1.08, valign: "top" });
  });
}

// ================================================================ 29 REPRODUCIBILITY
{
  const s = slide("Everything Is Reproducible", "Reproducibility");
  table(s, [
    [th("Script"), th("What it does")],
    ["build_features.py", "Feature matrix + QC report (depth, sparsity, leakage audit)"],
    ["export_ml_dataset.py", "Ready-to-model datasets with metadata and covariates"],
    ["train_eval.py", "Nested CV, permutation test, confounder checks, stratification, stability selection"],
    ["compare_models.py + explore_models.py", "17-model comparison across nine metrics"],
    ["svm_analysis.py", "Grid expansion + permutation importance"],
  ], { y: 1.7, colW: [3.6, 8.5], rowH: 0.46, align: "left" });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 4.7, w: 12.1, h: 1.05, fill: { color: DARK } });
  s.addText("git clone https://github.com/pengsihua2023/Christina-machine-learning-project", {
    x: 0.95, y: 4.88, w: 11.5, h: 0.35, margin: 0, fontFace: "Consolas", fontSize: 13, color: MOSS,
  });
  s.addText("python3 build_features.py && python3 train_eval.py && python3 compare_models.py", {
    x: 0.95, y: 5.26, w: 11.5, h: 0.35, margin: 0, fontFace: "Consolas", fontSize: 13, color: MOSS,
  });

  card(s, {
    x: 0.6, y: 5.95, w: 12.1, h: 0.8, accent: MOSS,
    title: null,
    body: "40 files under version control: all code, all input data, all result tables and figures, plus documentation in English (README.en.md) and Chinese (README.md).",
    bodySize: 12,
  });
}

// ================================================================ 30 CLOSING
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addText("Next Steps", {
    x: 1.0, y: 1.35, w: 11.3, h: 0.8, margin: 0,
    fontFace: HEAD, fontSize: 40, bold: true, color: W,
  });

  const nx = [
    ["Confirm the upstream filtering rule", "The single change that could invalidate the performance figures. Needs the data provider."],
    ["Nest the decision threshold", "Fold threshold selection into the inner CV loop to get an unbiased accuracy."],
    ["Expand the cohort", "Cross-study generalization needs more birds of the same host, not more studies of different ones."],
  ];
  nx.forEach((n, i) => {
    const y = 2.55 + i * 1.25;
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 11.3, h: 1.05, fill: { color: DARK2 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 0.075, h: 1.05, fill: { color: MOSS } });
    s.addText(n[0], { x: 1.35, y: y + 0.14, w: 10.6, h: 0.35, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: W });
    s.addText(n[1], { x: 1.35, y: y + 0.52, w: 10.6, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12, color: MOSS });
  });

  s.addText("Sihua Peng  ·  University of Georgia, College of Public Health  ·  pengsihua99@gmail.com", {
    x: 1.0, y: 6.75, w: 11.3, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12, color: TEALL,
  });
}

pres.writeFile({ fileName: path.join(__dirname, "Influenza_Microbiome_ML_Overview.pptx") })
  .then((f) => console.log("Written:", f, "| slides:", pageNo));
