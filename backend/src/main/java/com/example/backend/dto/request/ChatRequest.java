package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatRequest {
    @NotBlank(message = "Content is required")
    private String content;

    private String conversationId; // If null, create new

    /**
     * Query mode: "quick" → standard RAG (POST /api/v1/query/)
     *             "agent" → Multi-Agent LangGraph (POST /api/v1/query/agent)
     * Defaults to "quick" if null/missing.
     */
    private String mode; // "quick" | "agent"
}
