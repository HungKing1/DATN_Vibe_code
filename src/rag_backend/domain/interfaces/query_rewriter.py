"""QueryRewriter interface — for query understanding and rewriting."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rag_backend.domain.models.query import Query


class QueryRewriter(ABC):
    """Abstract base class for query rewriting.

    Rewrites user queries to improve retrieval quality
    (e.g., expand acronyms, reformulate, add context).
    """

    @abstractmethod
    async def rewrite(self, query: Query) -> Query:
        """Rewrite a query for better retrieval.

        Args:
            query: The original user query.

        Returns:
            Query with rewritten_text populated.
        """
        ...

    @abstractmethod
    async def classify(self, query: Query) -> Query:
        """Classify the query type (factual, analytical, etc.).

        Args:
            query: The query to classify.

        Returns:
            Query with query_type populated.
        """
        ...
