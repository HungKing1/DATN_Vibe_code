"""Semantic chunking strategy — groups text by semantic similarity."""

from __future__ import annotations

import logging
from uuid import uuid4

from rag_backend.domain.exceptions import ChunkingError
from rag_backend.domain.interfaces.chunking_strategy import ChunkingStrategy
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.models.document import DocumentChunk, ProcessedDocument

logger = logging.getLogger(__name__)


class SemanticChunker(ChunkingStrategy):
    """Semantic chunking based on embedding similarity between sentences.

    Splits text into sentences, embeds each, then groups consecutive
    sentences that are semantically similar into the same chunk.
    """

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        similarity_threshold: float = 0.5,
    ) -> None:
        self._embedding_provider = embedding_provider
        self._similarity_threshold = similarity_threshold

    def get_strategy_name(self) -> str:
        return "semantic"

    async def chunk(
        self,
        document: ProcessedDocument,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> list[DocumentChunk]:
        """Split document into semantically coherent chunks."""
        try:
            # Split into sentences
            sentences = self._split_sentences(document.content)
            if not sentences:
                return []

            # Embed all sentences
            embeddings = await self._embedding_provider.embed_batch(sentences)

            # Group by similarity
            groups = self._group_by_similarity(sentences, embeddings, chunk_size)

            chunks = []
            for i, group in enumerate(groups):
                chunk_text = " ".join(group)
                chunk = DocumentChunk(
                    id=uuid4(),
                    document_id=document.id,
                    content=chunk_text,
                    chunk_index=i,
                    metadata=document.metadata.model_copy(),
                    token_count=len(chunk_text.split()),
                )
                chunks.append(chunk)

            logger.info(
                "Chunked document %s into %d chunks (strategy=semantic)",
                document.id,
                len(chunks),
            )

            return chunks

        except Exception as e:
            raise ChunkingError(
                f"Semantic chunking failed for document {document.id}",
                detail=str(e),
            ) from e

    @staticmethod
    def _split_sentences(text: str) -> list[str]:
        """Split text into sentences."""
        import re

        sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sentences if s.strip()]

    def _group_by_similarity(
        self,
        sentences: list[str],
        embeddings: list[list[float]],
        max_chunk_size: int,
    ) -> list[list[str]]:
        """Group consecutive sentences by cosine similarity."""
        if not sentences:
            return []

        groups: list[list[str]] = [[sentences[0]]]
        current_size = len(sentences[0])

        for i in range(1, len(sentences)):
            similarity = self._cosine_similarity(embeddings[i - 1], embeddings[i])

            if similarity >= self._similarity_threshold and current_size + len(sentences[i]) <= max_chunk_size:
                groups[-1].append(sentences[i])
                current_size += len(sentences[i])
            else:
                groups.append([sentences[i]])
                current_size = len(sentences[i])

        return groups

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)
