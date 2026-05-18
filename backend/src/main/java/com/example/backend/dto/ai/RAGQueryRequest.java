package com.example.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * Maps to AI Server's QueryRequestSchema (Python).
 * 
 * Used for both standard RAG queries and search requests.
 * Supports all RAG pipeline options: reranking, query rewriting, streaming, filters.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RAGQueryRequest {

    private String query;

    @Builder.Default
    @JsonProperty("top_k")
    private int topK = 20;

    @Builder.Default
    @JsonProperty("rerank_top_k")
    private int rerankTopK = 5;

    @Builder.Default
    @JsonProperty("hybrid_alpha")
    private double hybridAlpha = 0.5;

    @Builder.Default
    @JsonProperty("use_reranker")
    private boolean useReranker = true;

    @Builder.Default
    @JsonProperty("use_query_rewrite")
    private boolean useQueryRewrite = true;

    @Builder.Default
    private boolean stream = false;

    @Builder.Default
    @JsonProperty("metadata_filters")
    private Map<String, Object> metadataFilters = new HashMap<>();

    @Builder.Default
    @JsonProperty("max_context_tokens")
    private int maxContextTokens = 4000;
}
