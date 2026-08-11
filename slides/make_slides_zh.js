/**
 * 生成中文版项目概览幻灯片。版式与英文版 make_slides.js 完全一致。
 *   node slides/make_slides_zh.js
 * Output: slides/Influenza_Microbiome_ML_Overview_ZH.pptx
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

const HEAD = "微软雅黑";
const BODY = "微软雅黑";

const SW = 13.333, SH = 7.5;   // LAYOUT_WIDE

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Sihua Peng";
pres.company = "University of Georgia, College of Public Health";
pres.title = "基于肠道菌群的禽流感感染预测";

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

  s.addText("禽流感感染状态预测", {
    x: 1.0, y: 1.75, w: 11.3, h: 0.6, margin: 0,
    fontFace: BODY, fontSize: 15, bold: true, color: MOSS, charSpacing: 3,
  });
  s.addText("肠道菌群作为\n诊断信号", {
    x: 1.0, y: 2.35, w: 11.3, h: 1.9, margin: 0,
    fontFace: HEAD, fontSize: 46, bold: true, color: W, lineSpacingMultiple: 1.05,
  });
  s.addText("基于野生水禽 16S rRNA 菌群图谱的机器学习研究", {
    x: 1.0, y: 4.3, w: 11.3, h: 0.45, margin: 0,
    fontFace: BODY, fontSize: 17, color: TEALL,
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 5.0, w: 3.6, h: 0.04, fill: { color: MOSS } });
  s.addText("260 只野鸭  ·  70 个菌群特征  ·  17 种模型横向比较", {
    x: 1.0, y: 5.2, w: 11.3, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 13, color: MOSS,
  });

  s.addText("佐治亚大学 · 公共卫生学院", {
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
  const s = slide("核心结论一览", "执行摘要");
  stat(s, { x: 0.6, y: 1.5, w: 2.85, value: "p=0.0099", label: "信号是真实的", sub: "置换检验，100 次打乱", valueSize: 32 });
  stat(s, { x: 3.6, y: 1.5, w: 2.85, value: "0.73–0.97", label: "固定季节后的效应", sub: "AUC，模型中只有菌群", valueSize: 30, color: DARK2 });
  stat(s, { x: 6.6, y: 1.5, w: 2.85, value: "+0.04–0.11", label: "相对协变量的增量", sub: "量级依赖模型选择", valueSize: 28, color: DARK2 });
  stat(s, { x: 9.6, y: 1.5, w: 3.1, value: "9", label: "个 Biomarker", sub: "三套独立方法一致", color: MOSS });

  s.addText("这里刻意不把模型分数放在头条：领先的几个模型之间不存在一致的排名（AUC 0.825–0.858，全部落在折间波动内），因此任何单一分数都不是这项发现的属性。", {
    x: 0.6, y: 2.92, w: 12.1, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 11.5, color: MUTED, italic: true, valign: "top",
  });

  card(s, {
    x: 0.6, y: 3.38, w: 6.0, h: 1.62, accent: TEAL,
    title: "我们确立了什么",
    body: "野鸭肠道菌群携带真实且可复现的流感感染信号。该关联通过了置换检验与月份分层分析的考验，且部分来自菌群之间的非线性交互。",
  });
  card(s, {
    x: 6.9, y: 3.38, w: 5.8, h: 1.62, accent: MOSS,
    title: "我们如何确立它",
    body: "嵌套交叉验证，所有预处理均在训练折内拟合；十七种模型在完全相同的折划分上比较；三套独立的特征排序方法相互交叉验证。",
  });

  caveat(s, {
    x: 0.6, y: 5.25, w: 12.1, h: 0.95,
    text: "本报告所有结论都受两条边界约束：（1）仅用采样季节等协变量即可达到 AUC 0.881，因此菌群的价值必须相对这一混杂基线来陈述；（2）结论仅在 UC Davis 野鸭队列内成立——跨研究泛化失败（AUC 0.54 ± 0.29）。",
  });
}

// ================================================================ 3 ROADMAP
{
  const s = slide("本报告的内容结构", "路线图");
  const items = [
    ["01", "数据", "三个输入文件、四个研究，以及为何只对其中一个建模"],
    ["02", "数据处理", "标签泄漏、成分数据变换，以及无泄漏的 pipeline"],
    ["03", "建模评估", "嵌套 CV 协议与十七模型横向比较"],
    ["04", "有效性", "置换检验、混杂因子、分层再分析与去混杂子集"],
    ["05", "生物学发现", "三方法交集的 Biomarker；非线性结构的证据"],
    ["06", "已知局限", "七项局限，如实陈述"],
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
  const s = slide("\u8bfb\u61c2\u672c\u62a5\u544a\u6570\u5b57\u7684\u516d\u4e2a\u524d\u63d0", "\u5f00\u59cb\u4e4b\u524d");
  s.addText("\u516d\u6761\u7ea6\u5b9a\u3002\u6bcf\u4e00\u6761\u8bfb\u9519\u90fd\u4f1a\u6539\u53d8\u7ed3\u679c\u7684\u542b\u4e49\u2014\u2014\u56e0\u6b64\u5b83\u4eec\u653e\u5728\u770b\u5230\u4efb\u4f55\u6570\u636e\u4e4b\u524d\uff0c\u800c\u4e0d\u662f\u4e4b\u540e\u3002", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });

  const items = [
    ["\u57fa\u7ebf\u4e0d\u662f 0.5", "58% \u7684\u6837\u672c\u4e3a\u9633\u6027\uff0c\u6240\u4ee5\u5168\u731c\u9633\u6027\u5df2\u7ecf\u80fd\u62ff\u5230\u51c6\u786e\u7387 0.581\u2014\u2014PR-AUC \u7684\u57fa\u7ebf\u4e5f\u662f 0.581\u3002\u53ea\u6709 ROC-AUC\uff080.50\uff09\u3001MCC\uff080\uff09\u4e0e\u5e73\u8861\u51c6\u786e\u7387\uff080.50\uff09\u7684\u57fa\u7ebf\u662f\u5e72\u51c0\u7684\u3002", CORAL],
    ["AUC \u4e0e\u9608\u503c\u65e0\u5173\uff0c\u51c6\u786e\u7387\u6709\u5173", "\u540c\u4e00\u7ec4\u9884\u6d4b\uff0c\u9608\u503c\u4e0d\u540c\u51c6\u786e\u7387\u5728 0.69\u20130.77 \u4e4b\u95f4\u6ed1\u52a8\u3002AUC \u8861\u91cf\u7684\u662f\u6392\u5e8f\u8d28\u91cf\uff0c\u56e0\u6b64\u6a21\u578b\u6bd4\u8f83\u5e94\u4ee5\u5b83\u4e3a\u51c6\u3002", CORAL],
    ["\u4e0d\u5e73\u8861\u65f6\u6700\u8be5\u4fe1 MCC", "\u5b83\u7528\u6ee1\u6df7\u6dc6\u77e9\u9635\u56db\u683c\uff0c\u4e14\u57fa\u7ebf\u4e3a 0\u3002\u51c6\u786e\u7387\u4e0e F1 \u90fd\u4f1a\u5956\u52b1\u201c\u76f4\u63a5\u731c\u591a\u6570\u7c7b\u201d\u8fd9\u79cd\u884c\u4e3a\u3002", TEAL],
    ["p \u7ba1\u4e00\u6b21\uff0cFDR \u7ba1\u4e00\u6279", "70 \u4e2a\u83cc\u5373\u4f7f\u5168\u662f\u566a\u58f0\uff0c\u6309 p<0.05 \u4ecd\u4f1a\u6709\u7ea6 3.5 \u4e2a\u201c\u663e\u8457\u201d\u3002\u6211\u4eec\u62a5\u51fa\u7684 19 \u4e2a FDR<0.05 \u7ed3\u679c\u4e2d\uff0c\u9884\u671f\u7ea6 1 \u4e2a\u4e3a\u5047\u9633\u6027\u3002", TEAL],
    ["\u6cc4\u6f0f \u2260 \u6df7\u6742", "\u6cc4\u6f0f\u7684\u4fe1\u606f\u5728\u9884\u6d4b\u65f6\u4e0d\u5b58\u5728\uff0c\u5fc5\u987b\u5220\u9664\uff1b\u6df7\u6742\u7684\u4fe1\u606f\u5b58\u5728\u2014\u2014\u4f60\u5f53\u7136\u77e5\u9053\u4eca\u5929\u51e0\u6708\u2014\u2014\u5e94\u7528\u5206\u5c42\u5904\u7406\u800c\u975e\u5220\u9664\u3002", MOSS],
    ["\u533a\u95f4\u662f\u6545\u610f\u7684\uff0c\u4e0d\u662f\u5e73\u5747\u503c", "\u7ed3\u679c\u5728\u5404\u5c42\u95f4\u5dee\u5f02\u5927\u65f6\uff0c\u6211\u4eec\u62a5\u533a\u95f4\uff08AUC 0.734\u20130.965\uff09\uff0c\u800c\u4e0d\u662f\u6837\u672c\u91cf\u52a0\u6743\u5e73\u5747\u503c\u2014\u2014\u540e\u8005\u4f1a\u63a9\u76d6\u6700\u5f31\u7684\u5c42\u3002", MOSS],
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

  s.addText("CLR\u3001Welch t\u3001L1 \u7a33\u5b9a\u6027\u9009\u62e9\u7b49\u5b8c\u6574\u5b9a\u4e49\u89c1 README \u00a710 \u672f\u8bed\u8868\u3002", {
    x: 0.6, y: 6.85, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 10.5, color: MUTED, italic: true,
  });
}

// ================================================================ 4 DIVIDER 1
divider("01", "数据", "三个文件、四个研究、326 个样本——以及唯一值得建模的那个队列");

// ================================================================ 5 INPUTS
{
  const s = slide("三个输入文件，完全对齐", "数据 · 输入");
  table(s, [
    [th("文件"), th("内容"), th("角色")],
    ["genus_raw_counts_by_featureID.csv", "326 样本 × 275 个 FeatureID，整数计数", { text: "特征矩阵", options: rowHi }],
    ["taxonomy_key.csv", "275 个 FeatureID 的七级分类学注释", "注释表"],
    ["metadata_all_samples-0810.csv", "326 样本 × 102 列元数据", "标签 + 协变量"],
    ["sample_counts_by_study_host_infection.csv", "研究 × 宿主 × 感染的 8 行汇总", "仅用于 Table 1"],
  ], { y: 1.75, colW: [4.5, 4.9, 2.7], rowH: 0.52 });

  card(s, {
    x: 0.6, y: 4.6, w: 5.9, h: 1.5, accent: MOSS,
    title: "对齐已核实",
    body: "三个文件的 SampleID 匹配 326/326。\nFeatureID 与分类学表匹配 275/275。\n无缺失值，无重复标识符。",
  });
  card(s, {
    x: 6.8, y: 4.6, w: 5.9, h: 1.5, accent: TEAL,
    title: "标签分布",
    body: "Influenza 阳性 = 196   ·   阴性 = 130\n总体阳性率 60%，建模队列内 58%。\n轻度不平衡——用类别权重处理，不做重采样。",
  });
}

// ================================================================ 6 COHORT
{
  const s = slide("四个研究，一个建模队列", "数据 · 队列");
  table(s, [
    [th("BioProject"), th("研究中心"), th("宿主"), th("n"), th("阴性"), th("阳性")],
    [{ text: "PRJNA464410", options: rowHi }, { text: "UC Davis", options: rowHi }, { text: "野鸭（泄殖腔拭子）", options: rowHi }, { text: "260", options: rowHi }, { text: "109", options: rowHi }, { text: "151", options: rowHi }],
    ["PRJNA644054", "俄亥俄州立大学", "火鸡", "45", "13", "32"],
    ["PRJNA347583", "中国科学院", "大天鹅", "15", "5", "10"],
    ["PRJNA379944", "华南农业大学", "鸡", "6", "3", "3"],
  ], { y: 1.75, colW: [2.5, 3.5, 3.1, 1.0, 1.0, 1.0], rowH: 0.5 });

  card(s, {
    x: 0.6, y: 4.5, w: 12.1, h: 1.05, accent: TEAL,
    title: "为何主分析只用 PRJNA464410",
    body: "它是唯一样本量足以建模的研究（326 中的 260 个），且内部同质——同一中心、同一宿主物种、同一组织类型。另外三个在宿主、组织、地域上完全不同，各自只贡献 6–45 个样本。",
  });
  caveat(s, {
    x: 0.6, y: 5.75, w: 12.1, h: 0.85,
    text: "把四个研究合并很有诱惑力，但行不通：按 BioProject 做 GroupKFold 时 AUC 塌缩到 0.54 ± 0.29，与随机猜测无异。详见「已知局限」一页。",
  });
}

// ================================================================ 7 CHARACTERISTICS
{
  const s = slide("特征矩阵长什么样", "数据 · 特性");
  stat(s, { x: 0.6, y: 1.55, w: 2.9, value: "90.2%", label: "零值占比", sub: "极度稀疏" });
  stat(s, { x: 3.7, y: 1.55, w: 2.9, value: "5000", label: "测序深度上限", sub: "326 个中 208 个恰好等于", color: DARK2 });
  stat(s, { x: 6.8, y: 1.55, w: 2.9, value: "275", label: "个 FeatureID", sub: "→ 155 个属", color: DARK2 });
  stat(s, { x: 9.9, y: 1.55, w: 2.8, value: "70", label: "过滤后特征数", sub: "流行度 ≥ 10%", color: MOSS });

  card(s, {
    x: 0.6, y: 3.2, w: 5.9, h: 1.85, accent: TEAL,
    title: "流行度过滤阶梯",
    body: "≥ 5%  → 117 个特征\n≥ 10% → 79 个特征   （本项目采用）\n≥ 20% → 36 个特征\n≥ 50% → 10 个特征",
  });
  card(s, {
    x: 6.8, y: 3.2, w: 5.9, h: 1.85, accent: TEAL,
    title: "分类学分辨率",
    body: "门 → 科：275 个中有 262–274 个有注释。\n属：220 个有注释，55 个未定。\n种：完全空白。\n因此生物学解释只能到属/科水平。",
  });
  caveat(s, {
    x: 0.6, y: 5.3, w: 12.1, h: 0.95,
    text: "对禽类肠道 16S 数据而言，275 个特征异常地少（通常有数千个 ASV）。该表几乎可以肯定被上游按某个未知规则预过滤过——这是本项目最大的未决风险。",
  });
}

// ================================================================ 8 DIVIDER 2
divider("02", "数据处理", "剔除会泄漏的，变换属于成分数据的，并让每一折保持诚实");

// ================================================================ 9 LEAKAGE
{
  const s = slide("最大的陷阱：标签泄漏", "数据处理 · 泄漏");
  s.addText("102 列元数据中，有相当一部分就是标签本身或标签的确定性函数。保留其中任何一列，都会得到 100% 准确率和零信息量。", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 13, color: MUTED,
  });
  table(s, [
    [th("列名"), th("泄漏方式")],
    ["Infection", "与 Influenza 标签逐字节完全相同"],
    ["CoreGroup", "直接编码 HostGroup_标签，如 \"Duck_Pos\""],
    ["HASubType / NASubType", "阴性全为字符串 \"neg\"，阳性携带亚型数字"],
    ["Log10_Virus_titer", "病毒滴度是感染的直接物理测量"],
    ["True_or_Neg, Infection_Status,\nInfecting_Agent, experimental_group", "实验感染分组标注"],
    ["isolation_source", "对照组为 \"mock\"，感染组为 \"Intestine N\""],
  ], { y: 2.0, colW: [4.6, 7.5], rowH: 0.5, align: "left" });

  card(s, {
    x: 0.6, y: 5.6, w: 12.1, h: 1.15, accent: MOSS,
    title: "另外剔除的列",
    body: "10 个样本标识列（326 个全唯一，且带有命名规则，树模型会直接背下来），以及 17 个与 BioProject 一一对应的批次代理列。审计清单固化在 mb_common.py 的 LEAKAGE_COLS 中；build_features.py 会打印每一列与标签的可分性，供人工核查而非盲信。",
  });
}

// ================================================================ 10 CLR
{
  const s = slide("菌群数据是成分数据", "数据处理 · 变换");
  s.addText("每个样本的总和固定于测序深度，因此丰度只携带相对信息。把原始计数直接喂给线性模型是方法学错误。", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0,
    fontFace: BODY, fontSize: 13, color: MUTED,
  });

  const steps = [
    ["流行度过滤", "保留在 ≥10% 样本中出现的特征", "275 → 70"],
    ["加伪计数", "每格加 0.5，使对数有定义", "消除零值"],
    ["相对丰度", "每行除以该行总和", "行和为 1"],
    ["CLR 变换", "取对数后减去该行的对数均值", "消除尺度"],
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
    title: "结果",
    body: "260 个样本对应 70 个 CLR 特征——p/n ≈ 0.27。\n不属于高维问题：无需 PCA，也无需激进的特征选择。",
  });
  card(s, {
    x: 6.8, y: 4.5, w: 5.9, h: 1.85, accent: MOSS,
    title: "属层聚合保留未注释特征",
    body: "55 个特征没有属注释。它们被保留为 Genus_unassigned_<ID> 而非丢弃——丢弃会破坏成分数据的封闭性并使 CLR 失真。因此是 275 → 210，而不是 155。",
  });
}

// ================================================================ 11 LEAK-FREE CV
{
  const s = slide("让每一折保持诚实", "数据处理 · 无泄漏 CV");

  card(s, {
    x: 0.6, y: 1.55, w: 5.9, h: 2.35, accent: CORAL, fill: "FBEDE7",
    title: "常见错误做法",
    body: "先在全量数据上过滤特征，再做交叉验证。\n\n验证折会悄悄影响「哪些特征被保留」。报出的 AUC 会虚高约 0.01–0.02——数值不大，但这是诚实数字与不诚实数字的分界。",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 1.55, w: 5.9, h: 2.35, accent: MOSS,
    title: "本项目的做法",
    body: "流行度过滤与 CLR 被封装成 scikit-learn 变换器 PrevalenceCLR，在每一个训练折内部重新拟合。\n\nCLR 本身是逐行运算，不存在跨样本泄漏——真正需要防护的只有过滤这一步。",
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 4.15, w: 12.1, h: 1.0, fill: { color: DARK } });
  s.addText("Pipeline([('clr', PrevalenceCLR(0.10)), ('sc', StandardScaler()), ('clf', SVC(kernel='rbf'))])", {
    x: 0.9, y: 4.4, w: 11.5, h: 0.5, margin: 0,
    fontFace: "Consolas", fontSize: 14, color: MOSS,
  });

  card(s, {
    x: 0.6, y: 5.45, w: 12.1, h: 1.0, accent: TEAL,
    title: "为何这比选哪个模型更重要",
    body: "已发表的菌群分类器中，多数报出的单一数字来自「特征选择看过全量数据」的 pipeline。把这一步做对，纸面上损失几个 AUC 点，换来的是结果的可信度。",
  });
}

// ================================================================ 12 DIVIDER 3
divider("03", "建模与评估", "一套嵌套协议，十七种模型，一次诚实的比较");

// ================================================================ 13 PROTOCOL + METRICS
{
  const s = slide("评估协议", "建模 · 协议");

  const proto = [
    ["外层循环", "RepeatedStratifiedKFold\n5 折 × 5 次重复 = 25 折\n用途：性能评估", DARK2],
    ["内层循环", "StratifiedKFold，4 折\n以 ROC-AUC 为目标做网格搜索\n用途：超参数搜索", TEAL],
    ["共用折划分", "所有模型看到完全相同的\n折划分\n用途：保证可比性", MOSS],
  ];
  proto.forEach((p, i) => {
    card(s, { x: 0.6 + i * 4.1, y: 1.45, w: 3.9, h: 1.5, accent: p[2],
              title: p[0], titleSize: 14, body: p[1], bodySize: 11 });
  });
  s.addText("嵌套把调参与评估隔离开，因此报出的 AUC 不含调参偏倚。", {
    x: 0.6, y: 3.05, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 11, color: MUTED, italic: true,
  });

  card(s, {
    x: 0.6, y: 3.55, w: 5.9, h: 1.85, accent: MOSS,
    title: "超参并非调出来的", titleSize: 14, bodySize: 11,
    body: "SVM-RBF 网格已扩展至 C ∈ [0.01, 500]、gamma ∈ [1e-4, 0.1] + scale。\n\n15 折中 0 折选中边界值，AUC 基本未变，整个曲面跨度仅 0.73–0.81。",
  });
  card(s, {
    x: 6.8, y: 3.55, w: 5.9, h: 1.85, accent: TEAL,
    title: "报告的指标", titleSize: 14, bodySize: 11,
    body: "ROC-AUC · PR-AUC · 准确率 · 平衡准确率 · 灵敏度 · 特异度 · 精确率 · F1 · MCC\n\n如何解读：见第 4 页的读数约定。",
  });

  caveat(s, {
    x: 0.6, y: 5.6, w: 12.1, h: 0.85,
    text: "所有准确率均在固定阈值 0.5 下计算。阈值 0.55 表现更好，但那是看着测试数据挑出来的——若要采用，必须把阈值选择也放进内层循环。",
    size: 11,
  });
}

// ================================================================ 14 MODEL TABLE
{
  const s = slide("十七种模型，不存在一致的排名", "建模 · 比较");
  table(s, [
    [th("模型"), th("准确率"), th("平衡准确率"), th("ROC-AUC"), th("PR-AUC"), th("灵敏度"), th("特异度"), th("F1"), th("MCC")],
    [{ text: "ExtraTrees", options: rowHi }, { text: "0.778", options: rowHi }, { text: "0.756", options: rowHi }, { text: "0.858", options: rowHi }, { text: "0.891", options: rowHi }, { text: "0.887", options: rowHi }, { text: "0.626", options: rowHi }, { text: "0.822", options: rowHi }, { text: "0.542", options: rowHi }],
    [{ text: "SVM-RBF", options: rowHi }, { text: "0.773", options: rowHi }, { text: "0.764", options: rowHi }, { text: "0.835", options: rowHi }, { text: "0.871", options: rowHi }, { text: "0.820", options: rowHi }, { text: "0.708", options: rowHi }, { text: "0.807", options: rowHi }, { text: "0.535", options: rowHi }],
    [{ text: "Ensemble（软投票）", options: rowHi }, { text: "0.767", options: rowHi }, { text: "0.757", options: rowHi }, { text: "0.834", options: rowHi }, { text: "0.874", options: rowHi }, { text: "0.816", options: rowHi }, { text: "0.699", options: rowHi }, { text: "0.802", options: rowHi }, { text: "0.523", options: rowHi }],
    [{ text: "SVM-poly", options: rowHi }, { text: "0.740", options: rowHi }, { text: "0.718", options: rowHi }, { text: "0.825", options: rowHi }, { text: "0.851", options: rowHi }, { text: "0.857", options: rowHi }, { text: "0.579", options: rowHi }, { text: "0.792", options: rowHi }, { text: "0.463", options: rowHi }],
    ["GP-RBF", "0.749", "0.733", "0.821", "0.868", "0.834", "0.631", "0.794", "0.482"],
    ["GP-Matérn", "0.746", "0.728", "0.818", "0.866", "0.841", "0.615", "0.793", "0.475"],
    ["RandomForest", "0.718", "0.693", "0.806", "0.845", "0.850", "0.535", "0.777", "0.416"],
    ["XGBoost", "0.727", "0.716", "0.800", "0.846", "0.786", "0.646", "0.768", "0.441"],
    ["HistGB", "0.709", "0.695", "0.794", "0.843", "0.783", "0.608", "0.757", "0.399"],
    ["kNN-Aitchison", "0.710", "0.679", "0.790", "0.830", "0.870", "0.488", "0.776", "0.402"],
    [{ text: "基线（全猜阳性）", options: { italic: true, color: MUTED } },
     { text: "0.581", options: { italic: true, color: MUTED } }, { text: "0.500", options: { italic: true, color: MUTED } }, { text: "0.500", options: { italic: true, color: MUTED } }, { text: "0.581", options: { italic: true, color: MUTED } }, { text: "1.000", options: { italic: true, color: MUTED } }, { text: "0.000", options: { italic: true, color: MUTED } }, { text: "0.735", options: { italic: true, color: MUTED } }, { text: "0.000", options: { italic: true, color: MUTED } }],
  ], { y: 1.5, colW: [2.9, 1.15, 1.25, 1.15, 1.15, 1.05, 1.05, 1.0, 1.0], rowH: 0.33, fontSize: 10 });

  s.addText("按 ROC-AUC 排序的前 10 名（共 17 个）· 底色标出领先群体 · 完整表见 results/model_comparison_all16.csv", {
    x: 0.6, y: 5.52, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 9.5, color: MUTED, italic: true,
  });

  card(s, {
    x: 0.6, y: 5.85, w: 12.1, h: 0.95, accent: TEAL,
    title: "顶部这一块要当作一个群体读，而不是一个排名", titleSize: 14,
    body: "ExtraTrees 只是名义领先（p=0.041，未校正）；SVM-RBF、集成、SVM-poly 三者互相无法区分（见下一页）。真正的分离要到 GP-RBF 以下才出现。", bodySize: 11,
  });
}

// ================================================================ 15 SIGNIFICANCE
{
  const s = slide("AUC 无法决定选哪个模型", "建模 · 显著性");
  s.addText("拿最优模型去比一个明显更差的模型，证明不了任何事。真正该问的是：领先的这几个模型之间到底能不能分辨。以下是前六名在同一批 25 折上的全部 15 次两两检验：", {
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
  s.addText("灰色 = 无法区分（p ≥ 0.05）", { x: 0.88, y: 4.71, w: 4.2, h: 0.26, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });
  s.addShape(pres.shapes.RECTANGLE, { x: 4.9, y: 4.74, w: 0.18, h: 0.18, fill: { color: "E4F0F0" } });
  s.addText("青色 = 可以区分", { x: 5.18, y: 4.71, w: 4.0, h: 0.26, margin: 0, fontFace: BODY, fontSize: 10, color: MUTED });

  card(s, {
    x: 0.6, y: 5.06, w: 5.9, h: 1.45, accent: CORAL, fill: "FBEDE7",
    title: "「无法区分」不具传递性", titleSize: 14, bodySize: 11,
    body: "ExtraTrees 名义上领先于所有模型（对 SVM-RBF p = 0.041），但未通过 15 次检验的 Bonferroni 阈值（0.0033），且仅赢 14/25 折。\n\nSVM-RBF、集成、SVM-poly 三者互相无法区分（p = 0.270–0.539）。",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 5.06, w: 5.9, h: 1.45, accent: MOSS,
    title: "所以取舍必须依据别的东西", titleSize: 14, bodySize: 11,
    body: "剩下两条依据：判决阈值处的错误结构（SVM-RBF 特异度 0.703，ExtraTrees 0.620），以及信号微弱处的稳健性。\n\n真正决定取舍的检验在下一页。",
  });

}

// ================================================================ 15b WHY NOT EXTRATREES
{
  const s = slide("为什么 ExtraTrees 没有取代主模型", "建模 · 模型选择");
  s.addText("AUC 高 0.023、p=0.041（未经 15 次比较校正），不足以定夺模型选择。决定性的检验是：信号弱的时候两个模型各自表现如何——于是我们在每个采样月份分层内部并排重跑。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("分层"), th("n"), th("阳性"), th("ExtraTrees"), th("SVM-RBF"), th("Δ")],
    ["7 月", "86", "52", "0.988", "0.975", { text: "+0.013", options: { color: MOSS } }],
    ["7 月 + 8 月", "123", "77", "0.970", "0.961", { text: "+0.008", options: { color: MOSS } }],
    ["10 月", "42", "24", "0.827", "0.819", { text: "+0.008", options: { color: MOSS } }],
    [{ text: "1 月 + 10 月（最弱层）", options: { fill: { color: "FBEDE7" }, bold: true } },
     { text: "92", options: { fill: { color: "FBEDE7" } } }, { text: "29", options: { fill: { color: "FBEDE7" } } },
     { text: "0.715", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } },
     { text: "0.774", options: { fill: { color: "FBEDE7" }, bold: true } },
     { text: "−0.060", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
  ], { y: 2.0, colW: [3.3, 1.4, 1.4, 2.2, 2.0, 1.8], rowH: 0.46 });

  card(s, {
    x: 0.6, y: 4.4, w: 5.9, h: 1.9, accent: CORAL, fill: "FBEDE7",
    title: "领先只来自容易的分层",
    body: "在任务本已容易的分层上 ExtraTrees 多赚 +0.008～+0.013，却在最困难的分层上丢掉 0.060。\n\n这正是强正则化的特征：信号强时无害，信号弱时把真实结构一并抹掉。",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 4.4, w: 5.9, h: 1.9, accent: MOSS,
    title: "从中保留下来的东西",
    body: "两个模型的 permutation importance 排名高度一致：Spearman ρ = 0.738（p = 3.3e-13），Top-15 重合 10/15。\n\n因此 biomarker 面板不依赖于选哪个模型——这反过来加强了「生物学发现」一节的结论。",
  });

  s.addText("ExtraTrees 自身的置换检验同样通过（实测 0.856，零分布 0.496 ± 0.046，p = 0.0099）。", {
    x: 0.6, y: 6.45, w: 12.1, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, color: MUTED, italic: true,
  });
}

// ================================================================ 18 DIVIDER 4
divider("04", "信号是真的吗？", "置换检验、混杂因子与分层再分析");

// ================================================================ 19 PERMUTATION
{
  const s = slide("置换检验", "有效性 · 过拟合");
  s.addText("把标签打乱 100 次，每次重跑整条 pipeline。如果模型能在噪声里找出结构，那么实测分数就毫无意义。", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });

  stat(s, { x: 0.9, y: 2.15, w: 3.4, value: "0.743", label: "实测 AUC", sub: "真实标签" });
  stat(s, { x: 4.7, y: 2.15, w: 3.4, value: "0.501", label: "零分布均值", sub: "± 0.049，最大 0.614", color: MUTED });
  stat(s, { x: 8.5, y: 2.15, w: 3.9, value: "p = 0.0099", label: "经验 p 值", sub: "100 次打乱中 0 次达到实测分数", valueSize: 34, color: MOSS });

  card(s, {
    x: 0.6, y: 4.05, w: 12.1, h: 1.15, accent: MOSS,
    title: "如何解读",
    body: "零分布正好落在理论值 0.50 上，100 次打乱中的最大值为 0.614，远低于实测的 0.743。说明 pipeline 没有从噪声中制造信号。",
  });
  card(s, {
    x: 0.6, y: 5.4, w: 12.1, h: 1.05, accent: TEAL,
    title: "它不能证明什么",
    body: "置换检验排除的是过拟合，对混杂完全无能为力——一个纯粹靠采样季节做预测的模型同样能通过。这个问题在下一页处理。",
  });
}

// ================================================================ 20 CONFOUNDER
{
  const s = slide("混杂因子：采样月份", "有效性 · 混杂");
  table(s, [
    [th("月份"), th("1月"), th("7月"), th("8月"), th("10月"), th("11月"), th("12月")],
    ["阴性", "45", "34", "12", "18", { text: "0", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }, { text: "0", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
    ["阳性", "5", "52", "25", "24", "27", "18"],
  ], { y: 1.7, colW: [2.5, 1.77, 1.77, 1.77, 1.77, 1.77, 1.77], rowH: 0.5 });

  card(s, {
    x: 0.6, y: 3.45, w: 5.9, h: 1.62, accent: CORAL, fill: "FBEDE7",
    title: "问题所在",
    body: "11–12 月 100% 阳性，1 月 90% 阴性。仅凭采样月份就能达到 AUC 0.777——此时还没考虑任何一个菌。",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 6.8, y: 3.45, w: 5.9, h: 1.62, accent: CORAL, fill: "FBEDE7",
    title: "它同样污染了特征",
    body: "菌群 → 预测「是否采样于 11–12 月」：AUC 0.777\n菌群 → 预测采样地点：AUC 0.795\n\n菌群编码了这只鸟在何时何地被捕获。",
    bodyColor: "7A2E14",
  });
  card(s, {
    x: 0.6, y: 5.32, w: 12.1, h: 1.2, accent: TEAL,
    title: "为何这并非致命",
    body: "禽流感流行率的季节性是真实的生物学现象，不只是采样安排的产物。真正的问题是：固定季节之后还剩下什么——这需要分层再分析，而不是一个 p 值。",
  });
}

// ================================================================ 21 STRATIFIED
{
  const s = slide("在同一月份内部重跑", "有效性 · 分层");
  table(s, [
    [th("分层"), th("n"), th("阳性数"), th("AUC")],
    [{ text: "7 月", options: rowHi }, { text: "86", options: rowHi }, { text: "52", options: rowHi }, { text: "0.964", options: rowHi }],
    [{ text: "7 月 + 8 月", options: rowHi }, { text: "123", options: rowHi }, { text: "77", options: rowHi }, { text: "0.944", options: rowHi }],
    ["10 月", "42", "24", "0.860"],
    [{ text: "1 月 + 10 月", options: { fill: { color: "FBEDE7" } } }, { text: "92", options: { fill: { color: "FBEDE7" } } }, { text: "29", options: { fill: { color: "FBEDE7" } } }, { text: "0.668", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
    [{ text: "1 月 / 11 月+12 月", options: { color: MUTED, italic: true } }, { text: "50 / 45", options: { color: MUTED, italic: true } }, { text: "5 / 45", options: { color: MUTED, italic: true } }, { text: "少数类过少，无法建模", options: { color: MUTED, italic: true } }],
  ], { y: 1.7, colW: [4.4, 2.2, 2.5, 3.0], rowH: 0.48 });

  card(s, {
    x: 0.6, y: 4.65, w: 5.9, h: 1.55, accent: MOSS,
    title: "信号存活下来了",
    body: "固定采样月份后，夏季各层的 AUC 仍保持在 0.86–0.96。季节混杂无法解释掉这一关联。",
  });
  card(s, {
    x: 6.8, y: 4.65, w: 5.9, h: 1.55, accent: CORAL, fill: "FBEDE7",
    title: "但效应并不均匀",
    body: "1 月 + 10 月降到 0.668。效应在季节之间高度异质，只报 0.944 属于挑选有利结果。",
    bodyColor: "7A2E14",
  });
}

// ================================================================ 22 ABLATION (stratified)
{
  const s = slide("\u56fa\u5b9a\u5b63\u8282\u540e\u7684\u83cc\u7fa4\u6548\u5e94", "\u6709\u6548\u6027 \u00b7 \u4e3b\u4f30\u8ba1");
  s.addText("\u5b63\u8282\u662f\u6df7\u6742\u56e0\u5b50\uff0c\u4e0d\u662f\u6211\u4eec\u611f\u5174\u8da3\u7684\u66b4\u9732\u2014\u2014\u56e0\u6b64\u5b83\u4e0d\u8be5\u8fdb\u5165\u6a21\u578b\u3002\u6211\u4eec\u6539\u4e3a\u56fa\u5b9a\u6708\u4efd\u3001\u53ea\u5728\u5c42\u5185\u6bd4\u8f83\u3002\u6a21\u578b\u4e2d\u9664\u4e86 70 \u4e2a CLR \u7279\u5f81\u4e4b\u5916\u522b\u65e0\u4ed6\u7269\u3002", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("\u5206\u5c42"), th("n"), th("AUC"), th("\u51c6\u786e\u7387"), th("\u57fa\u7ebf"), th("\u7279\u5f02\u5ea6"), th("MCC")],
    [{ text: "\u5168\u90e8\u6837\u672c\uff08\u672a\u5206\u5c42\uff09", options: { italic: true, color: MUTED } },
     { text: "260", options: { italic: true, color: MUTED } }, { text: "0.833", options: { italic: true, color: MUTED } },
     { text: "0.772", options: { italic: true, color: MUTED } }, { text: "0.581", options: { italic: true, color: MUTED } },
     { text: "0.703", options: { italic: true, color: MUTED } }, { text: "0.530", options: { italic: true, color: MUTED } }],
    [{ text: "7 \u6708", options: rowHi }, { text: "86", options: rowHi }, { text: "0.965", options: rowHi },
     { text: "0.949", options: rowHi }, { text: "0.605", options: rowHi }, { text: "0.929", options: rowHi }, { text: "0.893", options: rowHi }],
    ["8 \u6708", "37", "0.910", "0.838", "0.676", "0.667", "0.618"],
    [{ text: "10 \u6708", options: { fill: { color: "FBEDE7" }, bold: true } },
     { text: "42", options: { fill: { color: "FBEDE7" } } }, { text: "0.734", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } },
     { text: "0.676", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }, { text: "0.571", options: { fill: { color: "FBEDE7" } } },
     { text: "0.533", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }, { text: "0.328", options: { fill: { color: "FBEDE7" }, bold: true, color: CORAL } }],
    ["7 \u6708 + 8 \u6708", "123", "0.959", "0.930", "0.626", "0.896", "0.850"],
  ], { y: 2.0, colW: [3.5, 1.2, 1.5, 1.7, 1.5, 1.35, 1.35], rowH: 0.42, fontSize: 11 });

  card(s, {
    x: 0.6, y: 4.85, w: 5.9, h: 1.6, accent: TEAL,
    title: "\u62a5\u533a\u95f4\uff0c\u4e0d\u62a5\u5e73\u5747\u503c", titleSize: 14, bodySize: 11,
    body: "AUC 0.734\u20130.965 \u00b7 \u51c6\u786e\u7387 0.676\u20130.949 \u00b7 MCC 0.328\u20130.893\u3002\n\n\u6837\u672c\u91cf\u52a0\u6743\u5e73\u5747\uff080.894\uff09\u4f1a\u63a9\u76d6 10 \u6708\uff0c\u800c\u4e14\u5b83\u7684\u6743\u91cd\u6765\u81ea\u91c7\u6837\u6d3b\u52a8\u7684\u89c4\u6a21\uff0c\u4e0d\u662f\u79d1\u5b66\u610f\u4e49\u3002",
  });
  card(s, {
    x: 6.8, y: 4.85, w: 5.9, h: 1.6, accent: CORAL, fill: "FBEDE7",
    title: "\u5fc5\u987b\u4e0e\u8fd9\u4e9b\u6570\u5b57\u540c\u884c\u7684\u4e24\u6761\u9650\u5236", titleSize: 14, bodySize: 11,
    body: "10 \u6708\u7684\u7279\u5f02\u5ea6\u53ea\u6709 0.533\u2014\u2014\u5bf9\u9634\u6027\u6837\u672c\u51e0\u4e4e\u7b49\u540c\u4e8e\u731c\u3002\n\n260 \u4e2a\u6837\u672c\u4e2d\u53ea\u6709 165 \u4e2a\u80fd\u8fdb\u5165\u5206\u5c42\u5206\u6790\uff1a11 \u6708\u4e0e 12 \u6708 100% \u9633\u6027\uff0cAUC \u5728\u90a3\u91cc\u65e0\u5b9a\u4e49\u3002",
    bodyColor: "7A2E14",
  });

  s.addText("\u82e5\u6539\u7528\u534f\u53d8\u91cf\u8c03\u6574\uff0c\u589e\u91cf\u4e3a +0.043\uff08L2-LR\uff09\u81f3 +0.105\uff08SVM-RBF\uff09\u2014\u2014\u4f9d\u8d56\u6a21\u578b\u9009\u62e9\uff0c\u8fd9\u6b63\u662f\u4e3b\u4f30\u8ba1\u91c7\u7528\u5206\u5c42\u7684\u539f\u56e0\u3002", {
    x: 0.6, y: 6.55, w: 11.8, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED, italic: true,
  });
}

// ================================================================ 22b DECONFOUND
{
  const s = slide("如果直接删掉被混杂的月份呢？", "有效性 · 敏感性分析");
  s.addText("11–12 月 100% 阳性、1 月 90% 阴性。在这 95 个样本上，模型只要学会「这是几月」就能拿高分，学的不是菌群。排除它们之后（n = 260 → 165）：", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("特征集"), th("全队列 n=260"), th("子集 n=165"), th("变化")],
    ["仅协变量", "0.881", "0.774", { text: "−0.107", options: { color: MUTED } }],
    ["仅菌群", "0.766", { text: "0.933", options: { bold: true } }, { text: "+0.168", options: { color: MOSS, bold: true } }],
    ["菌群 + 协变量", "0.924", "0.951", { text: "+0.027", options: { color: MOSS } }],
    [{ text: "菌群独立增量", options: rowHi }, { text: "+0.043", options: rowHi }, { text: "+0.177", options: rowHi }, { text: "×4", options: rowHi }],
  ], { x: 0.6, y: 2.0, w: 6.9, colW: [2.7, 1.4, 1.5, 1.3], rowH: 0.44, fontSize: 11 });

  card(s, {
    x: 7.8, y: 2.0, w: 4.9, h: 2.2, accent: MOSS,
    title: "去混杂确实成功了", titleSize: 14, bodySize: 11,
    body: "仅用月份一个变量预测标签：\n\n   全队列   AUC 0.775\n   子集     AUC 0.426\n\n月份已被彻底中和。子集上的置换检验：p = 0.0099。",
  });

  card(s, {
    x: 0.6, y: 4.45, w: 5.9, h: 1.95, accent: TEAL,
    title: "Biomarker 更显著了，而不是换了一批", titleSize: 14, bodySize: 11,
    body: "显著菌数 19/70 → 34/65；t 统计量 Spearman ρ = 0.879；两边同时显著 18 个。\n\nVeillonella（FDR 3.7e-29）与 Prevotella——此前因共线性被挤出九菌面板的那两个——现在成为最强信号。",
  });
  card(s, {
    x: 6.8, y: 4.45, w: 5.9, h: 1.95, accent: CORAL, fill: "FBEDE7",
    title: "但这是敏感性分析，不是结果本身", titleSize: 14, bodySize: 11,
    body: "被排除的 95 个样本同时也是最难分的一批（Jan+Oct 分层 AUC 仅 0.668），因此两个 AUC 不可直接比较。\n\n而且空间混杂原封不动：地点 → 标签 AUC 0.740，菌群 → 地点 AUC 0.753。",
    bodyColor: "7A2E14",
  });

  s.addText("请把它读作菌群独立信息量的一个区间：保守估计 +0.043，消除时间混杂后 +0.177。", {
    x: 0.6, y: 6.5, w: 11.6, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: MUTED, italic: true,
  });
}

// ================================================================ 22c SITE GENERALIZATION
{
  const s = slide("换一个湿地还能用吗？", "有效性 · 泛化");
  s.addText("随机交叉验证允许模型靠「认地点」拿分，按地点分组则切断这条捷径。朴素结果初看是灾难性的——而且具有误导性。", {
    x: 0.6, y: 1.42, w: 12.1, h: 0.5, margin: 0, fontFace: BODY, fontSize: 12.5, color: MUTED, valign: "top",
  });
  table(s, [
    [th("留一地点交叉验证"), th("LOLO AUC"), th("随机 CV"), th("差")],
    ["SVM-RBF", { text: "0.443", options: { color: CORAL, bold: true } }, "0.853", { text: "−0.409", options: { color: CORAL } }],
    ["ExtraTrees", { text: "0.443", options: { color: CORAL, bold: true } }, "0.842", { text: "−0.399", options: { color: CORAL } }],
    ["L1-LR", { text: "0.469", options: { color: CORAL, bold: true } }, "0.777", { text: "−0.308", options: { color: CORAL } }],
  ], { x: 0.6, y: 2.0, w: 6.0, colW: [2.1, 1.35, 1.35, 1.2], rowH: 0.44, fontSize: 11 });

  card(s, {
    x: 6.9, y: 2.0, w: 5.8, h: 1.94, accent: CORAL, fill: "FBEDE7",
    title: "为什么具有误导性", titleSize: 14, bodySize: 11,
    body: "本队列的地点与月份几乎可以互换：Sacramento 80 个中 46 个在 1 月，GIWA 96 个中 82 个在 7–8 月，ConawayRanch 只在秋冬。\n\n所以「留一地点」同时也是「留一季节」。",
    bodyColor: "7A2E14",
  });

  s.addText("固定季节（仅 7–8 月）后重做留一地点：", {
    x: 0.6, y: 4.2, w: 12.1, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 15, bold: true, color: INK,
  });
  table(s, [
    [th("留出地点"), th("n"), th("阳性"), th("AUC")],
    ["GIWA", "82", "51", { text: "0.919", options: { color: "2E6B3A", bold: true } }],
    ["MandevilleIsland", "14", "9", { text: "0.844", options: { color: "2E6B3A", bold: true } }],
    ["SuisunMarsh/Balboa", "11", "1", "1.000"],
    [{ text: "平均", options: rowHi }, { text: "", options: rowHi }, { text: "", options: rowHi }, { text: "0.921", options: rowHi }],
  ], { x: 0.6, y: 4.6, w: 6.0, colW: [2.55, 1.05, 1.05, 1.35], rowH: 0.42, fontSize: 11 });

  card(s, {
    x: 6.9, y: 4.6, w: 5.8, h: 1.68, accent: MOSS,
    title: "空间泛化不是瓶颈", titleSize: 14, bodySize: 11,
    body: "在季节可比的前提下，模型跨湿地迁移的 AUC 为 0.84–0.92。\n\n把朴素平均值拖下去的 Sacramento 那一折，其 46 个 1 月样本中只有 1 个阳性——那个 AUC 是单只鸟的排名百分位，不是一个估计值。",
  });
}

// ================================================================ 23 DIVIDER 5
divider("05", "生物学发现", "哪些菌携带信号——以及方法之间在哪里产生分歧");

// ================================================================ 24 BIOMARKERS
{
  const s = slide("九个 Biomarker，三套独立方法", "发现 · Biomarker 面板");
  s.addText("SVM permutation importance、L1 稳定性选择（200 次 bootstrap）、差异丰度（CLR + Welch t + BH-FDR）三套方法独立运行后取交集。", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED,
  });
  table(s, [
    [th("属"), th("科"), th("SVM 重要性"), th("L1 频率"), th("方向"), th("FDR")],
    ["（未定属）", "Ruminococcaceae", "0.0198", "0.925", { text: "阳性 ↑", options: { color: MOSS, bold: true } }, "0.012"],
    ["Varibaculum", "Actinomycetaceae", "0.0131", "0.985", { text: "阳性 ↑", options: { color: MOSS, bold: true } }, "2e-04"],
    ["Rothia", "Micrococcaceae", "0.0100", "0.995", { text: "阳性 ↓", options: { color: CORAL, bold: true } }, "2e-06"],
    ["Psittacicella", "Pasteurellaceae", "0.0079", "0.925", { text: "阳性 ↑", options: { color: MOSS, bold: true } }, "9e-04"],
    ["Staphylococcus", "Staphylococcaceae", "0.0060", "0.940", { text: "阳性 ↓", options: { color: CORAL, bold: true } }, "1e-03"],
    ["Lawsonella", "Corynebacteriaceae", "0.0055", "0.930", { text: "阳性 ↓", options: { color: CORAL, bold: true } }, "0.017"],
    [{ text: "Candidatus Arthromitus (SFB)", options: rowHi }, { text: "Clostridiaceae", options: rowHi }, { text: "0.0050", options: rowHi }, { text: "0.995", options: rowHi }, { text: "阳性 ↑", options: { fill: { color: "E4F0F0" }, color: "3F7A47", bold: true } }, { text: "4e-05", options: rowHi }],
    [{ text: "2 个未注释特征", options: { italic: true, color: MUTED } }, { text: "—", options: { color: MUTED } }, { text: "—", options: { color: MUTED } }, { text: "≥ 0.915", options: { color: MUTED } }, { text: "阳性 ↑", options: { color: MUTED } }, { text: "≤ 1e-04", options: { color: MUTED } }],
  ], { y: 2.0, colW: [3.5, 3.0, 1.7, 1.5, 1.5, 1.4], rowH: 0.42, fontSize: 11 });

  card(s, {
    x: 0.6, y: 5.78, w: 12.1, h: 1.08, accent: MOSS,
    title: "Candidatus Arthromitus 是最具可解释性的一个命中",
    body: "分节丝状菌（SFB）在感染个体中富集。SFB 是已知的 Th17 与黏膜 IgA 应答诱导者——这为该关联提供了一条独立的免疫学支持证据。",
  });
}

// ================================================================ 25 DISAGREEMENT
{
  const s = slide("方法之间的分歧在哪里", "发现 · 解读");
  s.addText("交集是最安全的名单。而生物学恰恰藏在分歧里。", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: MUTED, italic: true,
  });

  card(s, {
    x: 0.6, y: 2.0, w: 5.9, h: 2.5, accent: TEAL,
    title: "Veillonella——被 L1 剔除，但真实存在",
    bodySize: 11.5,
    body: "permutation importance 排名第 2，且在 25 折中 100% 为正。FDR = 2.3e-05。\n\n然而它的 L1 选中频率只有 0.105。\n\n这是教科书式的共线性：L1 在一组相关特征中只保留一个，丢弃其余。因为 L1 没选它就排除 Veillonella，是错误的。",
  });
  card(s, {
    x: 6.8, y: 2.0, w: 5.9, h: 2.5, accent: MOSS,
    title: "Moraxella、Fusibacter、Cetobacterium",
    bodySize: 11.5,
    body: "permutation importance 为 0.008–0.009，在 88% 的折中为正。\n\n单变量 FDR：0.87、0.90、0.97——完全不显著。\n\n它们只通过与其他菌的交互起作用。任何单变量检验都不可能发现它们——而这正是 RBF 核所利用的东西。",
  });

  card(s, {
    x: 0.6, y: 4.75, w: 12.1, h: 1.5, accent: DARK2,
    title: "对论文写作的实际影响",
    body: "任何单一方法导出的 biomarker 面板，都会以一种特定且可预测的方式出错：单变量检验漏掉交互驱动的菌；L1 漏掉共线的菌；permutation importance 单独使用则给不出效应方向。报告三者交集并点名例外，比任何单一排序都更站得住脚，而代价只是多做一次分析。",
  });
}

// ================================================================ 26 NONLINEARITY
{
  const s = slide("存在真实非线性结构的证据", "发现 · 非线性");

  card(s, {
    x: 0.6, y: 1.6, w: 5.9, h: 2.1, accent: TEAL,
    title: "证据一——核函数带来的差距",
    body: "SVM-RBF     AUC 0.835\nSVM-linear  AUC 0.755\n\nΔ = +0.080，25 折中 24 折胜，Wilcoxon p < 0.0001。\n\n这是一次受控对比——同一模型族，只换核函数——也是本报告中最具决定性的检验。",
  });
  card(s, {
    x: 6.8, y: 1.6, w: 5.9, h: 2.1, accent: TEAL,
    title: "证据二——「隐形」的菌",
    body: "若干特征具有可观的 permutation importance，但在单变量检验中完全不显著（FDR 0.87–0.97）。\n\n它们的效应只存在于与其他菌的组合之中。",
  });

  card(s, {
    x: 0.6, y: 3.95, w: 12.1, h: 1.25, accent: MOSS,
    title: "生物学解读",
    body: "这与已知的肠道菌群规律一致：菌通过菌群联合体与代谢交叉喂养发挥作用，而非孤立起效。单个属很少能独自决定一个免疫表型。\n\n与模型比较那一页形成对照：在那里，领先的几个模型互相分不开；在这里，一次受控改动在每一折上都干净地分开了。",
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 5.45, w: 12.1, h: 1.15, fill: { color: DARK } });
  s.addText("一处需要记录在案的修正", {
    x: 0.95, y: 5.62, w: 11.5, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: W,
  });
  s.addText("早先一轮分析基于「线性模型与树模型表现相当」得出「非线性成分不强」的结论。加入 RBF 核后该结论被推翻。结论改变是因为模型类别不完整，而非数据发生了变化。", {
    x: 0.95, y: 5.92, w: 11.5, h: 0.55, margin: 0, fontFace: BODY, fontSize: 11.5, color: MOSS,
  });
}

// ================================================================ 27 LIMITATIONS
{
  const s = slide("八项已知局限", "局限");
  const lims = [
    ["跨研究泛化失败", "按 BioProject 做 GroupKFold：AUC 0.54 ± 0.29。四个研究的宿主、组织与地域各不相同。"],
    ["上游过滤规则未知", "275 个特征对禽类 16S 而言远远偏少。若过滤时用到了标签，本报告所有数字都被高估。"],
    ["抽平方式不严谨", "208 个样本恰好 5000，118 个低于此值。CLR 绕开了该问题，但依赖深度的指标绕不开。"],
    ["判决阈值未优化", "所有准确率均在固定阈值 0.5 下计算。调优需把阈值选择嵌套进 CV。"],
    ["分类学分辨率受限", "种水平完全空白，55 个特征无属注释。生物学解释止步于属/科。"],
    ["混杂基线偏高", "仅协变量即达 0.881。关于菌群的结论必须始终相对这条基线陈述。"],
    ["多重比较抬高了最优分", "共比较 17 个模型，最优是 17 选 1。Bonferroni 校正阈值约 p < 0.003。"],
    ["采样设计把空间与时间绑死", "地点与月份几乎可互换，故跨季节部署无法检验。跨地点迁移本身是好的（0.84–0.92）。"],
  ];
  lims.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.25, y = 1.5 + row * 1.33;
    card(s, {
      x, y, w: 5.9, h: 1.18, accent: CORAL, fill: "FBEDE7",
      title: `${i + 1}.  ${l[0]}`, titleSize: 12.5, body: l[1], bodySize: 10.5, bodyColor: "7A2E14",
    });
  });
  s.addText("与 README 中的表述完全一致——未因汇报场合而弱化。", {
    x: 0.6, y: 6.9, w: 12.1, h: 0.3, margin: 0,
    fontFace: BODY, fontSize: 11, color: MUTED, italic: true, valign: "top",
  });
}

// ================================================================ 28 CONCLUSIONS
{
  const s = slide("结论", "总结");
  const cs = [
    "野鸭肠道菌群携带真实且可复现的流感感染信号（置换检验 p = 0.0099）。",
    "SVM-RBF 是主模型——AUC 0.835、MCC 0.535——在 17 个模型的比较中显著优于随机森林（p = 0.017）、XGBoost（p = 0.005）与 L1-LR（p < 0.001）。",
    "信号部分来自非线性：RBF 核比线性核多出 0.073 的 AUC，且若干菌只在组合中起作用。",
    "九个菌通过了三套独立筛选方法的交叉验证；其中 Candidatus Arthromitus（SFB）有独立的免疫学证据支持。",
    "季节是混杂因子，因此主估计只保留菌群特征并固定月份：AUC 从 10 月的 0.734 到 7 月的 0.965，准确率 0.676 至 0.949。效应真实存在，但强烈依赖季节。",
    "ExtraTrees 分数更高（AUC 0.858，p = 0.041 未校正），但在最弱分层上更差（0.715 对 0.774）——其领先只来自本已容易的分层。",
    "结论仅适用于 UC Davis 野鸭队列，不可跨宿主或跨研究外推。",
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
  const s = slide("全流程可复现", "可复现性");
  table(s, [
    [th("脚本"), th("功能")],
    ["build_features.py", "构建特征矩阵 + 质控报告（深度、稀疏度、泄漏审计）"],
    ["export_ml_dataset.py", "导出含元数据与协变量的开箱即用建模数据集"],
    ["train_eval.py", "嵌套 CV、置换检验、混杂检查、月份分层、稳定性选择"],
    ["compare_models.py + explore_models.py", "17 模型 × 九指标横向比较"],
    ["svm_analysis.py", "超参网格扩展 + permutation importance"],
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
    body: "40 个文件纳入版本控制：全部代码、全部输入数据、全部结果表与图，以及中文（README.md）与英文（README.en.md）两份文档。",
    bodySize: 12,
  });
}

// ================================================================ 30 CLOSING
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  pageNo++;
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.32, fill: { color: MOSS } });
  s.addText("下一步工作", {
    x: 1.0, y: 1.35, w: 11.3, h: 0.8, margin: 0,
    fontFace: HEAD, fontSize: 40, bold: true, color: W,
  });

  const nx = [
    ["确认上游过滤规则", "唯一可能推翻全部性能数字的因素。需要向数据提供方核实。"],
    ["把判决阈值纳入嵌套", "将阈值选择放进 CV 内层，以得到无偏的准确率。"],
    ["扩充队列", "跨研究泛化需要的是更多同一宿主的个体，而不是更多不同宿主的研究。"],
  ];
  nx.forEach((n, i) => {
    const y = 2.55 + i * 1.25;
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 11.3, h: 1.05, fill: { color: DARK2 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y, w: 0.075, h: 1.05, fill: { color: MOSS } });
    s.addText(n[0], { x: 1.35, y: y + 0.14, w: 10.6, h: 0.35, margin: 0, fontFace: HEAD, fontSize: 16, bold: true, color: W });
    s.addText(n[1], { x: 1.35, y: y + 0.52, w: 10.6, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12, color: MOSS });
  });

  s.addText("Sihua Peng  ·  佐治亚大学公共卫生学院  ·  pengsihua99@gmail.com", {
    x: 1.0, y: 6.75, w: 11.3, h: 0.4, margin: 0, fontFace: BODY, fontSize: 12, color: TEALL,
  });
}

pres.writeFile({ fileName: path.join(__dirname, "Influenza_Microbiome_ML_Overview_ZH.pptx") })
  .then((f) => console.log("Written:", f, "| slides:", pageNo));
