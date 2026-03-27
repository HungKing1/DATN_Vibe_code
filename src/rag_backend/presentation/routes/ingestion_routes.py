"""Ingestion API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, UploadFile, File, Form
from typing import Annotated

from rag_backend.presentation.schemas.ingestion_schemas import (
    BatchUploadResponse,
    CollectionCreateRequest,
    CollectionListResponse,
    DeleteDocumentRequest,
    DeleteDocumentResponse,
    FileUploadResponse,
)

router = APIRouter(prefix="/api/v1/ingestion", tags=["Ingestion"])


def _get_ingestion_controller(request: Request):
    """Get IngestionController from app state (injected via DI)."""
    return request.app.state.ingestion_controller


def _get_vector_repo(request: Request):
    """Get VectorRepository from app state (injected via DI)."""
    return request.app.state.vector_repository


@router.post("/upload", response_model=FileUploadResponse)
async def upload_document(
    file: Annotated[UploadFile, File(description="Document file to ingest")],
    collection_name: Annotated[str, Form()] = "documents",
    request: Request = None,
    controller=Depends(_get_ingestion_controller),
):
    """Upload and ingest a single document."""
    tenant_id = getattr(request.state, "tenant_id", "default") if request else "default"
    return await controller.upload_file(
        file=file,
        tenant_id=tenant_id,
        collection_name=collection_name,
    )


@router.post("/upload/batch", response_model=BatchUploadResponse)
async def upload_batch(
    files: Annotated[list[UploadFile], File(description="Document files to ingest")],
    collection_name: Annotated[str, Form()] = "documents",
    request: Request = None,
    controller=Depends(_get_ingestion_controller),
):
    """Upload and ingest multiple documents."""
    tenant_id = getattr(request.state, "tenant_id", "default") if request else "default"
    return await controller.upload_batch(
        files=files,
        tenant_id=tenant_id,
        collection_name=collection_name,
    )


@router.delete("/document", response_model=DeleteDocumentResponse)
async def delete_document(
    body: DeleteDocumentRequest,
    controller=Depends(_get_ingestion_controller),
):
    """Delete a document and all its chunks from the vector store."""
    chunks_deleted = await controller.delete_document(
        document_id=body.document_id,
        collection_name=body.collection_name,
    )
    return DeleteDocumentResponse(
        document_id=body.document_id,
        chunks_deleted=chunks_deleted,
    )


@router.get("/collections", response_model=CollectionListResponse)
async def list_collections(
    repo=Depends(_get_vector_repo),
):
    """List all vector collections."""
    collections = await repo.list_collections()
    return CollectionListResponse(
        collections=collections,
        count=len(collections),
    )


@router.post("/collections")
async def create_collection(
    body: CollectionCreateRequest,
    repo=Depends(_get_vector_repo),
):
    """Create a new vector collection."""
    await repo.create_collection(
        collection_name=body.collection_name,
        dimension=body.dimension,
        tenant_id=body.tenant_id,
    )
    return {"status": "created", "collection_name": body.collection_name}
