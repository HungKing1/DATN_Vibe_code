package com.example.backend.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Maps to AI Server's AgentQueryRequest (Python Pydantic) — agent_schemas.py.
 *
 * Sent to POST /api/v1/query/agent/ — triggers Multi-Agent LangGraph pipeline.
 *
 * Fields MUST match AI Server:
 * question : str
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentQueryRequest {

    /** The user's natural-language legal question. AI Server field: "question" */
    private String question;
}