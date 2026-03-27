"""Prompt management — versioned prompt templates for RAG system."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class PromptManager:
    """Manages prompt templates with variable substitution and versioning.

    Supports multiple prompt versions for A/B testing and iteration.
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

    def __init__(self) -> None:
        self._templates: dict[str, dict[str, str]] = {
            "rag_system": {"v1": self.RAG_SYSTEM_PROMPT},
            "rag_user": {"v1": self.RAG_USER_PROMPT},
            "query_rewrite": {"v1": self.QUERY_REWRITE_PROMPT},
            "summarization": {"v1": self.SUMMARIZATION_PROMPT},
        }
        self._active_versions: dict[str, str] = {
            "rag_system": "v1",
            "rag_user": "v1",
            "query_rewrite": "v1",
            "summarization": "v1",
        }

    def get_prompt(
        self,
        template_name: str,
        version: str | None = None,
        **variables: Any,
    ) -> str:
        """Get a formatted prompt template.

        Args:
            template_name: Name of the prompt template.
            version: Optional version string. Uses active version if not specified.
            **variables: Template variables to substitute.

        Returns:
            Formatted prompt string.
        """
        ver = version or self._active_versions.get(template_name, "v1")
        versions = self._templates.get(template_name)

        if not versions:
            raise ValueError(f"Unknown prompt template: {template_name}")

        template = versions.get(ver)
        if not template:
            raise ValueError(f"Unknown version '{ver}' for template '{template_name}'")

        try:
            return template.format(**variables)
        except KeyError as e:
            raise ValueError(
                f"Missing template variable {e} in '{template_name}'"
            ) from e

    def register_template(
        self,
        template_name: str,
        version: str,
        template: str,
        set_active: bool = False,
    ) -> None:
        """Register a new prompt template version."""
        if template_name not in self._templates:
            self._templates[template_name] = {}
        self._templates[template_name][version] = template

        if set_active or template_name not in self._active_versions:
            self._active_versions[template_name] = version

        logger.info(
            "Registered prompt template: %s (version=%s, active=%s)",
            template_name,
            version,
            set_active,
        )

    def set_active_version(self, template_name: str, version: str) -> None:
        """Set the active version for a template."""
        if template_name not in self._templates:
            raise ValueError(f"Unknown template: {template_name}")
        if version not in self._templates[template_name]:
            raise ValueError(f"Unknown version: {version}")
        self._active_versions[template_name] = version

    def list_templates(self) -> dict[str, list[str]]:
        """List all templates with their versions."""
        return {name: list(versions.keys()) for name, versions in self._templates.items()}
