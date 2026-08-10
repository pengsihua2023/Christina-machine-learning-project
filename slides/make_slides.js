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
  stat(s, { x: 3.6, y: 1.5, w: 2.85, value: "+0.043", label: "Independent contribution", sub: "AUC over covariates alone", color: DARK2 });
  stat(s, { x: 6.6, y: 1.5, w: 2.85, value: "0.86–0.96", label: "Survives the confounder", sub: "AUC within a single month", valueSize: 30, color: DARK2 });
  stat(s, { x: 9.6, y: 1.5, w: 3.1, value: "9", label: "Biomarkers", sub: "3 independent methods agree", color: MOSS });

  s.addText("Model performance is deliberately not the headline: the four best of 17 models are statistically indistinguishable (AUC 0.834–0.859), so no single score is a property of the finding.", {
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
    ["04", "Validity", "Permutation testing, confounders, and stratified re-analysis"],
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
  const s = slide("How This Section Should Be Read", "Modeling · protocol");

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

  s.addText("Three ways the metrics mislead", {
    x: 0.6, y: 3.5, w: 12.1, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 17, bold: true, color: INK,
  });
  const pit = [
    ["Accuracy's baseline is 0.581", "58% of samples are positive, so always-Pos already scores 0.581. Never report accuracy without that number beside it."],
    ["F1 cannot rank models", "The always-Pos baseline scores F1 = 0.735 — above L2-LR's 0.725. F1 inflates when positives dominate."],
    ["MCC has a zero baseline", "So does balanced accuracy. They expose class asymmetry at once: RF reaches 0.725 accuracy while catching 55% of negatives."],
  ];
  pit.forEach((p, i) => {
    card(s, { x: 0.6 + i * 4.1, y: 3.95, w: 3.9, h: 1.5, accent: CORAL, fill: "FBEDE7",
              title: `${i + 1}.  ${p[0]}`, titleSize: 12.5, body: p[1], bodySize: 11, bodyColor: "7A2E14" });
  });

  caveat(s, {
    x: 0.6, y: 5.65, w: 12.1, h: 0.85,
    text: "All accuracy figures use a fixed 0.5 threshold. A 0.55 threshold performs better, but was chosen by looking at test data — using it would require folding threshold selection into the inner loop.",
    size: 11,
  });
}

// ================================================================ 14 MODEL TABLE
{
  const s = slide("Seventeen Models, Four of Them Tied", "Modeling · comparison");
  table(s, [
    [th("Model"), th("Accuracy"), th("Bal. Acc"), th("ROC-AUC"), th("PR-AUC"), th("Sens."), th("Spec."), th("F1"), th("MCC")],
    [{ text: "ExtraTrees", options: rowHi }, { text: "0.777", options: rowHi }, { text: "0.755", options: rowHi }, { text: "0.859", options: rowHi }, { text: "0.893", options: rowHi }, { text: "0.890", options: rowHi }, { text: "0.620", options: rowHi }, { text: "0.822", options: rowHi }, { text: "0.542", options: rowHi }],
    [{ text: "SVM-RBF", options: rowHi }, { text: "0.771", options: rowHi }, { text: "0.761", options: rowHi }, { text: "0.839", options: rowHi }, { text: "0.872", options: rowHi }, { text: "0.820", options: rowHi }, { text: "0.703", options: rowHi }, { text: "0.805", options: rowHi }, { text: "0.531", options: rowHi }],
    [{ text: "Ensemble (soft-vote)", options: rowHi }, { text: "0.766", options: rowHi }, { text: "0.756", options: rowHi }, { text: "0.836", options: rowHi }, { text: "0.873", options: rowHi }, { text: "0.818", options: rowHi }, { text: "0.694", options: rowHi }, { text: "0.802", options: rowHi }, { text: "0.521", options: rowHi }],
    [{ text: "SVM-poly", options: rowHi }, { text: "0.748", options: rowHi }, { text: "0.728", options: rowHi }, { text: "0.834", options: rowHi }, { text: "0.861", options: rowHi }, { text: "0.853", options: rowHi }, { text: "0.604", options: rowHi }, { text: "0.797", options: rowHi }, { text: "0.481", options: rowHi }],
    ["GP-RBF", "0.757", "0.741", "0.822", "0.866", "0.841", "0.641", "0.801", "0.498"],
    ["GP-Matérn", "0.755", "0.738", "0.819", "0.865", "0.844", "0.632", "0.800", "0.493"],
    ["RandomForest", "0.725", "0.701", "0.810", "0.851", "0.850", "0.553", "0.782", "0.433"],
    ["XGBoost", "0.730", "0.720", "0.801", "0.845", "0.784", "0.656", "0.770", "0.449"],
    ["HistGB", "0.722", "0.705", "0.796", "0.841", "0.809", "0.600", "0.771", "0.423"],
    ["kNN-Aitchison", "0.719", "0.687", "0.795", "0.838", "0.885", "0.490", "0.786", "0.422"],
    [{ text: "Baseline (always Pos)", options: { italic: true, color: MUTED } },
     { text: "0.581", options: { italic: true, color: MUTED } }, { text: "0.500", options: { italic: true, color: MUTED } }, { text: "0.500", options: { italic: true, color: MUTED } }, { text: "0.581", options: { italic: true, color: MUTED } }, { text: "1.000", options: { italic: true, color: MUTED } }, { text: "0.000", options: { italic: true, color: MUTED } }, { text: "0.735", options: { italic: true, color: MUTED } }, { text: "0.000", options: { italic: true, color: MUTED } }],
  ], { y: 1.5, colW: [2.9, 1.15, 1.25, 1.15, 1.15, 1.05, 1.05, 1.0, 1.0], rowH: 0.33, fontSize: 10 });

  s.addText("Top 10 of 17 by ROC-AUC · shading marks the tied leading group · full table in results/model_comparison_all16.csv", {
    x: 0.6, y: 5.52, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 9.5, color: MUTED, italic: true,
  });

  card(s, {
    x: 0.6, y: 5.85, w: 12.1, h: 0.95, accent: TEAL,
    title: "Read the top block as one group, not as a ranking", titleSize: 14,
    body: "The first four rows cannot be told apart (next slide) — their order here is noise. Real separation starts at GP-RBF.", bodySize: 11,
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
    [{ text: "ExtraTrees", options: { bold: true, align: "left" } }, { text: ".085", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".005", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".003", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".001", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".001", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }],
    [{ text: "SVM-RBF", options: { bold: true, align: "left" } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: ".360", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".476", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".003", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".002", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }],
    [{ text: "Ensemble", options: { bold: true, align: "left" } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: ".609", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".001", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }, { text: ".000", options: { fill: { color: "E4F0F0" }, color: TEAL, bold: true } }],
    [{ text: "SVM-poly", options: { bold: true, align: "left" } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: ".554", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }, { text: ".420", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }],
    [{ text: "GP-RBF", options: { bold: true, align: "left" } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: "", options: { fill: { color: "F7F5F1" } } }, { text: ".051", options: { fill: { color: "EDEDEA" }, color: MUTED, bold: false } }],
  ], { y: 2.15, colW: [2.5, 1.92, 1.92, 1.92, 1.92, 1.92], rowH: 0.42, fontSize: 11 });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 4.82, w: 0.2, h: 0.2, fill: { color: "EDEDEA" } });
  s.addText("grey = indistinguishable (p ≥ 0.05)", { x: 0.9, y: 4.78, w: 4.2, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });
  s.addShape(pres.shapes.RECTANGLE, { x: 4.9, y: 4.82, w: 0.2, h: 0.2, fill: { color: "E4F0F0" } });
  s.addText("teal = distinguishable", { x: 5.2, y: 4.78, w: 4.0, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });

  card(s, {
    x: 0.6, y: 5.05, w: 5.9, h: 1.42, accent: CORAL, fill: "FBEDE7",
    title: "The top four are a statistical tie", titleSize: 14, bodySize: 11,
    body: "ExtraTrees, SVM-RBF, the ensemble and SVM-poly cannot be separated from one another on this data. Their AUCs span 0.834–0.859, well inside the ±0.04–0.06 fold-to-fold spread.\n\nRanking them is reading noise.",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 5.05, w: 5.9, h: 1.42, accent: MOSS,
    title: "So the choice must rest on something else", titleSize: 14, bodySize: 11,
    body: "Two grounds remain: error structure at the operating threshold (specificity 0.703 for SVM-RBF vs 0.620 for ExtraTrees) and robustness where the signal is weak.\n\nThe next slide is the test that actually decides.",
  });

  s.addText("Hyperparameter robustness: the SVM-RBF grid was expanded to C ∈ [0.01, 500] and gamma ∈ [1e-4, 0.1] + scale. 0 of 15 folds selected a boundary value and AUC was unchanged (0.838 vs 0.839); the whole surface spans only 0.73–0.81. Full surface in results/svm_hyperparam_surface.csv.", {
    x: 0.6, y: 6.58, w: 12.1, h: 0.35, margin: 0,
    fontFace: BODY, fontSize: 9.5, color: MUTED, italic: true,
  });
}

// ================================================================ 15b WHY NOT EXTRATREES
{
  const s = slide("Why ExtraTrees Does Not Take Over", "Modeling · model choice");
  s.addText("A 0.020 AUC lead at p=0.085 does not settle a model choice. The decisive test is where each model stands when the signal is weak — so we re-ran both inside every sampling-month stratum.", {
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

// ================================================================ 22 ABLATION
{
  const s = slide("How Much Does the Microbiome Actually Add?", "Validity · ablation");

  const bars = [
    ["Covariates only", 0.881, "season, site, species, sex, month", DARK2],
    ["Microbiome only", 0.766, "70 CLR features", TEAL],
    ["Microbiome + covariates", 0.924, "combined model", MOSS],
  ];
  bars.forEach((b, i) => {
    const y = 1.75 + i * 1.15;
    const wMax = 7.6, wBar = wMax * (b[1] - 0.5) / 0.45;
    s.addText(b[0], { x: 0.6, y, w: 3.2, h: 0.35, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: INK });
    s.addText(b[2], { x: 0.6, y: y + 0.34, w: 3.2, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED });
    s.addShape(pres.shapes.RECTANGLE, { x: 3.95, y: y + 0.05, w: wMax, h: 0.52, fill: { color: "E8EEF0" } });
    s.addShape(pres.shapes.RECTANGLE, { x: 3.95, y: y + 0.05, w: wBar, h: 0.52, fill: { color: b[3] } });
    s.addText(b[1].toFixed(3), { x: 11.7, y: y + 0.07, w: 1.0, h: 0.45, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: b[3] });
  });
  s.addText("AUC  (bar origin = 0.50)", { x: 3.95, y: 5.15, w: 4, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });

  card(s, {
    x: 0.6, y: 5.55, w: 12.1, h: 1.15, accent: CORAL, fill: "FBEDE7",
    title: "Read this carefully",
    body: "The microbiome adds +0.043 over covariates alone — a real but modest independent contribution. Covariates by themselves already reach 0.881. Any claim that \"gut microbiota predict influenza\" must be quoted against that baseline, not against 0.50.",
    bodyColor: "7A2E14",
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
    body: "SVM-RBF     AUC 0.839\nSVM-linear  AUC 0.766\n\nΔ = +0.073, winning 25 of 25 folds, Wilcoxon p = 1e-5.\n\nA controlled comparison — same model family, only the kernel differs — and the most decisive test in this deck.",
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
  const s = slide("Seven Known Limitations", "Limitations");
  const lims = [
    ["Cross-study generalization fails", "GroupKFold by BioProject: AUC 0.54 ± 0.29. Four studies differ in host, tissue, geography."],
    ["Upstream filtering rule unknown", "275 features is far too few for avian 16S. If filtering used labels, every number here is inflated."],
    ["Rarefaction is not rigorous", "208 samples at exactly 5000, 118 below. CLR sidesteps it; depth-dependent metrics would not."],
    ["Threshold not optimized", "All accuracies use a fixed 0.5. Tuning it would require nesting the choice inside CV."],
    ["Taxonomic resolution is capped", "Species level entirely empty; 55 features lack a genus. Interpretation stops at genus/family."],
    ["Confounder baseline is high", "Covariates alone reach 0.881. Microbiome claims must always be framed relative to that."],
    ["Multiple comparison inflates the winner", "17 models compared; the reported best is a best-of-17. Bonferroni over 17 tests would demand p < 0.003."],
  ];
  lims.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.25, y = 1.5 + row * 1.33;
    card(s, {
      x, y, w: 5.9, h: 1.18, accent: CORAL, fill: "FBEDE7",
      title: `${i + 1}.  ${l[0]}`, titleSize: 12.5, body: l[1], bodySize: 10.5, bodyColor: "7A2E14",
    });
  });
  s.addText("Stated in the README as written here — not softened for presentation.\nItem 7 is why ExtraTrees, despite the highest AUC, is not the primary model.", {
    x: 6.85, y: 5.5, w: 5.8, h: 1.0, margin: 0,
    fontFace: BODY, fontSize: 11, color: MUTED, italic: true, valign: "top",
  });
}

// ================================================================ 28 CONCLUSIONS
{
  const s = slide("Conclusions", "Summary");
  const cs = [
    "Duck gut microbiota carry a real, reproducible signal for influenza infection status (permutation p = 0.0099).",
    "SVM-RBF is the primary model — AUC 0.839, MCC 0.531 — significantly beating Random Forest (p = 0.021), XGBoost (p = 0.0016) and L1-LR (p < 0.001) among 17 models compared.",
    "The signal is partly nonlinear: the RBF kernel gains 0.073 AUC over a linear one, and several taxa act only in combination.",
    "Nine taxa survive three independent selection methods; Candidatus Arthromitus (SFB) has independent immunological support.",
    "Sampling season is a serious confounder (covariates alone: AUC 0.881), but stratified analysis shows it does not explain the signal away.",
    "ExtraTrees scores higher (AUC 0.859) but is worse on the weakest stratum (0.715 vs 0.774); its lead comes only from strata that were already easy.",
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
