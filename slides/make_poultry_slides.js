/**
 * 家禽队列结果幻灯片（中文）。
 *   node slides/make_poultry_slides.js
 * 输出: slides/Poultry_Cohort_Results_ZH.pptx
 *
 * 内容：PRJNA644054（火鸡 45）单独建模，与其并入 PRJNA379944（鸡 6）后的对照，
 * 以及火鸡队列内部的混杂结构（隔离器 / 提取批次 / 纯笼效应）与驱动预测的菌。
 * 所有数字取自 results/poultry_cohort.json、turkey_confounding_biomarkers.json、
 * turkey_strain_cage.json，与 summary_Chicken_51_sample.md、summary_Turkey_45_sample.md 一致。
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

// ---------------------------------------------------------------- palette
// 与主 deck 同一套：深青水体、苔绿、暖沙；珊瑚色只用于警示。
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
pres.title = "家禽队列结果：火鸡单独 vs 火鸡+鸡合并";

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
    fontFace: HEAD, fontSize: 30, bold: true, color: INK });
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
    fontFace: HEAD, fontSize: 38, bold: true, color: W });
  s.addText(subtitle, { x: 3.15, y: 3.45, w: 9.0, h: 0.9, margin: 0,
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

// ================================================================ 1 标题
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: SH - 0.9, w: SW, h: 0.9, fill: { color: DARK2 } });
  s.addText("家禽队列 · SVM-RBF 建模", { x: 1.0, y: 1.75, w: 11.3, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 15, bold: true, color: MOSS, charSpacing: 3 });
  s.addText("火鸡单独，还是\n火鸡与鸡合并？", { x: 1.0, y: 2.35, w: 11.3, h: 1.9, margin: 0,
    fontFace: HEAD, fontSize: 44, bold: true, color: W, lineSpacingMultiple: 1.05 });
  s.addText("PRJNA644054（火鸡 45）与 PRJNA379944（鸡 6）的对照分析", {
    x: 1.0, y: 4.35, w: 11.3, h: 0.45, margin: 0, fontFace: BODY, fontSize: 17, color: TEALL });
  s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 5.05, w: 3.6, h: 0.04, fill: { color: MOSS } });
  s.addText("结论：合并使五项指标全部下降；但火鸡队列内部的笼效应与感染效应同量级", {
    x: 1.0, y: 5.25, w: 11.3, h: 0.4, margin: 0, fontFace: BODY, fontSize: 14, color: MOSS });
  s.addText("佐治亚大学 · 公共卫生学院", { x: 1.0, y: 6.72, w: 7, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 12, color: W });
  s.addText("summary_Chicken_51_sample.md ｜ summary_Turkey_45_sample.md", {
    x: 5.5, y: 6.72, w: 6.8, h: 0.4, margin: 0, fontFace: BODY, fontSize: 11,
    color: TEALL, align: "right" });
}

// ================================================================ 2 核心结论
{
  const s = slide("核心结论一览", "执行摘要");
  stat(s, { x: 0.6, y: 1.5, w: 2.85, value: "0.930", label: "火鸡单独 n=45", sub: "AUC，本队列最优" });
  stat(s, { x: 3.6, y: 1.5, w: 2.85, value: "0.895", label: "合并 n=51", sub: "AUC，反而更低", color: CORAL });
  stat(s, { x: 6.6, y: 1.5, w: 2.85, value: "−0.035", label: "合并的代价", sub: "五项指标全部下降", color: CORAL, valueSize: 36 });
  stat(s, { x: 9.6, y: 1.5, w: 3.1, value: "p=0.0050", label: "置换检验", sub: "信号真实，但余量有限", valueSize: 30, color: MOSS });

  s.addText("这一页刻意不把 AUC 放在最大号：n=51 时纯噪声的置换零分布最高可达 0.798，任何单一分数都必须与它并读。", {
    x: 0.6, y: 2.92, w: 12.1, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 11.5, color: MUTED, italic: true, valign: "top" });

  card(s, { x: 0.6, y: 3.38, w: 6.0, h: 1.72, accent: TEAL,
    title: "我们做了什么",
    body: "对火鸡队列 PRJNA644054（n=45）单独建模，再与并入鸡队列 PRJNA379944（n=6）后的 51 样本队列对照。两者用完全相同的无泄漏流程：原始计数 + PrevalenceCLR 折内拟合，嵌套 CV（外层 5×10，内层 4 折）。" });
  card(s, { x: 6.9, y: 3.38, w: 5.8, h: 1.72, accent: MOSS,
    title: "两个结论",
    body: "（1）合并没有带来任何收益，6 个鸡样本对模型是纯噪声。\n（2）但火鸡队列单独也不能直接解读：隔离器与感染状态完全共线，纯笼效应平均 AUC 0.908，与感染效应 0.967 同量级。" });

  caveat(s, { x: 0.6, y: 5.25, w: 12.1, h: 1.15,
    text: "三条边界：（1）n=51、少数类仅 16，特异度 0.581 的置信区间极宽。（2）流行度 ≥10% 时 p/n = 1.33，已是 p > n 的高维问题，与主队列的鸭群不可直接类比。（3）AUC 0.930 中有多少来自感染、多少来自笼号，本设计下无法拆分。" });
}

// ================================================================ 3 队列构成
{
  const s = slide("两个队列的构成", "数据");
  table(s, [
    [th("BioProject"), th("宿主"), th("研究中心"), th("阴性"), th("阳性"), th("n"), th("阳性率")],
    [{ text: "PRJNA644054", options: hi }, { text: "火鸡", options: hi }, { text: "Ohio State", options: hi },
     { text: "13", options: hi }, { text: "32", options: hi }, { text: "45", options: hi }, { text: "71.1%", options: hi }],
    ["PRJNA379944", "鸡", "华南农业大学", "3", "3", "6", "50.0%"],
    [{ text: "合并", options: { bold: true } }, { text: "—", options: { color: MUTED } }, { text: "—", options: { color: MUTED } },
     { text: "16", options: { bold: true } }, { text: "35", options: { bold: true } }, { text: "51", options: { bold: true } }, { text: "68.6%", options: { bold: true } }],
  ], { y: 1.75, colW: [2.4, 1.3, 3.0, 1.3, 1.3, 1.3, 1.5], rowH: 0.5 });

  card(s, { x: 0.6, y: 4.0, w: 12.1, h: 1.5, accent: CORAL, fill: "FBEDE7",
    title: "两个 project 在技术上完全不可比",
    body: "以下四个属性与 BioProject 完全共线，没有任何一个样本打破这个对应：\n\n    宿主  火鸡 45 / 鸡 6        研究中心  Ohio State / 华南农大\n    Assay.Type  OTHER / CTS      LibrarySource  OTHER / METAGENOMIC\n\n合并等于把两批用不同建库方法、在不同实验室、对不同物种测的数据放在一起。",
    bodyColor: "7A2E14" });

  s.addText("文件名沿用 summary_Chicken_51_sample.md 中的 Chicken，但该队列实际以火鸡为主（45/51 = 88%），鸡仅 6 个样本。", {
    x: 0.6, y: 5.7, w: 12.1, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, italic: true });
}

// ================================================================ 4 与主队列的差异
{
  const s = slide("为什么不能照搬主队列的读法", "数据 · 结构性差异");
  table(s, [
    [th("维度"), th("主队列（鸭）"), th("本队列（家禽）"), th("含义")],
    ["样本量 n", "260", { text: "51", options: warn }, "估计方差大得多"],
    ["少数类", "109", { text: "16", options: warn }, "每折测试集约 3 个阴性"],
    ["基线 accuracy", "0.581", "0.686", "真实增益的参照点更高"],
    [{ text: "p/n（流行度 ≥10%）", options: { bold: true } }, "70/260 = 0.27",
     { text: "68/51 = 1.33", options: warn }, { text: "p > n，高维问题", options: { bold: true, color: CORAL } }],
    ["置换零分布最大值", "0.614", { text: "0.798", options: warn }, "噪声可达的上限"],
  ], { y: 1.75, colW: [3.0, 3.0, 3.0, 3.1], rowH: 0.5 });

  card(s, { x: 0.6, y: 4.85, w: 5.9, h: 1.6, accent: CORAL, fill: "FBEDE7",
    title: "p/n 从 0.27 翻转到 1.33", titleSize: 14, bodySize: 11,
    body: "特征数超过样本数，模型可以完美拟合训练集。主队列「不需要 PCA、不需要激进特征选择」的判断在这里不成立。",
    bodyColor: "7A2E14" });
  card(s, { x: 6.8, y: 4.85, w: 5.9, h: 1.6, accent: CORAL, fill: "FBEDE7",
    title: "噪声上限 0.798", titleSize: 14, bodySize: 11,
    body: "n=51 时纯随机就能跑出接近 0.8 的 AUC（主队列只有 0.614）。因此本队列中低于 0.80 的 AUC 基本不具解释力。",
    bodyColor: "7A2E14" });
}

// ================================================================ 5 分节
divider("01", "建模结果", "两个队列并排，同一套无泄漏流程");

// ================================================================ 6 主结果表
{
  const s = slide("两个队列的全指标对照", "结果 · 主表");
  s.addText("嵌套 CV：外层 RepeatedStratifiedKFold（5 折 × 10 次 = 50 折），内层 4 折调参；流行度阈值 0.10；两者选中的超参均为 C = 1.0, gamma = scale。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.45, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED, valign: "top" });
  table(s, [
    [th("指标"), th("火鸡单独 n=45"), th("合并 n=51"), th("差值"), th("说明")],
    [{ text: "ROC-AUC", options: { bold: true } }, { text: "0.930", options: hi }, "0.895",
     { text: "−0.035", options: { color: CORAL } }, { text: "噪声上限 0.798", options: { fontSize: 10, color: MUTED } }],
    ["PR-AUC", { text: "0.971", options: hi }, "0.952", { text: "−0.019", options: { color: CORAL } },
     { text: "基线 = 阳性率", options: { fontSize: 10, color: MUTED } }],
    ["Accuracy", { text: "0.860", options: hi }, "0.825", { text: "−0.035", options: { color: CORAL } },
     { text: "基线 0.711 / 0.686", options: { fontSize: 10, color: MUTED } }],
    ["平衡准确率", { text: "0.806", options: hi }, "0.759", { text: "−0.047", options: { color: CORAL } },
     { text: "基线 0.500", options: { fontSize: 10, color: MUTED } }],
    ["灵敏度", "0.934", "0.937", { text: "+0.003", options: { color: MUTED } },
     { text: "阳性占多数，虚高", options: { fontSize: 10, color: MUTED } }],
    [{ text: "特异度", options: { bold: true } }, { text: "0.677", options: hi }, { text: "0.581", options: warn },
     { text: "−0.096", options: { color: CORAL, bold: true } }, { text: "两者都弱，见第 8 页", options: { fontSize: 10, color: CORAL } }],
    ["精确率", { text: "0.877", options: hi }, "0.830", { text: "−0.047", options: { color: CORAL } }, ""],
    ["F1", { text: "0.905", options: hi }, "0.881", { text: "−0.024", options: { color: CORAL } },
     { text: "基线 F1 0.831 / 0.814", options: { fontSize: 10, color: MUTED } }],
    [{ text: "MCC", options: { bold: true } }, { text: "0.647", options: hi }, "0.576",
     { text: "−0.071", options: { color: CORAL, bold: true } }, { text: "基线 0，最可靠", options: { fontSize: 10, color: MUTED } }],
  ], { y: 2.0, colW: [2.2, 2.5, 2.2, 1.9, 3.3], rowH: 0.4, fontSize: 11 });

  card(s, { x: 0.6, y: 6.2, w: 12.1, h: 0.75, accent: TEAL, titleSize: 13,
    title: null, bodySize: 11.5,
    body: "除灵敏度外，火鸡单独在所有指标上都优于合并。灵敏度的 +0.003 不构成例外——它随阳性率上升而虚高（合并后阳性率从 71.1% 降到 68.6%，本应略降）。" });
}

// ================================================================ 7 混淆矩阵
{
  const s = slide("混淆矩阵：错在哪里", "结果 · 错误结构");
  s.addText("50 折折外预测合并，计数已除以重复次数 10，因此可直接读作「平均每次交叉验证的结果」。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12, color: MUTED });

  s.addText("火鸡单独 n=45", { x: 1.2, y: 2.0, w: 4.8, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: INK });
  table(s, [
    ["", th("预测阴性"), th("预测阳性")],
    [th("真实阴性"), { text: "8.8", options: { fill: { color: "E4F0F0" }, bold: true } }, { text: "4.2", options: { color: CORAL } }],
    [th("真实阳性"), { text: "2.1", options: { color: CORAL } }, { text: "29.9", options: { fill: { color: "E4F0F0" }, bold: true } }],
  ], { x: 1.2, y: 2.45, w: 4.6, colW: [1.6, 1.5, 1.5], rowH: 0.5, fontSize: 12 });

  s.addText("合并 n=51", { x: 7.3, y: 2.0, w: 4.8, h: 0.35, margin: 0,
    fontFace: HEAD, fontSize: 16, bold: true, color: INK });
  table(s, [
    ["", th("预测阴性"), th("预测阳性")],
    [th("真实阴性"), { text: "9.3", options: { fill: { color: "E4F0F0" }, bold: true } }, { text: "6.7", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
    [th("真实阳性"), { text: "2.2", options: { color: CORAL } }, { text: "32.8", options: { fill: { color: "E4F0F0" }, bold: true } }],
  ], { x: 7.3, y: 2.45, w: 4.6, colW: [1.6, 1.5, 1.5], rowH: 0.5, fontSize: 12 });

  card(s, { x: 0.6, y: 4.35, w: 5.9, h: 1.9, accent: CORAL, fill: "FBEDE7",
    title: "错误集中在阴性样本上", titleSize: 14, bodySize: 11,
    body: "火鸡：13 个阴性判错 4.2 个（32%）\n合并：16 个阴性判错 6.7 个（42%）\n\n阳性几乎不出错（35 个中错 2.2 个），因为阳性本来就占 68.6%——模型顺着多数类猜就能拿到高灵敏度。",
    bodyColor: "7A2E14" });
  card(s, { x: 6.8, y: 4.35, w: 5.9, h: 1.9, accent: TEAL,
    title: "为什么必须看混淆矩阵", titleSize: 14, bodySize: 11,
    body: "合并后 TP 从 29.9 升到 32.8 看似进步，但那只是因为总样本变多了。真正变化的是 FP：从 4.2 升到 6.7。\n\n单看 accuracy（0.860 → 0.825）只知道变差了 0.035，看混淆矩阵才知道差在哪。" });
}

// ================================================================ 8 特异度问题
{
  const s = slide("最需要警惕的数字：特异度", "结果 · 局限");
  stat(s, { x: 0.9, y: 1.6, w: 3.4, value: "0.677", label: "火鸡单独 n=45", sub: "13 个阴性中判对 8.8 个" });
  stat(s, { x: 4.9, y: 1.6, w: 3.4, value: "0.581", label: "合并 n=51", sub: "16 个阴性中判对 9.3 个", color: CORAL });
  stat(s, { x: 8.9, y: 1.6, w: 3.4, value: "0.937", label: "对照：灵敏度", sub: "看起来很好，但…", color: MUTED });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.5, accent: CORAL, fill: "FBEDE7",
    title: "为什么这个数字不可靠",
    body: "少数类只有 13（火鸡）或 16（合并）个样本。5 折交叉验证下，每折测试集只有约 3 个阴性——判错一个，该折的特异度就跳 33 个百分点。\n\n这意味着 0.581 与 0.677 之间的差距虽然方向明确，但两者各自的置信区间都极宽。",
    bodyColor: "7A2E14" });

  card(s, { x: 0.6, y: 5.2, w: 12.1, h: 1.25, accent: TEAL,
    title: "报告时的硬性要求",
    body: "灵敏度 0.937 与特异度 0.581 必须并列出现。只报灵敏度会让读者以为模型接近可用，而实际上它对阴性样本的判别能力只比抛硬币好一点——这与主队列 10 月分层（特异度 0.533）是同一类问题。" });
}

// ================================================================ 9 置换检验
{
  const s = slide("信号是真的吗：置换检验", "验证 · 过拟合");
  s.addText("打乱标签 200 次，每次重跑整条 pipeline。若模型能在噪声里找出结构，实测分数就没有意义。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  stat(s, { x: 0.9, y: 2.0, w: 3.4, value: "0.967", label: "实测 AUC", sub: "单层 CV、固定超参" });
  stat(s, { x: 4.9, y: 2.0, w: 3.4, value: "0.492", label: "零分布均值", sub: "± 0.121", color: MUTED });
  stat(s, { x: 8.9, y: 2.0, w: 3.4, value: "p = 0.0050", label: "经验 p 值", sub: "200 次中 0 次达到实测值", valueSize: 32, color: MOSS });

  card(s, { x: 0.6, y: 3.85, w: 5.9, h: 1.75, accent: MOSS,
    title: "通过了", titleSize: 14, bodySize: 11,
    body: "零分布均值 0.492，正好落在理论值 0.5 上——说明流程本身没有泄漏。\n\n实测 0.967 远高于零分布，p = 0.0050。" });
  card(s, { x: 6.8, y: 3.85, w: 5.9, h: 1.75, accent: CORAL, fill: "FBEDE7",
    title: "但余量比主队列小得多", titleSize: 14, bodySize: 11,
    body: "零分布标准差 0.121（主队列 0.049），最大值达 0.798。\n\n换言之，n=51 时纯噪声就能跑出接近 0.8 的 AUC——本队列中低于 0.80 的结果基本不具解释力。",
    bodyColor: "7A2E14" });

  caveat(s, { x: 0.6, y: 5.8, w: 12.1, h: 0.75, size: 11.5,
    text: "注意此处实测值 0.967 来自单层 CV + 固定超参，与主表的 0.895 口径不同。嵌套 CV 的 0.895 才是可辩护的性能估计；0.967 仅用于与零分布比较（两者口径一致）。" });
}

// ================================================================ 10 稳健性
{
  const s = slide("结论稳不稳：两项稳健性检查", "验证 · 稳健性");
  s.addText("① 流行度阈值扫描（固定超参 C=5，单层 CV，仅供比较趋势）", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: INK });
  table(s, [
    [th("流行度阈值"), th("特征数"), th("p/n"), th("AUC")],
    ["≥ 0.05", "92", { text: "1.80", options: { color: CORAL } }, "0.976"],
    [{ text: "≥ 0.10（采用）", options: hi }, { text: "68", options: hi }, { text: "1.33", options: hi }, { text: "0.976", options: hi }],
    ["≥ 0.15", "55", "1.08", "0.940"],
    ["≥ 0.20", "51", "1.00", "0.945"],
    ["≥ 0.30", "45", "0.88", "0.949"],
    ["≥ 0.40", "39", "0.76", "0.955"],
  ], { x: 0.6, y: 1.8, w: 6.0, colW: [2.1, 1.3, 1.3, 1.3], rowH: 0.38, fontSize: 11 });

  card(s, { x: 7.0, y: 1.8, w: 5.7, h: 1.35, accent: MOSS, titleSize: 14, bodySize: 11,
    title: "阈值不影响结论",
    body: "AUC 在 0.940–0.976 之间波动，与阈值无系统关系。为与主队列保持一致，主结果仍用 0.10。" });

  s.addText("② 留一法（LOO）与 5 折的差异", {
    x: 7.0, y: 3.35, w: 5.7, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: INK });
  card(s, { x: 7.0, y: 3.72, w: 5.7, h: 1.55, accent: CORAL, fill: "FBEDE7", titleSize: 14, bodySize: 11,
    title: "差 0.078，反映划分方差",
    body: "留一法 LOO      AUC 0.973\n5 折 × 10 重复   AUC 0.895\n\nLOO 训练集更大因而更乐观。两者都不应单独引用——嵌套 5 折的 0.895 更保守、更可辩护。",
    bodyColor: "7A2E14" });

  caveat(s, { x: 0.6, y: 4.45, w: 6.0, h: 1.35, size: 11.5,
    text: "p/n 在所有阈值下都接近或超过 1。即使提高到 ≥0.40，样本量本身也只有 51——高维不是靠调阈值能解决的，只能靠更多样本。" });
}

// ================================================================ 11 批次检查
{
  const s = slide("合并为什么没用：批次检查", "验证 · 批次");
  s.addText("如果模型只是在学「这是火鸡还是鸡」，那么高 AUC 就毫无意义。两个检验回答这个问题。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("检验"), th("AUC"), th("含义")],
    ["菌群 → 预测 project（鸡 vs 火鸡）", { text: "1.000", options: warn }, "两个 project 的菌群完全可分"],
    ["project → 预测感染状态", { text: "0.499", options: { fill: { color: "E4F0F0" }, bold: true } }, "project 归属对标签毫无信息"],
  ], { y: 1.9, colW: [5.4, 2.2, 4.5], rowH: 0.52 });

  card(s, { x: 0.6, y: 3.5, w: 12.1, h: 1.35, accent: MOSS,
    title: "这两个数字合起来说明：批次效应是稀释，不是混杂",
    body: "菌群完全能分辨鸡与火鸡（不同宿主 + 不同实验室，意料之中），但 project 归属与感染状态无关。因此批次没有虚高 AUC——它只是给模型增加了必须绕开的无关变异。那 6 个鸡样本对模型而言是纯噪声。" });

  card(s, { x: 0.6, y: 5.05, w: 12.1, h: 1.4, accent: TEAL,
    title: "与主队列的混杂对照",
    body: "主队列中采样月份既影响菌群、也影响标签（仅协变量即达 AUC 0.881），那是真正的混杂，必须靠分层处理。\n本队列的批次只影响特征、不影响标签——性质不同，处理方式也不同：混杂要分层，稀释要剔除。" });
}

// ================================================================ 12 队列内部混杂
divider("02", "队列内部的混杂", "把火鸡队列单独拿出来后，新的问题出现了");

// ================================================================ 13 隔离器共线
{
  const s = slide("隔离器与感染状态完全共线", "混杂结构 · PRJNA644054");
  s.addText("前面十页只检查了「两个 project 之间」的批次效应。火鸡队列内部还有一层：饲养隔离器。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Isolator"), th("阴性"), th("阳性")],
    ["1", { text: "8", options: hi }, "0"],
    ["2", { text: "5", options: hi }, "0"],
    ["3", "0", { text: "8", options: warn }],
    ["4", "0", { text: "8", options: warn }],
    ["5", "0", { text: "8", options: warn }],
    ["6", "0", { text: "8", options: warn }],
  ], { x: 0.6, y: 1.9, w: 5.1, colW: [1.7, 1.7, 1.7], rowH: 0.42 });

  card(s, { x: 6.2, y: 1.9, w: 6.5, h: 1.72, accent: CORAL, fill: "FBEDE7",
    title: "DNA 提取批次：独立且部分共线", titleSize: 14, bodySize: 11,
    body: "18-11-06 批次的 16 个样本全部为阳性。\n\n    菌群 → 预测提取批次              AUC 0.921\n    仅在阳性组内（感染状态固定）      AUC 0.940\n\n第二个数字是关键：固定标签后批次仍高度可预测。",
    bodyColor: "7A2E14" });
  card(s, { x: 6.2, y: 3.82, w: 6.5, h: 1.36, accent: MOSS,
    title: "阴性对照：性别 AUC 0.454", titleSize: 14, bodySize: 11,
    body: "性别在两组间分布均衡，菌群预测它的 AUC 接近随机。同一套流程作用在无混杂的变量上就得不出信号——前面那些高 AUC 不是方法学假象。" });

  caveat(s, { x: 0.6, y: 5.4, w: 12.1, h: 0.95,
    text: "每个隔离器只含一种感染状态。这是实验设计使然（对照与感染必须分笼以防交叉感染），但代价是隔离器效应与感染效应在统计上不可分离——没有任何「同笼内既有阳性又有阴性」的样本可供拆解。" });
}

// ================================================================ 14 纯笼效应
{
  const s = slide("纯笼效应与感染效应几乎同量级", "混杂结构 · 决定性检验");
  s.addText("共线不代表无法量化。CKPA 占据隔离器 3 与 4，因此在 3 vs 4 的对比中，毒株、批次、感染状态全部固定，只有笼号不同。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("对比"), th("固定条件"), th("n"), th("AUC"), th("零分布最大"), th("p")],
    ["隔离器 3 vs 4", "同 CKPA、同 10-30、同阳性", "16", { text: "0.919", options: warn }, "0.938", "0.0066"],
    ["隔离器 5 vs 6", "同 TKMN、同 11-06、同阳性", "16", { text: "0.906", options: warn }, "1.000", "0.0166"],
    ["隔离器 1 vs 2", "同 Mock、同 10-30、同阴性", "13", { text: "0.900", options: warn }, "0.969", "0.0332"],
  ], { x: 0.6, y: 1.92, w: 12.1, colW: [2.5, 4.1, 1.0, 1.7, 1.8, 1.0], rowH: 0.46 });

  stat(s, { x: 1.1, y: 3.98, w: 3.4, value: "0.908", label: "纯笼效应平均", sub: "三组对比", color: CORAL });
  stat(s, { x: 5.0, y: 3.98, w: 3.4, value: "0.967", label: "感染效应", sub: "n=45，全队列" });
  stat(s, { x: 8.9, y: 3.98, w: 3.4, value: "3 / 3", label: "置换检验显著", sub: "300 次，全部 p<0.05", color: MOSS, valueSize: 36 });

  card(s, { x: 0.6, y: 5.42, w: 5.9, h: 1.18, accent: TEAL,
    title: "笼效应是多变量的", titleSize: 13.5, bodySize: 10.5,
    body: "逐菌差异丰度在三组对比中只有 0、1、3 个特征 FDR<0.05——单个菌几乎都不显著，模型却能到 AUC 0.90。同笼鸟的菌群是整体趋同。" });
  caveat(s, { x: 6.8, y: 5.42, w: 5.9, h: 1.18, size: 10.5,
    text: "样本量提醒：笼效应基于 n=16 或 13，零分布标准差 0.19–0.22。可以断定 0.908 与 0.967 量级相当，不能断定孰高孰低。" });
}

// ================================================================ 15 驱动菌
{
  const s = slide("驱动预测的菌：多一道笼效应筛查", "生物学 · 差异丰度");
  s.addText("62 个特征中 19 个 FDR<0.05，与 permutation importance 取交集得 11 个，再剔除在阳性组内部即因隔离器显著不同的，剩 7 个。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED });

  table(s, [
    [th("Genus"), th("Family"), th("方向"), th("importance"), th("t"), th("FDR")],
    ["HT002", "Lactobacillaceae", { text: "Pos↓", options: hi }, "0.0130", "−3.89", "0.0057"],
    ["Pediococcus", "Lactobacillaceae", { text: "Pos↑", options: warn }, "0.0129", "+4.32", "0.0010"],
    ["（未定属）", "Lactobacillaceae", { text: "Pos↓", options: hi }, "0.0064", "−4.15", "0.0017"],
    ["Incertae_Sedis", "—", { text: "Pos↓", options: hi }, "0.0022", "−2.60", "0.0499"],
    ["Weissella", "Lactobacillaceae", { text: "Pos↓", options: hi }, "0.0020", "−3.56", "0.0087"],
    [{ text: "Escherichia-Shigella", options: { bold: true } }, "Enterobacteriaceae",
     { text: "Pos↑", options: warn }, "0.0015", { text: "+5.64", options: { bold: true, color: CORAL } }, "0.0004"],
    ["Pseudomonas", "Pseudomonadaceae", { text: "Pos↑", options: warn }, "0.00004", "+3.49", "0.0057"],
  ], { x: 0.6, y: 1.9, w: 12.1, colW: [2.9, 3.0, 1.4, 1.9, 1.4, 1.5], rowH: 0.37 });

  card(s, { x: 0.6, y: 5.0, w: 5.9, h: 1.45, accent: MOSS,
    title: "模式符合免疫学预期", titleSize: 14, bodySize: 11,
    body: "乳酸菌科四个属中三个在感染组降低，机会致病菌 Escherichia-Shigella 与 Pseudomonas 升高——共生菌减少、机会致病菌扩张的典型菌群失调。" });
  caveat(s, { x: 6.8, y: 5.0, w: 5.9, h: 1.45, size: 11,
    text: "被剔除的最强反例：Negativibacillus 的 importance 最高（0.0133）、t=+5.87、FDR<0.0001，单看这两项会认为它是最好的 biomarker。但它在同为阳性的四个隔离器之间也显著不同，无法归因于感染。" });
}

// ================================================================ 16 结论
divider("03", "结论", "合并的代价，以及下一步该做什么");

// ================================================================ 13 建议
{
  const s = slide("建议：不要合并，用火鸡队列单独建模", "结论");
  const items = [
    ["合并后五项指标全部下降", "AUC −0.035、Accuracy −0.035、特异度 −0.096、F1 −0.024、MCC −0.071。唯一上升的灵敏度（+0.003）随阳性率虚高，不构成例外。", CORAL],
    ["6 个样本无法支撑任何跨宿主结论", "PRJNA379944 只有 3 阳 3 阴。若目的是检验跨宿主泛化，正确做法是「训练火鸡、测试鸡」而非合并——但 6 个样本也做不了这件事，AUC 会完全由个别样本决定。", CORAL],
    ["火鸡单独更好，但那个 0.930 不能当作感染信号来读", "AUC 0.930、MCC 0.647、F1 0.905，且内部同质（单一宿主、单一中心、单一建库方法）。但隔离器与感染状态完全共线，纯笼效应平均 0.908，报告时必须把笼效应一并给出。", CORAL],
  ];
  items.forEach((it, i) => {
    const y = 1.6 + i * 1.72;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: 12.1, h: 1.5, fill: { color: it[2] === CORAL ? "FBEDE7" : W }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: 0.075, h: 1.5, fill: { color: it[2] } });
    s.addShape(pres.shapes.OVAL, { x: 0.95, y: y + 0.34, w: 0.62, h: 0.62, fill: { color: DARK } });
    s.addText(String(i + 1), { x: 0.95, y: y + 0.45, w: 0.62, h: 0.4, margin: 0,
      fontFace: HEAD, fontSize: 18, bold: true, color: W, align: "center" });
    s.addText(it[0], { x: 1.85, y: y + 0.2, w: 10.5, h: 0.36, margin: 0,
      fontFace: HEAD, fontSize: 15, bold: true, color: INK });
    s.addText(it[1], { x: 1.85, y: y + 0.6, w: 10.5, h: 0.8, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: it[2] === CORAL ? "7A2E14" : MUTED, lineSpacingMultiple: 1.1 });
  });
}

// ================================================================ 14 下一步
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addText("若火鸡队列要写进论文，尚需补做", { x: 1.0, y: 1.25, w: 11.3, h: 0.8, margin: 0,
    fontFace: HEAD, fontSize: 34, bold: true, color: W });
  s.addText("前三项（混杂结构、驱动菌、跨宿主比较）已完成，见第 13–15 页；下面是剩下的", {
    x: 1.0, y: 2.1, w: 11.3, h: 0.4, margin: 0, fontFace: BODY, fontSize: 14, color: MOSS });

  const nx = [
    ["拆分笼效应与感染效应需要重做实验", "每个隔离器内同时放阳性与阴性个体。这是设计问题，不是分析问题，现有数据无法补救"],
    ["在两队列特征交集上重做跨宿主检验", "火鸡只保留 62 个特征，鸭队列九菌中多数根本没进候选池——目前的「不一致」更可能是特征空间不同所致"],
    ["纳入一致性检查", "该队列的 results/ 存档接入 check_consistency.py 与 pre-commit"],
    ["核实两列体重数据重复的问题", "Bird_weight.g. 与 Bursa.BodyWeight.Ratio1000 数值完全相同，需联系数据提供方"],
  ];
  nx.forEach((n, i) => {
    const y = 2.75 + i * 1.02;
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 11.3, h: 0.85, fill: { color: DARK2 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 0.075, h: 0.85, fill: { color: MOSS } });
    s.addText(n[0], { x: 1.35, y: y + 0.1, w: 10.6, h: 0.32, margin: 0,
      fontFace: HEAD, fontSize: 15, bold: true, color: W });
    s.addText(n[1], { x: 1.35, y: y + 0.44, w: 10.6, h: 0.34, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: MOSS });
  });

  s.addText("完整结果见 summary_Chicken_51_sample.md 与 summary_Turkey_45_sample.md ｜ 复现：poultry_cohort.py、turkey_confounding_biomarkers.py、turkey_strain_cage.py", {
    x: 1.0, y: 6.85, w: 11.3, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12, color: TEALL });
}

pres.writeFile({ fileName: path.join(__dirname, "Poultry_Cohort_Results_ZH.pptx") })
  .then((f) => console.log("已生成:", f, "| 页数:", pageNo));
