"""PDF input processor using pypdf."""

from __future__ import annotations

import logging
from pathlib import Path

from pypdf import PdfReader

from rag_backend.domain.exceptions import DocumentProcessingError
from rag_backend.domain.interfaces.input_processor import InputProcessor
from rag_backend.domain.models.document import (
    DocumentMetadata,
    DocumentType,
    ProcessedDocument,
)

logger = logging.getLogger(__name__)


class PDFProcessor(InputProcessor):
    """Processes PDF files and extracts text content."""

    def supported_extensions(self) -> list[str]:
        return [".pdf"]

    async def process(self, source: Path, **kwargs) -> ProcessedDocument:
        """Extract text from all pages of a PDF file."""
        try:
            reader = PdfReader(str(source))
            pages: list[str] = []
            for page in reader.pages:
                text = page.extract_text() or ""
                pages.append(text)

            full_content = "\n\n".join(pages)

            metadata = DocumentMetadata(
                source=str(source),
                file_name=source.name,
                file_type=DocumentType.PDF,
                file_size_bytes=source.stat().st_size,
                page_count=len(reader.pages),
            )

            logger.info(
                "Processed PDF: %s (%d pages, %d chars)",
                source.name,
                len(reader.pages),
                len(full_content),
            )

            return ProcessedDocument(
                content=full_content,
                metadata=metadata,
                pages=pages,
            )

        except Exception as e:
            raise DocumentProcessingError(
                f"Failed to process PDF: {source.name}",
                detail=str(e),
            ) from e
