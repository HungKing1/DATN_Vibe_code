"""Pydantic schemas for query/RAG API endpoints."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


# ── Request Schemas ─────────────────────────────────────────


class QueryRequestSchema(BaseModel):
    """Request schema for standard RAG queries."""

    query: str
    top_k: int = 20
    rerank_top_k: int = 5
    hybrid_alpha: float = Field(default=0.5, ge=0.0, le=1.0)
    use_reranker: bool = True
    use_query_rewrite: bool = True
    stream: bool = False
    metadata_filters: dict = Field(default_factory=dict)
    max_context_tokens: int = 4000


class ReflectionQueryRequestSchema(BaseModel):
    """Request schema for reflection RAG queries.

    Includes all standard query parameters plus reflection-specific options.
    """

    query: str
    top_k: int = 20
    rerank_top_k: int = 5
    hybrid_alpha: float = Field(default=0.5, ge=0.0, le=1.0)
    use_reranker: bool = True
    use_query_rewrite: bool = True
    metadata_filters: dict = Field(default_factory=dict)
    max_context_tokens: int = 4000
    max_reflection_iterations: int = Field(
        default=3, ge=1, le=5, description="Max reflection iterations"
    )


# ── Response Schemas ────────────────────────────────────────


class CitationSchema(BaseModel):
    """Citation in a RAG response."""

    source: str
    content_snippet: str
    relevance_score: float
    page_number: int | None = None


class QueryResponseSchema(BaseModel):
    """Response schema for standard RAG queries."""

    id: UUID
    query: str
    answer: str
    citations: list[CitationSchema] = Field(default_factory=list)
    model: str = ""
    retrieval_count: int = 0
    reranked_count: int = 0
    token_usage: dict[str, int] = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)


# ── Reflection-specific response schemas ────────────────────


class EvaluationSchema(BaseModel):
    """Evaluation metrics in a reflection RAG response."""

    groundedness: float
    relevance: float
    citations_matched: float
    answer_length: int
    latency: float
    length_score: float
    latency_score: float
    final_score: float
    reasoning: str = ""


class ReflectionDecisionSchema(BaseModel):
    """A single reflection decision in the iteration history."""

    action: str
    improved_query: str | None = None
    new_top_k: int | None = None
    reasoning: str = ""


class ReflectionQueryResponseSchema(QueryResponseSchema):
    """Extended response schema for reflection RAG queries.

    Inherits all fields from QueryResponseSchema and adds
    evaluation metrics, iteration count, and reflection history.
    """

    evaluation: EvaluationSchema | None = None
    iteration_count: int = 1
    reflection_history: list[ReflectionDecisionSchema] = Field(default_factory=list)
