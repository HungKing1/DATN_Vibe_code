"""LLMProvider interface — Adapter Pattern for LLM services."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from rag_backend.domain.models.query import GenerationResult


class LLMProvider(ABC):
    """Abstract base class for LLM providers.

    Implementations: LangChainOpenAIProvider, OllamaProvider, ClaudeProvider, etc.
    Supports both standard and streaming generation.

    Example — switching to Ollama:
        class OllamaProvider(LLMProvider):
            async def generate(self, prompt, **kwargs) -> GenerationResult: ...
            async def generate_stream(self, prompt, **kwargs) -> AsyncIterator[str]: ...
    """

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs,
    ) -> GenerationResult:
        """Generate a response from the LLM.

        Args:
            prompt: The user/query prompt.
            system_prompt: Optional system-level instruction.
            temperature: Sampling temperature override.
            max_tokens: Max tokens override.

        Returns:
            GenerationResult with text and token usage.
        """
        ...

    @abstractmethod
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs,
    ) -> AsyncIterator[str]:
        """Stream a response from the LLM token-by-token.

        Yields:
            String tokens as they are generated.
        """
        ...

    @abstractmethod
    def get_model_name(self) -> str:
        """Return the name of the underlying model."""
        ...
