"""Data Transfer Objects for ingestion operations."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class IngestionRequest(BaseModel):
    """Request DTO for document ingestion."""

    file_name: str
    collection_name: str = "documents"
    chunking_strategy: str = "recursive"
    chunk_size: int = 512
    chunk_overlap: int = 50
    metadata: dict = Field(default_factory=dict)
    async_processing: bool = False


class BatchIngestionRequest(BaseModel):
    """Request DTO for batch document ingestion."""

    file_names: list[str]
    collection_name: str = "documents"
    chunking_strategy: str = "recursive"
    chunk_size: int = 512
    chunk_overlap: int = 50
    async_processing: bool = True


class IngestionResponse(BaseModel):
    """Response DTO for ingestion results."""

    document_id: UUID
    file_name: str
    chunks_stored: int
    collection_name: str
    status: str = "completed"
    task_id: str | None = None  # for async processing


class BatchIngestionResponse(BaseModel):
    """Response DTO for batch ingestion."""

    total_files: int
    successful: int
    failed: int
    results: list[IngestionResponse] = Field(default_factory=list)
    task_ids: list[str] = Field(default_factory=list)
    status: str = "completed"
