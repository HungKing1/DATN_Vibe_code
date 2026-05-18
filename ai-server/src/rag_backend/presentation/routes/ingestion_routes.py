"""Ingestion API routes — Law/LawChunk schema."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, UploadFile, File, Form
from typing import Annotated

from rag_backend.presentation.schemas.ingestion_schemas import (
    CollectionListResponse,
    DeleteDocumentRequest,
    DeleteDocumentResponse,
    DeleteLawResponse,
    FilesAddToLawResponse,
    LawCreateBatchResponse,
    LawListResponse,
)

router = APIRouter(prefix="/api/v1/ingestion", tags=["Ingestion"])


def _get_ingestion_controller(request: Request):
    """Get IngestionController from app state (injected via DI)."""
    return request.app.state.ingestion_controller


def _get_vector_repo(request: Request):
    """Get VectorRepository from app state (injected via DI)."""
    return request.app.state.vector_repository


# ──────────────────────────────────────────────────────────────
# Law Management Routes (schema mới — dùng chính)
# ──────────────────────────────────────────────────────────────

@router.post(
    "/laws",
    response_model=LawCreateBatchResponse,
    summary="Tạo Law mới từ 1 hoặc nhiều file",
)
async def create_law(
    files: Annotated[list[UploadFile], File(description="1 hoặc nhiều file PDF của bộ luật")],
    controller=Depends(_get_ingestion_controller),
):
    """Upload 1 hoặc nhiều files và tạo Law object mới trong Weaviate.

    Pipeline:
    - File đầu: extract → LLM sinh title/description/keywords → create Law → chunk → store
    - File 2+: extract → LLM update description → chunk → store (append vào Law vừa tạo)

    Trả về law_uuid và kết quả từng file để admin theo dõi.
    """
    return await controller.create_law(files=files)


@router.post(
    "/laws/{law_uuid}/files",
    response_model=FilesAddToLawResponse,
    summary="Thêm 1 hoặc nhiều file vào Law đã có",
)
async def add_files_to_law(
    law_uuid: str,
    files: Annotated[list[UploadFile], File(description="1 hoặc nhiều file PDF bổ sung")],
    controller=Depends(_get_ingestion_controller),
):
    """Thêm 1 hoặc nhiều files vào Law đã tồn tại (incremental ingestion).

    Pipeline (mỗi file):
    - extract → LLM cập nhật description (không gen lại) → chunk → embed → store

    Không tạo Law mới — chỉ append chunks vào Law có law_uuid cho trước.
    """
    return await controller.add_files_to_law(
        files=files, law_uuid=law_uuid
    )


@router.get(
    "/laws",
    response_model=LawListResponse,
    summary="Danh sách tất cả Laws",
)
async def list_laws(
    controller=Depends(_get_ingestion_controller),
):
    """Lấy danh sách tất cả bộ luật từ Weaviate Law collection.

    Data source: Weaviate (persistent) — không phụ thuộc in-memory registry.
    """
    return await controller.list_laws()


@router.delete(
    "/laws/{law_uuid}",
    response_model=DeleteLawResponse,
    summary="Xóa Law và toàn bộ chunks liên quan",
)
async def delete_law(
    law_uuid: str,
    controller=Depends(_get_ingestion_controller),
):
    """Cascade-delete một bộ luật khỏi Weaviate.

    Thứ tự xóa:
    1. Xóa tất cả LawChunk objects có `law_uuid` khớp (batch delete by filter).
    2. Xóa Law object khỏi Law collection.

    Không thể hoàn tác — toàn bộ dữ liệu vector liên quan sẽ bị xóa vĩnh viễn.
    """
    return await controller.delete_law(law_uuid=law_uuid)


# ──────────────────────────────────────────────────────────────
# Document / Chunk Management
# ──────────────────────────────────────────────────────────────

@router.delete(
    "/document",
    response_model=DeleteDocumentResponse,
    summary="Xóa document chunks khỏi LawChunk",
)
async def delete_document(
    body: DeleteDocumentRequest,
    controller=Depends(_get_ingestion_controller),
):
    """Xóa tất cả chunks của 1 document khỏi LawChunk collection."""
    chunks_deleted = await controller.delete_document(
        document_id=body.document_id,
        collection_name=body.collection_name,
    )
    return DeleteDocumentResponse(
        document_id=body.document_id,
        chunks_deleted=chunks_deleted,
    )


# ──────────────────────────────────────────────────────────────
# Debug / Infra
# ──────────────────────────────────────────────────────────────

@router.get(
    "/collections",
    response_model=CollectionListResponse,
    summary="Liệt kê Weaviate collections (debug)",
)
async def list_collections(
    repo=Depends(_get_vector_repo),
):
    """Liệt kê tất cả collections trong Weaviate (Law, LawChunk, ...).

    Dùng để debug — kiểm tra schema đã được khởi tạo chưa.
    """
    collections = await repo.list_collections()
    return CollectionListResponse(
        collections=collections,
        count=len(collections),
    )
