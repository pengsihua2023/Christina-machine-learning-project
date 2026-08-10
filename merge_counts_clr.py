#!/usr/bin/env python3
"""
把 primary_counts.csv 转成 CLR，与原始计数合并成单个文件。

CLR(primary_counts) 与 primary_clr.csv 数值完全相同（差 <1e-15），
所以合并的意义在于：一个文件里同时提供两种表示，列名加后缀区分。

输出:
    ml_dataset/primary_merged.csv
        SampleID | 元数据列 | <feature>__count x70 | <feature>__clr x70
"""
import os

import numpy as np
import pandas as pd

import mb_common as mb

SRC = "ml_dataset/primary_counts.csv"
DST = "ml_dataset/primary_merged.csv"

META_COLS = ["label", "Influenza", "BioProject", "HostGroup", "HostType",
             "Season", "Age", "Sex", "Feeding", "Species", "Location", "month"]


def clr(counts, pseudocount=0.5):
    """逐样本的 centered log-ratio。行内运算，不存在跨样本泄漏。"""
    A = counts.astype(float) + pseudocount
    A = A / A.sum(axis=1, keepdims=True)
    L = np.log(A)
    return L - L.mean(axis=1, keepdims=True)


def main():
    df = pd.read_csv(SRC, index_col=0)
    meta = [c for c in META_COLS if c in df.columns]
    feat = [c for c in df.columns if c not in meta]
    print(f"读入 {SRC}: {df.shape[0]} 样本, {len(feat)} 特征, {len(meta)} 元数据列")

    counts = df[feat].astype(int)
    clr_df = pd.DataFrame(clr(counts.values), index=df.index, columns=feat)

    # 与已有的 primary_clr.csv 交叉核对
    ref_path = "ml_dataset/primary_clr.csv"
    if os.path.exists(ref_path):
        ref = pd.read_csv(ref_path, index_col=0)
        d = np.abs(clr_df.values - ref[feat].values).max()
        print(f"与 primary_clr.csv 的最大绝对差: {d:.2e} "
              f"{'(一致)' if d < 1e-9 else '(不一致，请检查)'}")

    counts.columns = [f"{c}__count" for c in feat]
    clr_df.columns = [f"{c}__clr" for c in feat]

    out = pd.concat([df[meta], counts, clr_df], axis=1)
    out.index.name = mb.SAMPLE_COL
    assert out.columns.is_unique and not out[list(clr_df.columns)].isna().any().any()

    out.to_csv(DST)
    print(f"\n写出 {DST}")
    print(f"  {out.shape[0]} 样本 x {out.shape[1]} 列 "
          f"= {len(meta)} 元数据 + {len(feat)} count + {len(feat)} clr")
    print(f"  文件大小 {os.path.getsize(DST)/1024:.1f} KB")
    print(f"  label: Pos={int(out.label.sum())}  Neg={int((1 - out.label).sum())}")
    print("\n列名示例:")
    print(f"  元数据  {meta[:4]}")
    print(f"  计数    {list(counts.columns[:2])}")
    print(f"  CLR     {list(clr_df.columns[:2])}")


if __name__ == "__main__":
    main()
