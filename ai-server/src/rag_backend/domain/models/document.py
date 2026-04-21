"""Document domain models."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    """Supported document types."""

    PDF = "pdf"
    TXT = "txt"
    JSON = "json"
    HTML = "html"
    DOCX = "docx"
    IMAGE = "image"
    AUDIO = "audio"


class DocumentMetadata(BaseModel):
    """Metadata associated with a document."""

    source: str = ""
    file_name: str = ""
    file_type: DocumentType | str = ""
    file_size_bytes: int = 0
    page_count: int | None = None
    language: str = "en"
    tenant_id: str = "default"
    collection_name: str = ""

    custom: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DocumentChunk(BaseModel):
    """A chunk of a document after splitting."""

    id: UUID = Field(default_factory=uuid4)
    document_id: UUID
    content: str
    chunk_index: int
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)
    embedding: list[float] | None = None
    token_count: int | None = None


class ProcessedDocument(BaseModel):
    """Result of processing a raw input into extractable text."""

    id: UUID = Field(default_factory=uuid4)
    content: str
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)
    pages: list[str] = Field(default_factory=list)


class Document(BaseModel):
    """Top-level document entity."""

    id: UUID = Field(default_factory=uuid4)
    content: str
    chunks: list[DocumentChunk] = Field(default_factory=list)
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)


class IngestionResult(BaseModel):
    """Result of ingesting a document into the vector store."""

    document_id: UUID
    chunks_stored: int
    collection_name: str

    success: bool = True
    error_message: str | None = None
