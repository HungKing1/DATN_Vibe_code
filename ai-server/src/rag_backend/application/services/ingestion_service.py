"""Ingestion service — orchestrates document ingestion pipeline.

Flow (new 2-collection schema):
  InputProcessor → CollectionRouter (LLM) → ChunkingStrategy → EmbeddingProvider
  → VectorRepository.upsert_law() + store_chunks()
"""

from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

from rag_backend.domain.exceptions import (
    DocumentTooLargeError,
    IngestionError,
    LawNotFoundError,
)
from rag_backend.domain.interfaces.chunking_strategy import ChunkingStrategy
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.domain.models.document import IngestionResult
from rag_backend.domain.interfaces.input_processor import InputProcessor
from rag_backend.infrastructure.query.collection_router import CollectionRouter

logger = logging.getLogger(__name__)


class IngestionService:
    """Orchestrates the full document ingestion pipeline.

    Supports:
    - Creating a new Law from 1 file (law_uuid=None)
    - Adding a new file to an existing Law (law_uuid provided)
    - Batch ingestion into a single Law
    """

    def __init__(
        self,
        input_processor: InputProcessor,
        chunking_strategy: ChunkingStrategy,
        embedding_provider: EmbeddingProvider,
        vector_repository: VectorRepository,
        collection_router: CollectionRouter | None = None,
        max_document_size_mb: int = 50,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        embedding_batch_size: int = 32,
    ) -> None:
        self._processor = input_processor
        self._chunking = chunking_strategy
        self._embeddings = embedding_provider
        self._vector_repo = vector_repository
        self._collection_router = collection_router
        self._max_size_mb = max_document_size_mb
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._embedding_batch_size = embedding_batch_size

    async def ingest_file(
        self,
        file_path: Path,
        law_uuid: str | None = None,
        original_filename: str | None = None,
    ) -> IngestionResult:
        """Ingest a single file into the Law/LawChunk schema.

        Args:
            file_path: Path to the (temp) document file.
            law_uuid: None → create new Law object.
                      UUID string → add file to existing Law.
            original_filename: Real filename shown to LLM (not temp path).

        Returns:
            IngestionResult with law_uuid as collection_name.
        """
        # Use original filename for LLM context; fall back to temp name
        display_name = original_filename or file_path.name

        try:
            # 1. Validate file size
            size_mb = file_path.stat().st_size / (1024 * 1024)
            if size_mb > self._max_size_mb:
                raise DocumentTooLargeError(size_mb, self._max_size_mb)

            # 2. Extract text using the configured processor
            if not self._processor.can_process(file_path):
                raise IngestionError(f"Unsupported file type for {file_path.name}. Only PDF is allowed.")
            processed = await self._processor.process(file_path)
            # Overwrite file_name metadata with real name
            processed.metadata.file_name = display_name

            # 3. Route: create new Law or add to existing Law
            if self._collection_router is None:
                raise IngestionError(
                    "CollectionRouter is required for Law-based ingestion."
                )

            if law_uuid is None:
                # ── CREATE NEW LAW ──────────────────────────────────────
                logger.info("Creating new Law from file '%s'", display_name)

                header = await self._collection_router.generate_law_header(
                    file_excerpts={display_name: processed.content},  # real name
                )
                title_embedding = await self._embeddings.embed_text(
                    f"{header['title']}. {header['description']}"
                )
                law_uuid = await self._vector_repo.upsert_law(
                    title=header["title"],
                    description=header["description"],
                    keywords=header.get("keywords", []),
                    title_embedding=title_embedding,
                    source_file=display_name,       # real name stored in Weaviate
                    law_uuid=None,   # INSERT
                )
                logger.info(
                    "Created Law uuid=%s title='%s'", law_uuid, header["title"]
                )

            else:
                # ── ADD FILE TO EXISTING LAW ────────────────────────────
                logger.info(
                    "Adding file '%s' to existing Law uuid=%s",
                    display_name, law_uuid,
                )
                existing_law = await self._vector_repo.get_law_by_uuid(law_uuid)
                if not existing_law:
                    raise LawNotFoundError(law_uuid)

                updated = await self._collection_router.update_law_description(
                    law_title=existing_law["title"],
                    old_description=existing_law["description"],
                    new_filename=display_name,           # real name
                    new_content=processed.content,
                )
                title_embedding = await self._embeddings.embed_text(
                    f"{existing_law['title']}. {updated['description']}"
                )
                await self._vector_repo.upsert_law(
                    title=existing_law["title"],
                    description=updated["description"],
                    keywords=updated.get("keywords", existing_law.get("keywords", [])),
                    title_embedding=title_embedding,
                    source_file=display_name,            # real name stored in Weaviate
                    law_uuid=law_uuid,  # UPDATE
                )
                logger.info("Updated Law uuid=%s with new file '%s'", law_uuid, display_name)

            # 4. Chunk the document
            chunks = await self._chunking.chunk(
                processed,
                chunk_size=self._chunk_size,
                chunk_overlap=self._chunk_overlap,
            )

            # 5. Embed chunks in batches
            texts = [chunk.content for chunk in chunks]
            all_embeddings: list[list[float]] = []

            for i in range(0, len(texts), self._embedding_batch_size):
                batch = texts[i: i + self._embedding_batch_size]
                batch_embeddings = await self._embeddings.embed_batch(batch)
                all_embeddings.extend(batch_embeddings)

            for chunk, embedding in zip(chunks, all_embeddings):
                chunk.embedding = embedding
                chunk.metadata.collection_name = law_uuid  # traceability

            # 6. Store chunks into LawChunk + cross-reference
            stored_ids = await self._vector_repo.store_chunks(
                chunks=chunks,
                law_uuid=law_uuid,
            )

            logger.info(
                "Ingested '%s': %d chunks → law_uuid='%s'",
                file_path.name,
                len(stored_ids),
                law_uuid,
            )

            return IngestionResult(
                document_id=processed.id,
                chunks_stored=len(stored_ids),
                collection_name=law_uuid,
            )

        except (DocumentTooLargeError, IngestionError, LawNotFoundError):
            raise
        except Exception as e:
            raise IngestionError(
                f"Ingestion failed for {file_path.name}",
                detail=str(e),
            ) from e

    async def ingest_batch(
        self,
        file_paths: list[Path],
        law_uuid: str | None = None,
        original_filenames: list[str] | None = None,  # real names for LLM context
    ) -> list[IngestionResult]:
        """Ingest multiple files into the same Law.

        - law_uuid=None: tạo Law mới từ file đầu tiên, các file sau thêm vào Law đó.
        - law_uuid provided: tất cả files thêm vào Law đã có.
        - original_filenames: danh sách tên file thật (tương ứng file_paths).
        """
        results: list[IngestionResult] = []
        current_law_uuid = law_uuid
        names = original_filenames or [p.name for p in file_paths]

        for file_path, orig_name in zip(file_paths, names):
            try:
                result = await self.ingest_file(
                    file_path=file_path,
                    law_uuid=current_law_uuid,
                    original_filename=orig_name,   # real name for LLM
                )
                # Sau file đầu tiên, dùng law_uuid vừa tạo cho các file tiếp theo
                if current_law_uuid is None:
                    current_law_uuid = result.collection_name
                results.append(result)
            except Exception as e:
                logger.error("Failed to ingest '%s': %s", orig_name, e)
                results.append(
                    IngestionResult(
                        document_id=uuid4(),
                        chunks_stored=0,
                        collection_name=current_law_uuid or "unknown",
                        success=False,
                        error_message=str(e),
                    )
                )

        successful = sum(1 for r in results if r.success)
        logger.info(
            "Batch ingestion complete: %d/%d successful, law_uuid=%s",
            successful, len(file_paths), current_law_uuid,
        )
        return results

    async def delete_document(
        self,
        document_id: str,
        collection_name: str = "LawChunk",
    ) -> int:
        """Delete all chunks for a document from LawChunk."""
        return await self._vector_repo.delete_by_document_id(
            document_id, collection_name
        )
