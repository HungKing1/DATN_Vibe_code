"""TXT input processor."""

from __future__ import annotations

import logging
from pathlib import Path

from rag_backend.domain.exceptions import DocumentProcessingError
from rag_backend.domain.interfaces.input_processor import InputProcessor
from rag_backend.domain.models.document import (
    DocumentMetadata,
    DocumentType,
    ProcessedDocument,
)

logger = logging.getLogger(__name__)


class TXTProcessor(InputProcessor):
    """Processes plain text files."""

    def supported_extensions(self) -> list[str]:
        return [".txt", ".md", ".rst"]

    async def process(self, source: Path, **kwargs) -> ProcessedDocument:
        """Read text file content."""
        encoding = kwargs.get("encoding", "utf-8")
        try:
            content = source.read_text(encoding=encoding)

            metadata = DocumentMetadata(
                source=str(source),
                file_name=source.name,
                file_type=DocumentType.TXT,
                file_size_bytes=source.stat().st_size,
            )

            logger.info("Processed TXT: %s (%d chars)", source.name, len(content))

            return ProcessedDocument(
                content=content,
                metadata=metadata,
                pages=[content],
            )

        except Exception as e:
            raise DocumentProcessingError(
                f"Failed to process text file: {source.name}",
                detail=str(e),
            ) from e
