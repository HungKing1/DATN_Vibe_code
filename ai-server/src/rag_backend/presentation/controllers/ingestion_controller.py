"""Ingestion controller — thin layer delegating to IngestionService."""

from __future__ import annotations

import logging

from rag_backend.application.services.ingestion_service import IngestionService
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.presentation.schemas.ingestion_schemas import (
    DeleteLawResponse,
    IngestionResultDto,
    LawListResponse,
    MongoIngestionRequest,
)

logger = logging.getLogger(__name__)


class IngestionController:
    """Controller for document ingestion operations (LegalChunk schema)."""

    def __init__(
        self,
        ingestion_service: IngestionService,
        vector_repository: VectorRepository | None = None,
    ) -> None:
        self._service = ingestion_service
        self._vector_repo = vector_repository

    async def ingest_law(
        self,
        request: MongoIngestionRequest,
    ) -> IngestionResultDto:
        """Ingest a law from MongoDB by name."""
        result = await self._service.ingest_from_mongodb(request.ten_day_du)
        
        return IngestionResultDto(
            so_ky_hieu=result.so_ky_hieu,
            ten_day_du=result.ten_day_du,
            chunks_stored=result.chunks_stored,
            success=result.success,
            error_message=result.error_message,
        )

    async def list_laws(self) -> LawListResponse:
        """List all distinct laws from Weaviate."""
        laws = await self._service.list_laws()
        return LawListResponse(count=len(laws), laws=laws)

    async def delete_law(self, so_ky_hieu: str) -> DeleteLawResponse:
        """Delete a law and all its chunks by so_ky_hieu."""
        result = await self._service.delete_law(so_ky_hieu)
        return DeleteLawResponse(
            so_ky_hieu=result["so_ky_hieu"],
            chunks_deleted=result["chunks_deleted"],
        )
