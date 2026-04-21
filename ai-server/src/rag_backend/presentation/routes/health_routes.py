"""Health check routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from rag_backend.config.settings import get_settings
from rag_backend.di.container import Container, get_container

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
async def readiness_check(container: Container = Depends(get_container)):
    """Readiness check — verifies dependent services are available."""
    try: 
        await container.vector_repository().list_collections()
        weaviate_healthy = True
    except Exception:
        weaviate_healthy = False
    
    status = "ready" if weaviate_healthy else "unhealthy"

    return {
        "status": status,
        "services": {
            "weaviate": "healthy" if weaviate_healthy else "unhealthy",
        }    
    }
