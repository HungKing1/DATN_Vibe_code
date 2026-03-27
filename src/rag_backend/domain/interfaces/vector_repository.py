"""VectorRepository interface — Repository Pattern for vector databases."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rag_backend.domain.models.document import DocumentChunk
from rag_backend.domain.models.query import RetrievalResult


class VectorRepository(ABC):
    """Abstract base class for vector database operations.

    Implementations: WeaviateRepository, PineconeRepository, QdrantRepository, etc.
    Business logic NEVER depends on a concrete vector database.

    Example — switching to Qdrant:
        class QdrantRepository(VectorRepository):
            async def store(self, chunks, collection_name): ...
            async def search(self, vector, collection_name, top_k, filters): ...
            ...
    """

    # --- Collection Management ---

    @abstractmethod
    async def create_collection(
        self,
        collection_name: str,
        dimension: int,
        metadata_schema: dict | None = None,
        tenant_id: str = "default",
    ) -> None:
        """Create a new vector collection."""
        ...

    @abstractmethod
    async def delete_collection(self, collection_name: str) -> None:
        """Delete a vector collection."""
        ...

    @abstractmethod
    async def list_collections(self) -> list[str]:
        """List all available collections."""
        ...

    @abstractmethod
    async def collection_exists(self, collection_name: str) -> bool:
        """Check if a collection exists."""
        ...

    # --- CRUD Operations ---

    @abstractmethod
    async def store(
        self,
        chunks: list[DocumentChunk],
        collection_name: str,
    ) -> list[str]:
        """Store document chunks with embeddings in the vector store.

        Returns:
            List of stored chunk IDs.
        """
        ...

    @abstractmethod
    async def delete(
        self,
        chunk_ids: list[str],
        collection_name: str,
    ) -> int:
        """Delete chunks by IDs. Returns count of deleted items."""
        ...

    @abstractmethod
    async def delete_by_document_id(
        self,
        document_id: str,
        collection_name: str,
    ) -> int:
        """Delete all chunks belonging to a document."""
        ...

    # --- Search ---

    @abstractmethod
    async def search(
        self,
        query_vector: list[float],
        collection_name: str,
        top_k: int = 10,
        filters: dict | None = None,
    ) -> list[RetrievalResult]:
        """Vector similarity search."""
        ...

    @abstractmethod
    async def hybrid_search(
        self,
        query_text: str,
        query_vector: list[float],
        collection_name: str,
        top_k: int = 10,
        alpha: float = 0.5,
        filters: dict | None = None,
    ) -> list[RetrievalResult]:
        """Hybrid search combining vector similarity and keyword matching.

        Args:
            alpha: Balance between vector (1.0) and keyword (0.0) search.
        """
        ...
