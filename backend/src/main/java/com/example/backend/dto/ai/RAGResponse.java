package com.example.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Maps to AI Server's QueryResponseSchema (Python).
 * 
 * Contains the RAG pipeline's answer, citations, model info, and usage stats.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RAGResponse {

    private String id;

    private String query;

    private String answer;

    private List<RAGCitation> citations;

    private String model;

    @JsonProperty("retrieval_count")
    private int retrievalCount;

    @JsonProperty("reranked_count")
    private int rerankedCount;

    @JsonProperty("token_usage")
    private Map<String, Integer> tokenUsage;

    private Map<String, Object> metadata;

    /**
     * Maps to AI Server's CitationSchema.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RAGCitation {
        private String source;

        @JsonProperty("content_snippet")
        private String contentSnippet;

        @JsonProperty("relevance_score")
        private double relevanceScore;

        @JsonProperty("page_number")
        private Integer pageNumber;
    }
}
