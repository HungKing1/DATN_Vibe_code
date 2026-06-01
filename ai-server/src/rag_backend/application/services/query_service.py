"""Query service — orchestrates the query pipeline for LegalChunk schema.

Flow: QueryRewriter → Extract so_ky_hieu → EmbeddingProvider → VectorRepository.hybrid_search → Expand split chunks → Reranker → ContextBuilder
"""

from __future__ import annotations

import logging
import re

from rag_backend.application.utils.chunk_utils import expand_split_chunks_async

from rag_backend.domain.interfaces.context_builder import ContextBuilder
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.query_rewriter import QueryRewriter
from rag_backend.domain.interfaces.reranker import Reranker
from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.domain.models.query import Query, RankedResult, RetrievalResult

logger = logging.getLogger(__name__)


class QueryService:
    """Orchestrates the query pipeline."""

    def __init__(
        self,
        query_rewriter: QueryRewriter,
        embedding_provider: EmbeddingProvider,
        vector_repository: VectorRepository,
        reranker: Reranker,
        context_builder: ContextBuilder,
    ) -> None:
        self._rewriter = query_rewriter
        self._embeddings = embedding_provider
        self._vector_repo = vector_repository
        self._reranker = reranker
        self._context_builder = context_builder

    def _extract_so_ky_hieu(self, text: str) -> str | None:
        """Simple regex to extract so_ky_hieu if present in query.
        E.g., matches "91/2015/QH13"
        """
        match = re.search(r"\b\d+/\d+/[A-Z0-9]+\b", text)
        return match.group(0) if match else None



    async def process_query(
        self,
        query: Query,
        use_rewrite: bool = True,
        use_reranker: bool = True,
        use_hybrid: bool = False,
        max_context_tokens: int = 4000,
    ) -> tuple[Query, list[RankedResult], str]:
        """Run the full query pipeline."""
        # 1. Query Understanding
        processed_query = query
        if use_rewrite:
            processed_query = await self._rewriter.rewrite(processed_query)
            processed_query = await self._rewriter.classify(processed_query)

        query_text = processed_query.rewritten_text or processed_query.original_text

        # 2. Extract so_ky_hieu
        so_ky_hieu = self._extract_so_ky_hieu(query_text)
        if so_ky_hieu:
            logger.info("Extracted so_ky_hieu from query: %s", so_ky_hieu)

        # 3. Embed the query
        query_vector = await self._embeddings.embed_text(query_text)

        # 4. Retrieval from LegalChunk collection
        if use_hybrid:
            retrieval_results = await self._vector_repo.hybrid_search(
                query=query_text,
                query_vector=query_vector,
                top_k=processed_query.top_k,
                so_ky_hieu=so_ky_hieu,
            )
        else:
            retrieval_results = await self._vector_repo.search_chunks(
                query_vector=query_vector,
                top_k=processed_query.top_k,
                so_ky_hieu=so_ky_hieu,
            )

        logger.info("Retrieved %d results from LegalChunk", len(retrieval_results))

        # 5. Expand split chunks
        expanded_results = await expand_split_chunks_async(retrieval_results, self._vector_repo, so_ky_hieu)
        logger.info("After expanding split chunks, we have %d results", len(expanded_results))

        # 6. Re-ranking
        if use_reranker and expanded_results:
            ranked_results = await self._reranker.rerank(
                query=query_text,
                results=expanded_results,
                top_k=min(5, len(expanded_results)),
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
                for r in expanded_results
            ]

        # 7. Build Context
        context = await self._context_builder.build_context(
            ranked_results=ranked_results,
            max_tokens=max_context_tokens,
            query=query_text,
        )

        return processed_query, ranked_results, context
