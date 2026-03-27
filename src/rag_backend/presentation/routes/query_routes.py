"""Query/RAG API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from rag_backend.presentation.schemas.query_schemas import (
    QueryRequestSchema,
    QueryResponseSchema,
)

router = APIRouter(prefix="/api/v1/query", tags=["Query"])


def _get_query_controller(request: Request):
    """Get QueryController from app state (injected via DI)."""
    return request.app.state.query_controller


@router.post("/", response_model=QueryResponseSchema)
async def query(
    body: QueryRequestSchema,
    request: Request,
    controller=Depends(_get_query_controller),
):
    """Execute a RAG query and return the response."""
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
    """Execute a RAG query with streaming response."""
    tenant_id = getattr(request.state, "tenant_id", "default")

    return StreamingResponse(
        controller.query_stream(body, tenant_id=tenant_id),
        media_type="text/event-stream",
    )
