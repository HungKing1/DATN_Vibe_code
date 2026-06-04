"""VectorRepository interface — Repository Pattern for vector databases."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rag_backend.domain.models.document import LegalChunk
from rag_backend.domain.models.query import RetrievalResult


class VectorRepository(ABC):
    """Abstract base class for vector database operations."""

    @abstractmethod
    async def close(self) -> None:
        """Close the connection to the vector database."""
        ...

    @abstractmethod
    async def check_health(self) -> bool:
        """Check if the vector database is healthy and ready."""
        ...

    @abstractmethod
    async def initialize_schema(self) -> None:
        """Create LegalChunk collection if it doesn't exist."""
        ...

    @abstractmethod
    async def store_legal_chunks(
        self,
        chunks: list[LegalChunk],
    ) -> list[str]:
        """Store chunks in LegalChunk collection."""
        ...

    @abstractmethod
    async def delete_by_so_ky_hieu(self, so_ky_hieu: str) -> dict:
        """Delete all chunks for a specific legal document by so_ky_hieu."""
        ...

    @abstractmethod
    async def get_distinct_laws(self) -> list[dict]:
        """Return distinct laws based on chunks in LegalChunk collection."""
        ...

    @abstractmethod
    async def get_chunks_by_article_id(
        self, mongo_article_id: str, so_ky_hieu: str
    ) -> list[RetrievalResult]:
        """Fetch all chunk parts of a split article."""
        ...

    @abstractmethod
    async def hybrid_search(
        self,
        query: str,
        query_vector: list[float],
        top_k: int = 10,
        so_ky_hieu: str | None = None,
        ten_day_du: str | None = None,
        dieu_number: int | None = None,
        alpha: float = 0.5,
    ) -> list[RetrievalResult]:
        """Hybrid search (BM25 + vector) on LegalChunk collection."""
        ...

    @abstractmethod
    async def fetch_random_chunks(self, limit: int = 50) -> list[RetrievalResult]:
        """Fetch a sample of chunks without any search query (for dataset generation / evaluation)."""
        ...
