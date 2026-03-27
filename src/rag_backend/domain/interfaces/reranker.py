"""Reranker interface — for cross-encoder and other re-ranking strategies."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rag_backend.domain.models.query import RankedResult, RetrievalResult


class Reranker(ABC):
    """Abstract base class for search result re-ranking.

    Implementations: CrossEncoderReranker, CohereReranker, etc.
    """

    @abstractmethod
    async def rerank(
        self,
        query: str,
        results: list[RetrievalResult],
        top_k: int = 5,
    ) -> list[RankedResult]:
        """Re-rank retrieval results using a more accurate (but slower) model.

        Args:
            query: The original query text.
            results: Initial retrieval results to re-rank.
            top_k: Number of top results to return after re-ranking.

        Returns:
            List of RankedResult sorted by rerank_score descending.
        """
        ...
