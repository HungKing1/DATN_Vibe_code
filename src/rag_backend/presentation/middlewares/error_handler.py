"""Centralized error handler middleware."""

from __future__ import annotations

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from rag_backend.domain.exceptions import (
    CollectionNotFoundError,
    DocumentProcessingError,
    DocumentTooLargeError,
    EmbeddingError,
    IngestionError,
    LLMProviderError,
    LLMRateLimitError,
    QueryPipelineError,
    RAGBackendError,
    TenantNotFoundError,
    UnsupportedFileTypeError,
    VectorStoreError,
)

logger = logging.getLogger(__name__)

# Map exception types to HTTP status codes
EXCEPTION_STATUS_MAP: dict[type, int] = {
    UnsupportedFileTypeError: 400,
    DocumentTooLargeError: 413,
    DocumentProcessingError: 422,
    CollectionNotFoundError: 404,
    TenantNotFoundError: 404,
    VectorStoreError: 502,
    LLMRateLimitError: 429,
    LLMProviderError: 502,
    EmbeddingError: 502,
    IngestionError: 500,
    QueryPipelineError: 500,
    RAGBackendError: 500,
}


async def rag_exception_handler(request: Request, exc: RAGBackendError) -> JSONResponse:
    """Handle all RAG backend exceptions with appropriate HTTP status codes."""
    status_code = EXCEPTION_STATUS_MAP.get(type(exc), 500)

    logger.error(
        "Request %s %s failed: [%s] %s (detail=%s)",
        request.method,
        request.url.path,
        type(exc).__name__,
        exc.message,
        exc.detail,
    )

    return JSONResponse(
        status_code=status_code,
        content={
            "error": type(exc).__name__,
            "message": exc.message,
            "detail": exc.detail,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.exception(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred",
            "detail": str(exc) if logger.isEnabledFor(logging.DEBUG) else None,
        },
    )
