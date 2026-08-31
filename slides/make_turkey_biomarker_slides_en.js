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

// ================================================================ 1 protocol and result
{
  const s = slide("Turkey cohort biomarkers", "PRJNA644054 · n=45 (13 negative / 32 positive)");
  s.addText("Four layers. The first three match the duck cohort (README §6.2) exactly, which is what makes the two comparable; the fourth is unique to this cohort — wild ducks have no cages, so it cannot be applied there.", {
    x: 0.6, y: 1.38, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Layer"), th("Method"), th("What it tests"), th("Hits of 62 features")],
    ["①", "Differential abundance (CLR + Welch t + BH-FDR)", "is the between-group difference real", "19"],
    ["②", "Permutation importance (within-fold, 3×5)", "does it contribute to the model", "24"],
    [{ text: "③", options: { bold: true } }, "L1 stability selection (200 bootstraps)",
     "is it reproducibly chosen by a sparse model", { text: "4", options: warn }],
    [{ text: "④", options: { bold: true } }, { text: "Cage screen (unique to this cohort)", options: hi },
     { text: "attributable to infection, not shared housing", options: hi },
     { text: "2 of the 4 pass", options: hi }],
  ], { y: 1.80, colW: [0.9, 4.7, 4.4, 2.1], rowH: 0.40, fontSize: 11 });

  table(s, [
    [th("Genus"), th("Family"), th("Importance"), th("L1 freq"), th("Direction"), th("t"), th("FDR"), th("Layer ④")],
    [{ text: "Negativibacillus", options: { italic: true } }, "Ruminococcaceae", "0.0133", "0.865",
     { text: "Pos↑", options: warn }, "+5.87", "3.8e-05", { text: "fails", options: warn }],
    [{ text: "HT002", options: { bold: true, italic: true } }, "Lactobacillaceae", "0.0130", "0.935",
     { text: "Pos↓", options: hi }, "−3.89", "5.7e-03", { text: "passes", options: hi }],
    [{ text: "Tissierella", options: { italic: true } }, "Family_XI", "0.0079", "0.885",
     { text: "Pos↑", options: warn }, "+4.82", "3.8e-04", { text: "fails", options: warn }],
    [{ text: "Escherichia-Shigella", options: { bold: true, italic: true } }, "Enterobacteriaceae", "0.0015", "1.000",
     { text: "Pos↑", options: hi }, "+5.64", "3.8e-04", { text: "passes", options: hi }],
  ], { y: 4.00, colW: [2.6, 2.3, 1.4, 1.2, 1.2, 1.0, 1.2, 1.2], rowH: 0.42, fontSize: 11 });

  s.addText("Two are reportable: HT002 (Lactobacillaceae, falls in infected birds) and Escherichia-Shigella (Enterobacteriaceae, rises) — commensal lactic acid bacteria depleted, opportunistic pathogens expanding, the classic dysbiosis pattern.", {
    x: 0.6, y: 6.25, w: 12.1, h: 0.45, margin: 0, fontFace: HEAD, fontSize: 12.5, bold: true, color: INK });

  s.addText("The L1 penalty does not carry across cohorts: the duck C=0.1 zeroes every coefficient at n=45, so C is treated as a sensitivity axis (0.2 / 1.0 / 10.0, 200 bootstraps each, intersected).", {
    x: 0.6, y: 6.78, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED, italic: true });
}

// ================================================================ 2 attribution and cross-host
{
  const s = slide("Why layer ④ cannot be dropped, and the duck comparison", "ATTRIBUTION · CROSS-HOST");

  card(s, { x: 0.6, y: 1.4, w: 12.1, h: 1.35, accent: CORAL, fill: "FBEDE7", bodySize: 11.5,
    title: "The statistically strongest feature is precisely the one that cannot be attributed", bodyColor: "7A2E14",
    body: "Negativibacillus leads the cohort under the first three layers — highest permutation importance (0.0133), t=+5.87, stable L1 selection at all three C values. But it also differs significantly across four isolators that are all positive, so whether it reflects infection or the shared cage cannot be determined. The same holds for Tissierella.\nDrop layer ④ and the paper reports four rather than two, half of them unattributable." });

  s.addText("Comparison with the duck cohort (layers ①–③ match, so the two are comparable)", {
    x: 0.6, y: 3.0, w: 12.1, h: 0.35, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: INK });
  s.addText("Rebuilding the duck three-method intersection returns exactly 9, matching README §6.2 — the reconstruction is verified before any comparison is drawn.", {
    x: 0.6, y: 3.38, w: 12.1, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED });

  table(s, [
    [th("Rank"), th("Overlap"), th("Detail")],
    ["Genus", { text: "none", options: warn }, "the duck 9 and the turkey 4 share no genus"],
    [{ text: "Family", options: { bold: true } }, { text: "Ruminococcaceae", options: hi },
     { text: "Duck (unnamed genus) Pos↑　|　Turkey Negativibacillus Pos↑　— same direction", options: hi }],
  ], { y: 3.78, colW: [1.6, 3.2, 7.3], rowH: 0.52, fontSize: 11.5 });

  caveat(s, { x: 0.6, y: 5.45, w: 12.1, h: 1.0, size: 11,
    text: "This is the first taxonomic cross-host consistency anywhere in this project — §3 had concluded that of the duck cohort's nine genera only Staphylococcus entered the turkey pool, pointing the opposite way and not significant. But the turkey member is the Negativibacillus above, confounded by strain or batch, so the agreement cannot be attributed to infection and stands only as a lead." });

  s.addText("Conclusion: turkey has 2 reportable biomarkers. Cross-host consistency exists only at family rank and carries confounding — the next step is to test Ruminococcaceae and Escherichia-Shigella in a third cohort.", {
    x: 0.6, y: 6.6, w: 12.1, h: 0.45, margin: 0, fontFace: HEAD, fontSize: 12.5, bold: true, color: INK });
}

pres.writeFile({ fileName: path.join(__dirname, "Turkey_Biomarkers_EN.pptx") })
  .then((f) => console.log("Written:", f, "| slides:", pageNo));
