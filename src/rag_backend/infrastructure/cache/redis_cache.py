"""Redis-backed cache service."""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

from rag_backend.domain.exceptions import CacheError
from rag_backend.domain.interfaces.cache_service import CacheService

logger = logging.getLogger(__name__)


class RedisCacheService(CacheService):
    """CacheService implementation backed by Redis."""

    def __init__(self, redis_url: str, default_ttl: int = 3600) -> None:
        self._redis_url = redis_url
        self._default_ttl = default_ttl
        self._client: aioredis.Redis | None = None

    async def _get_client(self) -> aioredis.Redis:
        """Lazy-initialize the Redis client."""
        if self._client is None:
            self._client = aioredis.from_url(
                self._redis_url,
                decode_responses=True,
            )
        return self._client

    async def get(self, key: str) -> Any | None:
        """Get a value from Redis."""
        try:
            client = await self._get_client()
            value = await client.get(key)
            if value is None:
                return None
            return json.loads(value)
        except json.JSONDecodeError:
            return value
        except Exception as e:
            raise CacheError(f"Cache get failed for key: {key}", detail=str(e)) from e

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        """Set a value in Redis with optional TTL."""
        try:
            client = await self._get_client()
            serialized = json.dumps(value, default=str)
            ttl = ttl_seconds or self._default_ttl
            await client.setex(key, ttl, serialized)
        except Exception as e:
            raise CacheError(f"Cache set failed for key: {key}", detail=str(e)) from e

    async def delete(self, key: str) -> bool:
        """Delete a key from Redis."""
        try:
            client = await self._get_client()
            result = await client.delete(key)
            return result > 0
        except Exception as e:
            raise CacheError(f"Cache delete failed for key: {key}", detail=str(e)) from e

    async def exists(self, key: str) -> bool:
        """Check if a key exists in Redis."""
        try:
            client = await self._get_client()
            return await client.exists(key) > 0
        except Exception as e:
            raise CacheError(f"Cache exists check failed: {key}", detail=str(e)) from e

    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern."""
        try:
            client = await self._get_client()
            count = 0
            async for key in client.scan_iter(match=pattern):
                await client.delete(key)
                count += 1
            return count
        except Exception as e:
            raise CacheError(
                f"Cache clear_pattern failed for: {pattern}",
                detail=str(e),
            ) from e

    async def close(self) -> None:
        """Close the Redis connection."""
        if self._client is not None:
            await self._client.close()
            self._client = None
