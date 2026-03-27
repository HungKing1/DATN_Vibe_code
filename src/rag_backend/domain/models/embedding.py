"""Embedding and versioning domain models."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class EmbeddingVector(BaseModel):
    """A single embedding vector with metadata."""

    vector: list[float]
    model: str
    version: str
    dimension: int


class EmbeddingVersion(BaseModel):
    """Tracks embedding model versions for consistency."""

    version: str
    model_name: str
    dimension: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    description: str = ""


class CollectionVersion(BaseModel):
    """Tracks collection schema versions."""

    collection_name: str
    schema_version: str
    embedding_version: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tenant_id: str = "default"
    properties: dict = Field(default_factory=dict)


class SchemaVersion(BaseModel):
    """Schema version metadata for migration tracking."""

    version: str
    description: str
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    changes: list[str] = Field(default_factory=list)
