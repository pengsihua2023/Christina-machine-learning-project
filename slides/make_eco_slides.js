/**
 * Ecological feature spaces vs the genus-abundance model — slide deck (English).
 *   node slides/make_eco_slides.js
 * Output: slides/Ecological_Models_EN.pptx
 *
 * Source of record: summary_ecological_models.md. Every number here is taken
 * from results/ecological_*.json via that document; the two are kept in step.
 *
 * Chinese counterpart: none yet (summary_ecological_models_CH.md is the text).
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

// ---------------------------------------------------------------- palette
// Same palette as the other decks in this project.
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
pres.title = "Ecological Feature Spaces vs the Genus-Abundance Model";

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
  s.addText("ECOLOGICAL FEATURE SPACES · AIV MICROBIOME", { x: 1.0, y: 1.7, w: 11.3, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 14, bold: true, color: MOSS, charSpacing: 3 });
  s.addText("When the bacteria differ,\ndoes the ecology still transfer?", {
    x: 1.0, y: 2.3, w: 11.3, h: 2.0, margin: 0,
    fontFace: HEAD, fontSize: 40, bold: true, color: W, lineSpacingMultiple: 1.05 });
  s.addText("Alpha diversity, core retention and community structure against the genus-abundance model",
    { x: 1.0, y: 4.4, w: 11.3, h: 0.45, margin: 0, fontFace: BODY, fontSize: 16, color: TEALL });
  s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 5.1, w: 3.6, h: 0.04, fill: { color: MOSS } });
  s.addText("326 samples · 4 hosts · duck-trained ecology transfers to turkey at AUC 0.870", {
    x: 1.0, y: 5.3, w: 11.3, h: 0.5, margin: 0, fontFace: BODY, fontSize: 13.5, color: MOSS });
  s.addText("University of Georgia · College of Public Health", { x: 1.0, y: 6.72, w: 7, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 12, color: W });
  s.addText("summary_ecological_models.md", { x: 5.5, y: 6.72, w: 6.8, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 11, color: TEALL, align: "right" });
}

// ================================================================ 2 executive summary
{
  const s = slide("Headline results", "EXECUTIVE SUMMARY");
  stat(s, { x: 0.6, y: 1.45, w: 3.0, value: "0.870", label: "Core retention, duck → turkey", sub: "linear model, p=0.0020" });
  stat(s, { x: 3.8, y: 1.45, w: 3.0, value: "0.500", label: "Genus abundance, same test", sub: "degenerate — no discrimination", color: CORAL });
  stat(s, { x: 7.0, y: 1.45, w: 3.0, value: "0.72", label: "Cage / infection ratio", sub: "0 of 3 contrasts significant", color: MOSS });
  stat(s, { x: 10.2, y: 1.45, w: 2.5, value: "0.94", label: "Same ratio, genus", sub: "3 of 3 significant", color: CORAL });

  card(s, { x: 0.6, y: 3.15, w: 6.0, h: 1.85, accent: MOSS, bodySize: 11.5,
    title: "What holds up",
    body: "Infected birds retain less of their host-specific baseline core microbiome, and this holds in both hosts. A linear model on core retention alone, trained on 260 wild ducks, separates infected from control turkeys at AUC 0.870 — 0.904 after depth adjustment. The genus model's decision function is constant on the target." });
  card(s, { x: 6.9, y: 3.15, w: 5.8, h: 1.85, accent: CORAL, fill: "FBEDE7", bodySize: 11.5,
    title: "What does not", bodyColor: "7A2E14",
    body: "Within host, genus abundance still wins and it is not close in duck (0.836 against 0.674). Alpha diversity clears no permutation null anywhere. The 15-sample swan cohort is uninterpretable — sequencing depth alone predicts infection there at AUC 0.870." });

  caveat(s, { x: 0.6, y: 5.15, w: 12.1, h: 0.95, size: 11.5,
    text: "The claim is one direction of one host pair. Turkey → duck gives 0.549 and does not survive depth adjustment; the swan cohort cannot serve as a third host. What makes the result worth reporting is not its size but that it rests on a single interpretable quantity whose direction agrees across two hosts with almost no shared genera." });
}

// ================================================================ 3 the question
{
  const s = slide("Why ask the question at all", "MOTIVATION");
  s.addText("The taxonomic findings from this project do not survive a change of host. That is the problem this analysis exists to address.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED });

  table(s, [
    [th("Duck cohort's nine candidate genera"), th("Fate in turkey")],
    ["8 of 9", { text: "never enter the candidate pool — prevalence below 10% in turkey", options: warn }],
    [{ text: "Staphylococcus", options: { bold: true, italic: true } },
     { text: "survives the filter, but points the opposite way and is not significant (t=+0.97, FDR=0.53)", options: warn }],
  ], { y: 2.0, colW: [4.6, 7.5], rowH: 0.62, fontSize: 12 });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.4, accent: TEAL,
    title: "The hypothesis under test",
    body: "Broader ecological descriptors may be more consistent between hosts than the identity of individual genera — even when the bacteria associated with infection differ completely. The question is not whether they beat the taxonomic model within a cohort; it is whether they survive the crossing." });

  caveat(s, { x: 0.6, y: 5.1, w: 12.1, h: 1.25, size: 11.5,
    text: "A structural reason to expect this: duck's baseline core is 14 genera and turkey's is 32, with almost no overlap. A model keyed to particular taxa has nothing to carry across. A model keyed to \"what proportion of the core was lost\" is computing the same quantity in both, from different ingredients." });
}

// ================================================================ 4 data
{
  const s = slide("The data", "COHORTS");
  table(s, [
    [th("Host"), th("BioProject"), th("Context"), th("Neg"), th("Pos"), th("n"), th("Baseline core")],
    [{ text: "Duck", options: hi }, "PRJNA464410", "wild surveillance",
     { text: "109", options: hi }, { text: "151", options: hi }, { text: "260", options: hi }, { text: "14 genera", options: hi }],
    [{ text: "Turkey", options: hi }, "PRJNA644054", "experimental infection",
     { text: "13", options: hi }, { text: "32", options: hi }, { text: "45", options: hi }, { text: "32 genera", options: hi }],
    ["Chicken", "PRJNA379944", "experimental infection", "3", "3", "6", "24 genera"],
    [{ text: "Whooper swan", options: warn }, "—", "wild surveillance",
     { text: "5", options: warn }, { text: "10", options: warn }, { text: "15", options: warn }, "31 genera"],
    [{ text: "Total", options: { bold: true } }, "", "", { text: "130", options: { bold: true } },
     { text: "196", options: { bold: true } }, { text: "326", options: { bold: true } }, ""],
  ], { y: 1.75, colW: [2.2, 2.3, 3.0, 1.1, 1.1, 1.1, 1.3], rowH: 0.46, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.75, w: 5.9, h: 1.6, accent: TEAL, titleSize: 14, bodySize: 11,
    title: "Only two cohorts can be modelled",
    body: "Duck (n=260) and turkey (n=45). Chicken has 6 samples; swan has 15 with only 5 negatives. Both are too small to model alone." });
  caveat(s, { x: 6.8, y: 4.75, w: 5.9, h: 1.6, size: 11,
    text: "The two modelled cohorts differ in more than host: wild surveillance versus experimental infection, different laboratories, different library preparation. A failure to transfer between them would confound \"different host\" with \"different study entirely\"." });
}

// ================================================================ 5 feature spaces
{
  const s = slide("The feature spaces compared", "METHOD");
  table(s, [
    [th("Feature space"), th("n"), th("Taxonomic detail?"), th("Fitted in-fold?")],
    ["α diversity", "6", { text: "no", options: hi }, "no fitting needed"],
    ["Core retention", "7", { text: "no", options: hi }, "yes — from training-fold negatives"],
    [{ text: "Pure ecological (α + core)", options: { bold: true } }, { text: "13", options: { bold: true } },
     { text: "no", options: hi }, "yes"],
    ["Community structure — Bray", "10 / kernel", { text: "no", options: hi }, "yes for PCoA, none for kernel"],
    [{ text: "Community structure — Aitchison", options: { italic: true } }, { text: "10 / kernel", options: { italic: true } },
     { text: "YES", options: warn }, { text: "yes for PCoA", options: { italic: true } }],
    [{ text: "Genus abundance CLR (reference)", options: { bold: true } },
     { text: "70 / 62", options: { bold: true } }, { text: "yes", options: warn }, "yes — PrevalenceCLR"],
  ], { y: 1.75, colW: [4.6, 2.0, 2.6, 2.9], rowH: 0.45, fontSize: 11.5 });

  caveat(s, { x: 0.6, y: 4.6, w: 12.1, h: 1.35,
    text: "Aitchison distance is Euclidean distance in CLR space — the same genus abundances the taxonomic model uses, in different geometry. Anything built on it carries the full taxonomic signal and is not an ecological alternative to taxonomy. It is kept in every table as a control, always labelled. Bray–Curtis is the honest community-structure comparator." });

  s.addText("Model held fixed at SVM-RBF for the within-host and confounding work, so what varies is the feature space and not the learner. Sections on transfer use a linear model — slide 16 explains why.", {
    x: 0.6, y: 6.1, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, italic: true });
}

// ================================================================ 6 leakage handling
{
  const s = slide("Leakage handling, per feature space", "METHOD · VALIDITY");
  s.addText("Each feature space leaks differently. The collaborator flagged one of these; the second was found during this work.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Step"), th("The risk"), th("What was done")],
    ["Core retention", "core defined from all negatives — held-out samples help define their own benchmark",
     { text: "redefined in-fold, from that fold's negatives only", options: hi }],
    ["PCoA", "cmdscale() on the full 326×326 matrix — axes encode held-out samples",
     { text: "fitted on training distances, test projected in", options: hi }],
    ["Distance kernels", "none — Bray–Curtis is pairwise, CLR is per-sample",
     { text: "used directly; bandwidth from training only", options: hi }],
    ["Genus abundance", "prevalence filter fitted globally",
     { text: "PrevalenceCLR fitted in-fold", options: hi }],
  ], { y: 1.9, colW: [2.2, 5.9, 4.0], rowH: 0.5, fontSize: 11 });

  card(s, { x: 0.6, y: 4.7, w: 12.1, h: 1.5, accent: MOSS, titleSize: 14, bodySize: 11.5,
    title: "Calibration checks before any of this was trusted",
    body: "The Python core-retention implementation reproduces the collaborator's R output exactly on all 7 columns and all 326 samples. The genus reference reproduces the established results: 70 features and AUC 0.836 in duck against a documented 0.835, and 62 features in turkey. The cage contrasts reproduce summary_Turkey_45_sample.md §4 to three decimals." });
}

// ================================================================ 7 divider
divider("01", "Within host", "How well does each space detect infection inside one cohort?");

// ================================================================ 8 within-host
{
  const s = slide("Within-host performance", "RESULTS · SECTION 1");
  table(s, [
    [th("Feature space"), th("Duck (n=260)"), th("p"), th("Turkey (n=45)"), th("p")],
    ["α diversity", "0.538", { text: "0.333", options: warn }, "0.748", { text: "0.070", options: warn }],
    ["Core retention", "0.593", "0.050", "0.799", "0.010"],
    [{ text: "Pure ecological (α + core)", options: { bold: true } }, { text: "0.613", options: hi }, "0.010",
     { text: "0.807", options: hi }, "0.020"],
    ["Pure ecological + Bray", "0.674", "0.005", "0.854", "0.005"],
    ["Bray kernel", "0.695", "0.005", "0.850", "0.005"],
    [{ text: "Aitchison kernel — taxonomic", options: { italic: true } }, { text: "0.848", options: { italic: true } },
     { text: "0.005", options: { italic: true } }, { text: "0.970", options: { italic: true } }, { text: "0.005", options: { italic: true } }],
    [{ text: "Genus abundance", options: { bold: true } }, { text: "0.836", options: hi }, "0.005",
     { text: "0.972", options: hi }, "0.005"],
  ], { y: 1.75, colW: [4.4, 2.3, 1.6, 2.3, 1.5], rowH: 0.42, fontSize: 11.5 });

  card(s, { x: 0.6, y: 5.0, w: 5.9, h: 1.35, accent: CORAL, fill: "FBEDE7", titleSize: 14, bodySize: 11,
    title: "Genus abundance wins within host", bodyColor: "7A2E14",
    body: "0.836 against 0.674 for the best purely ecological space in duck. The gap narrows in turkey but does not close." });
  card(s, { x: 6.8, y: 5.0, w: 5.9, h: 1.35, accent: TEAL, titleSize: 14, bodySize: 11,
    title: "α diversity is not usable on its own",
    body: "It fails its own permutation null in both cohorts (p=0.333 and 0.070). Only combined with core retention does it clear significance." });
}

// ================================================================ 9 Aitchison caveat
{
  const s = slide("One row in that table is not a result", "RESULTS · A STRUCTURAL CAVEAT");
  stat(s, { x: 1.4, y: 1.7, w: 3.6, value: "0.848", label: "Aitchison kernel, duck", sub: "\"community structure\"" });
  stat(s, { x: 5.4, y: 1.7, w: 3.6, value: "0.836", label: "Genus abundance, duck", sub: "the taxonomic model" });
  stat(s, { x: 9.4, y: 1.7, w: 2.6, value: "≈", label: "and in turkey", sub: "0.970 against 0.972", color: MUTED, valueSize: 44 });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.5, accent: CORAL, fill: "FBEDE7",
    title: "This near-equality is close to tautological", bodyColor: "7A2E14",
    body: "Aitchison distance is defined as Euclidean distance between CLR-transformed abundance vectors. It is the genus-abundance matrix, re-expressed. Reporting \"community structure performs as well as taxonomy\" from this row would be reporting that a quantity equals itself." });

  card(s, { x: 0.6, y: 5.15, w: 12.1, h: 1.2, accent: MOSS,
    title: "What the honest comparison looks like",
    body: "Bray–Curtis is a genuine community-structure measure that is not a re-expression of the CLR abundances: 0.695 in duck and 0.850 in turkey — clearly below genus abundance. Every Aitchison-based row in this deck is italicised and labelled taxonomic for that reason." });
}

// ================================================================ 10 divider
divider("02", "Confounding", "Two things that had to be ruled out before anything could be read");

// ================================================================ 11 depth
{
  const s = slide("Sequencing depth, and what it costs the swan cohort", "CONFOUNDING · DEPTH");
  s.addText("Counts were not rarefied, and richness metrics rise with depth by construction. Depth had to be checked first.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Depth → infection status"), th("AUC")],
    ["Duck", "0.650"],
    ["Turkey", "0.560"],
    [{ text: "Swan (n=15)", options: warn }, { text: "0.870", options: warn }],
  ], { x: 0.6, y: 1.9, w: 4.6, colW: [3.0, 1.6], rowH: 0.44, fontSize: 11.5 });

  table(s, [
    [th("Swan feature"), th("AUC alone"), th("|r| with depth")],
    ["TotalTaxaPresent", "1.000", { text: "0.772", options: warn }],
    ["Observed_Genera", "1.000", { text: "0.618", options: warn }],
    ["Shannon_Genus", "1.000", { text: "0.713", options: warn }],
    [{ text: "CoreAbundanceRetention", options: { bold: true } }, { text: "0.560", options: hi },
     { text: "0.007", options: hi }],
  ], { x: 5.8, y: 1.9, w: 6.9, colW: [3.1, 1.9, 1.9], rowH: 0.44, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.15, w: 12.1, h: 1.15, accent: MOSS, titleSize: 14, bodySize: 11.5,
    title: "The last row is the internal control",
    body: "CoreAbundanceRetention is the one core metric essentially uncorrelated with depth — and it is also the only one showing no signal in swan. Every feature that looks strong there is a feature that tracks depth." });

  caveat(s, { x: 0.6, y: 5.45, w: 12.1, h: 0.95, size: 11.5,
    text: "Nothing from the swan cohort is interpretable, and it is excluded from every conclusion. A depth-adjusted rerun confirms the diagnosis: turkey → swan transfer collapses from AUC 1.000 to 0.600 (p 0.005 → 0.259), which is exactly what should happen to a depth artefact." });
}

// ================================================================ 12 cage
{
  const s = slide("Ecological features are far less cage-confounded", "CONFOUNDING · CAGE");
  s.addText("In turkey, isolator is perfectly collinear with infection status. The pure cage effect holds strain, batch and infection fixed and varies only the isolator — 8 birds sharing litter, water and feed.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Feature space"), th("Pure cage"), th("Infection"), th("Cage / infection"), th("Cage contrasts significant")],
    ["α diversity", "0.502", "0.746", { text: "0.67", options: hi }, { text: "0 / 3", options: hi }],
    [{ text: "Pure ecological (α + core)", options: { bold: true } }, "0.563", "0.784",
     { text: "0.72", options: hi }, { text: "0 / 3", options: hi }],
    ["Core retention", "0.602", "0.780", { text: "0.77", options: hi }, { text: "0 / 3", options: hi }],
    [{ text: "PCoA (Aitchison) — taxonomic", options: { italic: true } }, { text: "0.935", options: { italic: true } },
     { text: "0.976", options: { italic: true } }, { text: "0.96", options: warn }, { text: "3 / 3", options: warn }],
    [{ text: "Genus abundance", options: { bold: true } }, { text: "0.908", options: warn },
     "0.967", { text: "0.94", options: warn }, { text: "3 / 3", options: warn }],
  ], { y: 1.95, colW: [4.2, 1.9, 1.9, 2.2, 1.9], rowH: 0.47, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.85, w: 5.9, h: 1.5, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "Ecological spaces see infection, not the cage",
    body: "Pure ecological: cage contrasts p = 0.40, 0.25, 0.55 — none significant, while the infection effect reaches 0.784 at p=0.0100." });
  caveat(s, { x: 6.8, y: 4.85, w: 5.9, h: 1.5, size: 11,
    text: "Read the ratio only where the numerator is real. α diversity's 0.67 looks best of all, but α has no infection signal in either cohort — a ratio built on noise means nothing." });
}

// ================================================================ 13 divider
divider("03", "Across hosts", "Train on one host, predict another — the question that started this");

// ================================================================ 14 transfer table
{
  const s = slide("Cross-host transfer", "RESULTS · SECTION 4");
  s.addText("Whole source cohort trains, whole target cohort tests. No target data enters training — not even the standardisation mean. Every AUC carries a permutation null built by shuffling the target labels.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED });

  table(s, [
    [th("Source → target  (SVM-RBF)"), th("α diversity"), th("Core retention"), th("Pure ecological"), th("Genus abundance")],
    [{ text: "Duck → Turkey", options: { bold: true } }, "0.375", "0.469",
     { text: "0.800  p=0.0050", options: hi }, { text: "0.500  degenerate", options: warn }],
    ["Turkey → Duck", "0.503", "0.579", "0.549", { text: "0.500  degenerate", options: warn }],
    [{ text: "Duck → Swan", options: { color: MUTED } }, { text: "0.400", options: { color: MUTED } },
     { text: "0.900", options: { color: MUTED } }, { text: "0.500", options: { color: MUTED } },
     { text: "0.500", options: { color: MUTED } }],
    [{ text: "Turkey → Swan", options: { color: MUTED } }, { text: "1.000", options: { color: MUTED } },
     { text: "0.980", options: { color: MUTED } }, { text: "1.000", options: { color: MUTED } },
     { text: "0.220", options: { color: MUTED } }],
  ], { y: 1.95, colW: [3.3, 2.1, 2.2, 2.4, 2.1], rowH: 0.5, fontSize: 11.5 });

  caveat(s, { x: 0.6, y: 4.5, w: 5.9, h: 1.0, size: 11,
    text: "Swan rows greyed out — depth artefacts (slide 11). Both collapse under depth adjustment." });
  card(s, { x: 6.8, y: 4.5, w: 5.9, h: 1.0, accent: CORAL, fill: "FBEDE7", titleSize: 13, bodySize: 10.5,
    title: "\"Degenerate\" is not \"chance\"", bodyColor: "7A2E14",
    body: "The genus model gives every target sample the same score. AUC 0.500 here means no discrimination at all." });

  s.addText("These are SVM-RBF figures, kept for protocol consistency with the earlier sections. They understate what these features can transfer — slide 16.", {
    x: 0.6, y: 5.7, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, italic: true });
}

// ================================================================ 15 the duck->turkey result
{
  const s = slide("The one direction that works", "RESULTS · DUCK → TURKEY");
  stat(s, { x: 0.9, y: 1.6, w: 3.4, value: "0.800", label: "Pure ecological, RBF", sub: "noise ceiling 0.740" });
  stat(s, { x: 4.9, y: 1.6, w: 3.4, value: "0.803", label: "After depth adjustment", sub: "noise ceiling 0.757", color: MOSS });
  stat(s, { x: 8.9, y: 1.6, w: 3.4, value: "p = 0.0050", label: "Permutation p, both", sub: "unchanged by adjustment", valueSize: 32, color: MOSS });

  card(s, { x: 0.6, y: 3.4, w: 12.1, h: 1.3, accent: MOSS,
    title: "A model trained on 260 wild ducks separates infected from control turkeys",
    body: "Using only α diversity and core retention — 13 features, no taxonomic information whatsoever. This is the first cross-host transfer anywhere in this project to clear its own noise ceiling in a non-degenerate way, and depth adjustment leaves it untouched." });

  caveat(s, { x: 0.6, y: 4.9, w: 12.1, h: 1.45,
    text: "Three limits, stated up front. (1) Transfer is asymmetric: turkey → duck gives 0.549, and 0.523 after depth adjustment — no signal. Training on 45 to predict 260 is the harder direction. (2) One direction of one host pair; the swan cohort cannot serve as replication. (3) Turkey's infection status is perfectly collinear with isolator, so the 0.800 is measured against a label inseparable from cage assignment — mitigated by slide 12, not eliminated." });
}

// ================================================================ 16 linear vs RBF
{
  const s = slide("What was actually blocking the transfer", "ANATOMY · SECTION 5.1");
  s.addText("Repeating every transfer with L2 logistic regression instead of SVM-RBF changes the picture entirely.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Feature set"), th("SVM-RBF"), th("Linear"), th("Linear, depth-adjusted")],
    ["All 13", "0.800", "0.834", "0.856"],
    ["α diversity only", "0.375", "0.714", "0.716"],
    [{ text: "Core retention only", options: { bold: true } }, { text: "0.469", options: warn },
     { text: "0.870", options: hi }, { text: "0.904", options: hi }],
    ["Count-type subset (6)", "0.591", "0.856", "—"],
  ], { y: 1.9, colW: [4.0, 2.7, 2.7, 2.7], rowH: 0.48, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.2, w: 12.1, h: 1.25, accent: TEAL,
    title: "Why the kernel was the obstacle",
    body: "An RBF kernel measures Euclidean distance in standardised feature space, and the standardisation is fitted on duck. Turkey's values sit far from duck's centre, so the kernel saturates and every target sample looks equally distant. A linear boundary needs only the direction of the effect to agree between hosts, not its location — which is exactly the property a cross-host transfer requires." });

  caveat(s, { x: 0.6, y: 5.65, w: 12.1, h: 0.75, size: 11.5,
    text: "This corrects the earlier reading. It is not an interaction between diversity and core retention — core retention carries the transfer on its own, and adding α diversity makes it worse (0.870 → 0.834)." });
}

// ================================================================ 17 mechanism
{
  const s = slide("The mechanism, in one sentence", "ANATOMY · SECTION 5.2");
  table(s, [
    [th("Feature"), th("Duck AUC"), th("Turkey AUC"), th("Same direction?")],
    [{ text: "CoreRetentionProportion", options: { bold: true } }, { text: "0.397", options: hi },
     { text: "0.154", options: hi }, { text: "yes — lower in infected", options: hi }],
    [{ text: "CoreTaxaLost", options: { bold: true } }, { text: "0.603", options: hi },
     { text: "0.846", options: hi }, { text: "yes — higher in infected", options: hi }],
    ["CoreTaxaPresent", "0.397", "0.154", "yes"],
    ["Observed_Genera", "0.491", "0.293", "yes"],
    [{ text: "Simpson / InvSimpson", options: { color: MUTED } }, { text: "0.507", options: { color: MUTED } },
     { text: "0.214", options: { color: MUTED } }, { text: "no", options: { color: MUTED } }],
  ], { y: 1.75, colW: [3.8, 2.4, 2.4, 3.5], rowH: 0.46, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.35, w: 12.1, h: 1.35, accent: MOSS,
    title: "Infected birds lose a larger share of their host-specific baseline core",
    body: "Which genera constitute that core differs completely between hosts — 14 in duck, 32 in turkey, with almost no overlap — but the proportion lost behaves the same way in both. That is why a taxonomic model cannot transfer and this one can. 9 of the 13 features agree in direction across hosts." });

  s.addText("The two strongest features are the same measurement from opposite ends: what fraction of the core is still there, and how many core taxa are gone.", {
    x: 0.6, y: 5.9, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, italic: true });
}

// ================================================================ 18 selection bias
{
  const s = slide("Both searches survive their own selection bias", "ANATOMY · SECTION 5.2");
  s.addText("Searching 13 single features and 78 pairs and reporting the best is exactly the best-of-N problem this project documents. The null must therefore be the null of the maximum over the whole search.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Search"), th("Best found"), th("Null of the max"), th("Corrected p")],
    [{ text: "13 single features", options: { bold: true } },
     { text: "0.846  CoreRetentionProportion", options: hi }, "0.623 ± 0.055  (max 0.867)",
     { text: "0.0040", options: hi }],
    [{ text: "78 feature pairs", options: { bold: true } },
     { text: "0.862  Observed_Genera + CoreRetentionProportion", options: hi }, "0.695 ± 0.051  (max 0.849)",
     { text: "0.0033", options: hi }],
  ], { y: 2.0, colW: [2.8, 4.6, 3.0, 1.7], rowH: 0.62, fontSize: 11 });

  card(s, { x: 0.6, y: 4.1, w: 5.9, h: 1.25, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "One feature is enough",
    body: "CoreRetentionProportion alone transfers at 0.846 — a single quantity that can go in an abstract, not a black-box combination." });
  caveat(s, { x: 6.8, y: 4.1, w: 5.9, h: 1.25, size: 11,
    text: "It was chosen after inspecting the ranking, so the plain p-value would be optimistic. Judged against the max-of-13 null it still holds at p=0.0040." });

  card(s, { x: 0.6, y: 5.5, w: 12.1, h: 0.95, accent: CORAL, fill: "FBEDE7", titleSize: 13.5, bodySize: 11,
    title: "One pre-registered hypothesis was not supported", bodyColor: "7A2E14",
    body: "The prediction was that only dimensionless features would transfer, because the hosts' core sizes differ. Under a linear model the count-type subset transfers at 0.856. The scale problem was real, but it lived in the kernel, not in the features." });
}

// ================================================================ 19 combining
{
  const s = slide("Would combining everything be better? No", "SECTION 6");
  table(s, [
    [th("Feature space"), th("Duck"), th("Turkey"), th("Duck → Turkey transfer"), th("Cage / infection")],
    [{ text: "Genus abundance", options: { bold: true } }, { text: "0.836", options: hi },
     { text: "0.972", options: hi }, { text: "0.500  degenerate", options: warn }, { text: "0.94", options: warn }],
    [{ text: "Pure ecological (α + core)", options: { bold: true } }, "0.613", "0.807",
     { text: "0.800  p=0.0050", options: hi }, { text: "0.72", options: hi }],
    [{ text: "Genus + α + core", options: { bold: true } }, "0.832", "0.960",
     { text: "0.490  p=0.522", options: warn }, { text: "0.95", options: warn }],
    ["Genus + α + core + Bray", "0.831", "0.979", "—", "0.84"],
  ], { y: 1.75, colW: [4.0, 1.8, 1.8, 2.7, 1.8], rowH: 0.5, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.1, w: 5.9, h: 1.5, accent: TEAL, titleSize: 14, bodySize: 11,
    title: "No gain within host",
    body: "Every difference is smaller than the repeat-to-repeat standard deviation (0.012–0.025). The ecological features are summary statistics of the same abundance table — a model holding all 70 abundances has nothing to gain from them." });
  caveat(s, { x: 6.8, y: 4.1, w: 5.9, h: 1.5, size: 11,
    text: "And both good properties are lost. Transfer falls from 0.800 to 0.490 once the genus block is added back, and the combination tracks isolators exactly as well as genus alone. Diluting a confounded block with clean features does not decontaminate it." });

  s.addText("The two spaces answer different questions. Merging them answers the first no better and the second not at all.", {
    x: 0.6, y: 5.8, w: 12.1, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: INK });
}

// ================================================================ 20 verdict + next
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addText("Which model, and what remains", { x: 1.0, y: 0.75, w: 11.3, h: 0.7, margin: 0,
    fontFace: HEAD, fontSize: 30, bold: true, color: W });

  const rows = [
    ["How well can infection be detected in this cohort?", "Genus abundance", "0.836 duck · 0.972 turkey", TEALL],
    ["Does the finding hold in another host?", "Core retention + linear model", "0.870, p=0.0020", MOSS],
  ];
  rows.forEach((r, i) => {
    const y = 1.6 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 11.3, h: 0.8, fill: { color: DARK2 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 0.075, h: 0.8, fill: { color: r[3] } });
    s.addText(r[0], { x: 1.35, y: y + 0.1, w: 5.6, h: 0.6, margin: 0,
      fontFace: BODY, fontSize: 12.5, color: W, valign: "middle" });
    s.addText(r[1], { x: 7.1, y: y + 0.1, w: 3.2, h: 0.6, margin: 0,
      fontFace: HEAD, fontSize: 13.5, bold: true, color: r[3], valign: "middle" });
    s.addText(r[2], { x: 10.4, y: y + 0.1, w: 1.8, h: 0.6, margin: 0,
      fontFace: BODY, fontSize: 11, color: MOSS, valign: "middle", align: "right" });
  });

  s.addText("Three usage rules", { x: 1.0, y: 3.65, w: 11.3, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: W });
  const rules = [
    "Use a linear model, not RBF — same features transfer at 0.469 against 0.870",
    "Do not add α diversity — it passes none of the checks in this dataset",
    "Do not merge with genus abundance — transfer falls to 0.490, cage ratio returns to 0.95",
  ];
  rules.forEach((t, i) => {
    s.addText("•  " + t, { x: 1.35, y: 4.05 + i * 0.32, w: 11.0, h: 0.3, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: TEALL });
  });

  s.addText("What remains", { x: 1.0, y: 5.15, w: 11.3, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: W });
  const next = [
    "Replicate duck → turkey on a third host — the swan cohort cannot serve",
    "Give the genus model a non-degenerate transfer baseline via the feature intersection",
    "Rarefy or model depth explicitly — depth reaches AUC 0.650 even in duck",
  ];
  next.forEach((t, i) => {
    s.addText("•  " + t, { x: 1.35, y: 5.55 + i * 0.32, w: 11.0, h: 0.3, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: MOSS });
  });

  s.addText("Full results in summary_ecological_models.md ｜ reproduce: ecological_models.py, ecological_transfer_anatomy.py, ecological_cage_check.py", {
    x: 1.0, y: 6.9, w: 11.3, h: 0.35, margin: 0, fontFace: BODY, fontSize: 10.5, color: TEALL });
}

pres.writeFile({ fileName: path.join(__dirname, "Ecological_Models_EN.pptx") })
  .then((f) => console.log("Written:", f, "| slides:", pageNo));
