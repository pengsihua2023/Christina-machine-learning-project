# ============================================================
# ECOLOGICAL FEATURES FOR MACHINE LEARNING
# AIV microbiome project
#
# Outputs:
#   1. ecological_ML_features.tsv
#   2. bray_curtis_distance_matrix.tsv
#   3. aitchison_distance_matrix.tsv
#   4. bray_pcoa_coordinates.tsv
#   5. aitchison_pcoa_coordinates.tsv
#
# IMPORTANT:
# Infection-dependent variables such as distance to the
# uninfected centroid or baseline-core retention are NOT
# calculated here because those need to be generated within
# cross-validation folds to avoid information leakage.
# ============================================================


# -----------------------------
# 1. PACKAGES
# -----------------------------

library(phyloseq)
library(vegan)
library(dplyr)
library(tibble)


# -----------------------------
# 2. FILE PATHS
# -----------------------------

ps_file <- "~/Microbiome_data/core_microbiome_outputs/ps_all_final.rds"

outdir <- "~/Microbiome_data/ML_ecological_features"

dir.create(
  outdir,
  showWarnings = FALSE,
  recursive = TRUE
)


# -----------------------------
# 3. LOAD DATA
# -----------------------------

ps <- readRDS(ps_file)

# Remove empty samples/taxa just in case
ps <- prune_samples(sample_sums(ps) > 0, ps)
ps <- prune_taxa(taxa_sums(ps) > 0, ps)

cat("Samples:", nsamples(ps), "\n")
cat("Features:", ntaxa(ps), "\n")

# -----------------------------
# 4. METADATA
# -----------------------------

meta <- data.frame(sample_data(ps))

# Make sure SampleID matches the phyloseq sample names
meta$SampleID <- rownames(meta)

# Put SampleID first
meta <- meta %>%
  dplyr::select(SampleID, everything())

# -----------------------------
# 5. ALPHA DIVERSITY
# -----------------------------

# Calculated from the abundance/count table
alpha <- estimate_richness(
  ps,
  measures = c(
    "Observed",
    "Chao1",
    "Shannon",
    "Simpson",
    "InvSimpson"
  )
) %>%
  rownames_to_column("SampleID")


# Add Pielou's evenness
#
# J = Shannon / log(richness)
#
# Only defined when richness > 1
alpha <- alpha %>%
  mutate(
    Pielou = ifelse(
      Observed > 1,
      Shannon / log(Observed),
      NA_real_
    )
  )


# -----------------------------
# 6. SEQUENCING DEPTH
# -----------------------------

depth_df <- tibble(
  SampleID = sample_names(ps),
  SequencingDepth = sample_sums(ps)
)


# -----------------------------
# 7. COMBINE SAMPLE-LEVEL
#    ECOLOGICAL FEATURES
# -----------------------------

ecological_features <- meta %>%
  left_join(alpha, by = "SampleID") %>%
  left_join(depth_df, by = "SampleID")


# Put useful columns first
preferred_cols <- c(
  "SampleID",
  "HostGroup",
  "HostSpecies",
  "HostType",
  "SampleContext",
  "Infection",
  "Observed",
  "Chao1",
  "Shannon",
  "Simpson",
  "InvSimpson",
  "Pielou",
  "SequencingDepth"
)

preferred_cols <- preferred_cols[
  preferred_cols %in% colnames(ecological_features)
]

ecological_features <- ecological_features %>%
  dplyr::select(
    all_of(preferred_cols),
    everything()
  )


write.table(
  ecological_features,
  file = file.path(
    outdir,
    "ecological_ML_features.tsv"
  ),
  sep = "\t",
  quote = FALSE,
  row.names = FALSE
)


# ============================================================
# 8. BRAY-CURTIS DISTANCE
# ============================================================

# Convert counts to relative abundance first
ps_rel <- transform_sample_counts(
  ps,
  function(x) x / sum(x)
)

bray_dist <- phyloseq::distance(
  ps_rel,
  method = "bray"
)

bray_mat <- as.matrix(bray_dist)

write.table(
  cbind(
    SampleID = rownames(bray_mat),
    as.data.frame(bray_mat)
  ),
  file = file.path(
    outdir,
    "bray_curtis_distance_matrix.tsv"
  ),
  sep = "\t",
  quote = FALSE,
  row.names = FALSE
)


# -----------------------------
# 9. BRAY-CURTIS PCoA
#    for exploratory use
# -----------------------------

bray_pcoa <- cmdscale(
  bray_dist,
  k = min(10, nsamples(ps) - 1),
  eig = TRUE,
  add = TRUE
)

bray_coords <- as.data.frame(bray_pcoa$points)

colnames(bray_coords) <- paste0(
  "Bray_PCoA",
  seq_len(ncol(bray_coords))
)

bray_coords <- bray_coords %>%
  rownames_to_column("SampleID")

write.table(
  bray_coords,
  file = file.path(
    outdir,
    "bray_pcoa_coordinates.tsv"
  ),
  sep = "\t",
  quote = FALSE,
  row.names = FALSE
)


# ============================================================
# 10. AITCHISON DISTANCE
# ============================================================

# Extract sample x feature count matrix

otu <- as(
  otu_table(ps),
  "matrix"
)

if (taxa_are_rows(ps)) {
  otu <- t(otu)
}

otu <- as.matrix(otu)


# -----------------------------
# Zero replacement
# -----------------------------
#
# Simple pseudocount approach.
# This matches the broad strategy used in Peng's CLR pipeline.
#
# Peng may choose to repeat preprocessing himself inside CV.

pseudocount <- 0.5

otu_pc <- otu + pseudocount


# -----------------------------
# CLR transformation
# -----------------------------

clr_transform <- function(x) {
  lx <- log(x)
  lx - mean(lx)
}

clr_mat <- t(
  apply(
    otu_pc,
    1,
    clr_transform
  )
)

rownames(clr_mat) <- rownames(otu)


# -----------------------------
# Aitchison distance
# -----------------------------
#
# Aitchison distance =
# Euclidean distance in CLR space

aitchison_dist <- dist(
  clr_mat,
  method = "euclidean"
)

aitchison_mat <- as.matrix(
  aitchison_dist
)

write.table(
  cbind(
    SampleID = rownames(aitchison_mat),
    as.data.frame(aitchison_mat)
  ),
  file = file.path(
    outdir,
    "aitchison_distance_matrix.tsv"
  ),
  sep = "\t",
  quote = FALSE,
  row.names = FALSE
)


# -----------------------------
# 11. AITCHISON PCoA
#     for exploratory use
# -----------------------------

aitchison_pcoa <- cmdscale(
  aitchison_dist,
  k = min(10, nsamples(ps) - 1),
  eig = TRUE,
  add = TRUE
)

aitchison_coords <- as.data.frame(
  aitchison_pcoa$points
)

colnames(aitchison_coords) <- paste0(
  "Aitchison_PCoA",
  seq_len(ncol(aitchison_coords))
)

aitchison_coords <- aitchison_coords %>%
  rownames_to_column("SampleID")

write.table(
  aitchison_coords,
  file = file.path(
    outdir,
    "aitchison_pcoa_coordinates.tsv"
  ),
  sep = "\t",
  quote = FALSE,
  row.names = FALSE
)


# ============================================================
# 12. QC
# ============================================================

cat("\nEcological feature table:\n")

print(
  ecological_features %>%
    dplyr::select(
      any_of(
        c(
          "Observed",
          "Chao1",
          "Shannon",
          "Simpson",
          "InvSimpson",
          "Pielou",
          "SequencingDepth"
        )
      )
    ) %>%
    summary()
)


cat("\nMissing ecological values:\n")

print(
  colSums(
    is.na(
      ecological_features %>%
        dplyr::select(
          any_of(
            c(
              "Observed",
              "Chao1",
              "Shannon",
              "Simpson",
              "InvSimpson",
              "Pielou"
            )
          )
        )
    )
  )
)

library(dplyr)

ecological_ml_clean <- ecological_features %>%
  dplyr::select(
    SampleID,
    HostGroup,
    HostSpecies,
    SampleContext,
    Infection,
    Observed,
    Chao1,
    Shannon,
    Simpson,
    InvSimpson,
    Pielou,
    SequencingDepth
  ) %>%
  rename(
    Observed_Genera = Observed,
    Chao1_Genus = Chao1,
    Shannon_Genus = Shannon,
    Simpson_Genus = Simpson,
    InvSimpson_Genus = InvSimpson,
    Pielou_Genus = Pielou
  )

write.table(
  ecological_ml_clean,
  file = file.path(outdir, "ecological_ML_features_clean.tsv"),
  sep = "\t",
  quote = FALSE,
  row.names = FALSE
)

# ============================================================
# SAMPLE-LEVEL CORE RETENTION METRICS
# AIV microbiome project
#
# PURPOSE:
# Quantify how much each individual sample retains the
# "baseline" microbiome core defined from AIV-negative birds.
#
# IMPORTANT:
# The output generated here is useful for:
#   - exploratory summaries
#   - plotting
#   - checking whether retention patterns differ by infection
#
# For MACHINE LEARNING performance estimates, the baseline
# core MUST be learned from TRAINING negatives within each
# cross-validation fold.
# ============================================================


# -----------------------------
# 1. PACKAGES
# -----------------------------

library(phyloseq)
library(dplyr)
library(tidyr)
library(tibble)


# -----------------------------
# 2. SETTINGS
# -----------------------------

ps_file <- "~/Microbiome_data/core_microbiome_outputs/ps_all_final.rds"

outdir <- "~/Microbiome_data/ML_ecological_features"

dir.create(
  outdir,
  showWarnings = FALSE,
  recursive = TRUE
)

# Match core microbiome analysis
detection_threshold <- 0.001   # 0.1% relative abundance
prevalence_threshold <- 0.50   # present in >=50% of baseline samples


# -----------------------------
# 3. LOAD DATA
# -----------------------------

ps <- readRDS(ps_file)

ps <- prune_samples(
  sample_sums(ps) > 0,
  ps
)

ps <- prune_taxa(
  taxa_sums(ps) > 0,
  ps
)


# -----------------------------
# 4. USE RELATIVE ABUNDANCE
# -----------------------------

ps_rel <- transform_sample_counts(
  ps,
  function(x) x / sum(x)
)


# -----------------------------
# 5. METADATA
# -----------------------------

meta <- data.frame(
  sample_data(ps_rel)
)

meta$SampleID <- rownames(meta)


# -----------------------------
# 6. EXTRACT SAMPLE x TAXA MATRIX
# -----------------------------

otu <- as(
  otu_table(ps_rel),
  "matrix"
)

if (taxa_are_rows(ps_rel)) {
  otu <- t(otu)
}

otu <- as.matrix(otu)


# ============================================================
# 7. DEFINE BASELINE CORE
#
# Use AIV-negative samples separately within host species.
#
# This prevents Turkey and Chicken from being forced to share
# the same baseline microbiome.
# ============================================================

baseline_group_var <- "HostSpecies"

baseline_groups <- unique(
  meta[[baseline_group_var]]
)

baseline_core_list <- list()


for (g in baseline_groups) {

  # Negative samples from this host
  neg_samples <- meta$SampleID[
    meta[[baseline_group_var]] == g &
      meta$Infection == "Neg"
  ]

  # Skip groups without negative samples
  if (length(neg_samples) == 0) {
    next
  }

  group_mat <- otu[
    neg_samples,
    ,
    drop = FALSE
  ]

  # Presence = abundance >= 0.1%
  present_mat <- group_mat >= detection_threshold

  # Prevalence among negative samples
  prevalence <- colMeans(
    present_mat
  )

  # Baseline core taxa
  core_taxa <- names(prevalence)[
    prevalence >= prevalence_threshold
  ]

  baseline_core_list[[g]] <- core_taxa


  cat(
    g,
    ":",
    length(neg_samples),
    "negative samples;",
    length(core_taxa),
    "baseline core taxa\n"
  )
}


# ============================================================
# 8. SAVE BASELINE CORE DEFINITIONS
# ============================================================

baseline_core_table <- bind_rows(
  lapply(
    names(baseline_core_list),
    function(g) {

      taxa <- baseline_core_list[[g]]

      if (length(taxa) == 0) {
        return(NULL)
      }

      tibble(
        HostSpecies = g,
        TaxonID = taxa
      )
    }
  )
)

write.table(
  baseline_core_table,
  file = file.path(
    outdir,
    "baseline_core_taxa_by_host.tsv"
  ),
  sep = "\t",
  quote = FALSE,
  row.names = FALSE
)


# ============================================================
# 9. CALCULATE SAMPLE-LEVEL RETENTION
# ============================================================

retention_list <- list()


for (i in seq_len(nrow(meta))) {

  sample_id <- meta$SampleID[i]

  host <- meta[[baseline_group_var]][i]

  core_taxa <- baseline_core_list[[host]]


  # If baseline couldn't be defined
  if (
    is.null(core_taxa) ||
    length(core_taxa) == 0
  ) {

    retention_list[[i]] <- tibble(

      SampleID = sample_id,

      BaselineCoreSize = NA_integer_,

      CoreTaxaPresent = NA_integer_,

      CoreTaxaLost = NA_integer_,

      CoreRetentionProportion = NA_real_,

      CoreAbundanceRetention = NA_real_,

      NonCoreTaxaPresent = NA_integer_,

      TotalTaxaPresent = NA_integer_
    )

    next
  }


  sample_vec <- otu[
    sample_id,
    ,
    drop = TRUE
  ]


  # -----------------------------
  # Core taxa detected in sample
  # -----------------------------

  core_present <- core_taxa[
    sample_vec[core_taxa] >= detection_threshold
  ]


  n_core_total <- length(core_taxa)

  n_core_present <- length(
    core_present
  )


  n_core_lost <- (
    n_core_total -
      n_core_present
  )


  # -----------------------------
  # Proportion baseline core retained
  # -----------------------------

  retention_prop <- (
    n_core_present /
      n_core_total
  )


  # -----------------------------
  # Relative abundance represented
  # by baseline core taxa
  # -----------------------------

  core_abundance <- sum(
    sample_vec[core_taxa],
    na.rm = TRUE
  )


  # -----------------------------
  # All taxa present in sample
  # -----------------------------

  all_present <- names(
    sample_vec
  )[
    sample_vec >= detection_threshold
  ]


  # -----------------------------
  # Taxa present but NOT members
  # of baseline core
  # -----------------------------

  noncore_present <- setdiff(
    all_present,
    core_taxa
  )


  retention_list[[i]] <- tibble(

    SampleID = sample_id,

    BaselineCoreSize = n_core_total,

    CoreTaxaPresent = n_core_present,

    CoreTaxaLost = n_core_lost,

    CoreRetentionProportion = retention_prop,

    CoreAbundanceRetention = core_abundance,

    NonCoreTaxaPresent = length(
      noncore_present
    ),

    TotalTaxaPresent = length(
      all_present
    )
  )
}


retention_df <- bind_rows(
  retention_list
)


# ============================================================
# 10. ADD METADATA
# ============================================================

retention_df <- meta %>%

  dplyr::select(
    SampleID,
    any_of(
      c(
        "HostGroup",
        "HostSpecies",
        "SampleContext",
        "Infection"
      )
    )
  ) %>%

  left_join(
    retention_df,
    by = "SampleID"
  )


# ============================================================
# 11. ADD ONE MORE USEFUL DERIVED METRIC
#
# Fraction of taxa detected in the sample that belong to
# the host baseline core.
# ============================================================

retention_df <- retention_df %>%

  mutate(

    CoreMembershipProportion = ifelse(

      TotalTaxaPresent > 0,

      CoreTaxaPresent /
        TotalTaxaPresent,

      NA_real_
    )
  )


# ============================================================
# 12. SAVE
# ============================================================

write.table(
  retention_df,
  file = file.path(
    outdir,
    "sample_level_core_retention_EXPLORATORY.tsv"
  ),
  sep = "\t",
  quote = FALSE,
  row.names = FALSE
)


# ============================================================
# 13. QC
# ============================================================

cat("\nSummary of retention metrics:\n")

print(
  retention_df %>%

    dplyr::select(
      CoreRetentionProportion,
      CoreAbundanceRetention,
      CoreMembershipProportion,
      CoreTaxaLost,
      NonCoreTaxaPresent
    ) %>%

    summary()
)


cat("\nMean values by host and infection:\n")

print(
  retention_df %>%

    group_by(
      HostSpecies,
      Infection
    ) %>%

    summarise(

      n = n(),

      mean_core_retention =
        mean(
          CoreRetentionProportion,
          na.rm = TRUE
        ),

      mean_core_abundance =
        mean(
          CoreAbundanceRetention,
          na.rm = TRUE
        ),

      mean_core_loss =
        mean(
          CoreTaxaLost,
          na.rm = TRUE
        ),

      mean_noncore_taxa =
        mean(
          NonCoreTaxaPresent,
          na.rm = TRUE
        ),

      .groups = "drop"
    )
)
cat("\nOutput files written to:\n")
cat(outdir, "\n")

