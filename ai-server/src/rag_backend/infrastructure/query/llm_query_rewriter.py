"""LLM-based query rewriter for improving retrieval quality."""

from __future__ import annotations

import logging

from rag_backend.domain.exceptions import QueryRewriteError
from rag_backend.domain.interfaces.llm_provider import LLMProvider
from rag_backend.domain.interfaces.query_rewriter import QueryRewriter
from rag_backend.domain.models.query import Query, QueryType

logger = logging.getLogger(__name__)

from rag_backend.application.prompt.prompt_manager import PromptManager
class LLMQueryRewriter(QueryRewriter):
    """Uses LLM to rewrite queries for better vector retrieval."""

    def __init__(self, llm_provider: LLMProvider, prompt_manager: PromptManager) -> None:
        self._llm = llm_provider
        self._prompts = prompt_manager

    async def rewrite(self, query: Query) -> Query:
        """Rewrite a query using the LLM."""
        try:
            result = await self._llm.generate(
                prompt=query.original_text,
                system_prompt=self._prompts.get_prompt("rewrite_system"),
                temperature=0.0,
                max_tokens=256,
            )
            rewritten = result.text.strip()
            logger.info(
                "Query rewritten: '%s' → '%s'",
                query.original_text[:50],
                rewritten[:50],
            )
            return query.model_copy(update={"rewritten_text": rewritten})

        except Exception as e:
            raise QueryRewriteError(
                f"Query rewriting failed: {e}",
                detail=str(e),
            ) from e

    async def classify(self, query: Query) -> Query:
        """Classify query type using the LLM."""
        try:
            result = await self._llm.generate(
                prompt=query.original_text,
                system_prompt=self._prompts.get_prompt("classify_system"),
                temperature=0.0,
                max_tokens=20,
            )

            category = result.text.strip().lower()
            try:
                query_type = QueryType(category)
            except ValueError:
                query_type = QueryType.FACTUAL

            logger.info(
                "Query classified: '%s' → %s",
                query.original_text[:50],
                query_type.value,
            )
            return query.model_copy(update={"query_type": query_type})

        except Exception as e:
            raise QueryRewriteError(
                f"Query classification failed: {e}",
                detail=str(e),
            ) from e
