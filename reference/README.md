# reference/

与本项目建模流程无关的通用参考资料。放在这里是为了便于取用，**不参与任何分析**，
也不纳入 `check_consistency.py` 的检查范围。

---

## `list-of-109-most-common-viruses.csv`

109 种常见人类 / 人畜共患病毒清单（不含噬菌体）。UTF-8-BOM 编码，Excel 直接打开中文不乱码。

**生成方式**：`python3 reference/build_virus_list.py`（数据内嵌在脚本里，便于版本追踪与增删）

### 字段

| 列 | 含义 |
|---|---|
| `no` | 序号 1–109 |
| `name_en` / `name_zh` | 英文名 / 中文名 |
| `abbr` | 常用缩写 |
| `family` / `genus` | ICTV 科 / 属 |
| `baltimore` | Baltimore 分类 Ⅰ–Ⅶ |
| `genome` | 核酸类型与结构 |
| `enveloped` | 有无包膜 |
| `transmission` | 主要传播途径 |
| `zoonotic` | `Y` / `N` / `Y(spillover)` / `Y(sylvatic)` |
| `reservoir` | 自然宿主；纯人类病毒填 `human` |
| `disease` | 主要疾病 |
| `vaccine` | 人用疫苗现状 |

### 构成

| 维度 | 分布 |
|---|---|
| 科 | 30 个；Picornaviridae 10、Flaviviridae 10、Paramyxoviridae 9、Orthoherpesviridae 9 |
| Baltimore | Ⅳ 39、Ⅴ 37、Ⅰ 23、Ⅵ 4、Ⅱ 3、Ⅲ 2、Ⅶ 1 |
| 人畜共患 | 55 条（占 50%），纯人类病毒 54 条 |
| 有人用疫苗 | 30 条 |

排序按「呼吸道 → 疱疹 → 肝炎 → 肠道 → 逆转录 → 乳头瘤/多瘤/细小 → 痘 →
黄病毒科虫媒 → 披膜科虫媒 → 布尼亚相关 → 丝状/沙粒 → 弹状/副黏」。

### 三条使用限制

1. **「常见」按临床与公共卫生重要性编排，不是按感染人数或血清阳性率排序。**
   若需要「全球感染人数前 N」，那是另一份表——细环病毒、疱疹类、HPV 会显著靠前，
   而埃博拉、拉沙这类高危病毒根本进不去。

2. **只给到科与属，不写 species 双名。** ICTV 自 2021 年起改用双名法命名且仍在推进
   （例如登革病毒的属已由 *Flavivirus* 更名为 *Orthoflavivirus*）。写双名有给出过时
   名称的风险，故停在科属层级，**使用前请对照当前 ICTV 版本**。

   表中已反映的近年变更：风疹 → Matonaviridae、RSV → Pneumoviridae、
   轮状 → Sedoreoviridae、丁肝 → Kolmioviridae、疱疹 → Orthoherpesviridae、
   科罗拉多蜱传热 → Spinareoviridae。

3. **`vaccine` 列指「是否存在人用疫苗」，不代表在你所在国家可及。**
   例如戊肝疫苗仅中国上市、EV-A71 疫苗仅中国、胡宁病毒疫苗仅阿根廷、
   腺病毒 Ad4/Ad7 口服疫苗仅美军使用。

### 脚本自带的校验

`build_virus_list.py` 在写出前断言：行数为 109、无重复条目、字段数一致、无空单元格。
增删条目后重跑即可，校验不通过会直接报错。
