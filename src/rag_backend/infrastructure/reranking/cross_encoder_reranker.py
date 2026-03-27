"""Cross-encoder reranker using sentence-transformers."""

from __future__ import annotations

import logging

from sentence_transformers import CrossEncoder

from rag_backend.domain.exceptions import RerankingError
from rag_backend.domain.interfaces.reranker import Reranker
from rag_backend.domain.models.query import RankedResult, RetrievalResult

logger = logging.getLogger(__name__)


class CrossEncoderReranker(Reranker):
    """Re-ranks retrieval results using a cross-encoder model.

    Cross-encoders are more accurate than bi-encoders for ranking
    but slower — hence used as a second-stage re-ranker.
    """

    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        device: str | None = None,
    ) -> None:
        try:
            self._model = CrossEncoder(model_name, device=device)
            self._model_name = model_name
            logger.info("Loaded cross-encoder model: %s", model_name)
        except Exception as e:
            raise RerankingError(
                f"Failed to load reranker model: {model_name}",
                detail=str(e),
            ) from e

    async def rerank(
        self,
        query: str,
        results: list[RetrievalResult],
        top_k: int = 5,
    ) -> list[RankedResult]:
        """Re-rank results using cross-encoder scoring."""
        if not results:
            return []

        try:
            pairs = [(query, result.content) for result in results]
            scores = self._model.predict(pairs)

            ranked = []
            for result, score in zip(results, scores):
                ranked.append(
                    RankedResult(
                        chunk_id=result.chunk_id,
                        content=result.content,
                        original_score=result.score,
                        rerank_score=float(score),
                        metadata=result.metadata,
                        document_id=result.document_id,
                    )
                )

            # Sort by rerank_score descending and take top_k
            ranked.sort(key=lambda r: r.rerank_score, reverse=True)
            top_results = ranked[:top_k]

            logger.info(
                "Reranked %d results → top %d (model=%s)",
                len(results),
                len(top_results),
                self._model_name,
            )

            return top_results

        except Exception as e:
            raise RerankingError(
                f"Reranking failed: {e}",
                detail=str(e),
            ) from e
