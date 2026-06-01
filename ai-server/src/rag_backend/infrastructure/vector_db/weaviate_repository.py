"""Weaviate implementation of VectorRepository for LegalChunk."""

from __future__ import annotations

import logging
from typing import Any
import uuid as _uuid_lib

import weaviate
from weaviate.classes.config import Configure, DataType, Property
from weaviate.classes.query import Filter, MetadataQuery
from weaviate.classes.aggregate import GroupByAggregate

from rag_backend.domain.exceptions import VectorStoreError
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.domain.models.document import LegalChunk
from rag_backend.domain.models.query import RetrievalResult

logger = logging.getLogger(__name__)


class WeaviateRepository(VectorRepository):
    """Weaviate-backed vector repository using single LegalChunk collection."""

    def __init__(self, url: str, api_key: str = "") -> None:
        self._url = url
        self._api_key = api_key
        self._client: weaviate.WeaviateClient | None = None

    async def _get_client(self) -> weaviate.WeaviateClient:
        """Lazy-initialize the Weaviate client."""
        if self._client is None:
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

    async def check_health(self) -> bool:
        """Check if Weaviate is healthy and ready."""
        try:
            client = await self._get_client()
            return client.is_ready()
        except Exception as e:
            logger.error("Weaviate health check failed: %s", e)
            return False

    async def collection_exists(self, collection_name: str) -> bool:
        try:
            client = await self._get_client()
            return client.collections.exists(collection_name)
        except Exception as e:
            raise VectorStoreError(f"Failed to check collection: {collection_name}", detail=str(e)) from e

    async def close(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None

    async def initialize_schema(self) -> None:
        """Create LegalChunk collection if it doesn't exist."""
        try:
            client = await self._get_client()

            if not client.collections.exists("LegalChunk"):
                client.collections.create(
                    name="LegalChunk",
                    properties=[
                        Property(name="content",           data_type=DataType.TEXT),
                        Property(name="chunk_index",       data_type=DataType.INT),
                        
                        Property(name="so_ky_hieu",        data_type=DataType.TEXT),
                        Property(name="ten_day_du",        data_type=DataType.TEXT),
                        Property(name="loai_van_ban",      data_type=DataType.TEXT),
                        Property(name="mongo_doc_id",      data_type=DataType.TEXT),
                        
                        Property(name="dieu_numbers",      data_type=DataType.INT_ARRAY),
                        Property(name="ten_dieu",          data_type=DataType.TEXT),
                        Property(name="article_mongo_ids", data_type=DataType.TEXT_ARRAY),
                        
                        Property(name="is_split",          data_type=DataType.BOOL),
                        Property(name="split_part",        data_type=DataType.INT),
                        Property(name="split_total",       data_type=DataType.INT),
                        Property(name="is_merged",         data_type=DataType.BOOL),
                    ],
                    vectorizer_config=Configure.Vectorizer.none(),
                )
                logger.info("Created collection: LegalChunk")
            else:
                logger.info("Collection LegalChunk already exists, skipping")

        except Exception as e:
            raise VectorStoreError("Failed to initialize schema", detail=str(e)) from e

    async def store_legal_chunks(self, chunks: list[LegalChunk]) -> list[str]:
        """Store chunks into LegalChunk collection."""
        try:
            client = await self._get_client()
            chunk_col = client.collections.get("LegalChunk")

            chunk_uuids = [str(_uuid_lib.uuid4()) for _ in chunks]

            with chunk_col.batch.dynamic() as batch:
                for chunk, chunk_uuid in zip(chunks, chunk_uuids):
                    lm = chunk.legal
                    batch.add_object(
                        uuid=chunk_uuid,
                        properties={
                            "content":           chunk.content,
                            "chunk_index":       chunk.chunk_index,
                            "so_ky_hieu":        lm.so_ky_hieu,
                            "ten_day_du":        lm.ten_day_du,
                            "loai_van_ban":      lm.loai_van_ban,
                            "mongo_doc_id":      lm.mongo_doc_id,
                            "dieu_numbers":      lm.dieu_numbers,
                            "ten_dieu":          lm.ten_dieu,
                            "article_mongo_ids": lm.article_mongo_ids,
                            "is_split":          lm.is_split,
                            "split_part":        lm.split_part or 0,
                            "split_total":       lm.split_total or 0,
                            "is_merged":         lm.is_merged,
                        },
                        vector=chunk.embedding,
                    )

            logger.info("Stored %d chunks in LegalChunk", len(chunk_uuids))
            return chunk_uuids

        except Exception as e:
            raise VectorStoreError("Failed to store legal chunks", detail=str(e)) from e

    async def delete_by_so_ky_hieu(self, so_ky_hieu: str) -> dict:
        """Delete all chunks for a specific legal document by so_ky_hieu."""
        try:
            client = await self._get_client()
            chunks_deleted = 0

            if client.collections.exists("LegalChunk"):
                chunk_col = client.collections.get("LegalChunk")
                law_filter = Filter.by_property("so_ky_hieu").equal(so_ky_hieu)

                count_response = chunk_col.query.fetch_objects(
                    filters=law_filter,
                    limit=10_000,
                )
                chunk_uuids = [str(obj.uuid) for obj in count_response.objects]
                chunks_deleted = len(chunk_uuids)

                if chunks_deleted > 0:
                    chunk_col.data.delete_many(where=law_filter)
                    logger.info("Deleted %d LegalChunk objects for so_ky_hieu=%s", chunks_deleted, so_ky_hieu)

            return {
                "so_ky_hieu": so_ky_hieu,
                "chunks_deleted": chunks_deleted,
            }

        except Exception as e:
            raise VectorStoreError(f"Failed to delete law so_ky_hieu={so_ky_hieu}", detail=str(e)) from e

    async def get_distinct_laws(self) -> list[dict]:
        """Return distinct laws based on chunks."""
        try:
            client = await self._get_client()
            if not client.collections.exists("LegalChunk"):
                return []
                
            chunk_col = client.collections.get("LegalChunk")
            
            # Use aggregation to group by so_ky_hieu
            response = chunk_col.aggregate.over_all(
                group_by=GroupByAggregate(prop="so_ky_hieu"),
                return_metrics=[]
            )
            
            laws = []
            for group in response.groups:
                so_ky_hieu = str(group.grouped_by.value)  # type: ignore
                # We need ten_day_du and loai_van_ban as well. 
                # Let's fetch one object for this so_ky_hieu to get details
                res = chunk_col.query.fetch_objects(
                    filters=Filter.by_property("so_ky_hieu").equal(so_ky_hieu),
                    limit=1
                )
                if res.objects:
                    obj = res.objects[0]
                    laws.append({
                        "so_ky_hieu": so_ky_hieu,
                        "ten_day_du": str(obj.properties.get("ten_day_du", "")),
                        "loai_van_ban": str(obj.properties.get("loai_van_ban", "")),
                        "chunk_count": group.total_count,
                    })
                    
            return laws
        except Exception as e:
            raise VectorStoreError("Failed to get distinct laws", detail=str(e)) from e

    async def get_chunks_by_article_id(self, mongo_article_id: str, so_ky_hieu: str) -> list[RetrievalResult]:
        """Fetch all chunk parts of a split article."""
        try:
            client = await self._get_client()
            if not client.collections.exists("LegalChunk"):
                return []
                
            chunk_col = client.collections.get("LegalChunk")
            
            filters = (
                Filter.by_property("so_ky_hieu").equal(so_ky_hieu) & 
                Filter.by_property("article_mongo_ids").contains_any([mongo_article_id])
            )
            
            response = chunk_col.query.fetch_objects(
                filters=filters,
                limit=100
            )
            
            return [
                RetrievalResult(
                    chunk_id=str(obj.uuid),
                    content=str(obj.properties.get("content", "")),
                    score=1.0,
                    metadata={k: v for k, v in obj.properties.items() if k != "content"},
                    document_id=str(obj.properties.get("mongo_doc_id", "")),
                )
                for obj in response.objects
            ]
        except Exception as e:
            raise VectorStoreError("Failed to get chunks by article id", detail=str(e)) from e

    async def search_chunks(
        self,
        query_vector: list[float],
        top_k: int = 20,
        so_ky_hieu: str | None = None,
    ) -> list[RetrievalResult]:
        """Vector similarity search on LegalChunk collection."""
        try:
            client = await self._get_client()
            if not client.collections.exists("LegalChunk"):
                return []
            chunk_col = client.collections.get("LegalChunk")

            filters = None
            if so_ky_hieu:
                filters = Filter.by_property("so_ky_hieu").equal(so_ky_hieu)

            response = chunk_col.query.near_vector(
                near_vector=query_vector,
                limit=top_k,
                filters=filters,
                return_metadata=MetadataQuery(distance=True),
            )

            return [
                RetrievalResult(
                    chunk_id=str(obj.uuid),
                    content=str(obj.properties.get("content", "")),
                    score=1.0 - (obj.metadata.distance or 0.0),
                    metadata={k: v for k, v in obj.properties.items() if k != "content"},
                    document_id=str(obj.properties.get("mongo_doc_id", "")),
                )
                for obj in response.objects
            ]
        except Exception as e:
            raise VectorStoreError(f"search_chunks failed (so_ky_hieu={so_ky_hieu})", detail=str(e)) from e

    async def hybrid_search(
        self,
        query: str,
        query_vector: list[float],
        top_k: int = 10,
        so_ky_hieu: str | None = None,
        alpha: float = 0.5,
    ) -> list[RetrievalResult]:
        """Hybrid search (BM25 + vector) on LegalChunk collection."""
        try:
            client = await self._get_client()
            if not client.collections.exists("LegalChunk"):
                return []
            chunk_col = client.collections.get("LegalChunk")

            filters = None
            if so_ky_hieu:
                filters = Filter.by_property("so_ky_hieu").equal(so_ky_hieu)

            response = chunk_col.query.hybrid(
                query=query,
                vector=query_vector,
                alpha=alpha,
                limit=top_k,
                filters=filters,
                return_metadata=MetadataQuery(score=True),
            )

            return [
                RetrievalResult(
                    chunk_id=str(obj.uuid),
                    content=str(obj.properties.get("content", "")),
                    score=obj.metadata.score or 0.0,
                    metadata={k: v for k, v in obj.properties.items() if k != "content"},
                    document_id=str(obj.properties.get("mongo_doc_id", "")),
                )
                for obj in response.objects
            ]
        except Exception as e:
            raise VectorStoreError(f"hybrid_search failed (so_ky_hieu={so_ky_hieu})", detail=str(e)) from e
