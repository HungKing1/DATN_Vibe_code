"""Query controller — thin layer delegating to RAGPipeline."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from rag_backend.application.dto.evaluation_dto import ReflectionRAGResponse
from rag_backend.application.services.rag_pipeline import RAGPipeline
from rag_backend.domain.models.query import Query, RAGResponse
from rag_backend.presentation.schemas.query_schemas import (
    CitationSchema,
    EvaluationSchema,
    QueryRequestSchema,
    QueryResponseSchema,
    ReflectionDecisionSchema,
    ReflectionQueryRequestSchema,
    ReflectionQueryResponseSchema,
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
        tenant_id: str = "default",
    ) -> QueryResponseSchema:
        """Process a standard RAG query and return the response."""
        query = self._build_query(request.query, tenant_id, request)

        result = await self._pipeline.run(
            query=query,
            use_rewrite=request.use_query_rewrite,
            use_reranker=request.use_reranker,
            max_context_tokens=request.max_context_tokens,
        )

        return self._to_response(result)

    async def query_stream(
        self,
        request: QueryRequestSchema,
        tenant_id: str = "default",
    ) -> AsyncIterator[str]:
        """Process a RAG query with streaming response."""
        query = self._build_query(request.query, tenant_id, request)

        async for token in self._pipeline.run_stream(
            query=query,
            use_rewrite=request.use_query_rewrite,
            use_reranker=request.use_reranker,
            max_context_tokens=request.max_context_tokens,
        ):
            yield token

    # ── Reflection RAG ──────────────────────────────────────

    async def query_reflect(
        self,
        request: ReflectionQueryRequestSchema,
        tenant_id: str = "default",
    ) -> ReflectionQueryResponseSchema:
        """Process a reflection RAG query with iterative self-correction."""
        query = self._build_query(request.query, tenant_id, request)

        result = await self._pipeline.run_with_reflection(
            query=query,
            use_rewrite=request.use_query_rewrite,
            use_reranker=request.use_reranker,
            max_context_tokens=request.max_context_tokens,
            max_iterations=request.max_reflection_iterations,
        )

        return self._to_reflection_response(result)

    # ── Helpers ─────────────────────────────────────────────

    @staticmethod
    def _build_query(
        query_text: str,
        tenant_id: str,
        request: QueryRequestSchema | ReflectionQueryRequestSchema,
    ) -> Query:
        """Build a domain Query from common request fields."""
        return Query(
            original_text=query_text,
            tenant_id=tenant_id,
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

    @staticmethod
    def _to_reflection_response(
        result: ReflectionRAGResponse,
    ) -> ReflectionQueryResponseSchema:
        """Map ReflectionRAGResponse to the extended API schema."""
        evaluation_schema = None
        if result.evaluation:
            evaluation_schema = EvaluationSchema(
                groundedness=result.evaluation.groundedness,
                relevance=result.evaluation.relevance,
                citations_matched=result.evaluation.citations_matched,
                answer_length=result.evaluation.answer_length,
                latency=result.evaluation.latency,
                length_score=result.evaluation.length_score,
                latency_score=result.evaluation.latency_score,
                final_score=result.evaluation.final_score,
                reasoning=result.evaluation.reasoning,
            )

        reflection_history = [
            ReflectionDecisionSchema(
                action=d.action.value,
                improved_query=d.improved_query,
                new_top_k=d.new_top_k,
                reasoning=d.reasoning,
            )
            for d in result.reflection_history
        ]

        return ReflectionQueryResponseSchema(
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
            evaluation=evaluation_schema,
            iteration_count=result.iteration_count,
            reflection_history=reflection_history,
        )
