"""Groq LLM provider adapter using langchain_groq."""

from __future__ import annotations

import logging
from typing import Any

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from rag_backend.domain.exceptions import LLMProviderError, LLMRateLimitError
from rag_backend.domain.interfaces.llm_provider import LLMProvider
from rag_backend.domain.models.query import GenerationResult

logger = logging.getLogger(__name__)

def extract_text_from_message(content) -> str:
    """Safely extract plain text from an AIMessage content which might be a list of blocks."""
    if isinstance(content, str):
        return content
    
    if isinstance(content, list):
        return " ".join(
            block.get("text", "") 
            for block in content 
            if isinstance(block, dict) and block.get("type") == "text"
        )
    
    return str(content)

class GroqProvider(LLMProvider):
    """LLM provider wrapping LangChain's ChatGroq.

    Uses Groq's ultra-fast inference API with models like
    openai/gpt-oss-120b, llama-3.3-70b-versatile, etc.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "openai/gpt-oss-120b",
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> None:
        self._model = model
        self._default_temperature = temperature
        self._default_max_tokens = max_tokens
        self._llm = ChatGroq(
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
        """Generate a response using Groq."""
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
                text=extract_text_from_message(response.content),
                model=self._model,
                prompt_tokens=token_usage.get("prompt_tokens"),
                completion_tokens=token_usage.get("completion_tokens"),
                total_tokens=token_usage.get("total_tokens"),
            )

        except Exception as e:
            err_str = str(e).lower()
            if "rate_limit" in err_str or "rate limit" in err_str or "429" in err_str:
                raise LLMRateLimitError(
                    "Groq rate limit exceeded",
                    detail=str(e),
                ) from e
            raise LLMProviderError(
                f"Groq generation failed: {e}",
                detail=str(e),
            ) from e


    def get_model_name(self) -> str:
        return self._model

    def get_underlying_model(self) -> Any:
        return self._llm
