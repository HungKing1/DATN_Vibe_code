"""MongoDB reader for legal documents."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class MongoDBLegalReader:
    """Read legal data from MongoDB (the single source of truth)."""

    def __init__(self, url: str, db_name: str) -> None:
        from motor.motor_asyncio import AsyncIOMotorClient
        self._client = AsyncIOMotorClient(url)
        self._db = self._client[db_name]
        logger.info("MongoDBLegalReader initialized for db: %s", db_name)

    async def find_by_so_ky_hieu(self, so_ky_hieu: str) -> dict[str, Any] | None:
        """Find a legal document by its exact so_ky_hieu."""
        doc = await self._db.legal_documents.find_one({
            "so_ky_hieu": so_ky_hieu
        })
        if doc:
            # Motor returns a dict with ObjectId, which we can cast to string if needed
            # We keep it as is, but maybe convert _id to str for safety
            doc["_id"] = str(doc["_id"])
            if "body" in doc:
                doc["body"] = [str(b) for b in doc["body"]]
        return doc
        
    async def get_articles(self, so_ky_hieu: str) -> list[dict[str, Any]]:
        """Get all articles for a given document (sorted by dieu)."""
        doc = await self._db.legal_documents.find_one({"so_ky_hieu": so_ky_hieu})
        if not doc:
            logger.warning("Document with so_ky_hieu %s not found.", so_ky_hieu)
            return []
            
        doc_id = doc["_id"]
        cursor = self._db.legal_articles.find({"document_id": doc_id}).sort("dieu", 1)
        
        articles = []
        async for art in cursor:
            art["_id"] = str(art["_id"])
            art["document_id"] = str(art["document_id"])
            articles.append(art)
            
        return articles
