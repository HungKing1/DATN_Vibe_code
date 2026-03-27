"""Recursive character chunking strategy using LangChain text splitters."""

from __future__ import annotations

import logging
from uuid import uuid4

from langchain_text_splitters import RecursiveCharacterTextSplitter

from rag_backend.domain.exceptions import ChunkingError
from rag_backend.domain.interfaces.chunking_strategy import ChunkingStrategy
from rag_backend.domain.models.document import DocumentChunk, ProcessedDocument

logger = logging.getLogger(__name__)


class RecursiveChunker(ChunkingStrategy):
    """Recursive character-based chunking using LangChain splitter.

    Splits by paragraphs, then sentences, then words — recursively
    trying each separator to stay within chunk_size.
    """

    def get_strategy_name(self) -> str:
        return "recursive"

    async def chunk(
        self,
        document: ProcessedDocument,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> list[DocumentChunk]:
        """Split document into chunks using recursive character splitting."""
        try:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len,
                separators=["\n\n", "\n", ". ", " ", ""],
            )

            texts = splitter.split_text(document.content)

            chunks = []
            for i, text in enumerate(texts):
                chunk = DocumentChunk(
                    id=uuid4(),
                    document_id=document.id,
                    content=text,
                    chunk_index=i,
                    metadata=document.metadata.model_copy(),
                    token_count=len(text.split()),
                )
                chunks.append(chunk)

            logger.info(
                "Chunked document %s into %d chunks (strategy=recursive, size=%d, overlap=%d)",
                document.id,
                len(chunks),
                chunk_size,
                chunk_overlap,
            )

            return chunks

        except Exception as e:
            raise ChunkingError(
                f"Recursive chunking failed for document {document.id}",
                detail=str(e),
            ) from e
