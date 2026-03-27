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


class UnsupportedFileTypeError(DocumentProcessingError):
    """Raised when a file type has no registered processor."""

    def __init__(self, file_type: str) -> None:
        super().__init__(f"Unsupported file type: {file_type}")
        self.file_type = file_type


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


class EmbeddingDimensionMismatchError(EmbeddingError):
    """Raised when embedding dimensions don't match expected."""

    def __init__(self, expected: int, got: int) -> None:
        super().__init__(f"Embedding dimension mismatch: expected {expected}, got {got}")
        self.expected = expected
        self.got = got


# --- Chunking ---

class ChunkingError(RAGBackendError):
    """Raised when document chunking fails."""


# --- Cache ---

class CacheError(RAGBackendError):
    """Raised when cache operations fail."""


# --- Reranking ---

class RerankingError(RAGBackendError):
    """Raised when reranking operations fail."""


# --- Query ---

class QueryRewriteError(RAGBackendError):
    """Raised when query rewriting fails."""


class QueryPipelineError(RAGBackendError):
    """Raised when the query pipeline encounters an error."""


# --- Ingestion ---

class IngestionError(RAGBackendError):
    """Raised when document ingestion fails."""


class DocumentTooLargeError(IngestionError):
    """Raised when a document exceeds maximum size."""

    def __init__(self, size_mb: float, max_mb: int) -> None:
        super().__init__(f"Document size {size_mb:.1f}MB exceeds limit {max_mb}MB")
        self.size_mb = size_mb
        self.max_mb = max_mb


# --- Tenant ---

class TenantNotFoundError(RAGBackendError):
    """Raised when a tenant does not exist."""

    def __init__(self, tenant_id: str) -> None:
        super().__init__(f"Tenant not found: {tenant_id}")
        self.tenant_id = tenant_id
