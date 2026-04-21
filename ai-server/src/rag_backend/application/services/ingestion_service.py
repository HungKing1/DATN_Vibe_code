"""Ingestion service — orchestrates document ingestion pipeline.

Flow: InputProcessor → [CollectionRouter] → ChunkingStrategy → EmbeddingProvider → VectorRepository
"""

from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

from rag_backend.domain.exceptions import (
    DocumentTooLargeError,
    IngestionError,
)
from rag_backend.domain.interfaces.chunking_strategy import ChunkingStrategy
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.domain.models.document import IngestionResult
from rag_backend.infrastructure.input_processors.factory import InputProcessorFactory
from rag_backend.infrastructure.query.collection_router import CollectionRouter

logger = logging.getLogger(__name__)


class IngestionService:
    """Orchestrates the full document ingestion pipeline.

    Supports:
    - Single file ingestion
    - Batch ingestion
    - Separate collection per type vs shared collection
    - Large document handling with batched embedding
    """

    def __init__(
        self,
        processor_factory: InputProcessorFactory,
        chunking_strategy: ChunkingStrategy,
        embedding_provider: EmbeddingProvider,
        vector_repository: VectorRepository,
        collection_router: CollectionRouter | None = None,
        max_document_size_mb: int = 50,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        embedding_batch_size: int = 32,
    ) -> None:
        self._processor_factory = processor_factory
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
        collection_name: str = "documents",
        tenant_id: str = "default",
    ) -> IngestionResult:
        """Ingest a single file into the vector store using Contextual Chunk Headers.

        Args:
            file_path: Path to the document file.
            collection_name: Target vector collection name.
            tenant_id: Tenant identifier for multi-tenant support.

        Returns:
            IngestionResult with storage details.
        """
        try:
            # 1. Validate file size
            size_mb = file_path.stat().st_size / (1024 * 1024)
            if size_mb > self._max_size_mb:
                raise DocumentTooLargeError(size_mb, self._max_size_mb)

            # 2. Get appropriate processor
            processor = self._processor_factory.get_processor(file_path)

            # 3. Process the document
            processed = await processor.process(file_path)
            processed.metadata.tenant_id = tenant_id


            # 4. Determine target collection using CCH
            target_collection = collection_name
            
            if self._collection_router:
                # ▶ Contextual Chunk Headers: LLM generates metadata
                header = await self._collection_router.generate_collection_header(
                    document_text=processed.content,
                )
                # Override the LLM's suggested collection_name with the user's
                header.collection_name = target_collection
                header.tenant_id = tenant_id
                header.source_files.append(file_path.name)
                header.document_count = 1

                # Register in collection registry
                existing = self._collection_router.registry.get(target_collection)
                if existing:
                    # Collection already exists — append file to existing
                    existing.source_files.append(file_path.name)
                    existing.document_count += 1
                    logger.info(
                        "Appending to existing collection '%s' (title: '%s')",
                        target_collection,
                        existing.title,
                    )
                else:
                    self._collection_router.registry.add(header)
                    logger.info(
                        "Registered collection '%s' with CCH (title: '%s')",
                        target_collection,
                        header.title,
                    )

            # 5. Ensure collection exists in vector DB
            if not await self._vector_repo.collection_exists(target_collection):
                await self._vector_repo.create_collection(
                    collection_name=target_collection,
                    dimension=self._embeddings.get_dimension(),
                    tenant_id=tenant_id,
                )

            # 6. Chunk the document
            chunks = await self._chunking.chunk(
                processed,
                chunk_size=self._chunk_size,
                chunk_overlap=self._chunk_overlap,
            )

            # 7. Embed chunks in batches (handles large documents)
            texts = [chunk.content for chunk in chunks]
            all_embeddings: list[list[float]] = []

            for i in range(0, len(texts), self._embedding_batch_size):
                batch = texts[i : i + self._embedding_batch_size]
                batch_embeddings = await self._embeddings.embed_batch(batch)
                all_embeddings.extend(batch_embeddings)

            for chunk, embedding in zip(chunks, all_embeddings):
                chunk.embedding = embedding
                chunk.metadata.collection_name = target_collection

            # 8. Store in vector DB
            stored_ids = await self._vector_repo.store(chunks, target_collection)

            logger.info(
                "Ingested '%s': %d chunks → collection '%s'",
                file_path.name,
                len(stored_ids),
                target_collection,
            )

            return IngestionResult(
                document_id=processed.id,
                chunks_stored=len(stored_ids),
                collection_name=target_collection,
            )

        except (DocumentTooLargeError, IngestionError):
            raise
        except Exception as e:
            raise IngestionError(
                f"Ingestion failed for {file_path.name}",
                detail=str(e),
            ) from e

    async def ingest_batch(
        self,
        file_paths: list[Path],
        collection_name: str = "documents",
        tenant_id: str = "default",
    ) -> list[IngestionResult]:
        """Ingest multiple files.

        Processes files sequentially to manage memory for large batches.
        For parallel processing, use Celery background tasks.
        """
        results: list[IngestionResult] = []

        for file_path in file_paths:
            try:
                result = await self.ingest_file(
                    file_path=file_path,
                    collection_name=collection_name,
                    tenant_id=tenant_id,
                )
                results.append(result)
            except Exception as e:
                logger.error("Failed to ingest %s: %s", file_path.name, e)
                results.append(
                    IngestionResult(
                        document_id=uuid4(),
                        chunks_stored=0,
                        collection_name=collection_name,
                        success=False,
                        error_message=str(e),
                    )
                )

        successful = sum(1 for r in results if r.success)
        logger.info(
            "Batch ingestion complete: %d/%d successful",
            successful,
            len(file_paths),
        )

        return results

    async def delete_document(
        self,
        document_id: str,
        collection_name: str = "documents",
    ) -> int:
        """Delete all chunks for a document from the vector store."""
        return await self._vector_repo.delete_by_document_id(
            document_id, collection_name
        )
