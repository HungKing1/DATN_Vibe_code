"""InputProcessorFactory — Factory Pattern for resolving input processors.

To add a new input type, simply:
1. Create a new class implementing InputProcessor
2. Register it with the factory (auto-discovered or manual)

No existing code needs modification (Open-Closed Principle).
"""

from __future__ import annotations

import logging
from pathlib import Path

from rag_backend.domain.exceptions import UnsupportedFileTypeError
from rag_backend.domain.interfaces.input_processor import InputProcessor

logger = logging.getLogger(__name__)


class InputProcessorFactory:
    """Factory that resolves the correct InputProcessor for a given file.

    Supports both explicit registration and auto-discovery.

    Usage:
        factory = InputProcessorFactory()
        factory.register(PDFProcessor())
        factory.register(TXTProcessor())

        processor = factory.get_processor(Path("doc.pdf"))
        result = await processor.process(Path("doc.pdf"))
    """

    def __init__(self) -> None:
        self._processors: dict[str, InputProcessor] = {}

    def register(self, processor: InputProcessor) -> None:
        """Register a processor for its supported extensions."""
        for ext in processor.supported_extensions():
            ext_lower = ext.lower()
            self._processors[ext_lower] = processor
            logger.info(
                "Registered processor %s for extension '%s'",
                processor.__class__.__name__,
                ext_lower,
            )

    def get_processor(self, source: Path) -> InputProcessor:
        """Get the appropriate processor for a file.

        Args:
            source: Path to the file.

        Returns:
            The matching InputProcessor.

        Raises:
            UnsupportedFileTypeError: If no processor is registered for the file type.
        """
        ext = source.suffix.lower()
        processor = self._processors.get(ext)
        if processor is None:
            raise UnsupportedFileTypeError(ext)
        return processor

    def supported_extensions(self) -> list[str]:
        """Return all registered extensions."""
        return list(self._processors.keys())

    def has_processor(self, extension: str) -> bool:
        """Check if a processor exists for the given extension."""
        return extension.lower() in self._processors
