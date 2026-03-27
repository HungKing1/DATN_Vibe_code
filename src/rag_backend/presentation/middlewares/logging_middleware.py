"""Structured logging middleware."""

from __future__ import annotations

import logging
import time
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Logs all incoming requests with timing and request ID."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid4())[:8]
        start = time.perf_counter()

        # Add request ID to state for downstream usage
        request.state.request_id = request_id

        logger.info(
            "[%s] → %s %s",
            request_id,
            request.method,
            request.url.path,
        )

        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "[%s] ← %d (%s %s) %.1fms",
            request_id,
            response.status_code,
            request.method,
            request.url.path,
            elapsed_ms,
        )

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.1f}"

        return response
