"""Query service — orchestrates the query pipeline.

Flow: CollectionRouter (LLM) → QueryRewriter → EmbeddingProvider → VectorRepository.search_chunks → Reranker → ContextBuilder
"""

from __future__ import annotations

import logging

from rag_backend.domain.exceptions import OutOfDomainError
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
        use_hybrid: bool = False,
        max_context_tokens: int = 4000,
    ) -> tuple[Query, list[RankedResult], str]:
        """Run the full query pipeline.

        Returns:
            Tuple of (processed_query, ranked_results, context_string).

        Raises:
            OutOfDomainError: If query does not match any law in the system.
        """
        # 1. Query Understanding (rewrite + classify)
        processed_query = query
        if use_rewrite:
            processed_query = await self._rewriter.rewrite(processed_query)
            processed_query = await self._rewriter.classify(processed_query)

        query_text = processed_query.rewritten_text or processed_query.original_text

        # 2. Embed the query
        query_vector = await self._embeddings.embed_text(query_text)

        # 3. Route query to correct Law via LLM
        selected_law_uuid: str | None = None
        if self._collection_router:
            all_laws = await self._vector_repo.get_all_laws()
            # raises OutOfDomainError if no match
            selected_law_uuid = await self._collection_router.route_query(
                query=processed_query.original_text,
                all_laws=all_laws,
            )
            logger.info("Routed query to law_uuid=%s", selected_law_uuid)

        # 4. Retrieval from LawChunk collection
        retrieval_results = await self._vector_repo.search_chunks(
            query_vector=query_vector,
            top_k=processed_query.top_k,
            law_uuid=selected_law_uuid,
        )

        logger.info("Retrieved %d results from LawChunk", len(retrieval_results))

        # 5. Re-ranking
        if use_reranker and retrieval_results:
            ranked_results = await self._reranker.rerank(
                query=query_text,
                results=retrieval_results,
                top_k=min(5, len(retrieval_results)),
            )
        else:
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

        # 6. Build Context
        context = await self._context_builder.build_context(
            ranked_results=ranked_results,
            max_tokens=max_context_tokens,
            query=query_text,
        )

        return processed_query, ranked_results, context
