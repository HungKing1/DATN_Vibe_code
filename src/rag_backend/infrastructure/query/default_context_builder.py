"""Default context builder — assembles LLM context from ranked results."""

from __future__ import annotations

import logging

from rag_backend.domain.interfaces.context_builder import ContextBuilder
from rag_backend.domain.models.query import RankedResult

logger = logging.getLogger(__name__)


class DefaultContextBuilder(ContextBuilder):
    """Builds context by selecting top-k ranked results and formatting them.

    Applies a simple token budget constraint and orders results
    by relevance score for the LLM prompt.
    """

    async def build_context(
        self,
        ranked_results: list[RankedResult],
        max_tokens: int = 4000,
        query: str = "",
    ) -> str:
        """Build a formatted context string from ranked results."""
        if not ranked_results:
            return ""

        context_parts: list[str] = []
        estimated_tokens = 0
        tokens_per_char = 0.25  # rough estimate: 1 token ≈ 4 chars

        for i, result in enumerate(ranked_results):
            chunk_tokens = int(len(result.content) * tokens_per_char)

            if estimated_tokens + chunk_tokens > max_tokens:
                # Truncate the last chunk to fit
                remaining_tokens = max_tokens - estimated_tokens
                remaining_chars = int(remaining_tokens / tokens_per_char)
                if remaining_chars > 100:
                    truncated = result.content[:remaining_chars] + "..."
                    source = result.metadata.get("source", "unknown")
                    context_parts.append(
                        f"[Source {i + 1}: {source}]\n{truncated}"
                    )
                break

            source = result.metadata.get("source", "unknown")
            context_parts.append(
                f"[Source {i + 1}: {source}]\n{result.content}"
            )
            estimated_tokens += chunk_tokens

        context = "\n\n---\n\n".join(context_parts)

        logger.info(
            "Built context: %d sources, ~%d tokens",
            len(context_parts),
            estimated_tokens,
        )

        return context
