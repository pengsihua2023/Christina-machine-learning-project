#!/usr/bin/env python3
"""
一致性检查：同一批数字存在于 4 份交付物中，本脚本防止改一处漏三处。

被检查的文件
------------
  README.md                    中文文档
  README.en.md                 英文文档
  slides/make_slides.js        英文幻灯片源
  slides/make_slides_zh.js     中文幻灯片源
  manuscript/abstract.md       摘要

两类检查
--------
  [A] 权威值检查：从 results/*.json 与 *.csv 读出权威值，确认文档中出现的
      对应数字与之一致。定位方式是「上下文关键词 + 邻近数字」，因此重排版
      不会误报，但改数字会。
  [B] 陈旧值扫描：列出已被推翻/已被替换的表述，若仍出现即报错。
      这是最直接防止"改了新的、忘了删旧的"的手段。

退出码 0 = 全部通过；1 = 存在不一致。

用法:
    python3 check_consistency.py
    python3 check_consistency.py --verbose      # 打印每一条通过的检查
"""
import argparse
import json
import os
import re
import sys

import pandas as pd

DOCS = {
    "README.md": "README.md",
    "README.en.md": "README.en.md",
    "slides-en": "slides/make_slides.js",
    "slides-zh": "slides/make_slides_zh.js",
    "abstract": "manuscript/abstract.md",
}

# ---------------------------------------------------------------- 权威值
def canonical():
    """从 results/ 读出权威值。键名用于 CHECKS 引用。"""
    c = {}
    strat = json.load(open("results/stratified_effect.json"))
    per = {r["stratum"]: r for r in strat["per_stratum"]}
    c["strat_auc_lo"] = strat["auc_range"][0]
    c["strat_auc_hi"] = strat["auc_range"][1]
    c["strat_acc_lo"] = strat["acc_range"][0]
    c["strat_acc_hi"] = strat["acc_range"][1]
    c["strat_mcc_lo"] = strat["mcc_range"][0]
    c["strat_mcc_hi"] = strat["mcc_range"][1]
    c["strat_covered"] = strat["n_covered"]
    c["strat_weighted"] = strat["weighted_auc_reference_only"]
    for key, name in [("jul", "7 月"), ("aug", "8 月"), ("oct", "10 月"),
                      ("julaug", "7+8 月（同季节合并）"),
                      ("pooled", "全部样本（未分层）")]:
        r = per[name]
        c[f"{key}_n"] = r["n"]
        c[f"{key}_auc"] = r["AUC"]
        c[f"{key}_acc"] = r["accuracy"]
        c[f"{key}_spec"] = r["specificity"]
        c[f"{key}_mcc"] = r["MCC"]

    summ = json.load(open("results/summary.json"))
    c["n_total"] = summ["n"]
    c["n_pos"] = summ["n_pos"]
    c["perm_p"] = summ["permutation"]["p_value"]
    c["perm_null"] = summ["permutation"]["null_mean"]

    dec = json.load(open("results/deconfound_summary.json"))
    c["dec_n_sub"] = dec["n_sub"]
    c["dec_month_full"] = dec["month_auc_full"]
    c["dec_month_sub"] = dec["month_auc_sub"]
    c["dec_micro_sub"] = dec["ablation"]["sub"]["micro"]
    c["dec_cov_full"] = dec["ablation"]["full"]["cov"]
    c["dec_inc_full"] = dec["ablation"]["full"]["increment"]

    site = json.load(open("results/site_generalization.json"))
    sf = {r["held_out_site"][:6]: r["AUC"] for r in site["season_fixed_lolo"]}
    c["site_giwa"] = sf.get("Grizzl")
    c["site_mand"] = sf.get("Mandev")
    ss = pd.DataFrame(site["summary"]).set_index("model")
    c["lolo_svm"] = ss.loc["SVM-RBF", "LOLO_AUC_mean"]

    mc = pd.read_csv("results/model_comparison_all16.csv").set_index("Model")
    c["svm_auc"] = mc.loc["SVM-RBF", "ROC_AUC"]
    c["et_auc"] = mc.loc["ExtraTrees", "ROC_AUC"]
    c["svmlin_auc"] = mc.loc["SVM-linear", "ROC_AUC"]
    c["n_models"] = int(len(mc) - 1)  # 扣除基线行
    return c


def fmt(v, nd=3):
    return f"{v:.{nd}f}"


# ---------------------------------------------------------------- 检查表
# (标签, 权威值键, 小数位, 上下文正则, 应出现的文件列表)
# 上下文正则里用 {V} 占位，运行时替换为权威值字符串。
CHECKS = [
    # --- 分层主估计（本项目主结果，四处都必须一致）---
    ("7月 AUC", "jul_auc", 3, r"0\.965", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("7月 accuracy", "jul_acc", 3, r"0\.949", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("7月 特异度", "jul_spec", 3, r"0\.929", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("7月 MCC", "jul_mcc", 3, r"0\.893", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("10月 AUC", "oct_auc", 3, r"0\.734", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("10月 accuracy", "oct_acc", 3, r"0\.676", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("10月 特异度", "oct_spec", 3, r"0\.533", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("10月 MCC", "oct_mcc", 3, r"0\.328", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("7+8月 AUC", "julaug_auc", 3, r"0\.959", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("未分层 AUC", "pooled_auc", 3, r"0\.833", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("可分层样本数", "strat_covered", 0, r"165", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    # --- 队列 ---
    ("样本总数", "n_total", 0, r"260", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("阳性数", "n_pos", 0, r"151", ["README.md", "README.en.md", "abstract"]),
    # --- 置换检验 ---
    ("置换 p", "perm_p", 4, r"0\.0099", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("置换零分布", "perm_null", 3, r"0\.501", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    # --- 模型比较 ---
    ("SVM-RBF AUC", "svm_auc", 3, r"0\.839", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("ExtraTrees AUC", "et_auc", 3, r"0\.859", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    ("SVM-linear AUC", "svmlin_auc", 3, r"0\.766", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("模型总数", "n_models", 0, r"17", ["README.md", "README.en.md", "slides-en", "slides-zh", "abstract"]),
    # --- 混杂 ---
    ("仅协变量 AUC", "dec_cov_full", 3, r"0\.881", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("去混杂子集 n", "dec_n_sub", 0, r"165", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("去混杂 仅菌群", "dec_micro_sub", 3, r"0\.933", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("月份预测力(全)", "dec_month_full", 3, r"0\.775", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("月份预测力(子集)", "dec_month_sub", 3, r"0\.426", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    # --- 跨采样点 ---
    ("LOLO SVM", "lolo_svm", 3, r"0\.443", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("季节固定 GIWA", "site_giwa", 3, r"0\.919", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
    ("季节固定 Mandeville", "site_mand", 3, r"0\.844", ["README.md", "README.en.md", "slides-en", "slides-zh"]),
]

# ---------------------------------------------------------------- 陈旧值
# 这些表述曾出现在文档中但已被推翻或替换，若仍存在即报错。
STALE = [
    (r"六模型|六种模型|six[- ]model|6 models compared", "「六模型」——已扩展为 17 模型"),
    (r"六项已知局限|Six Known Limitations|七项已知局限|Seven Known Limitations",
     "局限数量过时——现为八项"),
    (r"前四名(?!中有三个)[^。]{0,4}(互相|彼此)无法区分|(top|best) four[^.]{0,25}mutually indistinguishable",
     "「前四名互相无法区分」——不成立，无法区分不具传递性"),
    (r"加权.{0,8}AUC 0\.908|0\.908", "0.908 是旧口径的加权值，现为 0.894 且不作主报告"),
    # +0.177 允许出现在 §4.5/§4.5 敏感性分析的表格里，但不得出现在结论/摘要/执行摘要
     (r"\+0\.177", "+0.177 只能出现在敏感性分析章节，不可进入结论或摘要"),
    (r"AUC 0\.944 for July|7–8 月 AUC 0\.944", "0.944 为旧分层口径，现为 0.959"),
]

# 模式序号 -> 允许出现该模式的文件（确有必要引用旧值/在敏感性分析中出现）
ALLOW_STALE = {
    4: ["README.md", "README.en.md", "slides-en", "slides-zh"],  # +0.177 限于敏感性分析章节
}


def build_universe():
    """收集 results/ 下所有数值（保留 3 位小数），构成「合法数字全集」。

    文档中任何形如 0.xxx 的三位小数，若不在全集内，即为可疑值——
    要么是笔误，要么是某处改了数字而未同步。这是检查 [C] 的基础。
    """
    import glob
    uni = set()

    def add(v):
        try:
            f = float(v)
        except (TypeError, ValueError):
            return
        if f != f:  # NaN
            return
        uni.add(round(f, 3))
        uni.add(round(f, 2))
        uni.add(round(abs(f), 3))
        uni.add(round(abs(f), 2))

    def walk(o):
        if isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, (int, float)):
            add(o)

    for f in glob.glob("results/*.json"):
        walk(json.load(open(f)))
    for f in glob.glob("results/*.csv"):
        try:
            df = pd.read_csv(f)
        except Exception:
            continue
        for col in df.columns:
            for v in pd.to_numeric(df[col], errors="coerce").dropna():
                add(v)
    return uni


# 非结果类的合法数字（阈值、比例、版本号等），不视为可疑
WHITELIST_NUMS = {
    0.5, 0.05, 0.1, 0.10, 0.100, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45,
    0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 0.0,
    0.01, 0.001, 0.0001, 0.02, 0.005, 0.003, 0.08,
}


def check_unknown_numbers(texts, uni, verbose):
    """检查 [C]：文档中的三位小数是否都能在 results/ 中找到出处。"""
    bad = []
    for name, path in DOCS.items():
        txt = texts[path]
        for m in re.finditer(r"(?<![\d.])0\.\d{3}(?![\d])", txt):
            v = float(m.group())
            if v in WHITELIST_NUMS or round(v, 3) in uni:
                continue
            ctx = txt[max(0, m.start() - 45):m.end() + 45].replace("\n", " ")
            bad.append(f"[可疑] {path}: 数值 {m.group()} 在 results/ 中无出处\n         …{ctx}…")
    return bad


def run_check(label, key, nd, pat, files, canon, texts, verbose):
    want = canon[key]
    want_s = fmt(want, nd) if nd else str(int(round(want)))
    # 正则由权威值自动生成——CHECKS 里的 pat 仅作可读性注释，
    # 这样 results/ 变化后检查器自动跟随，不会像硬编码那样失效。
    auto = re.escape(want_s)
    problems = []
    for f in files:
        txt = texts[DOCS[f]]
        if re.search(auto, txt):
            continue
        problems.append(f)
    if problems:
        return f"[缺失] {label} = {want_s}  未在以下文件中找到: {', '.join(problems)}"
    if verbose:
        print(f"  ok   {label:<22} {want_s}  （{len(files)} 个文件）")
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--strict", action="store_true",
                    help="把 [C] 未知数值也视为错误（定稿/CI 用；pre-commit 默认仅警告）")
    args = ap.parse_args()

    missing = [p for p in DOCS.values() if not os.path.exists(p)]
    if missing:
        sys.exit(f"找不到文件: {missing}")
    texts = {p: open(p, encoding="utf-8").read() for p in DOCS.values()}
    canon = canonical()

    print("=" * 78)
    print("一致性检查")
    print("=" * 78)
    print(f"检查 {len(DOCS)} 份文档 × {len(CHECKS)} 项权威值 + {len(STALE)} 项陈旧值 + 未知数值扫描\n")

    errors = []
    print("[A] 权威值检查")
    for label, key, nd, pat, files in CHECKS:
        if canon.get(key) is None:
            errors.append(f"[无权威值] {label}（键 {key} 在 results/ 中缺失）")
            continue
        e = run_check(label, key, nd, pat, files, canon, texts, args.verbose)
        if e:
            errors.append(e)
    print(f"  {len(CHECKS) - len([e for e in errors if e.startswith('[缺失]')])}"
          f"/{len(CHECKS)} 项通过")

    print("\n[B] 陈旧值扫描")
    stale_hits = 0
    for i, (pat, why) in enumerate(STALE):
        for name, path in DOCS.items():
            if name in ALLOW_STALE.get(i, []):
                continue
            for m in re.finditer(pat, texts[path]):
                ctx = texts[path][max(0, m.start() - 40):m.end() + 40].replace("\n", " ")
                errors.append(f"[陈旧] {path}: {why}\n         …{ctx}…")
                stale_hits += 1
    print(f"  {'未发现陈旧表述' if stale_hits == 0 else f'发现 {stale_hits} 处'}")

    print("\n[C] 未知数值扫描（文档中的三位小数须能在 results/ 中找到出处）")
    uni = build_universe()
    unknown = check_unknown_numbers(texts, uni, args.verbose)
    print(f"  全集含 {len(uni)} 个合法数值；"
          f"{'未发现可疑数值' if not unknown else f'发现 {len(unknown)} 处'}"
          f"{'' if args.strict or not unknown else '（仅警告，加 --strict 可阻断）'}")
    if args.strict:
        errors.extend(unknown)
    elif unknown:
        print()
        for u in unknown:
            print("  " + u.replace("[可疑]", "[警告]"))

    print("\n" + "=" * 78)
    if errors:
        print(f"不一致 {len(errors)} 处：\n")
        for e in errors:
            print("  " + e)
        print("\n请修正后重新运行。")
        sys.exit(1)
    print("全部通过：四份交付物中的数字与 results/ 一致，无陈旧表述。")
    sys.exit(0)


if __name__ == "__main__":
    main()
