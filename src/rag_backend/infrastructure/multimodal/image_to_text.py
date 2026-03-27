"""Image-to-text adapter for image/OCR input processing."""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class ImageToTextAdapter:
    """Converts image input to text using OCR or vision models.

    Default implementation uses OpenAI Vision API.
    Can be swapped for Tesseract OCR, Google Vision, etc.
    """

    def __init__(
        self,
        api_key: str = "",
        model: str = "gpt-4o",
        use_ocr: bool = False,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._use_ocr = use_ocr

    async def extract_text(self, image_path: Path, prompt: str = "") -> str:
        """Extract text from an image.

        Args:
            image_path: Path to the image file.
            prompt: Optional prompt to guide text extraction.

        Returns:
            Extracted text content.
        """
        if self._use_ocr:
            return await self._extract_with_ocr(image_path)
        return await self._extract_with_vision(image_path, prompt)

    async def _extract_with_vision(self, image_path: Path, prompt: str = "") -> str:
        """Extract text using OpenAI Vision API."""
        try:
            import base64

            import openai

            client = openai.AsyncOpenAI(api_key=self._api_key)

            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")

            suffix = image_path.suffix.lower()
            media_type = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".gif": "image/gif",
                ".webp": "image/webp",
            }.get(suffix, "image/png")

            extraction_prompt = prompt or "Extract all text content from this image. Return the raw text only."

            response = await client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": extraction_prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{media_type};base64,{image_data}",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=4096,
            )

            text = response.choices[0].message.content or ""
            logger.info(
                "Extracted text from image (vision): %s (%d chars)",
                image_path.name,
                len(text),
            )
            return text

        except ImportError:
            logger.error("openai package required for vision-based text extraction")
            raise
        except Exception as e:
            logger.error("Vision text extraction failed: %s", e)
            raise

    async def _extract_with_ocr(self, image_path: Path) -> str:
        """Extract text using Tesseract OCR."""
        try:
            import pytesseract
            from PIL import Image

            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)

            logger.info(
                "Extracted text from image (OCR): %s (%d chars)",
                image_path.name,
                len(text),
            )
            return text

        except ImportError:
            logger.error("pytesseract and Pillow packages required for OCR")
            raise
        except Exception as e:
            logger.error("OCR text extraction failed: %s", e)
            raise
