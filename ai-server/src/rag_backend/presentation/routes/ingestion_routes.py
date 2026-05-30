"""Ingestion API routes — LegalChunk schema."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from rag_backend.presentation.schemas.ingestion_schemas import (
    CollectionListResponse,
    DeleteLawResponse,
    IngestionResultDto,
    LawListResponse,
    MongoIngestionRequest,
)

router = APIRouter(prefix="/api/v1/ingestion", tags=["Ingestion"])


def _get_ingestion_controller(request: Request):
    """Get IngestionController from app state (injected via DI)."""
    return request.app.state.ingestion_controller


def _get_vector_repo(request: Request):
    """Get VectorRepository from app state (injected via DI)."""
    return request.app.state.vector_repository


# ──────────────────────────────────────────────────────────────
# Law Management Routes
# ──────────────────────────────────────────────────────────────

@router.post(
    "/laws",
    response_model=IngestionResultDto,
    summary="Ingest Law from MongoDB",
)
async def ingest_law(
    request: MongoIngestionRequest,
    controller=Depends(_get_ingestion_controller),
):
    """Ingest a law document from MongoDB into Weaviate LegalChunk collection."""
    return await controller.ingest_law(request=request)


@router.post(
    "/laws/{so_ky_hieu:path}/reload",
    response_model=IngestionResultDto,
    summary="Reload Law from MongoDB",
)
async def reload_law(
    so_ky_hieu: str, # For path param, but we might just need ten_day_du for ingestion. 
    # For now, accept a body or just re-route to ingest if needed. Let's just take a body.
    request: MongoIngestionRequest,
    controller=Depends(_get_ingestion_controller),
):
    """Reload an existing law from MongoDB."""
    return await controller.ingest_law(request=request)


@router.get(
    "/laws",
    response_model=LawListResponse,
    summary="List all distinct Laws",
)
async def list_laws(
    controller=Depends(_get_ingestion_controller),
):
    """Get list of distinct laws from Weaviate."""
    return await controller.list_laws()


@router.delete(
    "/laws/{so_ky_hieu:path}",
    response_model=DeleteLawResponse,
    summary="Delete Law and its chunks",
)
async def delete_law(
    so_ky_hieu: str,
    controller=Depends(_get_ingestion_controller),
):
    """Delete a law and all its associated chunks from Weaviate."""
    return await controller.delete_law(so_ky_hieu=so_ky_hieu)


# ──────────────────────────────────────────────────────────────
# Debug / Infra
# ──────────────────────────────────────────────────────────────

@router.get(
    "/collections",
    response_model=CollectionListResponse,
    summary="List Weaviate collections (debug)",
)
async def list_collections(
    repo=Depends(_get_vector_repo),
):
    """List all collections in Weaviate."""
    collections = await repo.list_collections()
    return CollectionListResponse(
        collections=collections,
        count=len(collections),
    )
