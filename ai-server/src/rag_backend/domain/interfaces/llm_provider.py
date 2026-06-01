"""LLMProvider interface — Adapter Pattern for LLM services."""

from __future__ import annotations

from abc import ABC, abstractmethod
from rag_backend.domain.models.query import GenerationResult


class LLMProvider(ABC):
    """Abstract base class for LLM providers.

    Implementations: LangChainOpenAIProvider, OllamaProvider, ClaudeProvider, etc.
    Supports standard generation.

    Example — switching to Ollama:
        class OllamaProvider(LLMProvider):
            async def generate(self, prompt, **kwargs) -> GenerationResult: ...
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
    def get_model_name(self) -> str:
        """Return the name of the underlying model."""
        ...

    @abstractmethod
    def get_underlying_model(self) -> Any:
        """Return the underlying LangChain BaseChatModel instance."""
        ...
