"""Pydantic schemas for ingestion API endpoints."""

from __future__ import annotations

from pydantic import BaseModel


# ──────────────────────────────────────────────
# Law creation / file append
# ──────────────────────────────────────────────

class FileIngestionResult(BaseModel):
    """Per-file result inside a batch ingestion response."""

    file_name: str
    chunks_stored: int
    success: bool
    error: str | None = None


class LawCreateBatchResponse(BaseModel):
    """Response after creating a new Law from 1 or more files."""

    law_uuid: str
    title: str
    description: str
    source_files: list[str]
    chunk_count: int
    total_files: int
    successful: int
    failed: int
    results: list[FileIngestionResult] = []
    status: str = "created"


class FilesAddToLawResponse(BaseModel):
    """Response after adding 1 or more files to an existing Law."""

    law_uuid: str
    total_files: int
    successful: int
    failed: int
    total_chunks_added: int
    results: list[FileIngestionResult] = []
    status: str = "added"


# ──────────────────────────────────────────────
# Law listing
# ──────────────────────────────────────────────

class LawListResponse(BaseModel):
    """Response schema for listing all Laws."""

    count: int
    laws: list[dict]


# ──────────────────────────────────────────────
# Document / chunk deletion
# ──────────────────────────────────────────────

class DeleteDocumentRequest(BaseModel):
    """Request schema for document chunk deletion."""

    document_id: str
    collection_name: str = "LawChunk"


class DeleteDocumentResponse(BaseModel):
    """Response schema for document deletion."""

    document_id: str
    chunks_deleted: int
    status: str = "deleted"


class DeleteLawResponse(BaseModel):
    """Response schema for Law cascade delete."""

    law_uuid: str
    chunks_deleted: int
    law_deleted: bool
    status: str = "deleted"


# ──────────────────────────────────────────────
# Debug / Infra
# ──────────────────────────────────────────────

class CollectionListResponse(BaseModel):
    """Response schema for listing Weaviate collections (debug)."""

    collections: list[str]
    count: int
