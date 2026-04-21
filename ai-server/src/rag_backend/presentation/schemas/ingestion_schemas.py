"""Pydantic schemas for ingestion API endpoints."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class FileUploadResponse(BaseModel):
    """Response schema for single file upload."""

    document_id: UUID
    file_name: str
    chunks_stored: int
    collection_name: str
    status: str = "completed"
    task_id: str | None = None


class BatchUploadResponse(BaseModel):
    """Response schema for batch file upload."""

    total_files: int
    successful: int
    failed: int
    results: list[FileUploadResponse] = Field(default_factory=list)
    status: str = "completed"


class DeleteDocumentRequest(BaseModel):
    """Request schema for document deletion."""

    document_id: str
    collection_name: str = "documents"


class DeleteDocumentResponse(BaseModel):
    """Response schema for document deletion."""

    document_id: str
    chunks_deleted: int
    status: str = "deleted"


class CollectionCreateRequest(BaseModel):
    """Request schema for creating a new collection."""

    collection_name: str
    dimension: int = 384
    tenant_id: str = "default"


class CollectionListResponse(BaseModel):
    """Response schema for listing collections."""

    collections: list[str]
    count: int
