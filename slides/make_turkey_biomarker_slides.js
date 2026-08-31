/**
 * 火鸡队列 biomarker：与鸭队列同口径的三方法交集（中文）。
 *   node slides/make_turkey_biomarker_slides.js
 * 输出: slides/Turkey_Biomarkers_CH.pptx
 *
 * 内容依据 summary_Turkey_45_sample.md §2.5，数字全部来自
 * results/turkey_biomarkers_3method.json 与 turkey_l1_scan.csv。
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

// ---------------------------------------------------------------- palette
// 与项目其它 deck 同一套配色。
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

const HEAD = "微软雅黑";
const BODY = "微软雅黑";
const SW = 13.333, SH = 7.5;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Sihua Peng";
pres.company = "University of Georgia, College of Public Health";
pres.title = "火鸡队列 biomarker：三方法交集";

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

// ================================================================ 1 协议与结果
{
  const s = slide("火鸡队列的 biomarker", "PRJNA644054 · n=45（阴性 13 / 阳性 32）");
  s.addText("四层筛查。前三层与鸭队列（README §6.2）完全相同，因此两队列可比；第四层是本队列特有的——野鸭没有笼，无从施加。", {
    x: 0.6, y: 1.38, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("层"), th("方法"), th("检验什么"), th("62 个特征中命中")],
    ["①", "差异丰度（CLR + Welch t + BH-FDR）", "两组间差异是否真实", "19"],
    ["②", "Permutation importance（折内 3×5 折）", "对模型是否有贡献", "24"],
    [{ text: "③", options: { bold: true } }, "L1 稳定性选择（200 次 bootstrap）",
     "稀疏模型是否可重复地选中", { text: "4", options: warn }],
    [{ text: "④", options: { bold: true } }, { text: "笼效应筛查（本队列特有）", options: hi },
     { text: "能否归因于感染，而非同笼环境", options: hi }, { text: "4 个中 2 个通过", options: hi }],
  ], { y: 1.80, colW: [0.8, 4.6, 4.5, 2.2], rowH: 0.40, fontSize: 11 });

  table(s, [
    [th("Genus"), th("Family"), th("重要性"), th("L1 频率"), th("方向"), th("t"), th("FDR"), th("第 ④ 层")],
    [{ text: "Negativibacillus", options: { italic: true } }, "Ruminococcaceae", "0.0133", "0.865",
     { text: "Pos↑", options: warn }, "+5.87", "3.8e-05", { text: "未通过", options: warn }],
    [{ text: "HT002", options: { bold: true, italic: true } }, "Lactobacillaceae", "0.0130", "0.935",
     { text: "Pos↓", options: hi }, "−3.89", "5.7e-03", { text: "通过", options: hi }],
    [{ text: "Tissierella", options: { italic: true } }, "Family_XI", "0.0079", "0.885",
     { text: "Pos↑", options: warn }, "+4.82", "3.8e-04", { text: "未通过", options: warn }],
    [{ text: "Escherichia-Shigella", options: { bold: true, italic: true } }, "Enterobacteriaceae", "0.0015", "1.000",
     { text: "Pos↑", options: hi }, "+5.64", "3.8e-04", { text: "通过", options: hi }],
  ], { y: 4.00, colW: [2.6, 2.3, 1.3, 1.3, 1.1, 1.1, 1.3, 1.1], rowH: 0.42, fontSize: 11 });

  s.addText("可报告的是 2 个：HT002（Lactobacillaceae，感染组降低）与 Escherichia-Shigella（Enterobacteriaceae，感染组升高）—— 共生乳酸菌减少、机会致病菌扩张，典型的菌群失调。", {
    x: 0.6, y: 6.25, w: 12.1, h: 0.45, margin: 0, fontFace: HEAD, fontSize: 12.5, bold: true, color: INK });

  s.addText("L1 惩罚强度不可跨队列照搬：鸭队列的 C=0.1 在 n=45 下会把全部系数归零，故 C 作为敏感性轴处理（0.2 / 1.0 / 10.0 各 200 次 bootstrap，三者取交集）。", {
    x: 0.6, y: 6.78, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED, italic: true });
}

// ================================================================ 2 归因与跨宿主
{
  const s = slide("为什么第 ④ 层不能省，以及与鸭队列的比较", "归因 · 跨宿主");

  card(s, { x: 0.6, y: 1.4, w: 12.1, h: 1.35, accent: CORAL, fill: "FBEDE7", bodySize: 11.5,
    title: "统计上最强的那个，恰恰无法归因", bodyColor: "7A2E14",
    body: "Negativibacillus 在前三层下全场最强 —— permutation importance 最高（0.0133）、t=+5.87、L1 在三个 C 下都稳定入选。但它在同为阳性的四个隔离器之间也显著不同，因此无法区分它反映的是感染还是同笼环境。Tissierella 同理。\n省掉第 ④ 层，进论文的就是 4 个而非 2 个，其中一半说不清。" });

  s.addText("与鸭队列的比较（前三层同口径，因此可比）", { x: 0.6, y: 3.0, w: 12.1, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: INK });
  s.addText("重建鸭队列的三方法交集得到 9 个，与 README §6.2 记录一致 —— 验证重建方法正确后才作比较。", {
    x: 0.6, y: 3.38, w: 12.1, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED });

  table(s, [
    [th("层级"), th("重叠"), th("说明")],
    ["属", { text: "无", options: warn }, "鸭 9 菌与火鸡 4 菌在属这一级没有任何交集"],
    [{ text: "科", options: { bold: true } }, { text: "Ruminococcaceae", options: hi },
     { text: "鸭（未定属）Pos↑　｜　火鸡 Negativibacillus Pos↑　—— 方向一致", options: hi }],
  ], { y: 3.78, colW: [1.6, 3.2, 7.3], rowH: 0.52, fontSize: 11.5 });

  caveat(s, { x: 0.6, y: 5.45, w: 12.1, h: 1.0, size: 11,
    text: "这是本项目第一次出现分类学层面的跨宿主一致性 —— 此前 §3 的结论是「鸭队列九菌中只有 Staphylococcus 进入火鸡候选池，且方向相反、不显著」。但火鸡这一侧正是上面那个 Negativibacillus，受毒株或批次污染，因此这条一致性不能归因于感染，只能作为线索。" });

  s.addText("结论：火鸡有 2 个可报告的 biomarker。跨宿主一致性目前仅存在于科这一级，且带混杂 —— 下一步应在第三个队列验证 Ruminococcaceae 与 Escherichia-Shigella。", {
    x: 0.6, y: 6.6, w: 12.1, h: 0.45, margin: 0, fontFace: HEAD, fontSize: 12.5, bold: true, color: INK });
}

pres.writeFile({ fileName: path.join(__dirname, "Turkey_Biomarkers_CH.pptx") })
  .then((f) => console.log("已生成:", f, "| 页数:", pageNo));
