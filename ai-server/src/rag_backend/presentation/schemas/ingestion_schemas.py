"""Pydantic schemas for ingestion API endpoints."""

from __future__ import annotations

from pydantic import BaseModel


# ──────────────────────────────────────────────
# MongoDB JSON Ingestion
# ──────────────────────────────────────────────

class MongoIngestionRequest(BaseModel):
    """Request to ingest a law from MongoDB by so_ky_hieu."""
    so_ky_hieu: str


class IngestionResultDto(BaseModel):
    """Result of ingesting a law from MongoDB."""
    so_ky_hieu: str
    ten_day_du: str
    chunks_stored: int
    success: bool = True
    error_message: str | None = None
    status: str = "ingested"


# ──────────────────────────────────────────────
# Law listing
# ──────────────────────────────────────────────

class LawListResponse(BaseModel):
    """Response schema for listing all distinct laws."""
    count: int
    laws: list[dict]


# ──────────────────────────────────────────────
# Document / chunk deletion
# ──────────────────────────────────────────────

class DeleteDocumentRequest(BaseModel):
    """Request schema for document chunk deletion (legacy support)."""
    document_id: str
    collection_name: str = "LegalChunk"


class DeleteDocumentResponse(BaseModel):
    """Response schema for document deletion (legacy support)."""
    document_id: str
    chunks_deleted: int
    status: str = "deleted"


class DeleteLawResponse(BaseModel):
    """Response schema for Law cascade delete by so_ky_hieu."""
    so_ky_hieu: str
    chunks_deleted: int
    status: str = "deleted"


