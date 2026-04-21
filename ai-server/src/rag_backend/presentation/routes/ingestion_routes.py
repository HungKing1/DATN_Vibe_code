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
    """Upload and ingest a single document using Contextual Chunk Headers.
    
    The system will auto-generate metadata via LLM and save into collection_name.
    """
    tenant_id = getattr(request.state, "tenant_id", "default") if request else "default"
    return await controller.upload_file(
        file=file,
        collection_name=collection_name,
        tenant_id=tenant_id,
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
        collection_name=collection_name,
        tenant_id=tenant_id,
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


@router.get("/registry")
async def list_registered_collections(request: Request):
    """List all collections with their LLM-generated contextual headers.
    
    Returns title, description, keywords, and document count for each collection.
    """
    router = request.app.state.collection_router
    collections = router.registry.list_all()
    return {
        "count": len(collections),
        "collections": [
            {
                "collection_name": c.collection_name,
                "title": c.title,
                "description": c.description,
                "keywords": c.keywords,
                "document_count": c.document_count,
                "source_files": c.source_files,
            }
            for c in collections
        ],
    }
