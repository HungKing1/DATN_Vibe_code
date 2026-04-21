"""Embedding domain models."""

from __future__ import annotations

from pydantic import BaseModel


class EmbeddingVector(BaseModel):
    """A single embedding vector with metadata."""

    vector: list[float]
    model: str
    dimension: int
