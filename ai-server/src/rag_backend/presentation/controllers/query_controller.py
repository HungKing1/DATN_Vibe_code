"""Query controller — thin layer delegating to RAGPipeline."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from rag_backend.application.dto.evaluation_dto import ReflectionRAGResponse
from rag_backend.application.services.rag_pipeline import RAGPipeline
from rag_backend.domain.models.query import Query, RAGResponse
from rag_backend.presentation.schemas.query_schemas import (
    CitationSchema,
    QueryRequestSchema,
    QueryResponseSchema,
)

logger = logging.getLogger(__name__)


class QueryController:
    """Controller for RAG query operations."""

    def __init__(self, rag_pipeline: RAGPipeline) -> None:
        self._pipeline = rag_pipeline


    # ── Standard RAG ────────────────────────────────────────

    async def query(
        self,
        request: QueryRequestSchema,
    ) -> QueryResponseSchema:
        """Process a standard RAG query and return the response."""
        query = self._build_query(request.query, request)

        result = await self._pipeline.run(  # type: ignore
            query=query,
            use_rewrite=request.use_query_rewrite,
            use_reranker=request.use_reranker,
            max_context_tokens=request.max_context_tokens,
        )

        return self._to_response(result)

    async def query_stream(
        self,
        request: QueryRequestSchema,
    ) -> AsyncIterator[str]:
        """Process a RAG query with streaming response."""
        query = self._build_query(request.query, request)

        async for token in self._pipeline.run_stream(  # type: ignore
            query=query,
            use_rewrite=request.use_query_rewrite,
            use_reranker=request.use_reranker,
            max_context_tokens=request.max_context_tokens,
        ):
            yield token



    # ── Helpers ─────────────────────────────────────────────

    @staticmethod
    def _build_query(
        query_text: str,
        request: QueryRequestSchema,
    ) -> Query:
        """Build a domain Query from common request fields."""
        return Query(
            original_text=query_text,
            top_k=request.top_k,
            hybrid_alpha=request.hybrid_alpha,
            metadata_filters=request.metadata_filters,
        )

    # ── Mappers ─────────────────────────────────────────────

    @staticmethod
    def _to_response(result: RAGResponse) -> QueryResponseSchema:
        """Map domain RAGResponse to API response schema."""
        return QueryResponseSchema(
            id=result.id,
            query=result.query,
            answer=result.answer,
            citations=[
                CitationSchema(
                    source=c.source,
                    content_snippet=c.content_snippet,
                    relevance_score=c.relevance_score,
                    page_number=c.page_number,
                )
                for c in result.citations
            ],
            model=result.model,
            retrieval_count=result.retrieval_count,
            reranked_count=result.reranked_count,
            token_usage=result.token_usage,
            metadata=result.metadata,
        )


