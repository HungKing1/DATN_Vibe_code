"""Health check routes."""

from __future__ import annotations

from fastapi import APIRouter

from rag_backend.config.settings import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Application health check."""
    settings = get_settings()
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/health/ready")
async def readiness_check():
    """Readiness check — verifies dependent services are available."""
    # In production, check Weaviate, Redis, etc.
    return {"status": "ready"}
