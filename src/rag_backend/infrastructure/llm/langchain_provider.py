"""LangChain OpenAI LLM provider adapter."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from rag_backend.domain.exceptions import LLMProviderError
from rag_backend.domain.interfaces.llm_provider import LLMProvider
from rag_backend.domain.models.query import GenerationResult

logger = logging.getLogger(__name__)


class LangChainOpenAIProvider(LLMProvider):
    """LLM provider wrapping LangChain's ChatOpenAI.

    To switch to another LLM:
    1. Create OllamaProvider(LLMProvider) or ClaudeProvider(LLMProvider)
    2. Change DI container wiring
    No other code changes needed.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o",
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> None:
        self._model = model
        self._default_temperature = temperature
        self._default_max_tokens = max_tokens
        self._llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs,
    ) -> GenerationResult:
        """Generate a response using LangChain ChatOpenAI."""
        try:
            messages = []
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            messages.append(HumanMessage(content=prompt))

            # Override params if provided
            llm = self._llm
            if temperature is not None or max_tokens is not None:
                llm = self._llm.bind(
                    temperature=temperature or self._default_temperature,
                    max_tokens=max_tokens or self._default_max_tokens,
                )

            response = await llm.ainvoke(messages)

            token_usage = response.response_metadata.get("token_usage", {})

            return GenerationResult(
                text=str(response.content),
                model=self._model,
                prompt_tokens=token_usage.get("prompt_tokens"),
                completion_tokens=token_usage.get("completion_tokens"),
                total_tokens=token_usage.get("total_tokens"),
            )

        except Exception as e:
            raise LLMProviderError(
                f"LLM generation failed: {e}",
                detail=str(e),
            ) from e

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs,
    ) -> AsyncIterator[str]:
        """Stream response tokens from LangChain ChatOpenAI."""
        try:
            messages = []
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            messages.append(HumanMessage(content=prompt))

            llm = self._llm
            if temperature is not None or max_tokens is not None:
                llm = self._llm.bind(
                    temperature=temperature or self._default_temperature,
                    max_tokens=max_tokens or self._default_max_tokens,
                )

            async for chunk in llm.astream(messages):
                if chunk.content:
                    yield str(chunk.content)

        except Exception as e:
            raise LLMProviderError(
                f"LLM streaming failed: {e}",
                detail=str(e),
            ) from e

    def get_model_name(self) -> str:
        return self._model
