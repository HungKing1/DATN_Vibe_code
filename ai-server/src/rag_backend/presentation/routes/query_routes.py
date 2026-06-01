"""Query/RAG API routes.

Endpoints:
    POST /api/v1/query/          — Standard RAG query (sync JSON response)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from rag_backend.presentation.schemas.query_schemas import (
    QueryRequestSchema,
    QueryResponseSchema,
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
    return await controller.query(body)


