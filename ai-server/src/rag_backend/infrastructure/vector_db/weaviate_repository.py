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
            # Parse host and port from URL (e.g. "http://localhost:9090")
            url_no_scheme = self._url.replace("https://", "").replace("http://", "")
            parts = url_no_scheme.split(":")
            host = parts[0]
            port = int(parts[1]) if len(parts) > 1 else 8080

            kwargs: dict = {
                "http_host": host,
                "http_port": port,
                "http_secure": self._url.startswith("https"),
                "grpc_host": host,
                "grpc_port": 50051,
                "grpc_secure": False,
            }

            if self._api_key:
                kwargs["auth_credentials"] = weaviate.auth.AuthApiKey(self._api_key)

            self._client = weaviate.connect_to_custom(**kwargs)
            logger.info("Connected to Weaviate at %s:%d", host, port)
        return self._client

    # --- Collection Management ---

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

    # --- delete all chunks by document_id(law_chunks), delete one of many law's files ---
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

    async def close(self) -> None:
        """Close the Weaviate client connection."""
        if self._client is not None:
            self._client.close()
            self._client = None

    # --- Law / LawChunk 2-Collection Schema ---

    async def initialize_schema(self) -> None:
        """Create Law and LawChunk collections if they don't exist (idempotent)."""
        try:
            client = await self._get_client()

            # LawChunk phải tạo trước vì Law reference đến nó
            if not client.collections.exists("LawChunk"):
                client.collections.create(
                    name="LawChunk",
                    properties=[
                        Property(name="law_uuid",    data_type=DataType.TEXT),
                        Property(name="document_id", data_type=DataType.TEXT),
                        Property(name="content",     data_type=DataType.TEXT),
                        Property(name="chunk_index", data_type=DataType.INT),
                        Property(name="file_name",   data_type=DataType.TEXT),
                        Property(name="page_number", data_type=DataType.INT),
                        Property(name="file_type",   data_type=DataType.TEXT),
                    ],
                    vectorizer_config=Configure.Vectorizer.none(),
                )
                logger.info("Created collection: LawChunk")
            else:
                logger.info("Collection LawChunk already exists, skipping")

            if not client.collections.exists("Law"):
                from weaviate.classes.config import ReferenceProperty
                client.collections.create(
                    name="Law",
                    properties=[
                        Property(name="title",        data_type=DataType.TEXT),
                        Property(name="description",  data_type=DataType.TEXT),
                        Property(name="keywords",     data_type=DataType.TEXT_ARRAY),
                        Property(name="source_files", data_type=DataType.TEXT_ARRAY),
                        Property(name="chunk_count",  data_type=DataType.INT),
                    ],
                    references=[
                        ReferenceProperty(name="hasChunks", target_collection="LawChunk")
                    ],
                    vectorizer_config=Configure.Vectorizer.none(),
                )
                logger.info("Created collection: Law")
            else:
                logger.info("Collection Law already exists, skipping")

        except Exception as e:
            raise VectorStoreError("Failed to initialize schema", detail=str(e)) from e

    async def upsert_law(
        self,
        title: str,
        description: str,
        keywords: list[str],
        title_embedding: list[float],
        source_file: str,
        law_uuid: str | None = None,
    ) -> str:
        """Insert or update a Law object. Returns law_uuid."""
        try:
            client = await self._get_client()
            law_col = client.collections.get("Law")

            if law_uuid:
                # UPDATE existing Law
                existing = law_col.query.fetch_object_by_id(law_uuid)
                old_files: list[str] = []
                if existing:
                    old_files = existing.properties.get("source_files") or []
                if source_file not in old_files:
                    old_files.append(source_file)

                law_col.data.update(
                    uuid=law_uuid,
                    properties={
                        "title":        title,
                        "description":  description,
                        "keywords":     keywords,
                        "source_files": old_files,
                    },
                    vector=title_embedding,
                )
                logger.info("Updated Law uuid=%s title='%s'", law_uuid, title)
                return law_uuid
            else:
                # INSERT new Law
                new_uuid = str(law_col.data.insert(
                    properties={
                        "title":        title,
                        "description":  description,
                        "keywords":     keywords,
                        "source_files": [source_file],
                        "chunk_count":  0,
                    },
                    vector=title_embedding,
                ))
                logger.info("Inserted Law uuid=%s title='%s'", new_uuid, title)
                return new_uuid

        except Exception as e:
            raise VectorStoreError("Failed to upsert Law", detail=str(e)) from e

    async def get_all_laws(self) -> list[dict]:
        """Return all Law objects as list of dicts."""
        try:
            client = await self._get_client()
            if not client.collections.exists("Law"):
                return []
            law_col = client.collections.get("Law")
            response = law_col.query.fetch_objects(
                limit=1000,
            )
            return [
                {
                    "law_uuid":    str(obj.uuid),
                    "title":       obj.properties.get("title", ""),
                    "description": obj.properties.get("description", ""),
                    "keywords":    obj.properties.get("keywords") or [],
                    "chunk_count": obj.properties.get("chunk_count", 0),
                    "source_files": obj.properties.get("source_files") or [],
                }
                for obj in response.objects
            ]
        except Exception as e:
            raise VectorStoreError("Failed to get all laws", detail=str(e)) from e

    async def get_law_by_uuid(self, law_uuid: str) -> dict | None:
        """Fetch a single Law object by UUID."""
        try:
            client = await self._get_client()
            law_col = client.collections.get("Law")
            obj = law_col.query.fetch_object_by_id(law_uuid)
            if not obj:
                return None
            return {
                "law_uuid":     str(obj.uuid),
                "title":        obj.properties.get("title", ""),
                "description":  obj.properties.get("description", ""),
                "keywords":     obj.properties.get("keywords") or [],
                "source_files": obj.properties.get("source_files") or [],
                "chunk_count":  obj.properties.get("chunk_count", 0),
            }
        except Exception as e:
            raise VectorStoreError(
                f"Failed to get law by uuid {law_uuid}", detail=str(e)
            ) from e

    async def store_chunks(
        self,
        chunks: list[DocumentChunk],
        law_uuid: str,
    ) -> list[str]:
        """Store chunks into LawChunk collection and create cross-references to Law.

        NOTE: Weaviate v4 batch.add_object() does NOT return UUID.
        We pre-generate UUIDs with uuid4() and pass them explicitly.
        """
        import uuid as _uuid_lib

        try:
            client = await self._get_client()
            chunk_col = client.collections.get("LawChunk")
            law_col   = client.collections.get("Law")

            # Pre-generate UUIDs so we have them regardless of batch return value
            chunk_uuids = [str(_uuid_lib.uuid4()) for _ in chunks]

            with chunk_col.batch.dynamic() as batch:
                for chunk, chunk_uuid in zip(chunks, chunk_uuids):
                    batch.add_object(
                        uuid=chunk_uuid,          # explicit UUID
                        properties={
                            "law_uuid":    law_uuid,
                            "document_id": str(chunk.document_id),
                            "content":     chunk.content,
                            "chunk_index": chunk.chunk_index,
                            "file_name":   chunk.metadata.file_name,
                            "page_number": getattr(chunk.metadata, "page_number", 0),
                            "file_type":   str(chunk.metadata.file_type),
                        },
                        vector=chunk.embedding,
                    )

            # Cross-reference: Law → LawChunk (best-effort, non-blocking)
            for chunk_uuid in chunk_uuids:
                try:
                    law_col.data.reference_add(
                        from_uuid=law_uuid,
                        from_property="hasChunks",
                        to=chunk_uuid,
                    )
                except Exception as ref_err:
                    logger.warning("Skipping reference %s: %s", chunk_uuid, ref_err)

            # Update chunk_count in Law object
            existing = law_col.query.fetch_object_by_id(law_uuid)
            old_count = existing.properties.get("chunk_count", 0) if existing else 0
            law_col.data.update(
                uuid=law_uuid,
                properties={"chunk_count": old_count + len(chunk_uuids)},
            )

            logger.info(
                "Stored %d chunks in LawChunk for law_uuid=%s",
                len(chunk_uuids), law_uuid,
            )
            return chunk_uuids

        except Exception as e:
            raise VectorStoreError(
                f"Failed to store chunks for law {law_uuid}", detail=str(e)
            ) from e

    async def search_chunks(
        self,
        query_vector: list[float],
        top_k: int = 20,
        law_uuid: str | None = None,
    ) -> list[RetrievalResult]:
        """Vector similarity search on LawChunk collection."""
        try:
            client = await self._get_client()
            if not client.collections.exists("LawChunk"):
                return []
            chunk_col = client.collections.get("LawChunk")

            filters = None
            if law_uuid:
                filters = Filter.by_property("law_uuid").equal(law_uuid)

            response = chunk_col.query.near_vector(
                near_vector=query_vector,
                limit=top_k,
                filters=filters,
                return_metadata=MetadataQuery(distance=True),
            )

            return [
                RetrievalResult(
                    chunk_id=str(obj.uuid),
                    content=obj.properties.get("content", ""),
                    score=1.0 - (obj.metadata.distance or 0.0),
                    metadata={
                        k: v for k, v in obj.properties.items() if k != "content"
                    },
                    document_id=obj.properties.get("document_id"),
                )
                for obj in response.objects
            ]

        except Exception as e:
            raise VectorStoreError(
                f"search_chunks failed (law_uuid={law_uuid})", detail=str(e)
            ) from e

    async def delete_law(self, law_uuid: str) -> dict:
        """Cascade-delete a Law and ALL its LawChunk objects.

        Steps:
        1. Count chunks with law_uuid == law_uuid.
        2. Batch-delete all LawChunk objects with that law_uuid filter.
        3. Delete the Law object itself by UUID.

        Returns:
            { "law_uuid": str, "chunks_deleted": int, "law_deleted": bool }
        """
        try:
            client = await self._get_client()
            chunks_deleted = 0
            law_deleted = False

            # ── Step 1: Delete all LawChunk objects referencing this Law ──
            if client.collections.exists("LawChunk"):
                chunk_col = client.collections.get("LawChunk")
                law_filter = Filter.by_property("law_uuid").equal(law_uuid)

                # Count first for the response
                count_response = chunk_col.query.fetch_objects(
                    filters=law_filter,
                    limit=10_000, #fetch 10000 objects to present but still delete all
                )
                chunk_uuids = [str(obj.uuid) for obj in count_response.objects]
                chunks_deleted = len(chunk_uuids)

                if chunks_deleted > 0:
                    # Weaviate v4: delete_many with filter
                    chunk_col.data.delete_many(
                        where=law_filter,
                    )
                    logger.info(
                        "Deleted %d LawChunk objects for law_uuid=%s",
                        chunks_deleted, law_uuid,
                    )

            # ── Step 2: Delete the Law object itself ──────────────────────
            if client.collections.exists("Law"):
                law_col = client.collections.get("Law")
                try:
                    law_col.data.delete_by_id(law_uuid)
                    law_deleted = True
                    logger.info("Deleted Law object uuid=%s", law_uuid)
                except Exception as e:
                    logger.warning("Law uuid=%s not found or already deleted: %s", law_uuid, e)

            return {
                "law_uuid": law_uuid,
                "chunks_deleted": chunks_deleted,
                "law_deleted": law_deleted,
            }

        except Exception as e:
            raise VectorStoreError(
                f"Failed to cascade-delete Law uuid={law_uuid}", detail=str(e)
            ) from e
