#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 109 种常见人类 / 人畜共患病毒清单（不含噬菌体）。

字段
----
no                    序号
name_en / name_zh     英文名 / 中文名
abbr                  常用缩写
family / genus        ICTV 科 / 属
baltimore             Baltimore 分类（I–VII）
genome                核酸类型与结构
enveloped             有无包膜
transmission          主要传播途径
zoonotic              是否人畜共患（Y / N / Y(spillover)）
reservoir             自然宿主 / 储存宿主（非人畜共患填 human）
disease               主要疾病
vaccine               人用疫苗现状

说明
----
ICTV 自 2021 年起改用双名法species命名且仍在推进，本表因此只给到**科与属**，
不写 species 双名，避免给出可能已过时的名称。使用前请对照当前 ICTV 版本。
"""
import csv
import os

C = ["no", "name_en", "name_zh", "abbr", "family", "genus", "baltimore",
     "genome", "enveloped", "transmission", "zoonotic", "reservoir",
     "disease", "vaccine"]

R = [
# ---------------------------------------------------------------- 呼吸道 RNA
("Influenza A virus","甲型流感病毒","IAV","Orthomyxoviridae","Alphainfluenzavirus","V","ssRNA(-) 分8节段","有","飞沫/气溶胶/接触","Y","野生水禽（雁形目、鸻形目）","流行性感冒；H5N1/H7N9 等禽源亚型可致重症","有（季节性，需年度更新）"),
("Influenza B virus","乙型流感病毒","IBV","Orthomyxoviridae","Betainfluenzavirus","V","ssRNA(-) 分8节段","有","飞沫/气溶胶","N","human（另见海豹）","流行性感冒，儿童负担较重","有（季节性）"),
("Influenza D virus","丁型流感病毒","IDV","Orthomyxoviridae","Deltainfluenzavirus","V","ssRNA(-) 分7节段","有","飞沫/接触","Y(spillover)","牛、猪","牛呼吸道病；人感染证据有限，主要为血清学阳性","无"),
("Influenza C virus","丙型流感病毒","ICV","Orthomyxoviridae","Gammainfluenzavirus","V","ssRNA(-) 分7节段","有","飞沫","Y","猪、犬","轻症上呼吸道感染","无"),
("SARS-CoV-2","严重急性呼吸综合征冠状病毒2","SARS-CoV-2","Coronaviridae","Betacoronavirus","IV","ssRNA(+) 不分节","有","气溶胶/飞沫","Y","蝙蝠（中间宿主未定论）","COVID-19","有（多平台）"),
("SARS-CoV","严重急性呼吸综合征冠状病毒","SARS-CoV","Coronaviridae","Betacoronavirus","IV","ssRNA(+) 不分节","有","飞沫/接触","Y","菊头蝠；果子狸为中间宿主","SARS；2004年后无自然病例","无获批人用疫苗"),
("Middle East respiratory syndrome coronavirus","中东呼吸综合征冠状病毒","MERS-CoV","Coronaviridae","Betacoronavirus","IV","ssRNA(+) 不分节","有","接触骆驼/医院内传播","Y","单峰驼（蝙蝠为源头）","MERS，病死率高","无（候选疫苗在研）"),
("Human coronavirus 229E","人冠状病毒229E","HCoV-229E","Coronaviridae","Alphacoronavirus","IV","ssRNA(+) 不分节","有","飞沫/接触","N","human（源自蝙蝠）","普通感冒","无"),
("Human coronavirus NL63","人冠状病毒NL63","HCoV-NL63","Coronaviridae","Alphacoronavirus","IV","ssRNA(+) 不分节","有","飞沫/接触","N","human（源自蝙蝠）","普通感冒、儿童哮吼","无"),
("Human coronavirus OC43","人冠状病毒OC43","HCoV-OC43","Coronaviridae","Betacoronavirus","IV","ssRNA(+) 不分节","有","飞沫/接触","N","human（源自牛）","普通感冒","无"),
("Human coronavirus HKU1","人冠状病毒HKU1","HCoV-HKU1","Coronaviridae","Betacoronavirus","IV","ssRNA(+) 不分节","有","飞沫/接触","N","human","普通感冒、下呼吸道感染","无"),
("Respiratory syncytial virus","呼吸道合胞病毒","RSV","Pneumoviridae","Orthopneumovirus","V","ssRNA(-) 不分节","有","飞沫/接触","N","human","婴幼儿细支气管炎、老年人肺炎","有（2023年起用于老年人及孕妇）"),
("Human metapneumovirus","人偏肺病毒","hMPV","Pneumoviridae","Metapneumovirus","V","ssRNA(-) 不分节","有","飞沫/接触","N","human（源自禽偏肺病毒）","儿童下呼吸道感染","无"),
("Human parainfluenza virus 1","人副流感病毒1型","HPIV-1","Paramyxoviridae","Respirovirus","V","ssRNA(-) 不分节","有","飞沫/接触","N","human","儿童哮吼","无"),
("Human parainfluenza virus 2","人副流感病毒2型","HPIV-2","Paramyxoviridae","Orthorubulavirus","V","ssRNA(-) 不分节","有","飞沫/接触","N","human","哮吼、上呼吸道感染","无"),
("Human parainfluenza virus 3","人副流感病毒3型","HPIV-3","Paramyxoviridae","Respirovirus","V","ssRNA(-) 不分节","有","飞沫/接触","N","human","婴幼儿细支气管炎、肺炎","无"),
("Human parainfluenza virus 4","人副流感病毒4型","HPIV-4","Paramyxoviridae","Orthorubulavirus","V","ssRNA(-) 不分节","有","飞沫/接触","N","human","轻症呼吸道感染","无"),
("Rhinovirus A/B/C","鼻病毒A/B/C","HRV","Picornaviridae","Enterovirus","IV","ssRNA(+) 不分节","无","飞沫/接触/污染物","N","human","普通感冒；可诱发哮喘急性发作","无（血清型过多）"),
("Human adenovirus (respiratory)","人腺病毒（呼吸道型）","HAdV","Adenoviridae","Mastadenovirus","I","dsDNA 线性","无","飞沫/接触/粪口","N","human","咽结膜热、肺炎、角结膜炎","有（美军用 Ad4/Ad7 口服）"),
("Measles virus","麻疹病毒","MeV","Paramyxoviridae","Morbillivirus","V","ssRNA(-) 不分节","有","气溶胶（传染性极强）","N","human","麻疹；可致亚急性硬化性全脑炎","有（MMR）"),
("Mumps virus","腮腺炎病毒","MuV","Paramyxoviridae","Orthorubulavirus","V","ssRNA(-) 不分节","有","飞沫/唾液","N","human","流行性腮腺炎、睾丸炎、脑膜炎","有（MMR）"),
("Rubella virus","风疹病毒","RuV","Matonaviridae","Rubivirus","IV","ssRNA(+) 不分节","有","飞沫/垂直传播","N","human","风疹；孕早期致先天性风疹综合征","有（MMR）"),
# ---------------------------------------------------------------- 疱疹
("Herpes simplex virus 1","单纯疱疹病毒1型","HSV-1 / HHV-1","Orthoherpesviridae","Simplexvirus","I","dsDNA 线性","有","接触唾液/黏膜","N","human","口唇疱疹、疱疹性脑炎","无"),
("Herpes simplex virus 2","单纯疱疹病毒2型","HSV-2 / HHV-2","Orthoherpesviridae","Simplexvirus","I","dsDNA 线性","有","性接触/垂直传播","N","human","生殖器疱疹、新生儿疱疹","无"),
("Varicella-zoster virus","水痘-带状疱疹病毒","VZV / HHV-3","Orthoherpesviridae","Varicellovirus","I","dsDNA 线性","有","气溶胶/接触疱液","N","human","水痘；复燃致带状疱疹","有（水痘疫苗、带状疱疹疫苗）"),
("Epstein-Barr virus","EB病毒","EBV / HHV-4","Orthoherpesviridae","Lymphocryptovirus","I","dsDNA 线性","有","唾液","N","human","传染性单核细胞增多症；鼻咽癌、伯基特淋巴瘤","无"),
("Human cytomegalovirus","人巨细胞病毒","HCMV / HHV-5","Orthoherpesviridae","Cytomegalovirus","I","dsDNA 线性","有","唾液/尿/性接触/垂直传播","N","human","先天性感染致耳聋；免疫抑制者重症","无"),
("Human herpesvirus 6B","人疱疹病毒6B型","HHV-6B","Orthoherpesviridae","Roseolovirus","I","dsDNA 线性","有","唾液","N","human","幼儿急疹","无"),
("Human herpesvirus 7","人疱疹病毒7型","HHV-7","Orthoherpesviridae","Roseolovirus","I","dsDNA 线性","有","唾液","N","human","幼儿急疹（部分病例）","无"),
("Kaposi sarcoma-associated herpesvirus","卡波西肉瘤相关疱疹病毒","KSHV / HHV-8","Orthoherpesviridae","Rhadinovirus","I","dsDNA 线性","有","唾液/性接触","N","human","卡波西肉瘤、原发渗出性淋巴瘤","无"),
("B virus (Macacine alphaherpesvirus 1)","B病毒（猕猴疱疹病毒1型）","BV","Orthoherpesviridae","Simplexvirus","I","dsDNA 线性","有","猕猴咬伤/抓伤/体液","Y","猕猴属","人感染罕见但病死率极高的脑脊髓炎","无"),
# ---------------------------------------------------------------- 肝炎
("Hepatitis A virus","甲型肝炎病毒","HAV","Picornaviridae","Hepatovirus","IV","ssRNA(+) 不分节","无","粪口/污染食物水","N","human","急性甲型肝炎，不转慢性","有"),
("Hepatitis B virus","乙型肝炎病毒","HBV","Hepadnaviridae","Orthohepadnavirus","VII","部分dsDNA 环状，逆转录复制","有","血液/性接触/垂直传播","N","human","慢性乙肝、肝硬化、肝细胞癌","有"),
("Hepatitis C virus","丙型肝炎病毒","HCV","Flaviviridae","Hepacivirus","IV","ssRNA(+) 不分节","有","血液（输血、共用针具）","N","human","慢性丙肝、肝硬化、肝癌；DAA 可治愈","无"),
("Hepatitis D virus","丁型肝炎病毒","HDV","Kolmioviridae","Deltavirus","V","ssRNA(-) 环状，类病毒样","有（借用HBsAg）","与HBV同途径","N","human","需 HBV 辅助；重叠感染加速肝硬化","无（经乙肝疫苗间接预防）"),
("Hepatitis E virus","戊型肝炎病毒","HEV","Hepeviridae","Paslahepevirus","IV","ssRNA(+) 不分节","无（粪便中）","粪口；基因4型经猪肉","Y","猪、野猪、鹿（基因3/4型）","急性戊肝；孕妇病死率高","有（Hecolin，仅中国上市）"),
# ---------------------------------------------------------------- 肠道
("Rotavirus A","A组轮状病毒","RVA","Sedoreoviridae","Rotavirus","III","dsRNA 分11节段","无","粪口","Y","牛、猪（重配可跨种）","婴幼儿重症腹泻","有（口服减毒活疫苗）"),
("Norovirus GI/GII","诺如病毒GI/GII","NoV","Caliciviridae","Norovirus","IV","ssRNA(+) 不分节","无","粪口/呕吐物气溶胶/贝类","N","human","急性胃肠炎暴发（邮轮、学校）","无"),
("Sapovirus","札如病毒","SaV","Caliciviridae","Sapovirus","IV","ssRNA(+) 不分节","无","粪口","N","human","儿童及成人胃肠炎","无"),
("Human astrovirus","人星状病毒","HAstV","Astroviridae","Mamastrovirus","IV","ssRNA(+) 不分节","无","粪口","N","human","儿童腹泻","无"),
("Enteric adenovirus F40/41","肠道腺病毒F40/41","HAdV-F","Adenoviridae","Mastadenovirus","I","dsDNA 线性","无","粪口","N","human","婴幼儿腹泻","无"),
("Poliovirus 1-3","脊髓灰质炎病毒1-3型","PV","Picornaviridae","Enterovirus","IV","ssRNA(+) 不分节","无","粪口","N","human","脊髓灰质炎（急性弛缓性麻痹）","有（OPV/IPV）"),
("Coxsackievirus A16","柯萨奇病毒A16","CVA16","Picornaviridae","Enterovirus","IV","ssRNA(+) 不分节","无","粪口/接触疱液","N","human","手足口病","无"),
("Coxsackievirus B1-6","柯萨奇病毒B组","CVB","Picornaviridae","Enterovirus","IV","ssRNA(+) 不分节","无","粪口","N","human","心肌炎、无菌性脑膜炎、胸膜痛","无"),
("Echovirus","埃可病毒","E","Picornaviridae","Enterovirus","IV","ssRNA(+) 不分节","无","粪口","N","human","无菌性脑膜炎、新生儿脓毒症样病","无"),
("Enterovirus A71","肠道病毒A71","EV-A71","Picornaviridae","Enterovirus","IV","ssRNA(+) 不分节","无","粪口/接触","N","human","手足口病合并脑干脑炎","有（仅中国上市）"),
("Enterovirus D68","肠道病毒D68","EV-D68","Picornaviridae","Enterovirus","IV","ssRNA(+) 不分节","无","飞沫/粪口","N","human","严重喘息；与急性弛缓性脊髓炎相关","无"),
("Parechovirus A","人副肠孤病毒A","PeV-A","Picornaviridae","Parechovirus","IV","ssRNA(+) 不分节","无","粪口/飞沫","N","human","新生儿脓毒症样病、脑炎","无"),
("Aichi virus A","爱知病毒A","AiV","Picornaviridae","Kobuvirus","IV","ssRNA(+) 不分节","无","粪口/生食贝类","N","human","胃肠炎","无"),
# ---------------------------------------------------------------- 逆转录
("Human immunodeficiency virus 1","人类免疫缺陷病毒1型","HIV-1","Retroviridae","Lentivirus","VI","ssRNA(+) 二倍体，逆转录","有","性接触/血液/垂直传播","Y","黑猩猩（SIVcpz 跨种起源）","艾滋病","无（ART 可控）"),
("Human immunodeficiency virus 2","人类免疫缺陷病毒2型","HIV-2","Retroviridae","Lentivirus","VI","ssRNA(+) 二倍体，逆转录","有","性接触/血液","Y","乌黑白眉猴（SIVsmm 起源）","艾滋病，进展较慢，西非为主","无"),
("Human T-lymphotropic virus 1","人类嗜T淋巴细胞病毒1型","HTLV-1","Retroviridae","Deltaretrovirus","VI","ssRNA(+) 二倍体，逆转录","有","母乳/性接触/血液","N","human","成人T细胞白血病、HTLV相关脊髓病","无"),
("Human T-lymphotropic virus 2","人类嗜T淋巴细胞病毒2型","HTLV-2","Retroviridae","Deltaretrovirus","VI","ssRNA(+) 二倍体，逆转录","有","共用针具/母乳","N","human","多为无症状；偶见神经病变","无"),
# ---------------------------------------------------------------- 乳头瘤/多瘤/细小/指环
("Human papillomavirus 16","人乳头瘤病毒16型","HPV-16","Papillomaviridae","Alphapapillomavirus","I","dsDNA 环状","无","性接触/皮肤黏膜接触","N","human","宫颈癌、口咽癌（高危型主因）","有（二/四/九价）"),
("Human papillomavirus 18","人乳头瘤病毒18型","HPV-18","Papillomaviridae","Alphapapillomavirus","I","dsDNA 环状","无","性接触","N","human","宫颈腺癌（高危型）","有"),
("Human papillomavirus 6/11","人乳头瘤病毒6/11型","HPV-6/11","Papillomaviridae","Alphapapillomavirus","I","dsDNA 环状","无","性接触/垂直传播","N","human","生殖器疣、复发性呼吸道乳头瘤病","有（四价及以上）"),
("BK polyomavirus","BK多瘤病毒","BKPyV","Polyomaviridae","Betapolyomavirus","I","dsDNA 环状","无","呼吸道/尿；儿童期普遍感染","N","human","肾移植者多瘤病毒肾病、出血性膀胱炎","无"),
("JC polyomavirus","JC多瘤病毒","JCPyV","Polyomaviridae","Betapolyomavirus","I","dsDNA 环状","无","呼吸道/消化道","N","human","进行性多灶性白质脑病（免疫抑制者）","无"),
("Merkel cell polyomavirus","梅克尔细胞多瘤病毒","MCPyV","Polyomaviridae","Alphapolyomavirus","I","dsDNA 环状","无","皮肤接触","N","human","梅克尔细胞癌","无"),
("Parvovirus B19","细小病毒B19","B19V","Parvoviridae","Erythroparvovirus","II","ssDNA 线性","无","飞沫/血液/垂直传播","N","human","传染性红斑；再障危象；胎儿水肿","无"),
("Human bocavirus 1","人博卡病毒1型","HBoV1","Parvoviridae","Bocaparvovirus","II","ssDNA 线性","无","飞沫/粪口","N","human","儿童呼吸道感染、喘息","无"),
("Torque teno virus","细环病毒","TTV","Anelloviridae","Alphatorquevirus","II","ssDNA 环状","无","血液/粪口/多途径","N","human","无明确致病性；作为免疫功能标志物研究","无"),
# ---------------------------------------------------------------- 痘
("Mpox virus","猴痘病毒","MPXV","Poxviridae","Orthopoxvirus","I","dsDNA 线性","有","接触皮损/飞沫/性接触","Y","非洲啮齿类（松鼠、睡鼠）","猴痘；2022年起全球人际传播","有（MVA-BN）"),
("Variola virus","天花病毒","VARV","Poxviridae","Orthopoxvirus","I","dsDNA 线性","有","气溶胶/接触","N","human","天花；1980年宣布消灭","有（战略储备）"),
("Vaccinia virus","痘苗病毒","VACV","Poxviridae","Orthopoxvirus","I","dsDNA 线性","有","接种部位接触","Y(spillover)","实验室/疫苗株；野外宿主未明","接种并发症；用作疫苗载体","本身即天花疫苗"),
("Cowpox virus","牛痘病毒","CPXV","Poxviridae","Orthopoxvirus","I","dsDNA 线性","有","接触感染动物","Y","野生啮齿类（猫为常见传播媒介）","局部皮肤痘疮性损害","无（天花疫苗有交叉保护）"),
("Molluscum contagiosum virus","传染性软疣病毒","MCV","Poxviridae","Molluscipoxvirus","I","dsDNA 线性","有","直接接触/性接触/污染物","N","human","传染性软疣","无"),
("Orf virus","羊口疮病毒","ORFV","Poxviridae","Parapoxvirus","I","dsDNA 线性","有","接触病羊口鼻","Y","绵羊、山羊","挤奶工结节／羊痘样皮损","无（有兽用疫苗）"),
# ---------------------------------------------------------------- 黄病毒科虫媒
("Dengue virus 1-4","登革病毒1-4型","DENV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","埃及伊蚊/白纹伊蚊","Y(sylvatic)","人-蚊循环为主；森林型有灵长类","登革热、重症登革","有（Dengvaxia、Qdenga）"),
("Zika virus","寨卡病毒","ZIKV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","伊蚊/性接触/垂直传播","Y(sylvatic)","非洲有猴-蚊循环","寨卡热；先天性小头畸形","无"),
("West Nile virus","西尼罗病毒","WNV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","库蚊","Y","鸟类（人与马为终末宿主）","西尼罗热、脑炎","无人用疫苗（有马用）"),
("Japanese encephalitis virus","乙型脑炎病毒","JEV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","三带喙库蚊","Y","涉禽与猪（猪为扩增宿主）","流行性乙型脑炎","有"),
("Yellow fever virus","黄热病毒","YFV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","伊蚊/趋血蚊","Y","非洲与南美灵长类","黄热病","有（17D 减毒活疫苗）"),
("Tick-borne encephalitis virus","蜱传脑炎病毒","TBEV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","硬蜱叮咬；未灭菌生乳","Y","小型啮齿类与蜱","蜱传脑炎","有"),
("St. Louis encephalitis virus","圣路易斯脑炎病毒","SLEV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","库蚊","Y","鸟类","脑炎（美洲）","无"),
("Kyasanur Forest disease virus","基萨那森林病病毒","KFDV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","硬蜱叮咬","Y","猴、啮齿类（印度西南部）","出血热合并脑炎","有（印度地区性使用）"),
("Powassan virus","波瓦生病毒","POWV","Flaviviridae","Orthoflavivirus","IV","ssRNA(+) 不分节","有","硬蜱叮咬","Y","啮齿类、土拨鼠","脑炎，后遗症率高（北美）","无"),
# ---------------------------------------------------------------- 披膜科虫媒
("Chikungunya virus","基孔肯雅病毒","CHIKV","Togaviridae","Alphavirus","IV","ssRNA(+) 不分节","有","伊蚊","Y(sylvatic)","非洲有灵长类循环","发热合并长期多关节炎","有（2023年起获批）"),
("Ross River virus","罗斯河病毒","RRV","Togaviridae","Alphavirus","IV","ssRNA(+) 不分节","有","蚊（澳大利亚）","Y","有袋类（袋鼠、小袋鼠）","流行性多关节炎","无"),
("Eastern equine encephalitis virus","东方马脑炎病毒","EEEV","Togaviridae","Alphavirus","IV","ssRNA(+) 不分节","有","蚊","Y","鸟类（人马为终末宿主）","脑炎，病死率高","无人用疫苗（有马用）"),
("Western equine encephalitis virus","西方马脑炎病毒","WEEV","Togaviridae","Alphavirus","IV","ssRNA(+) 不分节","有","蚊","Y","鸟类","脑炎","无人用疫苗"),
("Venezuelan equine encephalitis virus","委内瑞拉马脑炎病毒","VEEV","Togaviridae","Alphavirus","IV","ssRNA(+) 不分节","有","蚊","Y","啮齿类与马","发热、脑炎","无人用疫苗（有马用）"),
("O'nyong-nyong virus","奥尼翁尼翁病毒","ONNV","Togaviridae","Alphavirus","IV","ssRNA(+) 不分节","有","按蚊（非洲）","N","human（媒介为按蚊，罕见非人宿主）","发热、关节痛、皮疹","无"),
("Mayaro virus","马亚罗病毒","MAYV","Togaviridae","Alphavirus","IV","ssRNA(+) 不分节","有","趋血蚊（南美）","Y","非人灵长类","发热合并关节炎","无"),
# ---------------------------------------------------------------- 布尼亚相关
("Hantaan orthohantavirus","汉滩病毒","HTNV","Hantaviridae","Orthohantavirus","V","ssRNA(-) 分3节段","有","啮齿类排泄物气溶胶","Y","黑线姬鼠","肾综合征出血热（重型）","有（韩国/中国地区性使用）"),
("Seoul orthohantavirus","汉城病毒","SEOV","Hantaviridae","Orthohantavirus","V","ssRNA(-) 分3节段","有","褐家鼠排泄物气溶胶","Y","褐家鼠（全球分布）","肾综合征出血热（中型）","部分地区可用"),
("Puumala orthohantavirus","普马拉病毒","PUUV","Hantaviridae","Orthohantavirus","V","ssRNA(-) 分3节段","有","啮齿类排泄物气溶胶","Y","欧鮃（岸鼠）","流行性肾病（轻型HFRS）","无"),
("Sin Nombre orthohantavirus","辛诺柏病毒","SNV","Hantaviridae","Orthohantavirus","V","ssRNA(-) 分3节段","有","鹿鼠排泄物气溶胶","Y","鹿鼠","汉坦病毒肺综合征，病死率高","无"),
("Andes orthohantavirus","安第斯病毒","ANDV","Hantaviridae","Orthohantavirus","V","ssRNA(-) 分3节段","有","啮齿类气溶胶；可人际传播","Y","长尾侏儒稻鼠","汉坦病毒肺综合征；唯一确证人传人的汉坦病毒","无"),
("Crimean-Congo hemorrhagic fever virus","克里米亚-刚果出血热病毒","CCHFV","Nairoviridae","Orthonairovirus","V","ssRNA(-) 分3节段","有","璃眼蜱叮咬/接触畜血/院内传播","Y","家畜（牛羊）与蜱","克里米亚-刚果出血热","无广泛获批疫苗"),
("Rift Valley fever virus","裂谷热病毒","RVFV","Phenuiviridae","Phlebovirus","V","ssRNA(-) 分3节段","有","蚊叮咬/接触感染畜体液","Y","牛、羊、骆驼","裂谷热；畜群流产暴发","无人用疫苗（有兽用）"),
("Dabie bandavirus (SFTSV)","发热伴血小板减少综合征病毒","SFTSV","Phenuiviridae","Bandavirus","V","ssRNA(-) 分3节段","有","长角血蜱叮咬；接触血液可人际传播","Y","蜱；家畜与犬猫可带毒","发热伴血小板减少综合征","无"),
("Oropouche virus","奥罗普切病毒","OROV","Peribunyaviridae","Orthobunyavirus","V","ssRNA(-) 分3节段","有","库蠓（Culicoides paraensis）","Y","树懒、非人灵长类","奥罗普切热；2024年南美大规模暴发","无"),
("Toscana virus","托斯卡纳病毒","TOSV","Phenuiviridae","Phlebovirus","V","ssRNA(-) 分3节段","有","白蛉叮咬","Y","白蛉（可经卵传递）","无菌性脑膜炎（地中海地区夏季主因）","无"),
("La Crosse virus","拉克罗斯病毒","LACV","Peribunyaviridae","Orthobunyavirus","V","ssRNA(-) 分3节段","有","三列伊蚊","Y","花栗鼠、松鼠","儿童脑炎（美国中西部）","无"),
# ---------------------------------------------------------------- 丝状/沙粒
("Ebola virus (Zaire)","埃博拉病毒（扎伊尔型）","EBOV","Filoviridae","Orthoebolavirus","V","ssRNA(-) 不分节","有","接触体液/尸体","Y","果蝠（推定）","埃博拉出血热","有（Ervebo 等）"),
("Sudan virus","苏丹病毒","SUDV","Filoviridae","Orthoebolavirus","V","ssRNA(-) 不分节","有","接触体液","Y","果蝠（推定）","埃博拉病（苏丹型）","无获批疫苗"),
("Marburg virus","马尔堡病毒","MARV","Filoviridae","Orthomarburgvirus","V","ssRNA(-) 不分节","有","接触体液；矿洞蝙蝠暴露","Y","埃及果蝠","马尔堡出血热","无获批疫苗"),
("Lassa virus","拉沙病毒","LASV","Arenaviridae","Mammarenavirus","V","ssRNA(-) 分2节段（双义）","有","啮齿类排泄物；院内传播","Y","多乳鼠（Mastomys natalensis）","拉沙热；后遗耳聋常见","无获批疫苗"),
("Lymphocytic choriomeningitis virus","淋巴细胞脉络丛脑膜炎病毒","LCMV","Arenaviridae","Mammarenavirus","V","ssRNA(-) 分2节段（双义）","有","小鼠/仓鼠排泄物；器官移植","Y","小家鼠","无菌性脑膜炎；先天感染致脑积水","无"),
("Machupo virus","马丘波病毒","MACV","Arenaviridae","Mammarenavirus","V","ssRNA(-) 分2节段（双义）","有","啮齿类排泄物","Y","暮鼠属（Calomys callosus）","玻利维亚出血热","无"),
("Junin virus","胡宁病毒","JUNV","Arenaviridae","Mammarenavirus","V","ssRNA(-) 分2节段（双义）","有","啮齿类排泄物气溶胶","Y","暮鼠属（Calomys musculinus）","阿根廷出血热","有（Candid#1，阿根廷）"),
# ---------------------------------------------------------------- 弹状/副黏（人畜共患）
("Australian bat lyssavirus","澳大利亚蝙蝠狂犬病毒","ABLV","Rhabdoviridae","Lyssavirus","V","ssRNA(-) 不分节","有","蝙蝠咬伤/抓伤","Y","果蝠、食虫蝠","狂犬病样脑炎；人间病例极少","狂犬疫苗可交叉保护"),
("Rabies lyssavirus","狂犬病病毒","RABV","Rhabdoviridae","Lyssavirus","V","ssRNA(-) 不分节","有","咬伤/抓伤唾液暴露","Y","犬、蝙蝠、狐、浣熊、臭鼬","狂犬病；发病后近乎100%致死","有（暴露前后均可用）"),
("Vesicular stomatitis virus","水疱性口炎病毒","VSV","Rhabdoviridae","Vesiculovirus","V","ssRNA(-) 不分节","有","接触病畜/白蛉与蚋叮咬","Y","牛、马、猪","轻症流感样病；广泛用作疫苗与溶瘤载体","无（有兽用）"),
("Nipah virus","尼帕病毒","NiV","Paramyxoviridae","Henipavirus","V","ssRNA(-) 不分节","有","果蝠污染的椰枣汁/接触猪/人际传播","Y","狐蝠属果蝠","脑炎与呼吸窘迫，病死率极高","无获批疫苗"),
("Hendra virus","亨德拉病毒","HeV","Paramyxoviridae","Henipavirus","V","ssRNA(-) 不分节","有","接触感染马","Y","狐蝠属果蝠（马为中间宿主）","呼吸道与脑炎综合征","无人用疫苗（有马用）"),
("Newcastle disease virus","新城疫病毒","NDV","Paramyxoviridae","Orthoavulavirus","V","ssRNA(-) 不分节","有","接触感染禽/气溶胶","Y","家禽与野鸟","人感染多为自限性结膜炎","无人用疫苗（有禽用）"),
("Colorado tick fever virus","科罗拉多蜱传热病毒","CTFV","Spinareoviridae","Coltivirus","III","dsRNA 分12节段","无","安氏革蜱叮咬","Y","小型哺乳动物与蜱","双相热、白细胞减少","无"),
]


def main():
    assert len(R) == 109, f"应为 109 行，实为 {len(R)}"
    names = [r[0] for r in R]
    assert len(set(names)) == 109, "存在重复条目"
    for i, r in enumerate(R, 1):
        assert len(r) == len(C) - 1, f"第 {i} 行字段数不符：{len(r)}"
        assert all(str(x).strip() for x in r), f"第 {i} 行有空字段"
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "list-of-109-most-common-viruses.csv")
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(C)
        for i, r in enumerate(R, 1):
            w.writerow([i] + list(r))
    print(f"已写出 {out}：{len(R)} 条，{len(C)} 列")

    from collections import Counter
    fam = Counter(r[3] for r in R)
    print(f"\n覆盖 {len(fam)} 个科，前 8：")
    for k, v in fam.most_common(8):
        print(f"  {k:<20} {v}")
    zo = Counter(r[9] for r in R)
    print(f"\n人畜共患：{zo['Y'] + zo.get('Y(spillover)',0) + zo.get('Y(sylvatic)',0)} 条"
          f"（Y={zo['Y']}、Y(spillover)={zo.get('Y(spillover)',0)}、Y(sylvatic)={zo.get('Y(sylvatic)',0)}）"
          f"，纯人类病毒 {zo['N']} 条")
    bal = Counter(r[5] for r in R)
    print("Baltimore 分类：", dict(sorted(bal.items())))
    vac = sum(1 for r in R if r[12].startswith("有"))
    print(f"有人用疫苗：{vac} 条")


if __name__ == "__main__":
    main()
