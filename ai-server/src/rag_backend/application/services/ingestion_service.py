"""Ingestion service — orchestrates document ingestion pipeline from MongoDB to Weaviate.

Flow:
  MongoDBLegalReader → LegalArticleChunker → EmbeddingProvider → VectorRepository
"""

from __future__ import annotations

import logging

from rag_backend.domain.exceptions import IngestionError
from rag_backend.domain.interfaces.chunking_strategy import ChunkingStrategy
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.domain.models.document import IngestionResult
from rag_backend.infrastructure.mongodb.mongodb_legal_reader import MongoDBLegalReader

logger = logging.getLogger(__name__)


class IngestionService:
    """Orchestrates the MongoDB to Weaviate ingestion pipeline."""

    def __init__(
        self,
        chunking_strategy: ChunkingStrategy,
        embedding_provider: EmbeddingProvider,
        vector_repository: VectorRepository,
        mongo_reader: MongoDBLegalReader,
        embedding_batch_size: int = 32,
    ) -> None:
        self._chunking = chunking_strategy
        self._embeddings = embedding_provider
        self._vector_repo = vector_repository
        self._mongo_reader = mongo_reader
        self._embedding_batch_size = embedding_batch_size

    async def ingest_from_mongodb(self, ten_day_du: str) -> IngestionResult:
        """Ingest a legal document from MongoDB by its name."""
        try:
            # 1. Find document in MongoDB
            doc_meta = await self._mongo_reader.find_by_name(ten_day_du)
            if not doc_meta:
                raise IngestionError(f"Không tìm thấy văn bản '{ten_day_du}' trong MongoDB")
                
            so_ky_hieu = doc_meta["so_ky_hieu"]
            
            # 2. Get articles
            articles = await self._mongo_reader.get_articles(so_ky_hieu)
            if not articles:
                logger.warning("No articles found for %s", so_ky_hieu)
                
            # 3. Chunk articles
            chunks = await self._chunking.chunk(articles, doc_meta)
            
            if not chunks:
                logger.warning("No chunks generated for %s", so_ky_hieu)
                return IngestionResult(
                    so_ky_hieu=so_ky_hieu,
                    ten_day_du=doc_meta["ten_day_du"],
                    chunks_stored=0,
                )

            # 4. Embed chunks
            texts = [chunk.legal.embedding_text for chunk in chunks]
            all_embeddings: list[list[float]] = []

            for i in range(0, len(texts), self._embedding_batch_size):
                batch = texts[i: i + self._embedding_batch_size]
                batch_embeddings = await self._embeddings.embed_batch(batch)
                all_embeddings.extend(batch_embeddings)

            for chunk, embedding in zip(chunks, all_embeddings):
                chunk.embedding = embedding

            # 5. Store chunks in Weaviate
            stored_ids = await self._vector_repo.store_legal_chunks(chunks)

            logger.info(
                "Ingested '%s': %d chunks",
                ten_day_du,
                len(stored_ids),
            )

            return IngestionResult(
                so_ky_hieu=so_ky_hieu,
                ten_day_du=doc_meta["ten_day_du"],
                chunks_stored=len(stored_ids),
            )

        except IngestionError:
            raise
        except Exception as e:
            raise IngestionError(
                f"Ingestion failed for {ten_day_du}",
                detail=str(e),
            ) from e

    async def list_laws(self) -> list[dict]:
        """List distinct laws from vector database."""
        return await self._vector_repo.get_distinct_laws()
        
    async def delete_law(self, so_ky_hieu: str) -> dict:
        """Delete a law and all its chunks by so_ky_hieu."""
        return await self._vector_repo.delete_by_so_ky_hieu(so_ky_hieu)
