"""FastAPI application entry point.

Run with: uv run uvicorn rag_backend.main:app --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables into os.environ for LangSmith / Langchain
load_dotenv()

from rag_backend.config.settings import Settings, get_settings
from rag_backend.di.container import init_container
from rag_backend.domain.exceptions import RAGBackendError
from rag_backend.presentation.middlewares.error_handler import (
    generic_exception_handler,
    rag_exception_handler,
)
from rag_backend.presentation.middlewares.logging_middleware import LoggingMiddleware
from rag_backend.presentation.routes import health_routes, ingestion_routes, query_routes

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — initialize and teardown resources."""
    settings = get_settings()

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    logger.info("Starting %s v%s", settings.app_name, settings.app_version)

    # Initialize DI container
    container = init_container(settings)

    # Initialize Weaviate schema (Law + LawChunk collections)
    vector_repo = container.vector_repository()
    await vector_repo.initialize_schema()
    logger.info("Weaviate schema initialized: Law + LawChunk ready")

    # Inject controllers into app state (for route dependency injection)
    app.state.ingestion_controller = container.ingestion_controller()
    app.state.query_controller = container.query_controller()
    app.state.vector_repository = vector_repo

    logger.info("Application started successfully")

    yield

    # Shutdown 
    logger.info("Shutting down...")
    # Close connections
    vector_repo = container.vector_repository()
    if hasattr(vector_repo, "close"):
        await vector_repo.close()

    logger.info("Shutdown complete")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Application factory — creates and configures the FastAPI app."""
    if settings is None:
        settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Production-ready Advanced RAG Backend System",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # --- Middleware ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(LoggingMiddleware)

    # --- Exception Handlers ---
    app.add_exception_handler(RAGBackendError, rag_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # --- Routes ---
    app.include_router(health_routes.router)
    app.include_router(ingestion_routes.router)
    app.include_router(query_routes.router)

    return app


# Default app instance
app = create_app()
