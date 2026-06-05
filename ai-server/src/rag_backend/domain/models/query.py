"""Query and RAG response domain models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RetrievalResult(BaseModel):
    """A single result from vector search."""

    chunk_id: str
    content: str
    score: float
    metadata: dict = Field(default_factory=dict)
    document_id: str | None = None


class RankedResult(BaseModel):
    """A re-ranked retrieval result."""

    chunk_id: str
    content: str
    original_score: float
    rerank_score: float
    metadata: dict = Field(default_factory=dict)
    document_id: str | None = None


class GenerationResult(BaseModel):
    """Result from LLM generation."""

    text: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
