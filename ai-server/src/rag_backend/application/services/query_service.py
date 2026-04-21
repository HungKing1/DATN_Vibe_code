"""Query service — orchestrates the query pipeline.

Flow: [CollectionRouter] → QueryRewriter → EmbeddingProvider → VectorRepository → Reranker → ContextBuilder
"""

from __future__ import annotations

import asyncio
import logging

from rag_backend.domain.interfaces.context_builder import ContextBuilder
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.query_rewriter import QueryRewriter
from rag_backend.domain.interfaces.reranker import Reranker
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.domain.models.query import Query, RankedResult
from rag_backend.infrastructure.query.collection_router import CollectionRouter

logger = logging.getLogger(__name__)


class QueryService:
    """Orchestrates the query pipeline: [route] → rewrite → retrieve → rerank → build context.

    Each step is pluggable via dependency injection.
    """

    def __init__(
        self,
        query_rewriter: QueryRewriter,
        embedding_provider: EmbeddingProvider,
        vector_repository: VectorRepository,
        reranker: Reranker,
        context_builder: ContextBuilder,
        collection_router: CollectionRouter | None = None,
    ) -> None:
        self._rewriter = query_rewriter
        self._embeddings = embedding_provider
        self._vector_repo = vector_repository
        self._reranker = reranker
        self._context_builder = context_builder
        self._collection_router = collection_router

    async def process_query(
        self,
        query: Query,
        use_rewrite: bool = True,
        use_reranker: bool = True,
        use_hybrid: bool = True,
        max_context_tokens: int = 4000,
    ) -> tuple[Query, list[RankedResult], str]:
        """Run the full query pipeline.

        Returns:
            Tuple of (processed_query, ranked_results, context_string).
        """
        # 0. Auto-route to correct collections
        if self._collection_router and self._collection_router.registry.list_all():
            matched = await self._collection_router.route_by_embedding(
                query=query.original_text,
                top_k=3,  # Support multiple matching legal collections
            )
            if matched:
                query.collection_names = [m.collection_name for m in matched]
                logger.info(
                    "Auto-routed to collections: %s",
                    query.collection_names,
                )

        # 1. Query Understanding
        processed_query = query
        if use_rewrite:
            processed_query = await self._rewriter.rewrite(processed_query)
            processed_query = await self._rewriter.classify(processed_query)

        query_text = processed_query.rewritten_text or processed_query.original_text

        # 2. Embed the query
        query_vector = await self._embeddings.embed_text(query_text)

        # 3. Retrieval across all chosen collections
        tasks = []
        for col_name in processed_query.collection_names:
            if use_hybrid:
                tasks.append(
                    self._vector_repo.hybrid_search(
                        query_text=query_text,
                        query_vector=query_vector,
                        collection_name=col_name,
                        top_k=processed_query.top_k,
                        alpha=processed_query.hybrid_alpha,
                        filters=processed_query.metadata_filters or None,
                    )
                )
            else:
                tasks.append(
                    self._vector_repo.search(
                        query_vector=query_vector,
                        collection_name=col_name,
                        top_k=processed_query.top_k,
                        filters=processed_query.metadata_filters or None,
                    )
                )
        
        results_list = await asyncio.gather(*tasks)
        retrieval_results = []
        seen_chunks = set()
        for res_list in results_list:
            for r in res_list:
                if r.chunk_id not in seen_chunks:
                    retrieval_results.append(r)
                    seen_chunks.add(r.chunk_id)

        # Sort combined results from all collections by original vector score
        retrieval_results.sort(key=lambda x: x.score, reverse=True)
        retrieval_results = retrieval_results[:processed_query.top_k]

        logger.info("Retrieved %d results", len(retrieval_results))

        # 4. Re-ranking
        if use_reranker and retrieval_results:
            ranked_results = await self._reranker.rerank(
                query=query_text,
                results=retrieval_results,
                top_k=min(5, len(retrieval_results)),
            )
        else:
            # Convert retrieval results to ranked results without reranking
            ranked_results = [
                RankedResult(
                    chunk_id=r.chunk_id,
                    content=r.content,
                    original_score=r.score,
                    rerank_score=r.score,
                    metadata=r.metadata,
                    document_id=r.document_id,
                )
                for r in retrieval_results
            ]

        # 5. Build Context
        context = await self._context_builder.build_context(
            ranked_results=ranked_results,
            max_tokens=max_context_tokens,
            query=query_text,
        )

        return processed_query, ranked_results, context
