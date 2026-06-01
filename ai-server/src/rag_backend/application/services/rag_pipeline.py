"""RAG Pipeline — full end-to-end Retrieval-Augmented Generation.

Flow: Query → QueryService → PromptManager → LLMProvider → Post-processing → RAGResponse
"""

from __future__ import annotations

import logging
import time

from langsmith import traceable

from rag_backend.application.prompt.prompt_manager import PromptManager
from rag_backend.application.services.query_service import QueryService
from rag_backend.domain.interfaces.llm_provider import LLMProvider
from rag_backend.domain.models.query import Citation, Query, RAGResponse

logger = logging.getLogger(__name__)


class RAGPipeline:
    """Full RAG pipeline with streaming, citation support, and optional reflection loop.

    Pipeline steps (standard):
    1. Query understanding (via QueryService)
    2. Retrieval + Reranking (via QueryService)
    3. Context building (via QueryService)
    4. Prompt construction (via PromptManager)
    5. LLM generation
    6. Post-processing (citations, formatting)
    """

    def __init__(
        self,
        query_service: QueryService,
        llm_provider: LLMProvider,
        prompt_manager: PromptManager,
    ) -> None:
        self._query_service = query_service
        self._llm = llm_provider
        self._prompts = prompt_manager

    # ────────────────────────────────────────────────────────
    #  Standard RAG (unchanged)
    # ────────────────────────────────────────────────────────

    @traceable(run_type="chain", name="rag_pipeline_standard")
    async def run(
        self,
        query: Query,
        use_rewrite: bool = True,
        use_reranker: bool = True,
        use_hybrid: bool = True,
        max_context_tokens: int = 4000,
    ) -> RAGResponse:
        """Execute the full RAG pipeline.

        Args:
            query: The user query.
            use_rewrite: Whether to rewrite the query.
            use_reranker: Whether to use re-ranking.
            use_hybrid: Whether to use hybrid search.
            max_context_tokens: Max tokens for context.

        Returns:
            RAGResponse with answer, citations, and metadata.
        """

        # 1–3. Query pipeline (route, rewrite, retrieve, rerank, build context)
        processed_query, ranked_results, context = await self._query_service.process_query(
            query=query,
            use_rewrite=use_rewrite,
            use_reranker=use_reranker,
            use_hybrid=use_hybrid,
            max_context_tokens=max_context_tokens,
        )

        # 4. Build prompt
        system_prompt = self._prompts.get_prompt("rag_system")
        user_prompt = self._prompts.get_prompt(
            "rag_user",
            context=context,
            query=processed_query.rewritten_text or processed_query.original_text,
        )

        # 5. LLM generation
        generation = await self._llm.generate(
            prompt=user_prompt,
            system_prompt=system_prompt,
        )

        # 6. Post-processing — extract citations
        citations = self._extract_citations(ranked_results, generation.text)

        # 7. Build response
        response = RAGResponse(
            query=query.original_text,
            answer=generation.text,
            citations=citations,
            model=generation.model,
            retrieval_count=len(ranked_results),
            reranked_count=len(ranked_results),
            token_usage={
                "prompt_tokens": generation.prompt_tokens or 0,
                "completion_tokens": generation.completion_tokens or 0,
                "total_tokens": generation.total_tokens or 0,
            },
            metadata={
                "query_type": processed_query.query_type.value if processed_query.query_type else None,
                "rewritten_query": processed_query.rewritten_text,
            },
        )

        return response



    # ────────────────────────────────────────────────────────
    #  Helpers
    # ────────────────────────────────────────────────────────

    @staticmethod
    def _extract_citations(ranked_results, answer_text: str) -> list[Citation]:
        """Extract source citations from the answer and ranked results."""
        citations: list[Citation] = []

        for i, result in enumerate(ranked_results):
            source_ref = f"[Source {i + 1}"
            if source_ref in answer_text:
                citations.append(
                    Citation(
                        source=result.metadata.get("source", "unknown"),
                        chunk_id=result.chunk_id,
                        content_snippet=result.content[:200],
                        relevance_score=result.rerank_score,
                        page_number=result.metadata.get("page_number"),
                    )
                )

        # If no explicit citations found, include top results as implicit sources
        if not citations and ranked_results:
            for result in ranked_results[:3]:
                citations.append(
                    Citation(
                        source=result.metadata.get("source", "unknown"),
                        chunk_id=result.chunk_id,
                        content_snippet=result.content[:200],
                        relevance_score=result.rerank_score,
                        page_number=result.metadata.get("page_number"),
                    )
                )

        return citations
