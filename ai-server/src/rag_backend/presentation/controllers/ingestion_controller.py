"""Ingestion controller — thin layer delegating to IngestionService."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from fastapi import UploadFile

from rag_backend.application.services.ingestion_service import IngestionService
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.presentation.schemas.ingestion_schemas import (
    DeleteLawResponse,
    FileIngestionResult,
    FilesAddToLawResponse,
    LawCreateBatchResponse,
    LawListResponse,
)

logger = logging.getLogger(__name__)


class IngestionController:
    """Controller for document ingestion operations (Law/LawChunk schema)."""

    def __init__(
        self,
        ingestion_service: IngestionService,
        vector_repository: VectorRepository | None = None,
    ) -> None:
        self._service = ingestion_service
        self._vector_repo = vector_repository

    # ──────────────────────────────────────────────────────────────
    # Law Management — multi-file batch support
    # ──────────────────────────────────────────────────────────────

    async def create_law(
        self,
        files: list[UploadFile],
    ) -> LawCreateBatchResponse:
        """Upload 1 hoặc nhiều files để tạo Law mới trong Weaviate.

        - File đầu tiên tạo Law (LLM sinh title/description từ nội dung thật).
        - Các file tiếp theo được thêm vào cùng Law vừa tạo.
        - Trả về LawCreateBatchResponse với law_uuid + per-file results.
        """
        tmp_paths: list[Path] = []
        original_names: list[str] = []

        try:
            # Save all files to temp, giữ tên gốc
            for file in files:
                suffix = Path(file.filename or "file.pdf").suffix
                original_names.append(file.filename or "unknown.pdf")
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=suffix, prefix="rag_"
                ) as tmp:
                    tmp.write(await file.read())
                    tmp_paths.append(Path(tmp.name))

            results = await self._service.ingest_batch(
                file_paths=tmp_paths,
                law_uuid=None,                          # CREATE new Law
                original_filenames=original_names,      # real names for LLM
            )

            # law_uuid được tạo từ file đầu tiên thành công
            law_uuid = next(
                (r.collection_name for r in results if r.success),
                None,
            )

            # Fetch Law metadata từ Weaviate (title, description, chunk_count cập nhật)
            law_info = None
            if law_uuid and self._vector_repo:
                law_info = await self._vector_repo.get_law_by_uuid(law_uuid)

            successful = sum(1 for r in results if r.success)
            file_results = [
                FileIngestionResult(
                    file_name=name,
                    chunks_stored=r.chunks_stored,
                    success=r.success,
                    error=r.error_message if not r.success else None,
                )
                for r, name in zip(results, original_names)
            ]

            return LawCreateBatchResponse(
                law_uuid=law_uuid or "",
                title=law_info["title"] if law_info else "",
                description=law_info["description"] if law_info else "",
                source_files=law_info["source_files"] if law_info else original_names,
                chunk_count=law_info["chunk_count"] if law_info else sum(r.chunks_stored for r in results),
                total_files=len(files),
                successful=successful,
                failed=len(files) - successful,
                results=file_results,
            )
        finally:
            for p in tmp_paths:
                p.unlink(missing_ok=True)

    async def add_files_to_law(
        self,
        files: list[UploadFile],
        law_uuid: str,
    ) -> FilesAddToLawResponse:
        """Upload 1 hoặc nhiều files và append vào Law đã tồn tại.

        - Tất cả files được thêm vào cùng law_uuid (không tạo Law mới).
        - LLM cập nhật description sau mỗi file.
        - Trả về FilesAddToLawResponse với per-file results.
        """
        tmp_paths: list[Path] = []
        original_names: list[str] = []

        try:
            for file in files:
                suffix = Path(file.filename or "file.pdf").suffix
                original_names.append(file.filename or "unknown.pdf")
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=suffix, prefix="rag_"
                ) as tmp:
                    tmp.write(await file.read())
                    tmp_paths.append(Path(tmp.name))

            results = await self._service.ingest_batch(
                file_paths=tmp_paths,
                law_uuid=law_uuid,                      # ADD to existing Law
                original_filenames=original_names,
            )

            successful = sum(1 for r in results if r.success)
            total_chunks = sum(r.chunks_stored for r in results if r.success)
            file_results = [
                FileIngestionResult(
                    file_name=name,
                    chunks_stored=r.chunks_stored,
                    success=r.success,
                    error=r.error_message if not r.success else None,
                )
                for r, name in zip(results, original_names)
            ]

            return FilesAddToLawResponse(
                law_uuid=law_uuid,
                total_files=len(files),
                successful=successful,
                failed=len(files) - successful,
                total_chunks_added=total_chunks,
                results=file_results,
            )
        finally:
            for p in tmp_paths:
                p.unlink(missing_ok=True)

    async def list_laws(self) -> LawListResponse:
        """List all Law objects from Weaviate."""
        if self._vector_repo is None:
            return LawListResponse(count=0, laws=[])
        laws = await self._vector_repo.get_all_laws()
        return LawListResponse(count=len(laws), laws=laws)

    async def delete_law(self, law_uuid: str) -> DeleteLawResponse:
        """Cascade-delete a Law and ALL its associated LawChunk objects.

        Execution order:
        1. Batch-delete all LawChunk objects where law_uuid matches.
        2. Delete the Law object itself from the Law collection.
        """
        if self._vector_repo is None:
            return DeleteLawResponse(
                law_uuid=law_uuid,
                chunks_deleted=0,
                law_deleted=False,
                status="error",
            )
        result = await self._vector_repo.delete_law(law_uuid)
        return DeleteLawResponse(
            law_uuid=result["law_uuid"],
            chunks_deleted=result["chunks_deleted"],
            law_deleted=result["law_deleted"],
        )

    # ──────────────────────────────────────────────────────────────
    # Document / Chunk Management
    # ──────────────────────────────────────────────────────────────

    async def delete_document(
        self,
        document_id: str,
        collection_name: str = "LawChunk",
    ) -> int:
        """Delete a document and all its chunks from LawChunk."""
        return await self._service.delete_document(document_id, collection_name)
