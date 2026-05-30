"""ChunkingStrategy interface — Strategy Pattern for document chunking."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rag_backend.domain.models.document import LegalChunk


class ChunkingStrategy(ABC):
    """Abstract base class for chunking strategies.

    Implementations: LegalArticleChunker
    """

    @abstractmethod
    def get_strategy_name(self) -> str:
        """Return the name of this chunking strategy."""
        ...

    @abstractmethod
    async def chunk(
        self,
        articles: list[dict],
        doc_meta: dict,
    ) -> list[LegalChunk]:
        """Split a processed document into chunks.

        Args:
            articles: List of articles from MongoDB.
            doc_meta: Document metadata from MongoDB.

        Returns:
            List of LegalChunk objects.
        """
        ...
