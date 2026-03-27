"""CacheService interface — for caching layer abstraction."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class CacheService(ABC):
    """Abstract base class for caching.

    Implementations: RedisCacheService, InMemoryCacheService, etc.
    """

    @abstractmethod
    async def get(self, key: str) -> Any | None:
        """Get a value by key. Returns None if not found."""
        ...

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        """Set a value with optional TTL."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete a key. Returns True if deleted, False if not found."""
        ...

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if a key exists."""
        ...

    @abstractmethod
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching a pattern. Returns count cleared."""
        ...
