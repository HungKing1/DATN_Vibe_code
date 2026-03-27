"""ChunkingStrategy interface — Strategy Pattern for document chunking."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rag_backend.domain.models.document import DocumentChunk, ProcessedDocument


class ChunkingStrategy(ABC):
    """Abstract base class for chunking strategies.

    Implementations: RecursiveChunker, SemanticChunker, SlidingWindowChunker, etc.
    Selected at runtime based on configuration (Strategy Pattern).

    Example — adding ML-based chunking:
        class MLChunker(ChunkingStrategy):
            def get_strategy_name(self) -> str:
                return "ml_based"

            async def chunk(self, document) -> list[DocumentChunk]:
                # ML-based chunking logic
                ...
    """

    @abstractmethod
    def get_strategy_name(self) -> str:
        """Return the name of this chunking strategy."""
        ...

    @abstractmethod
    async def chunk(
        self,
        document: ProcessedDocument,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> list[DocumentChunk]:
        """Split a processed document into chunks.

        Args:
            document: The processed document to chunk.
            chunk_size: Target size for each chunk (in characters or tokens).
            chunk_overlap: Overlap between consecutive chunks.

        Returns:
            List of DocumentChunk objects.
        """
        ...
