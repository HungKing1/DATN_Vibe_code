"""Weaviate implementation of VectorRepository."""

from __future__ import annotations

import logging
from typing import Any

import weaviate
from weaviate.classes.config import Configure, DataType, Property
from weaviate.classes.query import Filter, MetadataQuery

from rag_backend.domain.exceptions import CollectionNotFoundError, VectorStoreError
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.domain.models.document import DocumentChunk
from rag_backend.domain.models.query import RetrievalResult

logger = logging.getLogger(__name__)


class WeaviateRepository(VectorRepository):
    """Weaviate-backed vector repository.

    To switch to another vector DB (Qdrant, Pinecone, etc.):
    1. Create a new class implementing VectorRepository
    2. Update the DI container to inject the new implementation
    No other code changes needed.
    """

    def __init__(self, url: str, api_key: str = "") -> None:
        self._url = url
        self._api_key = api_key
        self._client: weaviate.WeaviateClient | None = None

    async def _get_client(self) -> weaviate.WeaviateClient:
        """Lazy-initialize the Weaviate client."""
        if self._client is None:
            if self._api_key:
                self._client = weaviate.connect_to_custom(
                    http_host=self._url.replace("http://", "").split(":")[0],
                    http_port=int(self._url.split(":")[-1]) if ":" in self._url.split("//")[-1] else 8080,
                    http_secure=self._url.startswith("https"),
                    grpc_host=self._url.replace("http://", "").split(":")[0],
                    grpc_port=50051,
                    grpc_secure=False,
                    auth_credentials=weaviate.auth.AuthApiKey(self._api_key),
                )
            else:
                self._client = weaviate.connect_to_local()
        return self._client

    # --- Collection Management ---

    async def create_collection(
        self,
        collection_name: str,
        dimension: int,
        metadata_schema: dict | None = None,
        tenant_id: str = "default",
    ) -> None:
        """Create a new Weaviate collection with properties."""
        try:
            client = await self._get_client()

            properties = [
                Property(name="content", data_type=DataType.TEXT),
                Property(name="document_id", data_type=DataType.TEXT),
                Property(name="chunk_index", data_type=DataType.INT),
                Property(name="source", data_type=DataType.TEXT),
                Property(name="file_name", data_type=DataType.TEXT),
                Property(name="file_type", data_type=DataType.TEXT),
                Property(name="tenant_id", data_type=DataType.TEXT),
            ]

            client.collections.create(
                name=collection_name,
                properties=properties,
                vectorizer_config=Configure.Vectorizer.none(),
            )

            logger.info("Created collection: %s", collection_name)

        except Exception as e:
            raise VectorStoreError(
                f"Failed to create collection: {collection_name}",
                detail=str(e),
            ) from e

    async def delete_collection(self, collection_name: str) -> None:
        """Delete a Weaviate collection."""
        try:
            client = await self._get_client()
            client.collections.delete(collection_name)
            logger.info("Deleted collection: %s", collection_name)
        except Exception as e:
            raise VectorStoreError(
                f"Failed to delete collection: {collection_name}",
                detail=str(e),
            ) from e

    async def list_collections(self) -> list[str]:
        """List all Weaviate collections."""
        try:
            client = await self._get_client()
            response = client.collections.list_all()
            return list(response.keys())
        except Exception as e:
            raise VectorStoreError("Failed to list collections", detail=str(e)) from e

    async def collection_exists(self, collection_name: str) -> bool:
        """Check if collection exists in Weaviate."""
        try:
            client = await self._get_client()
            return client.collections.exists(collection_name)
        except Exception as e:
            raise VectorStoreError(
                f"Failed to check collection: {collection_name}",
                detail=str(e),
            ) from e

    # --- CRUD ---

    async def store(
        self,
        chunks: list[DocumentChunk],
        collection_name: str,
    ) -> list[str]:
        """Store document chunks in Weaviate."""
        try:
            client = await self._get_client()
            collection = client.collections.get(collection_name)

            stored_ids: list[str] = []

            with collection.batch.dynamic() as batch:
                for chunk in chunks:
                    properties: dict[str, Any] = {
                        "content": chunk.content,
                        "document_id": str(chunk.document_id),
                        "chunk_index": chunk.chunk_index,
                        "source": chunk.metadata.source,
                        "file_name": chunk.metadata.file_name,
                        "file_type": str(chunk.metadata.file_type),
                        "tenant_id": chunk.metadata.tenant_id,
                    }

                    uuid = batch.add_object(
                        properties=properties,
                        vector=chunk.embedding,
                    )
                    stored_ids.append(str(uuid))

            logger.info(
                "Stored %d chunks in collection '%s'",
                len(stored_ids),
                collection_name,
            )
            return stored_ids

        except Exception as e:
            raise VectorStoreError(
                f"Failed to store chunks in {collection_name}",
                detail=str(e),
            ) from e

    async def delete(
        self,
        chunk_ids: list[str],
        collection_name: str,
    ) -> int:
        """Delete chunks by IDs from Weaviate."""
        try:
            client = await self._get_client()
            collection = client.collections.get(collection_name)
            count = 0
            for chunk_id in chunk_ids:
                collection.data.delete_by_id(chunk_id)
                count += 1
            return count
        except Exception as e:
            raise VectorStoreError(
                f"Failed to delete chunks from {collection_name}",
                detail=str(e),
            ) from e

    async def delete_by_document_id(
        self,
        document_id: str,
        collection_name: str,
    ) -> int:
        """Delete all chunks for a document."""
        try:
            client = await self._get_client()
            collection = client.collections.get(collection_name)
            result = collection.data.delete_many(
                where=Filter.by_property("document_id").equal(document_id)
            )
            deleted = result.successful if result else 0
            logger.info(
                "Deleted %d chunks for document %s from %s",
                deleted,
                document_id,
                collection_name,
            )
            return deleted
        except Exception as e:
            raise VectorStoreError(
                f"Failed to delete document {document_id}",
                detail=str(e),
            ) from e

    # --- Search ---

    async def search(
        self,
        query_vector: list[float],
        collection_name: str,
        top_k: int = 10,
        filters: dict | None = None,
    ) -> list[RetrievalResult]:
        """Vector similarity search in Weaviate."""
        try:
            client = await self._get_client()

            if not await self.collection_exists(collection_name):
                raise CollectionNotFoundError(collection_name)

            collection = client.collections.get(collection_name)

            weaviate_filter = self._build_filters(filters) if filters else None

            response = collection.query.near_vector(
                near_vector=query_vector,
                limit=top_k,
                filters=weaviate_filter,
                return_metadata=MetadataQuery(distance=True),
            )

            results: list[RetrievalResult] = []
            for obj in response.objects:
                results.append(
                    RetrievalResult(
                        chunk_id=str(obj.uuid),
                        content=obj.properties.get("content", ""),
                        score=1.0 - (obj.metadata.distance or 0.0),
                        metadata={
                            k: v
                            for k, v in obj.properties.items()
                            if k != "content"
                        },
                        document_id=obj.properties.get("document_id"),
                    )
                )

            return results

        except CollectionNotFoundError:
            raise
        except Exception as e:
            raise VectorStoreError(
                f"Search failed in {collection_name}",
                detail=str(e),
            ) from e

    async def hybrid_search(
        self,
        query_text: str,
        query_vector: list[float],
        collection_name: str,
        top_k: int = 10,
        alpha: float = 0.5,
        filters: dict | None = None,
    ) -> list[RetrievalResult]:
        """Hybrid search combining vector and keyword search."""
        try:
            client = await self._get_client()

            if not await self.collection_exists(collection_name):
                raise CollectionNotFoundError(collection_name)

            collection = client.collections.get(collection_name)

            weaviate_filter = self._build_filters(filters) if filters else None

            response = collection.query.hybrid(
                query=query_text,
                vector=query_vector,
                alpha=alpha,
                limit=top_k,
                filters=weaviate_filter,
                return_metadata=MetadataQuery(score=True),
            )

            results: list[RetrievalResult] = []
            for obj in response.objects:
                results.append(
                    RetrievalResult(
                        chunk_id=str(obj.uuid),
                        content=obj.properties.get("content", ""),
                        score=obj.metadata.score or 0.0,
                        metadata={
                            k: v
                            for k, v in obj.properties.items()
                            if k != "content"
                        },
                        document_id=obj.properties.get("document_id"),
                    )
                )

            return results

        except CollectionNotFoundError:
            raise
        except Exception as e:
            raise VectorStoreError(
                f"Hybrid search failed in {collection_name}",
                detail=str(e),
            ) from e

    @staticmethod
    def _build_filters(filters: dict) -> Filter | None:
        """Convert a dict of filters to Weaviate Filter objects."""
        filter_parts = []
        for key, value in filters.items():
            filter_parts.append(Filter.by_property(key).equal(value))
        if not filter_parts:
            return None
        if len(filter_parts) == 1:
            return filter_parts[0]
        # Combine with AND
        combined = filter_parts[0]
        for f in filter_parts[1:]:
            combined = combined & f
        return combined

    async def close(self) -> None:
        """Close the Weaviate client connection."""
        if self._client is not None:
            self._client.close()
            self._client = None
