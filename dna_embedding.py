"""
DNA序列Embedding脚本
支持 DNABERT-2 和 Nucleotide Transformer (NT-v2) 两种预训练模型
适用长度：几十bp到几kb（1540bp左右的16S rRNA基因序列完全没问题）

环境依赖：
    pip install torch transformers einops --break-system-packages
    # DNABERT-2 需要额外安装（triton在某些环境可能有冲突，可选）
    # pip install triton --break-system-packages

使用建议（RTX 4090 24GB环境下）：
    - DNABERT-2 (117M参数) 和 NT-v2-500M 都可以轻松在4090上跑
    - 如果要跑 NT-v2-2.5B，建议用你的 A100 80GB
"""

import torch
from transformers import AutoTokenizer, AutoModel

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# ---------------------------------------------------------------------------
# 方式一：DNABERT-2
# ---------------------------------------------------------------------------
def embed_with_dnabert2(sequences, model_name="zhihan1996/DNABERT-2-117M", pooling="mean"):
    """
    用 DNABERT-2 对一批DNA序列做embedding

    Args:
        sequences: list[str]，DNA序列（大写ATCG，不要有换行/空格）
        model_name: HuggingFace模型名
        pooling: "mean" 或 "cls"

    Returns:
        torch.Tensor, shape [batch_size, hidden_dim]  (117M模型 hidden_dim=768)
    """
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModel.from_pretrained(model_name, trust_remote_code=True).to(DEVICE)
    model.eval()

    embeddings = []
    with torch.no_grad():
        for seq in sequences:
            inputs = tokenizer(seq, return_tensors="pt")["input_ids"].to(DEVICE)
            outputs = model(inputs)[0]  # [1, seq_len, hidden_dim]

            if pooling == "cls":
                emb = outputs[:, 0, :]
            else:  # mean pooling
                emb = outputs.mean(dim=1)

            embeddings.append(emb.squeeze(0).cpu())

    return torch.stack(embeddings)


# ---------------------------------------------------------------------------
# 方式二：Nucleotide Transformer (NT-v2)
# ---------------------------------------------------------------------------
def embed_with_nucleotide_transformer(
    sequences,
    model_name="InstaDeepAI/nucleotide-transformer-v2-500m-multi-species",
    pooling="mean",
):
    """
    用 Nucleotide Transformer v2 对一批DNA序列做embedding

    Args:
        sequences: list[str]，DNA序列
        model_name: HuggingFace模型名，可选：
            - InstaDeepAI/nucleotide-transformer-v2-50m-multi-species
            - InstaDeepAI/nucleotide-transformer-v2-100m-multi-species
            - InstaDeepAI/nucleotide-transformer-v2-250m-multi-species
            - InstaDeepAI/nucleotide-transformer-v2-500m-multi-species
        pooling: "mean" 或 "cls"

    Returns:
        torch.Tensor, shape [batch_size, hidden_dim]
    """
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name).to(DEVICE)
    model.eval()

    # NT用6-mer tokenization，batch内序列长度不同时需要padding
    tokens = tokenizer.batch_encode_plus(
        sequences, return_tensors="pt", padding=True
    )
    input_ids = tokens["input_ids"].to(DEVICE)
    attention_mask = tokens["attention_mask"].to(DEVICE)

    with torch.no_grad():
        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_hidden_states=True,
        )
        hidden_states = outputs.hidden_states[-1]  # 最后一层 [batch, seq_len, hidden_dim]

        if pooling == "cls":
            embeddings = hidden_states[:, 0, :]
        else:  # mean pooling，注意要用attention_mask排除padding部分
            mask = attention_mask.unsqueeze(-1).expand(hidden_states.size()).float()
            summed = torch.sum(hidden_states * mask, dim=1)
            counts = torch.clamp(mask.sum(dim=1), min=1e-9)
            embeddings = summed / counts

    return embeddings.cpu()


# ---------------------------------------------------------------------------
# 示例用法
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # 替换成你的实际16S rRNA基因序列（示例用随机序列演示，请换成真实数据）
    example_seq_1540bp = "ATCG" * 385  # 占位示例，长度1540bp

    sequences = [example_seq_1540bp]

    print("=== DNABERT-2 ===")
    emb1 = embed_with_dnabert2(sequences)
    print("Embedding shape:", emb1.shape)  # 期望: [1, 768]

    print("\n=== Nucleotide Transformer v2 (500M) ===")
    emb2 = embed_with_nucleotide_transformer(sequences)
    print("Embedding shape:", emb2.shape)  # 期望: [1, 1024] (500M模型)

    # 如果有多条序列做批量embedding，直接传list即可：
    # sequences = [seq1, seq2, seq3, ...]
    # embeddings = embed_with_nucleotide_transformer(sequences)
    # 后续可用 embeddings.numpy() 做聚类/UMAP/相似度检索等下游分析
