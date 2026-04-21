"""InputProcessor interface — Adapter Pattern for input types."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from rag_backend.domain.models.document import ProcessedDocument


class InputProcessor(ABC):
    """Abstract base class for all input processors.

    Each input type (PDF, TXT, JSON, HTML, Image, etc.) implements
    this interface. New input types can be added without modifying
    existing code (Open-Closed Principle).

    Example — adding an HTML processor:
        class HTMLProcessor(InputProcessor):
            def supported_extensions(self) -> list[str]:
                return [".html", ".htm"]

            async def process(self, source: Path, **kwargs) -> ProcessedDocument:
                # HTML processing logic here
                ...
    """

    @abstractmethod
    def supported_extensions(self) -> list[str]:
        """Return list of file extensions this processor handles (e.g., ['.pdf'])."""
        ...

    @abstractmethod
    async def process(self, source: Path, **kwargs) -> ProcessedDocument:
        """Process a file and return a ProcessedDocument.

        Args:
            source: Path to the input file.
            **kwargs: Additional processor-specific options.

        Returns:
            ProcessedDocument with extracted text content and metadata.

        Raises:
            DocumentProcessingError: If processing fails.
        """
        ...

    def can_process(self, source: Path) -> bool:
        """Check if this processor can handle the given file."""
        return source.suffix.lower() in self.supported_extensions()
