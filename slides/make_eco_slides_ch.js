/**
 * 生态特征空间 vs 属丰度模型 —— 幻灯片（中文）。
 *   node slides/make_eco_slides_ch.js
 * 输出: slides/Ecological_Models_CH.pptx
 *
 * 内容依据 summary_ecological_models_CH.md，数字全部来自 results/ecological_*.json。
 * 英文版：make_eco_slides.js（两版逐页对应，数值必须一致）。
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
pres.title = "生态特征空间 vs 属丰度模型";

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

// ================================================================ 1 封面
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: SH - 0.9, w: SW, h: 0.9, fill: { color: DARK2 } });
  s.addText("生态特征空间 · AIV 菌群研究", { x: 1.0, y: 1.7, w: 11.3, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 14, bold: true, color: MOSS, charSpacing: 3 });
  s.addText("当菌不一样了，\n生态学还能迁移吗？", {
    x: 1.0, y: 2.3, w: 11.3, h: 2.0, margin: 0,
    fontFace: HEAD, fontSize: 40, bold: true, color: W, lineSpacingMultiple: 1.05 });
  s.addText("α 多样性、核心保留度与群落结构，对照属丰度模型",
    { x: 1.0, y: 4.4, w: 11.3, h: 0.45, margin: 0, fontFace: BODY, fontSize: 16, color: TEALL });
  s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 5.1, w: 3.6, h: 0.04, fill: { color: MOSS } });
  s.addText("326 个样本 · 4 个宿主 · 鸭训练的生态模型迁移到火鸡达 AUC 0.870", {
    x: 1.0, y: 5.3, w: 11.3, h: 0.5, margin: 0, fontFace: BODY, fontSize: 13.5, color: MOSS });
  s.addText("佐治亚大学 · 公共卫生学院", { x: 1.0, y: 6.72, w: 7, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 12, color: W });
  s.addText("summary_ecological_models_CH.md", { x: 5.5, y: 6.72, w: 6.8, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 11, color: TEALL, align: "right" });
}

// ================================================================ 2 执行摘要
{
  const s = slide("核心结论一览", "执行摘要");
  stat(s, { x: 0.6, y: 1.45, w: 3.0, value: "0.870", label: "核心保留度 鸭→火鸡", sub: "线性模型，p=0.0020" });
  stat(s, { x: 3.8, y: 1.45, w: 3.0, value: "0.500", label: "属丰度，同一检验", sub: "退化 —— 毫无区分力", color: CORAL });
  stat(s, { x: 7.0, y: 1.45, w: 3.0, value: "0.72", label: "笼 / 感染 比值", sub: "3 组对比 0 组显著", color: MOSS });
  stat(s, { x: 10.2, y: 1.45, w: 2.5, value: "0.94", label: "属丰度的同一比值", sub: "3 组全部显著", color: CORAL });

  card(s, { x: 0.6, y: 3.15, w: 6.0, h: 1.85, accent: MOSS, bodySize: 11.5,
    title: "站得住的结论",
    body: "感染个体保留的宿主特异基线核心菌群更少，两个宿主皆然。只用核心保留度训练的线性模型（源队列 260 只野鸭），把火鸡的感染与对照分开到 AUC 0.870；去深度混杂后为 0.904。属丰度模型在目标队列上则判别函数完全常数化。" });
  card(s, { x: 6.9, y: 3.15, w: 5.8, h: 1.85, accent: CORAL, fill: "FBEDE7", bodySize: 11.5,
    title: "站不住的结论", bodyColor: "7A2E14",
    body: "队列内属丰度仍然胜出，鸭队列差距不小（0.836 对 0.674）。α 多样性在任何一处都过不了置换零分布。15 个样本的天鹅队列不可解读 —— 那里光靠测序深度就能预测感染，AUC 达 0.870。" });

  caveat(s, { x: 0.6, y: 5.15, w: 12.1, h: 0.95, size: 11.5,
    text: "结论只覆盖一对队列的一个方向。火鸡→鸭为 0.549，去深度混杂后不成立；天鹅队列无法充当第三个宿主。这个结果值得报告，不在于数值大小，而在于它落在一个可解释的单一量上，且该量的方向在两个几乎无共享菌属的宿主间一致。" });
}

// ================================================================ 3 为什么问
{
  const s = slide("为什么要问这个问题", "研究动机");
  s.addText("本项目在分类学层面的发现，换一个宿主就不成立。这正是本轮分析要解决的问题。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED });

  table(s, [
    [th("鸭队列的九个候选菌属"), th("在火鸡队列中的命运")],
    ["9 个里的 8 个", { text: "根本没进候选池 —— 在火鸡中流行度不足 10%", options: warn }],
    [{ text: "Staphylococcus", options: { bold: true, italic: true } },
     { text: "通过了过滤，但方向相反且不显著（t=+0.97，FDR=0.53）", options: warn }],
  ], { y: 2.0, colW: [4.6, 7.5], rowH: 0.62, fontSize: 12 });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.4, accent: TEAL,
    title: "待检验的假设",
    body: "更宏观的生态学描述子，可能比单个菌属的身份更能在宿主间保持一致 —— 哪怕与感染相关的细菌完全不同。问题不是它们能否在队列内打败分类学模型，而是它们能否经受住跨宿主这一关。" });

  caveat(s, { x: 0.6, y: 5.1, w: 12.1, h: 1.25, size: 11.5,
    text: "有一个结构性理由支持这种预期：鸭的基线核心是 14 个属，火鸡是 32 个，两者几乎不重叠。绑定在具体菌属上的模型没有任何东西可以带过去；而绑定在「核心丢失了多大比例」上的模型，是在用不同的原料计算同一个量。" });
}

// ================================================================ 4 数据
{
  const s = slide("数据构成", "队列");
  table(s, [
    [th("宿主"), th("BioProject"), th("采样方式"), th("阴性"), th("阳性"), th("n"), th("基线核心")],
    [{ text: "鸭", options: hi }, "PRJNA464410", "野外监测",
     { text: "109", options: hi }, { text: "151", options: hi }, { text: "260", options: hi }, { text: "14 个属", options: hi }],
    [{ text: "火鸡", options: hi }, "PRJNA644054", "实验感染",
     { text: "13", options: hi }, { text: "32", options: hi }, { text: "45", options: hi }, { text: "32 个属", options: hi }],
    ["鸡", "PRJNA379944", "实验感染", "3", "3", "6", "24 个属"],
    [{ text: "大天鹅", options: warn }, "—", "野外监测",
     { text: "5", options: warn }, { text: "10", options: warn }, { text: "15", options: warn }, "31 个属"],
    [{ text: "合计", options: { bold: true } }, "", "", { text: "130", options: { bold: true } },
     { text: "196", options: { bold: true } }, { text: "326", options: { bold: true } }, ""],
  ], { y: 1.75, colW: [1.9, 2.4, 2.6, 1.2, 1.2, 1.2, 1.6], rowH: 0.46, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.75, w: 5.9, h: 1.6, accent: TEAL, titleSize: 14, bodySize: 11,
    title: "只有两个队列能建模",
    body: "鸭（n=260）与火鸡（n=45）。鸡只有 6 个样本，天鹅 15 个、其中阴性仅 5 个，两者都太小，无法单独建模。" });
  caveat(s, { x: 6.8, y: 4.75, w: 5.9, h: 1.6, size: 11,
    text: "两个可建模的队列相差的不只是宿主：野外监测对实验感染、不同实验室、不同建库方法。两者之间迁移失败，会把「宿主不同」与「整个研究不同」混在一起。" });
}

// ================================================================ 5 特征空间
{
  const s = slide("参与比较的特征空间", "方法");
  table(s, [
    [th("特征空间"), th("特征数"), th("含分类学细节？"), th("需折内拟合？")],
    ["α 多样性", "6", { text: "否", options: hi }, "无需拟合"],
    ["核心保留度", "7", { text: "否", options: hi }, "是 —— 用训练折阴性重定义"],
    [{ text: "纯生态（α + 核心）", options: { bold: true } }, { text: "13", options: { bold: true } },
     { text: "否", options: hi }, "是"],
    ["群落结构 —— Bray", "10 / 核", { text: "否", options: hi }, "PCoA 需要，核不需要"],
    [{ text: "群落结构 —— Aitchison", options: { italic: true } }, { text: "10 / 核", options: { italic: true } },
     { text: "含！", options: warn }, { text: "PCoA 需要", options: { italic: true } }],
    [{ text: "属丰度 CLR（参照）", options: { bold: true } },
     { text: "70 / 62", options: { bold: true } }, { text: "含", options: warn }, "是 —— PrevalenceCLR"],
  ], { y: 1.75, colW: [4.6, 2.0, 2.6, 2.9], rowH: 0.45, fontSize: 11.5 });

  caveat(s, { x: 0.6, y: 4.6, w: 12.1, h: 1.35,
    text: "Aitchison 距离是 CLR 空间里的欧氏距离 —— 与分类学模型用的是同一份属丰度数据，只是换了几何表示。任何建立其上的空间都携带完整的分类学信号，不是分类学的生态学替代品。表中保留它作对照，并始终标注。Bray-Curtis 才是诚实的群落结构对照。" });

  s.addText("队列内与混杂分析全程固定为 SVM-RBF，使变化的只有特征空间而非学习器。迁移相关章节改用线性模型，原因见第 16 页。", {
    x: 0.6, y: 6.1, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, italic: true });
}

// ================================================================ 6 泄漏处理
{
  const s = slide("逐个特征空间的泄漏处理", "方法 · 有效性");
  s.addText("每个特征空间的泄漏方式都不同。其中一条由协作者指出，另一条是本轮工作中发现的。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("步骤"), th("风险"), th("处理方式")],
    ["核心保留度", "核心用全部阴性定义 —— 测试样本参与定义了自己被比对的基准",
     { text: "折内重定义，只用该折阴性", options: hi }],
    ["PCoA", "cmdscale() 作用于完整 326×326 矩阵 —— 坐标轴编码了测试样本",
     { text: "训练折拟合，测试样本投影进去", options: hi }],
    ["距离核", "无 —— Bray-Curtis 是两两函数，CLR 逐样本计算",
     { text: "直接使用；核宽只取训练折", options: hi }],
    ["属丰度", "流行度过滤在全量数据上拟合",
     { text: "PrevalenceCLR 折内拟合", options: hi }],
  ], { y: 1.9, colW: [2.2, 5.9, 4.0], rowH: 0.5, fontSize: 11 });

  card(s, { x: 0.6, y: 4.7, w: 12.1, h: 1.5, accent: MOSS, titleSize: 14, bodySize: 11.5,
    title: "在信任任何数字之前先做的校准",
    body: "Python 版核心保留度与协作者的 R 输出在全部 7 列、326 个样本上完全一致。属丰度参照复现了既有结果：鸭 70 特征、AUC 0.836，对照文档记录的 0.835；火鸡 62 特征。笼效应对比复现 summary_Turkey_45_sample.md §4 到三位小数。" });
}

// ================================================================ 7 分节
divider("01", "队列内", "每个空间在单个队列内部检出感染的能力如何？");

// ================================================================ 8 队列内
{
  const s = slide("队列内性能", "结果 · 第 1 节");
  table(s, [
    [th("特征空间"), th("鸭（n=260）"), th("p"), th("火鸡（n=45）"), th("p")],
    ["α 多样性", "0.538", { text: "0.333", options: warn }, "0.748", { text: "0.070", options: warn }],
    ["核心保留度", "0.593", "0.050", "0.799", "0.010"],
    [{ text: "纯生态（α + 核心）", options: { bold: true } }, { text: "0.613", options: hi }, "0.010",
     { text: "0.807", options: hi }, "0.020"],
    ["纯生态 + Bray", "0.674", "0.005", "0.854", "0.005"],
    ["Bray 核", "0.695", "0.005", "0.850", "0.005"],
    [{ text: "Aitchison 核 —— 分类学", options: { italic: true } }, { text: "0.848", options: { italic: true } },
     { text: "0.005", options: { italic: true } }, { text: "0.970", options: { italic: true } }, { text: "0.005", options: { italic: true } }],
    [{ text: "属丰度", options: { bold: true } }, { text: "0.836", options: hi }, "0.005",
     { text: "0.972", options: hi }, "0.005"],
  ], { y: 1.75, colW: [4.4, 2.3, 1.6, 2.3, 1.5], rowH: 0.42, fontSize: 11.5 });

  card(s, { x: 0.6, y: 5.3, w: 5.9, h: 1.1, accent: CORAL, fill: "FBEDE7", titleSize: 14, bodySize: 11,
    title: "队列内属丰度胜出", bodyColor: "7A2E14",
    body: "鸭队列 0.836 对最佳纯生态空间的 0.674。火鸡队列差距收窄，但没有消失。" });
  card(s, { x: 6.8, y: 5.3, w: 5.9, h: 1.1, accent: TEAL, titleSize: 14, bodySize: 11,
    title: "α 多样性单独不可用",
    body: "两个队列都过不了自己的置换零分布（p=0.333 与 0.070）。只有与核心保留度合并后才达到显著。" });
}

// ================================================================ 9 Aitchison 警示
{
  const s = slide("上表里有一行不是结果", "结果 · 一处结构性警示");
  stat(s, { x: 1.4, y: 1.7, w: 3.6, value: "0.848", label: "Aitchison 核，鸭队列", sub: "所谓「群落结构」" });
  stat(s, { x: 5.4, y: 1.7, w: 3.6, value: "0.836", label: "属丰度，鸭队列", sub: "分类学模型" });
  stat(s, { x: 9.4, y: 1.7, w: 2.6, value: "≈", label: "火鸡队列亦然", sub: "0.970 对 0.972", color: MUTED, valueSize: 44 });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.5, accent: CORAL, fill: "FBEDE7",
    title: "这种几乎相等近乎恒真", bodyColor: "7A2E14",
    body: "Aitchison 距离的定义就是 CLR 变换后丰度向量之间的欧氏距离。它就是属丰度矩阵换一种表达。从这一行得出「群落结构不输分类学」，等于在报告一个量等于它自己。" });

  card(s, { x: 0.6, y: 5.15, w: 12.1, h: 1.2, accent: MOSS,
    title: "诚实的对照应该长什么样",
    body: "Bray-Curtis 是真正的群落结构度量，不是 CLR 丰度的换写：鸭 0.695、火鸡 0.850 —— 明显低于属丰度。本 deck 中所有基于 Aitchison 的行都用斜体并标注「分类学」，原因即在此。" });
}

// ================================================================ 10 分节
divider("02", "混杂", "在解读任何结果之前必须先排除的两件事");

// ================================================================ 11 深度
{
  const s = slide("测序深度，以及它让天鹅队列付出的代价", "混杂 · 深度");
  s.addText("计数未做抽平，而丰富度指标天然随深度上升。深度必须先查。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("深度 → 感染状态"), th("AUC")],
    ["鸭", "0.650"],
    ["火鸡", "0.560"],
    [{ text: "天鹅（n=15）", options: warn }, { text: "0.870", options: warn }],
  ], { x: 0.6, y: 1.9, w: 4.6, colW: [3.0, 1.6], rowH: 0.44, fontSize: 11.5 });

  table(s, [
    [th("天鹅队列的特征"), th("单独 AUC"), th("与深度 |r|")],
    ["TotalTaxaPresent", "1.000", { text: "0.772", options: warn }],
    ["Observed_Genera", "1.000", { text: "0.618", options: warn }],
    ["Shannon_Genus", "1.000", { text: "0.713", options: warn }],
    [{ text: "CoreAbundanceRetention", options: { bold: true } }, { text: "0.560", options: hi },
     { text: "0.007", options: hi }],
  ], { x: 5.8, y: 1.9, w: 6.9, colW: [3.1, 1.9, 1.9], rowH: 0.44, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.15, w: 12.1, h: 1.15, accent: MOSS, titleSize: 14, bodySize: 11.5,
    title: "最后一行是内部对照",
    body: "CoreAbundanceRetention 是唯一与深度基本无关的核心指标 —— 它也正是天鹅队列里唯一没有信号的那个。凡在那里看起来很强的特征，都是追踪深度的特征。" });

  caveat(s, { x: 0.6, y: 5.45, w: 12.1, h: 0.95, size: 11.5,
    text: "天鹅队列的任何结果都不可解读，已从全部结论中剔除。去深度混杂的重跑印证了这一诊断：火鸡→天鹅的迁移从 AUC 1.000 掉到 0.600（p 由 0.005 变为 0.259）—— 深度假象就该这样表现。" });
}

// ================================================================ 12 笼效应
{
  const s = slide("生态特征受笼效应污染小得多", "混杂 · 笼效应");
  s.addText("火鸡队列里隔离器与感染状态完全共线。纯笼效应固定毒株、批次与感染状态，只变隔离器 —— 8 只鸟共享垫料、饮水与饲料。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("特征空间"), th("纯笼"), th("感染"), th("笼 / 感染"), th("笼对比显著数")],
    ["α 多样性", "0.502", "0.746", { text: "0.67", options: hi }, { text: "0 / 3", options: hi }],
    [{ text: "纯生态（α + 核心）", options: { bold: true } }, "0.563", "0.784",
     { text: "0.72", options: hi }, { text: "0 / 3", options: hi }],
    ["核心保留度", "0.602", "0.780", { text: "0.77", options: hi }, { text: "0 / 3", options: hi }],
    [{ text: "PCoA（Aitchison）—— 分类学", options: { italic: true } }, { text: "0.935", options: { italic: true } },
     { text: "0.976", options: { italic: true } }, { text: "0.96", options: warn }, { text: "3 / 3", options: warn }],
    [{ text: "属丰度", options: { bold: true } }, { text: "0.908", options: warn },
     "0.967", { text: "0.94", options: warn }, { text: "3 / 3", options: warn }],
  ], { y: 1.95, colW: [4.2, 1.9, 1.9, 2.2, 1.9], rowH: 0.47, fontSize: 11.5 });

  card(s, { x: 0.6, y: 5.05, w: 5.9, h: 1.3, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "生态空间看得见感染，看不见笼号",
    body: "纯生态的三组笼对比 p = 0.40、0.25、0.55，无一显著；而感染效应达到 0.784（p=0.0100）。" });
  caveat(s, { x: 6.8, y: 5.05, w: 5.9, h: 1.3, size: 11,
    text: "比值只在分子是真信号时才可读。α 多样性的 0.67 全场最好看，但 α 在两个队列里都没有感染信号 —— 建立在噪声上的比值毫无意义。" });
}

// ================================================================ 13 分节
divider("03", "跨宿主", "在一个宿主上训练，去预测另一个 —— 这正是最初的问题");

// ================================================================ 14 迁移总表
{
  const s = slide("跨宿主迁移", "结果 · 第 4 节");
  s.addText("整个源队列训练，整个目标队列测试。目标数据一丁点不参与训练，连标准化的均值方差都来自源队列。每个 AUC 都配有打乱目标标签得到的置换零分布。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED });

  table(s, [
    [th("源 → 目标（SVM-RBF）"), th("α 多样性"), th("核心保留度"), th("纯生态"), th("属丰度")],
    [{ text: "鸭 → 火鸡", options: { bold: true } }, "0.375", "0.469",
     { text: "0.800  p=0.0050", options: hi }, { text: "0.500  退化", options: warn }],
    ["火鸡 → 鸭", "0.503", "0.579", "0.549", { text: "0.500  退化", options: warn }],
    [{ text: "鸭 → 天鹅", options: { color: MUTED } }, { text: "0.400", options: { color: MUTED } },
     { text: "0.900", options: { color: MUTED } }, { text: "0.500", options: { color: MUTED } },
     { text: "0.500", options: { color: MUTED } }],
    [{ text: "火鸡 → 天鹅", options: { color: MUTED } }, { text: "1.000", options: { color: MUTED } },
     { text: "0.980", options: { color: MUTED } }, { text: "1.000", options: { color: MUTED } },
     { text: "0.220", options: { color: MUTED } }],
  ], { y: 1.95, colW: [3.3, 2.1, 2.2, 2.4, 2.1], rowH: 0.5, fontSize: 11.5 });

  caveat(s, { x: 0.6, y: 4.7, w: 5.9, h: 0.9, size: 11,
    text: "天鹅两行已置灰 —— 深度假象（第 11 页），去深度混杂后全部崩塌。" });
  card(s, { x: 6.8, y: 4.7, w: 5.9, h: 0.9, accent: CORAL, fill: "FBEDE7", titleSize: 13, bodySize: 10.5,
    title: "「退化」不等于「随机」", bodyColor: "7A2E14",
    body: "属丰度模型给所有目标样本同一个分数。这里的 AUC 0.500 意思是毫无区分力。" });

  s.addText("本表为 SVM-RBF，以与前面各节协议一致。它低估了这些特征真正的迁移能力 —— 见第 16 页。", {
    x: 0.6, y: 5.8, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, italic: true });
}

// ================================================================ 15 鸭→火鸡
{
  const s = slide("唯一成立的那个方向", "结果 · 鸭 → 火鸡");
  stat(s, { x: 0.9, y: 1.6, w: 3.4, value: "0.800", label: "纯生态，RBF", sub: "噪声上限 0.740" });
  stat(s, { x: 4.9, y: 1.6, w: 3.4, value: "0.803", label: "去深度混杂后", sub: "噪声上限 0.757", color: MOSS });
  stat(s, { x: 8.9, y: 1.6, w: 3.4, value: "p = 0.0050", label: "两种口径的置换 p", sub: "去混杂后不变", valueSize: 32, color: MOSS });

  card(s, { x: 0.6, y: 3.4, w: 12.1, h: 1.3, accent: MOSS,
    title: "一个在 260 只野鸭上训练的模型，把火鸡的感染与对照分开",
    body: "只用了 α 多样性与核心保留度 —— 13 个特征，不含任何分类学信息。这是本项目里第一个以非退化方式越过自身噪声上限的跨宿主迁移，且去深度混杂后原封不动。" });

  caveat(s, { x: 0.6, y: 4.9, w: 12.1, h: 1.45,
    text: "三条边界，先讲清楚。（1）迁移是不对称的：火鸡→鸭为 0.549，去深度混杂后 0.523 —— 无信号。用 45 个样本预测 260 个本就是更难的方向。（2）一对队列的一个方向；天鹅队列无法充当重复验证。（3）火鸡的感染状态与隔离器完全共线，所以这个 0.800 是对着一个与笼分不开的标签测出来的 —— 第 12 页缓解了这一点，但没有消除。" });
}

// ================================================================ 16 线性 vs RBF
{
  const s = slide("真正卡住迁移的是什么", "拆解 · 第 5.1 节");
  s.addText("把每个迁移改用 L2 逻辑回归重跑一遍，整幅图景就变了。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("特征集"), th("SVM-RBF"), th("线性"), th("线性 + 去深度")],
    ["全部 13", "0.800", "0.834", "0.856"],
    ["仅 α 多样性", "0.375", "0.714", "0.716"],
    [{ text: "仅核心保留度", options: { bold: true } }, { text: "0.469", options: warn },
     { text: "0.870", options: hi }, { text: "0.904", options: hi }],
    ["计数型子集（6）", "0.591", "0.856", "—"],
  ], { y: 1.9, colW: [4.0, 2.7, 2.7, 2.7], rowH: 0.48, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.2, w: 12.1, h: 1.25, accent: TEAL,
    title: "为什么核函数才是障碍",
    body: "RBF 核度量的是标准化特征空间里的欧氏距离，而标准化是在鸭队列上拟合的。火鸡的取值离鸭的中心很远，于是核函数饱和，每个目标样本看起来都一样远。线性边界只要求效应的方向在两个宿主间一致，不要求位置一致 —— 这恰恰是跨宿主迁移需要的性质。" });

  caveat(s, { x: 0.6, y: 5.65, w: 12.1, h: 0.75, size: 11.5,
    text: "这一条修正了前面的读法。它不是多样性与核心保留度之间的交互作用 —— 核心保留度自己就承载了整个迁移，加上 α 多样性反而更差（0.870 → 0.834）。" });
}

// ================================================================ 17 机制
{
  const s = slide("机制，一句话说完", "拆解 · 第 5.2 节");
  table(s, [
    [th("特征"), th("鸭 AUC"), th("火鸡 AUC"), th("方向是否一致")],
    [{ text: "CoreRetentionProportion", options: { bold: true } }, { text: "0.397", options: hi },
     { text: "0.154", options: hi }, { text: "一致 —— 感染组更低", options: hi }],
    [{ text: "CoreTaxaLost", options: { bold: true } }, { text: "0.603", options: hi },
     { text: "0.846", options: hi }, { text: "一致 —— 感染组更高", options: hi }],
    ["CoreTaxaPresent", "0.397", "0.154", "一致"],
    ["Observed_Genera", "0.491", "0.293", "一致"],
    [{ text: "Simpson / InvSimpson", options: { color: MUTED } }, { text: "0.507", options: { color: MUTED } },
     { text: "0.214", options: { color: MUTED } }, { text: "不一致", options: { color: MUTED } }],
  ], { y: 1.75, colW: [3.8, 2.4, 2.4, 3.5], rowH: 0.46, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.6, w: 12.1, h: 1.35, accent: MOSS,
    title: "感染个体丢失了更大比例的宿主特异基线核心",
    body: "构成这个核心的具体菌属在两个宿主间完全不同 —— 鸭 14 个、火鸡 32 个，几乎不重叠 —— 但「丢失的比例」在两边表现一致。这正是分类学模型迁移不了、而这个模型能迁移的原因。13 个特征中有 9 个在两个宿主里方向一致。" });

  s.addText("最强的两个特征其实是同一件事的正反两面：核心还剩多少，以及丢了几个核心菌。", {
    x: 0.6, y: 6.1, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 11.5, color: MUTED, italic: true });
}

// ================================================================ 18 选择偏倚
{
  const s = slide("两次搜索都经受住了自身的选择偏倚", "拆解 · 第 5.2 节");
  s.addText("在 13 个单特征与 78 个特征对里搜索并报告最大值，正是本项目记录过的 best-of-N 问题。因此零分布必须取整轮搜索的最大值。", {
    x: 0.6, y: 1.4, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("搜索范围"), th("找到的最优"), th("取最大值的零分布"), th("校正后 p")],
    [{ text: "13 个单特征", options: { bold: true } },
     { text: "0.846  CoreRetentionProportion", options: hi }, "0.623 ± 0.055（max 0.867）",
     { text: "0.0040", options: hi }],
    [{ text: "78 个特征对", options: { bold: true } },
     { text: "0.862  Observed_Genera + CoreRetentionProportion", options: hi }, "0.695 ± 0.051（max 0.849）",
     { text: "0.0033", options: hi }],
  ], { y: 2.0, colW: [2.8, 4.6, 3.0, 1.7], rowH: 0.62, fontSize: 11 });

  card(s, { x: 0.6, y: 4.1, w: 5.9, h: 1.25, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "一个特征就够",
    body: "CoreRetentionProportion 单独迁移到 0.846 —— 一个可以写进摘要的量，而非说不清的特征组合。" });
  caveat(s, { x: 6.8, y: 4.1, w: 5.9, h: 1.25, size: 11,
    text: "它是看过排名之后才挑出来的，所以裸 p 值会偏乐观。用「13 个取最大」的零分布来判，仍然成立，p=0.0040。" });

  card(s, { x: 0.6, y: 5.5, w: 12.1, h: 0.95, accent: CORAL, fill: "FBEDE7", titleSize: 13.5, bodySize: 11,
    title: "有一条预注册假设没有得到支持", bodyColor: "7A2E14",
    body: "原本预测只有无量纲特征能迁移，理由是两个宿主的核心大小不同。但线性模型下计数型子集迁移到 0.856。量纲问题确实存在，只是它存在于核函数里，不在特征里。" });
}

// ================================================================ 19 全合并
{
  const s = slide("全部合并会不会更好？不会", "第 6 节");
  table(s, [
    [th("特征空间"), th("鸭"), th("火鸡"), th("鸭 → 火鸡 迁移"), th("笼 / 感染")],
    [{ text: "属丰度", options: { bold: true } }, { text: "0.836", options: hi },
     { text: "0.972", options: hi }, { text: "0.500  退化", options: warn }, { text: "0.94", options: warn }],
    [{ text: "纯生态（α + 核心）", options: { bold: true } }, "0.613", "0.807",
     { text: "0.800  p=0.0050", options: hi }, { text: "0.72", options: hi }],
    [{ text: "属丰度 + α + 核心", options: { bold: true } }, "0.832", "0.960",
     { text: "0.490  p=0.522", options: warn }, { text: "0.95", options: warn }],
    ["属丰度 + α + 核心 + Bray", "0.831", "0.979", "—", "0.84"],
  ], { y: 1.75, colW: [4.0, 1.8, 1.8, 2.7, 1.8], rowH: 0.5, fontSize: 11.5 });

  card(s, { x: 0.6, y: 4.45, w: 5.9, h: 1.3, accent: TEAL, titleSize: 14, bodySize: 11,
    title: "队列内没有增益",
    body: "所有差异都小于重复间标准差（0.012–0.025）。生态特征是从同一张丰度表算出来的汇总统计量 —— 一个已经拿到全部 70 维丰度的模型，从它们身上得不到新东西。" });
  caveat(s, { x: 6.8, y: 4.45, w: 5.9, h: 1.3, size: 11,
    text: "而两个好性质都丢了。把属丰度加回来，迁移从 0.800 掉到 0.490，且合并模型追踪隔离器的能力与属丰度单独完全一样。用干净特征稀释受污染的特征块，并不能去污。" });

  s.addText("两种特征空间回答的是不同的问题。合并得到的模型，对第一个问题没有改善，对第二个问题完全失效。", {
    x: 0.6, y: 5.95, w: 12.1, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: INK });
}

// ================================================================ 20 结论
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addText("用哪个模型，以及还剩什么", { x: 1.0, y: 0.75, w: 11.3, h: 0.7, margin: 0,
    fontFace: HEAD, fontSize: 30, bold: true, color: W });

  const rows = [
    ["这个队列里能多准地检出感染？", "属丰度", "鸭 0.836 · 火鸡 0.972", TEALL],
    ["这个规律在别的宿主里还成立吗？", "核心保留度 + 线性模型", "0.870，p=0.0020", MOSS],
  ];
  rows.forEach((r, i) => {
    const y = 1.6 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 11.3, h: 0.8, fill: { color: DARK2 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 0.075, h: 0.8, fill: { color: r[3] } });
    s.addText(r[0], { x: 1.35, y: y + 0.1, w: 5.6, h: 0.6, margin: 0,
      fontFace: BODY, fontSize: 12.5, color: W, valign: "middle" });
    s.addText(r[1], { x: 7.1, y: y + 0.1, w: 3.4, h: 0.6, margin: 0,
      fontFace: HEAD, fontSize: 13.5, bold: true, color: r[3], valign: "middle" });
    s.addText(r[2], { x: 10.5, y: y + 0.1, w: 1.7, h: 0.6, margin: 0,
      fontFace: BODY, fontSize: 11, color: MOSS, valign: "middle", align: "right" });
  });

  s.addText("三条使用规则", { x: 1.0, y: 3.65, w: 11.3, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: W });
  const rules = [
    "配线性模型，不要用 RBF —— 同一份特征迁移 0.469 对 0.870",
    "不要加 α 多样性 —— 它在这份数据里没通过任何一项检验",
    "不要与属丰度合并 —— 迁移掉到 0.490，笼效应比值回到 0.95",
  ];
  rules.forEach((t, i) => {
    s.addText("•  " + t, { x: 1.35, y: 4.05 + i * 0.32, w: 11.0, h: 0.3, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: TEALL });
  });

  s.addText("还剩什么", { x: 1.0, y: 5.15, w: 11.3, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 15, bold: true, color: W });
  const next = [
    "在第三个宿主上复现鸭→火鸡 —— 天鹅队列不能胜任",
    "用两队列特征交集，给属丰度模型一个非退化的迁移基线",
    "做抽平或显式建模深度 —— 鸭队列的深度已达 AUC 0.650",
  ];
  next.forEach((t, i) => {
    s.addText("•  " + t, { x: 1.35, y: 5.55 + i * 0.32, w: 11.0, h: 0.3, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: MOSS });
  });

  s.addText("完整结果见 summary_ecological_models_CH.md ｜ 复现：ecological_models.py、ecological_transfer_anatomy.py、ecological_cage_check.py", {
    x: 1.0, y: 6.9, w: 11.3, h: 0.35, margin: 0, fontFace: BODY, fontSize: 10.5, color: TEALL });
}

pres.writeFile({ fileName: path.join(__dirname, "Ecological_Models_CH.pptx") })
  .then((f) => console.log("已生成:", f, "| 页数:", pageNo));
