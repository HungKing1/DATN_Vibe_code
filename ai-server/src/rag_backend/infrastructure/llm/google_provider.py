"""Google Gemini LLM provider adapter using LangChain."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from rag_backend.domain.exceptions import LLMProviderError
from rag_backend.domain.interfaces.llm_provider import LLMProvider
from rag_backend.domain.models.query import GenerationResult

logger = logging.getLogger(__name__)


class GoogleGeminiProvider(LLMProvider):
    """LLM provider wrapping LangChain's ChatGoogleGenerativeAI (Gemini).

    Uses the same LLMProvider interface as OpenAI/Claude/Ollama.
    Swap is transparent — no business logic changes needed.

    Usage:
        provider = GoogleGeminiProvider(
            api_key="your-google-api-key",
            model="gemini-1.5-pro",
        )
        result = await provider.generate("Hello, Gemini!")
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-pro",
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> None:
        self._model = model
        self._default_temperature = temperature
        self._default_max_tokens = max_tokens
        self._llm = ChatGoogleGenerativeAI(
            google_api_key=api_key,
            model=model,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs,
    ) -> GenerationResult:
        """Generate a response using Google Gemini via LangChain."""
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
                    max_output_tokens=max_tokens or self._default_max_tokens,
                )

            response = await llm.ainvoke(messages)

            # Extract token usage from response metadata
            usage_metadata = response.usage_metadata or {}
            token_usage = response.response_metadata.get("token_usage", {})

            return GenerationResult(
                text=str(response.content),
                model=self._model,
                prompt_tokens=usage_metadata.get("input_tokens") or token_usage.get("prompt_tokens"),
                completion_tokens=usage_metadata.get("output_tokens") or token_usage.get("completion_tokens"),
                total_tokens=usage_metadata.get("total_tokens") or token_usage.get("total_tokens"),
            )

        except Exception as e:
            raise LLMProviderError(
                f"Google Gemini generation failed: {e}",
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
        """Stream response tokens from Google Gemini."""
        try:
            messages = []
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            messages.append(HumanMessage(content=prompt))

            llm = self._llm
            if temperature is not None or max_tokens is not None:
                llm = self._llm.bind(
                    temperature=temperature or self._default_temperature,
                    max_output_tokens=max_tokens or self._default_max_tokens,
                )

            async for chunk in llm.astream(messages):
                if chunk.content:
                    yield str(chunk.content)

        except Exception as e:
            raise LLMProviderError(
                f"Google Gemini streaming failed: {e}",
                detail=str(e),
            ) from e

    def get_model_name(self) -> str:
        return self._model
