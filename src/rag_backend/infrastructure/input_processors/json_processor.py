"""JSON input processor."""

from __future__ import annotations

import json
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


class JSONProcessor(InputProcessor):
    """Processes JSON files — extracts text from structured data."""

    def supported_extensions(self) -> list[str]:
        return [".json", ".jsonl"]

    async def process(self, source: Path, **kwargs) -> ProcessedDocument:
        """Parse JSON and flatten content to text."""
        text_field = kwargs.get("text_field", None)
        try:
            raw = source.read_text(encoding="utf-8")

            if source.suffix == ".jsonl":
                lines = [json.loads(line) for line in raw.strip().split("\n") if line.strip()]
                content = self._flatten_records(lines, text_field)
            else:
                data = json.loads(raw)
                if isinstance(data, list):
                    content = self._flatten_records(data, text_field)
                elif isinstance(data, dict):
                    content = self._flatten_dict(data, text_field)
                else:
                    content = str(data)

            metadata = DocumentMetadata(
                source=str(source),
                file_name=source.name,
                file_type=DocumentType.JSON,
                file_size_bytes=source.stat().st_size,
            )

            logger.info("Processed JSON: %s (%d chars)", source.name, len(content))

            return ProcessedDocument(
                content=content,
                metadata=metadata,
                pages=[content],
            )

        except json.JSONDecodeError as e:
            raise DocumentProcessingError(
                f"Invalid JSON in {source.name}",
                detail=str(e),
            ) from e
        except Exception as e:
            raise DocumentProcessingError(
                f"Failed to process JSON: {source.name}",
                detail=str(e),
            ) from e

    def _flatten_records(
        self, records: list[dict], text_field: str | None
    ) -> str:
        """Flatten a list of records to text."""
        parts = []
        for record in records:
            if text_field and text_field in record:
                parts.append(str(record[text_field]))
            else:
                parts.append(
                    " ".join(f"{k}: {v}" for k, v in record.items())
                )
        return "\n\n".join(parts)

    def _flatten_dict(self, data: dict, text_field: str | None) -> str:
        """Flatten a dictionary to text."""
        if text_field and text_field in data:
            return str(data[text_field])
        return " ".join(f"{k}: {v}" for k, v in data.items())
