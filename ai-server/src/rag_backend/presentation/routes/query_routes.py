"""Query/RAG API routes.

Endpoints:
    POST /api/v1/query/          — Standard RAG query (sync JSON response)
    POST /api/v1/query/stream    — Standard RAG query (SSE streaming)
    POST /api/v1/query/reflect   — Reflection RAG query (iterative self-correction)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from rag_backend.presentation.schemas.query_schemas import (
    QueryRequestSchema,
    QueryResponseSchema,
    ReflectionQueryRequestSchema,
    ReflectionQueryResponseSchema,
)

router = APIRouter(prefix="/api/v1/query", tags=["Query"])


def _get_query_controller(request: Request):
    """Get QueryController from app state (injected via DI)."""
    return request.app.state.query_controller


# ── Standard RAG ────────────────────────────────────────────


@router.post("/", response_model=QueryResponseSchema)
async def query(
    body: QueryRequestSchema,
    request: Request,
    controller=Depends(_get_query_controller),
):
    """Execute a standard RAG query and return the response.

    Pipeline: query rewrite → hybrid search → rerank → context build → LLM generate.
    """
    tenant_id = getattr(request.state, "tenant_id", "default")

    if body.stream:
        return StreamingResponse(
            controller.query_stream(body, tenant_id=tenant_id),
            media_type="text/event-stream",
        )

    return await controller.query(body, tenant_id=tenant_id)


@router.post("/stream")
async def query_stream(
    body: QueryRequestSchema,
    request: Request,
    controller=Depends(_get_query_controller),
):
    """Execute a RAG query with Server-Sent Events (SSE) streaming response.

    Tokens are returned in real-time as they are generated.
    """
    tenant_id = getattr(request.state, "tenant_id", "default")

    return StreamingResponse(
        controller.query_stream(body, tenant_id=tenant_id),
        media_type="text/event-stream",
    )


# ── Reflection RAG ──────────────────────────────────────────


@router.post("/reflect", response_model=ReflectionQueryResponseSchema)
async def query_with_reflection(
    body: ReflectionQueryRequestSchema,
    request: Request,
    controller=Depends(_get_query_controller),
):
    """Execute a RAG query with iterative reflection loop.

    After generating an answer, the system evaluates quality
    (groundedness, relevance, citations) and self-corrects via
    query rewriting, additional retrieval, or regeneration —
    up to ``max_reflection_iterations`` times.
    """
    tenant_id = getattr(request.state, "tenant_id", "default")

    return await controller.query_reflect(body, tenant_id=tenant_id)
