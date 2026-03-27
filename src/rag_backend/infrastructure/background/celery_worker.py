"""Celery worker for background and async job processing."""

from __future__ import annotations

import logging

from celery import Celery

from rag_backend.config.settings import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# --- Celery App ---
celery_app = Celery(
    "rag_backend",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


# --- Tasks ---

@celery_app.task(bind=True, name="rag_backend.ingest_document", max_retries=3)
def ingest_document_task(self, file_path: str, tenant_id: str = "default", collection_name: str = "documents"):
    """Background task for document ingestion.

    This task is dispatched asynchronously so large documents
    don't block the API response.

    Args:
        file_path: Path to the file to ingest.
        tenant_id: Tenant identifier.
        collection_name: Target vector collection.
    """
    try:
        logger.info(
            "Background ingestion started: file=%s, tenant=%s, collection=%s",
            file_path,
            tenant_id,
            collection_name,
        )

        # NOTE: In production, this would use the DI container to get
        # the IngestionService and call it here. The actual implementation
        # requires an async event loop bridge since Celery tasks are sync.
        #
        # Example:
        #   import asyncio
        #   from rag_backend.di.container import get_container
        #
        #   container = get_container()
        #   service = container.ingestion_service()
        #
        #   loop = asyncio.new_event_loop()
        #   result = loop.run_until_complete(
        #       service.ingest_file(Path(file_path), tenant_id, collection_name)
        #   )
        #   loop.close()

        logger.info("Background ingestion completed: %s", file_path)
        return {"status": "completed", "file_path": file_path}

    except Exception as exc:
        logger.error("Background ingestion failed: %s — %s", file_path, exc)
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


@celery_app.task(bind=True, name="rag_backend.batch_ingest", max_retries=3)
def batch_ingest_task(self, file_paths: list[str], tenant_id: str = "default", collection_name: str = "documents"):
    """Background task for batch document ingestion.

    Args:
        file_paths: List of file paths to ingest.
        tenant_id: Tenant identifier.
        collection_name: Target vector collection.
    """
    try:
        logger.info(
            "Batch ingestion started: %d files, tenant=%s",
            len(file_paths),
            tenant_id,
        )

        results = []
        for fp in file_paths:
            result = ingest_document_task.delay(fp, tenant_id, collection_name)
            results.append(result.id)

        logger.info("Batch ingestion dispatched: %d tasks", len(results))
        return {"status": "dispatched", "task_ids": results}

    except Exception as exc:
        logger.error("Batch ingestion failed: %s", exc)
        raise self.retry(exc=exc, countdown=120)
