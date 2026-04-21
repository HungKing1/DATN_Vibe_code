"""RAG Pipeline — full end-to-end Retrieval-Augmented Generation.

Flow (standard):      Query → QueryService → PromptManager → LLMProvider → Post-processing → RAGResponse
Flow (with reflection): Query → [retrieve → generate → evaluate → reflect → adjust] × N → ReflectionRAGResponse
"""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator

from langsmith import traceable

from rag_backend.application.dto.evaluation_dto import (
    ReflectionAction,
    ReflectionDecision,
    ReflectionRAGResponse,
)
from rag_backend.application.prompt.prompt_manager import PromptManager
from rag_backend.application.services.evaluation_service import EvaluationService
from rag_backend.application.services.query_service import QueryService
from rag_backend.application.services.reflection_service import ReflectionService
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

    Reflection loop (optional):
    After step 6, evaluate the answer quality. If quality is below threshold,
    use the reflection agent to decide corrective actions (rewrite query,
    search more, regenerate, or stop). Repeat up to max_iterations.
    """

    def __init__(
        self,
        query_service: QueryService,
        llm_provider: LLMProvider,
        prompt_manager: PromptManager,
        evaluation_service: EvaluationService | None = None,
        reflection_service: ReflectionService | None = None,
    ) -> None:
        self._query_service = query_service
        self._llm = llm_provider
        self._prompts = prompt_manager
        self._evaluation_service = evaluation_service
        self._reflection_service = reflection_service

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

    @traceable(run_type="chain", name="rag_pipeline_stream")
    async def run_stream(
        self,
        query: Query,
        use_rewrite: bool = True,
        use_reranker: bool = True,
        use_hybrid: bool = True,
        max_context_tokens: int = 4000,
    ) -> AsyncIterator[str]:
        """Execute the RAG pipeline with streaming LLM output.

        Yields:
            String tokens as they are generated.
        """
        # Query pipeline (same as non-streaming)
        processed_query, ranked_results, context = await self._query_service.process_query(
            query=query,
            use_rewrite=use_rewrite,
            use_reranker=use_reranker,
            use_hybrid=use_hybrid,
            max_context_tokens=max_context_tokens,
        )

        # Build prompt
        system_prompt = self._prompts.get_prompt("rag_system")
        user_prompt = self._prompts.get_prompt(
            "rag_user",
            context=context,
            query=processed_query.rewritten_text or processed_query.original_text,
        )

        # Stream LLM response
        async for token in self._llm.generate_stream(
            prompt=user_prompt,
            system_prompt=system_prompt,
        ):
            yield token

    # ────────────────────────────────────────────────────────
    #  Reflection RAG (new)
    # ────────────────────────────────────────────────────────

    @traceable(run_type="chain", name="rag_pipeline_reflection")
    async def run_with_reflection(
        self,
        query: Query,
        use_rewrite: bool = True,
        use_reranker: bool = True,
        use_hybrid: bool = True,
        max_context_tokens: int = 4000,
        max_iterations: int = 3,
    ) -> ReflectionRAGResponse:
        """Execute the RAG pipeline with iterative reflection loop.

        After generating an answer, evaluates its quality.
        If the score is below threshold, the reflection agent decides
        a corrective action (rewrite query, search more, regenerate, or stop).
        Repeats up to ``max_iterations`` times.

        Args:
            query: The user query.
            use_rewrite: Whether to rewrite the query in the first iteration.
            use_reranker: Whether to use re-ranking.
            use_hybrid: Whether to use hybrid search.
            max_context_tokens: Max tokens for context.
            max_iterations: Maximum number of reflection iterations.

        Returns:
            ReflectionRAGResponse with answer, evaluation, and reflection history.
        """
        if not self._evaluation_service or not self._reflection_service:
            logger.warning(
                "Reflection services not configured — falling back to standard RAG."
            )
            standard_response = await self.run(
                query=query,
                use_rewrite=use_rewrite,
                use_reranker=use_reranker,
                use_hybrid=use_hybrid,
                max_context_tokens=max_context_tokens,
            )
            return ReflectionRAGResponse(
                **standard_response.model_dump(),
                evaluation=None,
                iteration_count=1,
                reflection_history=[],
            )

        original_question = query.original_text
        reflection_history: list[ReflectionDecision] = []
        evaluation = None
        answer = ""
        citations: list[Citation] = []
        model = ""
        token_usage: dict[str, int] = {}
        ranked_results = []
        processed_query = query
        context = ""
        total_iterations = 0

        for iteration in range(max_iterations):
            total_iterations = iteration + 1
            logger.info(
                "Reflection RAG — iteration %d/%d | query=%s | top_k=%d",
                total_iterations,
                max_iterations,
                query.original_text[:80],
                query.top_k,
            )

            start_time = time.monotonic()

            # ── 1. Retrieve + Build Context ─────────────
            processed_query, ranked_results, context = (
                await self._query_service.process_query(
                    query=query,
                    use_rewrite=use_rewrite if iteration == 0 else False,
                    use_reranker=use_reranker,
                    use_hybrid=use_hybrid,
                    max_context_tokens=max_context_tokens,
                )
            )

            # ── 2. Generate Answer ──────────────────────
            system_prompt = self._prompts.get_prompt("rag_system")
            user_prompt = self._prompts.get_prompt(
                "rag_user",
                context=context,
                query=processed_query.rewritten_text or processed_query.original_text,
            )

            generation = await self._llm.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
            )

            answer = generation.text
            model = generation.model
            token_usage = {
                "prompt_tokens": generation.prompt_tokens or 0,
                "completion_tokens": generation.completion_tokens or 0,
                "total_tokens": generation.total_tokens or 0,
            }
            citations = self._extract_citations(ranked_results, answer)

            latency = time.monotonic() - start_time

            # ── 3. Evaluate ────────────────────────────
            evaluation = await self._evaluation_service.evaluate(
                question=original_question,
                context=context,
                answer=answer,
                latency=latency,
            )

            logger.info(
                "Reflection RAG — iter %d eval: final=%.3f ground=%.2f rel=%.2f cite=%.2f",
                total_iterations,
                evaluation.final_score,
                evaluation.groundedness,
                evaluation.relevance,
                evaluation.citations_matched,
            )

            # ── 4. Check if reflection needed ──────────
            if not self._evaluation_service.should_reflect(evaluation):
                logger.info(
                    "Reflection RAG — score %.3f meets threshold; stopping at iteration %d.",
                    evaluation.final_score,
                    total_iterations,
                )
                break

            # Don't reflect on the last iteration — just return what we have
            if iteration == max_iterations - 1:
                logger.info(
                    "Reflection RAG — max iterations reached (%d); returning best answer.",
                    max_iterations,
                )
                break

            # ── 5. Reflect ─────────────────────────────
            decision = await self._reflection_service.reflect(
                question=original_question,
                answer=answer,
                context=context,
                evaluation=evaluation,
            )
            reflection_history.append(decision)

            # ── 6. Apply Decision ──────────────────────
            if decision.action == ReflectionAction.REWRITE_QUERY:
                if decision.improved_query:
                    query = query.model_copy(
                        update={"original_text": decision.improved_query}
                    )
                    logger.info(
                        "Reflection: REWRITE_QUERY → %s", decision.improved_query[:80]
                    )
                else:
                    logger.warning("REWRITE_QUERY but no improved_query; skipping.")

            elif decision.action == ReflectionAction.SEARCH_MORE:
                new_top_k = decision.new_top_k or (query.top_k + 3)
                query = query.model_copy(update={"top_k": new_top_k})
                logger.info("Reflection: SEARCH_MORE → top_k=%d", new_top_k)

            elif decision.action == ReflectionAction.REGENERATE:
                logger.info("Reflection: REGENERATE with same context.")
                # No query mutation — the loop will regenerate with same retrieval
                continue

            elif decision.action == ReflectionAction.STOP:
                logger.info("Reflection: STOP — %s", decision.reasoning[:100])
                break

        # ── Build final response ────────────────────────
        return ReflectionRAGResponse(
            query=original_question,
            answer=answer,
            citations=citations,
            model=model,
            retrieval_count=len(ranked_results),
            reranked_count=len(ranked_results),
            token_usage=token_usage,
            metadata={
                "query_type": (
                    processed_query.query_type.value if processed_query.query_type else None
                ),
                "rewritten_query": processed_query.rewritten_text,
                "reflection_enabled": True,
            },
            evaluation=evaluation,
            iteration_count=total_iterations,
            reflection_history=reflection_history,
        )

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
