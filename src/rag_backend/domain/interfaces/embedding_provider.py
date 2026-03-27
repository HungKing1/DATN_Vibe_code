"""EmbeddingProvider interface — supports multiple providers and versioning."""

from __future__ import annotations

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers.

    Implementations: SentenceTransformerProvider, OpenAIEmbeddingProvider, etc.
    Supports versioning so embeddings can be tracked and migrated.
    """

    @abstractmethod
    async def embed_text(self, text: str) -> list[float]:
        """Embed a single text string into a vector."""
        ...

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts into vectors.

        More efficient than calling embed_text in a loop.
        """
        ...

    @abstractmethod
    def get_dimension(self) -> int:
        """Return the embedding dimension."""
        ...

    @abstractmethod
    def get_model_name(self) -> str:
        """Return the name of the embedding model."""
        ...

    @abstractmethod
    def get_version(self) -> str:
        """Return the current embedding version string."""
        ...
