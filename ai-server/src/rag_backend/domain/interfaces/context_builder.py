"""ContextBuilder interface — for assembling LLM context from ranked results."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rag_backend.domain.models.query import RankedResult


class ContextBuilder(ABC):
    """Abstract base class for building LLM context.

    Responsible for selecting, ordering, and optionally compressing
    ranked retrieval results into a context string for the LLM.
    """

    @abstractmethod
    async def build_context(
        self,
        ranked_results: list[RankedResult],
        max_tokens: int = 4000,
        query: str = "",
    ) -> str:
        """Build a context string from ranked results.

        Args:
            ranked_results: Re-ranked retrieval results.
            max_tokens: Maximum token budget for the context.
            query: Original query (for relevance-aware compression).

        Returns:
            Formatted context string ready for LLM prompt injection.
        """
        ...
