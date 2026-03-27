"""Tenant resolution middleware for multi-tenant support."""

from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from rag_backend.config.settings import get_settings

logger = logging.getLogger(__name__)


class TenantMiddleware(BaseHTTPMiddleware):
    """Resolves tenant ID from request headers or defaults.

    Expects header: X-Tenant-ID
    Falls back to settings.default_tenant_id.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()

        if settings.multi_tenant_enabled:
            tenant_id = request.headers.get("X-Tenant-ID", settings.default_tenant_id)
        else:
            tenant_id = settings.default_tenant_id

        request.state.tenant_id = tenant_id

        response = await call_next(request)
        response.headers["X-Tenant-ID"] = tenant_id

        return response
