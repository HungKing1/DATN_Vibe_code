"""Ingestion controller — thin layer delegating to IngestionService."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from rag_backend.application.services.ingestion_service import IngestionService
from rag_backend.presentation.schemas.ingestion_schemas import (
    BatchUploadResponse,
    FileUploadResponse,
)

logger = logging.getLogger(__name__)


class IngestionController:
    """Controller for document ingestion operations."""

    def __init__(self, ingestion_service: IngestionService) -> None:
        self._service = ingestion_service

    async def upload_file(
        self,
        file: UploadFile,
        collection_name: str = "documents",
        tenant_id: str = "default",
    ) -> FileUploadResponse:
        """Handle single file upload and ingestion."""
        # Save uploaded file to temp location
        suffix = Path(file.filename or "file.txt").suffix
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=suffix, prefix="rag_"
        ) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = Path(tmp.name)

        try:
            result = await self._service.ingest_file(
                file_path=tmp_path,
                collection_name=collection_name,
                tenant_id=tenant_id,
            )

            return FileUploadResponse(
                document_id=result.document_id,
                file_name=file.filename or "unknown",
                chunks_stored=result.chunks_stored,
                collection_name=result.collection_name,
            )
        finally:
            tmp_path.unlink(missing_ok=True)

    async def upload_batch(
        self,
        files: list[UploadFile],
        collection_name: str = "documents",
        tenant_id: str = "default",
    ) -> BatchUploadResponse:
        """Handle batch file upload and ingestion."""
        tmp_paths: list[Path] = []

        try:
            # Save all files to temp
            for file in files:
                suffix = Path(file.filename or "file.txt").suffix
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=suffix, prefix="rag_"
                ) as tmp:
                    content = await file.read()
                    tmp.write(content)
                    tmp_paths.append(Path(tmp.name))

            results = await self._service.ingest_batch(
                file_paths=tmp_paths,
                collection_name=collection_name,
                tenant_id=tenant_id,
            )

            file_responses = []
            for result, file in zip(results, files):
                file_responses.append(
                    FileUploadResponse(
                        document_id=result.document_id,
                        file_name=file.filename or "unknown",
                        chunks_stored=result.chunks_stored,
                        collection_name=result.collection_name,
                        status="completed" if result.success else "failed",
                    )
                )

            successful = sum(1 for r in results if r.success)
            return BatchUploadResponse(
                total_files=len(files),
                successful=successful,
                failed=len(files) - successful,
                results=file_responses,
            )
        finally:
            for p in tmp_paths:
                p.unlink(missing_ok=True)

    async def delete_document(
        self,
        document_id: str,
        collection_name: str = "documents",
    ) -> int:
        """Delete a document and all its chunks."""
        return await self._service.delete_document(document_id, collection_name)
