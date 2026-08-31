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

// ================================================================ 1 为什么重做
{
  const s = slide("火鸡的 biomarker 为什么要重做一遍", "方法 · 口径对齐");
  s.addText("火鸡队列此前已给出候选菌，但用的方法与鸭队列不同，两者因此不可直接比较。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th(""), th("鸭队列（README §6.2）"), th("火鸡（原 §2.1–2.4）")],
    ["①", "差异丰度 CLR + Welch t + BH-FDR", "差异丰度 CLR + Welch t + BH-FDR"],
    ["②", "SVM permutation importance", "SVM permutation importance"],
    [{ text: "③", options: { bold: true } },
     { text: "L1 稳定性选择", options: warn },
     { text: "笼效应筛查（本队列特有）", options: hi }],
    [{ text: "结果", options: { bold: true } }, { text: "9 个 biomarker", options: { bold: true } },
     { text: "7 个候选（§2.3）", options: { bold: true } }],
  ], { y: 1.9, colW: [1.0, 5.6, 5.5], rowH: 0.5, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.5, w: 12.1, h: 0.95, accent: CORAL, fill: "FBEDE7", titleSize: 14, bodySize: 11.5,
    title: "缺的是第 ③ 套：L1 稳定性选择", bodyColor: "7A2E14",
    body: "两个队列各自少了对方的第三套方法。补上 L1 之后才谈得上比较；笼效应筛查则保留为第四层叠加——那是鸭队列做不到的检验，不应为了对齐而丢掉。" });

  caveat(s, { x: 0.6, y: 5.6, w: 12.1, h: 0.85, size: 11.5,
    text: "口径不一致这件事此前没有被记录。文档里两组数字（9 与 7）看起来可比，实际上不是同一套流程的产物——这正是本次重做要修正的。" });
}

// ================================================================ 2 L1 的取值问题
{
  const s = slide("L1 惩罚强度不能照搬，故作为敏感性轴", "方法 · 关键取舍");
  s.addText("鸭队列用 C=0.1（18/70 特征）。火鸡 n=45、62 特征，两种「对齐鸭队列」的方式互相矛盾。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("C"), th("非零系数"), th("占 62 个特征"), th("CV-AUC"), th("说明")],
    ["0.05", { text: "0", options: warn }, "0%", { text: "0.500", options: warn }, "惩罚过强，全部归零"],
    [{ text: "0.20", options: hi }, "7", "11%", "0.934", { text: "对齐鸭队列的准则：损失约 0.03 AUC", options: hi }],
    [{ text: "1.00", options: hi }, "10", "16%", "0.971", { text: "居中", options: hi }],
    [{ text: "10.00", options: hi }, "15", "24%", "0.971", { text: "对齐鸭队列的稀疏度比例（≈1/4）", options: hi }],
    ["50.00", "18", "29%", "0.977", "惩罚几乎不起作用"],
  ], { y: 1.9, colW: [1.4, 1.8, 2.0, 1.6, 5.3], rowH: 0.46, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.85, w: 5.9, h: 1.5, accent: CORAL, fill: "FBEDE7", titleSize: 14, bodySize: 11,
    title: "两种对齐方式给出不同答案", bodyColor: "7A2E14",
    body: "对齐稀疏度比例要 C≈10，此时惩罚几乎不起作用；对齐鸭队列实际用的准则则是 C≈0.2，只剩 7 个非零系数。没有唯一正确取法。" });
  card(s, { x: 6.8, y: 4.85, w: 5.9, h: 1.5, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "解法：把 C 当敏感性轴",
    body: "0.2 / 1.0 / 10.0 各跑 200 次 bootstrap，只有在三个 C 下都达到选中频率 ≥70% 的特征才算 L1 命中（分别命中 4 / 8 / 9，取交集）。结论因此不依赖这个任意选择。" });
}

// ================================================================ 3 结果
{
  const s = slide("结果：4 个通过三方法，其中 2 个通过笼效应筛查", "结果");
  s.addText("三套方法各自的命中数：差异丰度 19、permutation importance 24、L1（三个 C 均达标）4。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Genus"), th("Family"), th("重要性"), th("L1 频率（最低）"), th("方向"), th("FDR"), th("笼效应筛查")],
    [{ text: "Negativibacillus", options: { italic: true } }, "Ruminococcaceae", "0.0133", "0.865",
     { text: "Pos↑", options: warn }, "3.8e-05", { text: "受污染", options: warn }],
    [{ text: "HT002", options: { bold: true, italic: true } }, "Lactobacillaceae", "0.0130", "0.935",
     { text: "Pos↓", options: hi }, "5.7e-03", { text: "通过", options: hi }],
    [{ text: "Tissierella", options: { italic: true } }, "Family_XI", "0.0079", "0.885",
     { text: "Pos↑", options: warn }, "3.8e-04", { text: "受污染", options: warn }],
    [{ text: "Escherichia-Shigella", options: { bold: true, italic: true } }, "Enterobacteriaceae", "0.0015", "1.000",
     { text: "Pos↑", options: hi }, "3.8e-04", { text: "通过", options: hi }],
  ], { y: 1.9, colW: [2.9, 2.4, 1.3, 1.9, 1.1, 1.2, 1.3], rowH: 0.5, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.4, w: 5.9, h: 1.45, accent: TEAL, titleSize: 14, bodySize: 11,
    title: "L1 是最严的一关",
    body: "19 个菌达到 FDR<0.05，经 L1 只剩 4 个。鸭队列也是如此——L1 正是把 19 收敛到 9 的那一步。" });
  card(s, { x: 6.8, y: 4.4, w: 5.9, h: 1.45, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "与 §2.3 那 7 个的关系",
    body: "这 4 个是那 7 个的更严子集。加上 L1 后，Pediococcus、未定属 Lactobacillaceae、Incertae_Sedis、Weissella 未能在三个 C 下都稳定入选。" });

  s.addText("与鸭队列比较时用这 4 个；列本队列全部候选时用 §2.3 的 7 个 —— 两者都对，只是严格程度不同。", {
    x: 0.6, y: 6.0, w: 12.1, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 13, bold: true, color: INK });
}

// ================================================================ 4 跨宿主 + 结论
{
  const s = slide("跨宿主比较，以及这次能与不能说什么", "结论");
  s.addText("先重建鸭队列的三方法交集，得到正好 9 个、与 README §6.2 吻合 —— 验证重建方法正确后才作比较。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("比较层级"), th("重叠"), th("说明")],
    ["属", { text: "无", options: warn }, "鸭 9 菌与火鸡 4 菌在属这一级没有任何交集"],
    [{ text: "科", options: { bold: true } }, { text: "Ruminococcaceae", options: hi },
     { text: "鸭（未定属）Pos↑　｜　火鸡 Negativibacillus Pos↑　—— 方向一致", options: hi }],
  ], { y: 1.9, colW: [1.8, 3.2, 7.1], rowH: 0.58, fontSize: 11.5 });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.0, accent: MOSS, titleSize: 14, bodySize: 11.5,
    title: "这是本项目第一次出现分类学层面的跨宿主一致性",
    body: "此前 §3 的结论是「鸭队列九菌中只有 Staphylococcus 进入火鸡候选池，且方向相反、不显著」。放宽到科这一级后，Ruminococcaceae 在两个宿主中同向升高。" });

  caveat(s, { x: 0.6, y: 4.7, w: 12.1, h: 1.05, size: 11.5,
    text: "但火鸡这一侧的 Negativibacillus 正是 §2.4 那个最强反例 —— 它在同为阳性的四个隔离器之间也显著不同，§4.5 进一步显示污染源是毒株或批次。因此这条科层面的一致性不能归因于感染，只能作为线索。" });

  s.addText("结论：火鸡有 biomarker，但只有 2 个同时通过三方法与笼效应筛查；跨宿主一致性目前仅存在于科这一级，且带混杂。下一步应在第三个队列验证 Ruminococcaceae 与 Escherichia-Shigella。", {
    x: 0.6, y: 5.95, w: 12.1, h: 0.5, margin: 0, fontFace: HEAD, fontSize: 12.5, bold: true, color: INK });
}

pres.writeFile({ fileName: path.join(__dirname, "Turkey_Biomarkers_CH.pptx") })
  .then((f) => console.log("已生成:", f, "| 页数:", pageNo));
