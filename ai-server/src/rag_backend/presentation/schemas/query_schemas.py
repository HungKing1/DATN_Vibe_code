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
    metadata_filters: dict = Field(default_factory=dict)
    max_context_tokens: int = 4000




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
