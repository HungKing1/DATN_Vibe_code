"""Prompt management — prompt templates for RAG system."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class PromptManager:
    """Manages prompt templates with variable substitution.

    Provides a central registry for all prompt templates used in the RAG pipeline.
    """

    # --- Default Prompt Templates ---

    RAG_SYSTEM_PROMPT = """You are a knowledgeable AI assistant. Answer the user's question
based ONLY on the provided context. If the context doesn't contain enough
information to answer, say so clearly. Always cite your sources.

Guidelines:
- Be precise and factual
- Reference specific sources using [Source N] notation
- If uncertain, acknowledge the limitation
- Structure your response clearly"""

    RAG_USER_PROMPT = """Context:
{context}

---

Question: {query}

Please provide a comprehensive answer based on the context above. Cite sources using [Source N] notation."""

    QUERY_REWRITE_PROMPT = """Rewrite the following query to improve retrieval from a vector database.
Make it more specific, expand abbreviations, and add relevant synonyms.
Return ONLY the rewritten query.

Original query: {query}"""

    SUMMARIZATION_PROMPT = """Based on the following context, provide a concise summary.

Context:
{context}

Summary:"""

    EVALUATION_PROMPT = """You are an evaluator for a Retrieval-Augmented Generation (RAG) system.

Evaluate the answer using these criteria:

- groundedness (0–1): Is the answer fully grounded in the retrieved context? 1 = every claim is supported.
- relevance (0–1): Does the answer directly and completely address the user question? 1 = perfectly relevant.
- citations_matched (0–1): Are the cited sources correct and aligned with the context used? 1 = all citations accurate.

Question:
{question}

Context:
{context}

Answer:
{answer}

Return ONLY a JSON object (no markdown, no extra text):
{{"groundedness": ..., "relevance": ..., "citations_matched": ..., "reasoning": "..."}}"""

    REFLECTION_PROMPT = """You are a reflection agent in a RAG system. Your job is to analyse evaluation metrics and decide how to improve the answer.

Question:
{question}

Answer:
{answer}

Context:
{context}

Evaluation Metrics:
{evaluation}

Rules for deciding the action:
- If relevance is low → REWRITE_QUERY (provide an improved_query)
- If groundedness is low → SEARCH_MORE or REGENERATE
- If citations_matched is low → SEARCH_MORE
- If answer is too short (length_score low) → REGENERATE
- If latency is too high (latency_score low) → STOP to avoid further delay
- If metrics are acceptable → STOP

Allowed actions: REWRITE_QUERY, SEARCH_MORE, REGENERATE, STOP

Return ONLY a JSON object (no markdown, no extra text):
{{"action": "...", "improved_query": "...", "new_top_k": ..., "reasoning": "..."}}

If action is not REWRITE_QUERY, set improved_query to null.
If action is not SEARCH_MORE, set new_top_k to null."""

    def __init__(self) -> None:
        self._templates: dict[str, str] = {
            "rag_system": self.RAG_SYSTEM_PROMPT,
            "rag_user": self.RAG_USER_PROMPT,
            "query_rewrite": self.QUERY_REWRITE_PROMPT,
            "summarization": self.SUMMARIZATION_PROMPT,
            "evaluation": self.EVALUATION_PROMPT,
            "reflection": self.REFLECTION_PROMPT,
        }

    def get_prompt(
        self,
        template_name: str,
        **variables: Any,
    ) -> str:
        """Get a formatted prompt template.

        Args:
            template_name: Name of the prompt template.
            **variables: Template variables to substitute.

        Returns:
            Formatted prompt string.
        """
        template = self._templates.get(template_name)

        if not template:
            raise ValueError(f"Unknown prompt template: {template_name}")

        try:
            return template.format(**variables)
        except KeyError as e:
            raise ValueError(
                f"Missing template variable {e} in '{template_name}'"
            ) from e

    def register_template(
        self,
        template_name: str,
        template: str,
    ) -> None:
        """Register a new prompt template."""
        self._templates[template_name] = template
        logger.info("Registered prompt template: %s", template_name)

    def list_templates(self) -> list[str]:
        """List all registered template names."""
        return list(self._templates.keys())
