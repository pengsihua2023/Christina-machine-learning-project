/**
 * Turkey cohort biomarkers: the duck three-method protocol — slide deck (English).
 *   node slides/make_turkey_biomarker_slides_en.js
 * Output: slides/Turkey_Biomarkers_EN.pptx
 *
 * Source of record: summary_Turkey_45_sample_EN.md §2.5. Every number comes from
 * results/turkey_biomarkers_3method.json and turkey_l1_scan.csv.
 *
 * Chinese counterpart: make_turkey_biomarker_slides.js (kept in step, same numbers).
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
pres.title = "Turkey Cohort Biomarkers: the Three-Method Intersection";

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

// ================================================================ 1 why redo
{
  const s = slide("Why the turkey biomarkers had to be redone", "METHOD · MATCHING PROTOCOLS");
  s.addText("The turkey cohort already had candidate taxa, but from a different protocol than the duck cohort — so the two were never comparable.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th(""), th("Duck cohort (README §6.2)"), th("Turkey (as run in §2.1–2.4)")],
    ["①", "Differential abundance: CLR + Welch t + BH-FDR", "Differential abundance: CLR + Welch t + BH-FDR"],
    ["②", "SVM permutation importance", "SVM permutation importance"],
    [{ text: "③", options: { bold: true } },
     { text: "L1 stability selection", options: warn },
     { text: "Cage screen (unique to this cohort)", options: hi }],
    [{ text: "Result", options: { bold: true } }, { text: "9 biomarkers", options: { bold: true } },
     { text: "7 candidates (§2.3)", options: { bold: true } }],
  ], { y: 1.9, colW: [1.0, 5.6, 5.5], rowH: 0.5, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.5, w: 12.1, h: 0.95, accent: CORAL, fill: "FBEDE7", titleSize: 14, bodySize: 11.5,
    title: "The missing piece is ③: L1 stability selection", bodyColor: "7A2E14",
    body: "Each cohort lacked the other's third method. Only after adding L1 does a comparison mean anything. The cage screen is kept as a fourth layer on top — it is a test the duck cohort cannot run, and should not be dropped for the sake of alignment." });

  caveat(s, { x: 0.6, y: 5.6, w: 12.1, h: 0.85, size: 11.5,
    text: "This mismatch had never been recorded. The two figures in the documents — 9 and 7 — read as comparable while being products of different pipelines. That is what this rework corrects." });
}

// ================================================================ 2 the L1 problem
{
  const s = slide("The L1 penalty cannot simply be carried over", "METHOD · THE KEY CHOICE");
  s.addText("The duck cohort used C=0.1 (18 of 70 features). With n=45 and 62 features in turkey, the two ways of matching it contradict each other.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("C"), th("Non-zero"), th("of 62 features"), th("CV-AUC"), th("Reading")],
    ["0.05", { text: "0", options: warn }, "0%", { text: "0.500", options: warn }, "penalty too strong — everything zeroed"],
    [{ text: "0.20", options: hi }, "7", "11%", "0.934", { text: "matches the duck rule: ~0.03 AUC given up", options: hi }],
    [{ text: "1.00", options: hi }, "10", "16%", "0.971", { text: "midpoint", options: hi }],
    [{ text: "10.00", options: hi }, "15", "24%", "0.971", { text: "matches the duck sparsity fraction (≈1/4)", options: hi }],
    ["50.00", "18", "29%", "0.977", "penalty barely active"],
  ], { y: 1.9, colW: [1.4, 1.8, 2.2, 1.6, 5.1], rowH: 0.46, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.85, w: 5.9, h: 1.5, accent: CORAL, fill: "FBEDE7", titleSize: 14, bodySize: 11,
    title: "The two ways of matching disagree", bodyColor: "7A2E14",
    body: "Matching the sparsity fraction needs C≈10, where the penalty barely does anything. Matching the rule the duck cohort actually applied gives C≈0.2 and only 7 non-zero coefficients. There is no correct answer." });
  card(s, { x: 6.8, y: 4.85, w: 5.9, h: 1.5, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "The fix: treat C as a sensitivity axis",
    body: "200 bootstraps at each of 0.2 / 1.0 / 10.0, and a feature counts as an L1 hit only if it clears 70% selection frequency at all three (4 / 8 / 9 hits; the intersection is taken). The conclusion then rests on no arbitrary choice." });
}

// ================================================================ 3 results
{
  const s = slide("Four features clear all three methods", "RESULTS");
  s.addText("Hits per method: differential abundance 19, permutation importance 24, L1 (all three C values) 4.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Genus"), th("Family"), th("Importance"), th("L1 freq (lowest)"), th("Direction"), th("FDR"), th("Cage screen")],
    [{ text: "Negativibacillus", options: { italic: true } }, "Ruminococcaceae", "0.0133", "0.865",
     { text: "Pos↑", options: warn }, "3.8e-05", { text: "confounded", options: warn }],
    [{ text: "HT002", options: { bold: true, italic: true } }, "Lactobacillaceae", "0.0130", "0.935",
     { text: "Pos↓", options: hi }, "5.7e-03", { text: "passes", options: hi }],
    [{ text: "Tissierella", options: { italic: true } }, "Family_XI", "0.0079", "0.885",
     { text: "Pos↑", options: warn }, "3.8e-04", { text: "confounded", options: warn }],
    [{ text: "Escherichia-Shigella", options: { bold: true, italic: true } }, "Enterobacteriaceae", "0.0015", "1.000",
     { text: "Pos↑", options: hi }, "3.8e-04", { text: "passes", options: hi }],
  ], { y: 1.9, colW: [2.8, 2.4, 1.4, 1.9, 1.2, 1.2, 1.2], rowH: 0.5, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.4, w: 5.9, h: 1.45, accent: TEAL, titleSize: 14, bodySize: 11,
    title: "L1 is by far the strictest gate",
    body: "Nineteen genera reach FDR<0.05; four survive L1. The duck cohort behaves the same way — L1 is the step that narrowed 19 to 9 there." });
  card(s, { x: 6.8, y: 4.4, w: 5.9, h: 1.45, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "How these relate to the seven in §2.3",
    body: "These four are the stricter subset. Once L1 is added, Pediococcus, the unnamed Lactobacillaceae genus, Incertae_Sedis and Weissella fail to be selected consistently across all three C values." });

  s.addText("Use these four when comparing against the duck cohort; use the seven in §2.3 when listing every candidate this cohort offers — both are correct at their own strictness.", {
    x: 0.6, y: 6.0, w: 12.1, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 12.5, bold: true, color: INK });
}

// ================================================================ 4 cross-host + limits
{
  const s = slide("Cross-host comparison, and what it does not license", "CONCLUSIONS");
  s.addText("The duck three-method intersection was rebuilt first and returns exactly 9, matching README §6.2 — the reconstruction is verified before any comparison is drawn.", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Rank"), th("Overlap"), th("Detail")],
    ["Genus", { text: "none", options: warn }, "the duck 9 and the turkey 4 share no genus"],
    [{ text: "Family", options: { bold: true } }, { text: "Ruminococcaceae", options: hi },
     { text: "Duck (unnamed genus) Pos↑　|　Turkey Negativibacillus Pos↑　— same direction", options: hi }],
  ], { y: 1.9, colW: [1.6, 3.2, 7.3], rowH: 0.58, fontSize: 11.5 });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.0, accent: MOSS, titleSize: 14, bodySize: 11.5,
    title: "The first taxonomic cross-host consistency anywhere in this project",
    body: "§3 had concluded that of the duck cohort's nine genera only Staphylococcus entered the turkey candidate pool, pointing the opposite way and not significant. Relaxed to family rank, Ruminococcaceae rises in infected birds of both hosts." });

  caveat(s, { x: 0.6, y: 4.7, w: 12.1, h: 1.05, size: 11.5,
    text: "But the turkey member, Negativibacillus, is precisely the cautionary case from §2.4 — it differs significantly across four isolators that are all positive, and §4.5 traces the contamination to strain or batch. This family-level agreement therefore cannot be attributed to infection; it is a lead, not a finding." });

  s.addText("Bottom line: turkey does have biomarkers, but only two clear both the three methods and the cage screen. Cross-host consistency exists only at family rank and carries confounding. The next step is to test Ruminococcaceae and Escherichia-Shigella in a third cohort.", {
    x: 0.6, y: 5.95, w: 12.1, h: 0.5, margin: 0, fontFace: HEAD, fontSize: 12.5, bold: true, color: INK });
}

pres.writeFile({ fileName: path.join(__dirname, "Turkey_Biomarkers_EN.pptx") })
  .then((f) => console.log("Written:", f, "| slides:", pageNo));
