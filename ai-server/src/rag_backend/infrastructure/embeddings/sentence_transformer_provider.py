"""Sentence Transformers embedding provider."""

from __future__ import annotations

import logging

from sentence_transformers import SentenceTransformer

from rag_backend.domain.exceptions import EmbeddingError
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider

logger = logging.getLogger(__name__)


class SentenceTransformerProvider(EmbeddingProvider):
    """Embedding provider using sentence-transformers."""

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        device: str | None = None,
    ) -> None:
        self._model_name = model_name
        try:
            self._model = SentenceTransformer(model_name, device=device)
            self._dimension = self._model.get_sentence_embedding_dimension()
            logger.info(
                "Loaded embedding model: %s (dim=%d)",
                model_name,
                self._dimension,
            )
        except Exception as e:
            raise EmbeddingError(
                f"Failed to load embedding model: {model_name}",
                detail=str(e),
            ) from e

    async def embed_text(self, text: str) -> list[float]:
        """Embed a single text string."""
        try:
            embedding = self._model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            raise EmbeddingError(
                "Failed to embed text",
                detail=str(e),
            ) from e

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts efficiently."""
        try:
            embeddings = self._model.encode(texts, convert_to_numpy=True, batch_size=32)
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            raise EmbeddingError(
                f"Failed to embed batch of {len(texts)} texts",
                detail=str(e),
            ) from e

    def get_dimension(self) -> int:
        return self._dimension

    def get_model_name(self) -> str:
        return self._model_name
