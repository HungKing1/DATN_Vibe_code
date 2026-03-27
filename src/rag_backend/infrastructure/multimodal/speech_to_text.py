"""Speech-to-text adapter for voice input processing."""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class SpeechToTextAdapter:
    """Converts audio input to text using speech recognition.

    Default implementation uses OpenAI Whisper API.
    Can be swapped for local Whisper, Google STT, etc.
    """

    def __init__(
        self,
        api_key: str = "",
        model: str = "whisper-1",
    ) -> None:
        self._api_key = api_key
        self._model = model

    async def transcribe(self, audio_path: Path, language: str = "en") -> str:
        """Transcribe audio file to text.

        Args:
            audio_path: Path to audio file (mp3, wav, m4a, etc.).
            language: Language code for transcription.

        Returns:
            Transcribed text content.
        """
        try:
            import openai

            client = openai.AsyncOpenAI(api_key=self._api_key)

            with open(audio_path, "rb") as audio_file:
                response = await client.audio.transcriptions.create(
                    model=self._model,
                    file=audio_file,
                    language=language,
                )

            text = response.text
            logger.info(
                "Transcribed audio: %s (%d chars)",
                audio_path.name,
                len(text),
            )
            return text

        except ImportError:
            logger.error("openai package required for speech-to-text")
            raise
        except Exception as e:
            logger.error("Speech-to-text failed: %s", e)
            raise

    async def transcribe_bytes(self, audio_bytes: bytes, filename: str = "audio.wav") -> str:
        """Transcribe audio from bytes."""
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)

        try:
            return await self.transcribe(tmp_path)
        finally:
            tmp_path.unlink(missing_ok=True)
