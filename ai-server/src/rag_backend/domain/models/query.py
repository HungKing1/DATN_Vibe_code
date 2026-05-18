"""Query and RAG response domain models."""

from __future__ import annotations

from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class QueryType(str, Enum):
    """Classification of query intent."""

    FACTUAL = "factual"
    ANALYTICAL = "analytical"
    SUMMARIZATION = "summarization"
    COMPARISON = "comparison"
    CONVERSATIONAL = "conversational"


class InputModality(str, Enum):
    """Input modality type."""

    TEXT = "text"
    VOICE = "voice"
    IMAGE = "image"


class Query(BaseModel):
    """Represents a user query through the RAG pipeline."""

    id: UUID = Field(default_factory=uuid4)
    original_text: str
    rewritten_text: str | None = None
    query_type: QueryType | None = None
    modality: InputModality = InputModality.TEXT
    collection_names: list[str] = Field(default_factory=lambda: ["documents"])
    metadata_filters: dict[str, str | int | float | bool] = Field(default_factory=dict)
    top_k: int = 20
    hybrid_alpha: float = 0.5


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


class Citation(BaseModel):
    """Source attribution for generated content."""

    source: str
    chunk_id: str
    content_snippet: str
    relevance_score: float
    page_number: int | None = None


class GenerationResult(BaseModel):
    """Result from LLM generation."""

    text: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class RAGResponse(BaseModel):
    """Complete RAG pipeline response."""

    id: UUID = Field(default_factory=uuid4)
    query: str
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    model: str = ""
    retrieval_count: int = 0
    reranked_count: int = 0
    token_usage: dict[str, int] = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)
