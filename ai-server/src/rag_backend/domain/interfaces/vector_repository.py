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
    async def list_collections(self) -> list[str]:
        """List all available collections."""
        ...

    @abstractmethod
    async def collection_exists(self, collection_name: str) -> bool:
        """Check if a collection exists."""
        ...

    # --- CRUD Operations ---

    @abstractmethod
    async def delete_by_document_id(
        self,
        document_id: str,
        collection_name: str,
    ) -> int:
        """Delete all chunks belonging to a document."""
        ...



    # --- Law / LawChunk 2-Collection Schema ---

    @abstractmethod
    async def initialize_schema(self) -> None:
        """Create Law and LawChunk collections if they don't exist (idempotent)."""
        ...

    @abstractmethod
    async def upsert_law(
        self,
        title: str,
        description: str,
        keywords: list[str],
        title_embedding: list[float],
        source_file: str,
        law_uuid: str | None = None,
    ) -> str:
        """Insert (law_uuid=None) or update (law_uuid provided) a Law object.

        Returns:
            law_uuid of the created/updated Law object.
        """
        ...

    @abstractmethod
    async def get_all_laws(self) -> list[dict]:
        """Return all Law objects as list of dicts (uuid, title, description, ...)."""
        ...

    @abstractmethod
    async def get_law_by_uuid(self, law_uuid: str) -> dict | None:
        """Fetch a single Law object by its Weaviate UUID."""
        ...

    @abstractmethod
    async def store_chunks(
        self,
        chunks: list[DocumentChunk],
        law_uuid: str,
    ) -> list[str]:
        """Store chunks in LawChunk collection, link to Law via cross-reference.

        Returns:
            List of stored chunk UUIDs.
        """
        ...

    @abstractmethod
    async def search_chunks(
        self,
        query_vector: list[float],
        top_k: int = 20,
        law_uuid: str | None = None,
    ) -> list[RetrievalResult]:
        """Vector search on LawChunk collection.

        Args:
            law_uuid: If provided, search only within that law's chunks.
                      If None, search across all chunks (fallback).
        """
        ...

    @abstractmethod
    async def delete_law(self, law_uuid: str) -> dict:
        """Cascade-delete a Law and ALL its associated LawChunk objects.

        Order of operations:
        1. Delete all LawChunks where law_uuid == law_uuid (by filter).
        2. Delete the Law object itself by UUID.

        Returns:
            dict with keys: law_uuid, chunks_deleted, law_deleted (bool)
        """
        ...
