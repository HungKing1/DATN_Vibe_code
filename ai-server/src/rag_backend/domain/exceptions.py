"""Domain exceptions — centralized error hierarchy."""

from __future__ import annotations


class RAGBackendError(Exception):
    """Base exception for all RAG backend errors."""

    def __init__(self, message: str = "", detail: str | None = None) -> None:
        self.message = message
        self.detail = detail
        super().__init__(self.message)


# --- Document Processing ---

class DocumentProcessingError(RAGBackendError):
    """Raised when document processing fails."""


# --- Vector Store ---

class VectorStoreError(RAGBackendError):
    """Raised when vector store operations fail."""


class CollectionNotFoundError(VectorStoreError):
    """Raised when a vector collection does not exist."""

    def __init__(self, collection_name: str) -> None:
        super().__init__(f"Collection not found: {collection_name}")
        self.collection_name = collection_name


# --- LLM ---

class LLMProviderError(RAGBackendError):
    """Raised when LLM provider operations fail."""


class LLMRateLimitError(LLMProviderError):
    """Raised when LLM rate limit is exceeded."""


# --- Embedding ---

class EmbeddingError(RAGBackendError):
    """Raised when embedding operations fail."""







# --- Reranking ---

class RerankingError(RAGBackendError):
    """Raised when reranking operations fail."""


# --- Query ---


class QueryPipelineError(RAGBackendError):
    """Raised when the query pipeline encounters an error."""


class OutOfDomainError(RAGBackendError):
    """Raised when a user query does not match any available law in the system."""

    def __init__(self, available_laws: list[str]) -> None:
        law_list = ", ".join(available_laws) if available_laws else "Chưa có bộ luật nào"
        super().__init__(
            "Câu hỏi không thuộc lĩnh vực pháp luật mà hệ thống hỗ trợ.",
            detail=f"Hệ thống hiện có: {law_list}",
        )
        self.available_laws = available_laws



# --- Ingestion ---

class IngestionError(RAGBackendError):
    """Raised when document ingestion fails."""


class DocumentTooLargeError(IngestionError):
    """Raised when a document exceeds maximum size."""

    def __init__(self, size_mb: float, max_mb: int) -> None:
        super().__init__(f"Document size {size_mb:.1f}MB exceeds limit {max_mb}MB")
        self.size_mb = size_mb
        self.max_mb = max_mb



