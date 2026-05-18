"""Data Transfer Objects for query/RAG operations."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request DTO for RAG queries."""

    query: str
    collection_name: str = "documents"
    top_k: int = 20
    rerank_top_k: int = 5
    hybrid_alpha: float = 0.5
    use_reranker: bool = True
    use_query_rewrite: bool = True
    stream: bool = False
    metadata_filters: dict = Field(default_factory=dict)
    max_context_tokens: int = 4000


class QueryResponse(BaseModel):
    """Response DTO for RAG query results."""

    id: UUID
    query: str
    answer: str
    citations: list[CitationDTO] = Field(default_factory=list)
    model: str = ""
    retrieval_count: int = 0
    reranked_count: int = 0
    token_usage: dict[str, int] = Field(default_factory=dict)


class CitationDTO(BaseModel):
    """Citation DTO for source attribution."""

    source: str
    content_snippet: str
    relevance_score: float
    page_number: int | None = None


# Fix: Rebuild model after CitationDTO is defined
QueryResponse.model_rebuild()


class StreamChunk(BaseModel):
    """DTO for streaming response chunks."""

    token: str
    is_final: bool = False
    metadata: dict = Field(default_factory=dict)
