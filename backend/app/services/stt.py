# services/stt.py — Server-side speech-to-text (Gemini audio input)
#
# Fallback for browsers whose SpeechRecognition is unavailable or blocked (Brave, Firefox, Chromium without Google keys).

import time
from typing import Protocol

from google.genai import types
from loguru import logger

from app.config import settings

# The UI language is only a hint: a visitor with the site in Spanish may well speak English (and vice versa),
# so the model must transcribe the language actually spoken and never translate.
_HINT = {"es": "Spanish", "en": "English"}
_PROMPT = (
    "Transcribe verbatim what is said in this audio. The speaker most likely speaks {hint}, but may speak "
    "Spanish or English: write the words in the language actually spoken and NEVER translate. Reply with ONLY the "
    "transcript, no quotes or comments. Never guess or invent words: if there is no clear, intelligible human speech, "
    "reply with an empty string."
)


# Peak amplitude (of 32768) below which a clip is treated as silence and never sent to the model:
# on silence/near-silence the model hallucinates words ("¡Tontos!"), and it costs quota.
MIN_PEAK = 500


def has_signal(wav: bytes) -> bool:
    """True if a 16-bit PCM WAV contains anything louder than near-silence."""
    import io
    import wave
    from array import array

    try:
        with wave.open(io.BytesIO(wav)) as w:
            if w.getsampwidth() != 2:
                return True  # unknown format: let the model decide
            samples = array("h")
            samples.frombytes(w.readframes(w.getnframes()))
    except (wave.Error, EOFError):
        return True
    if not samples:
        return False
    return max(max(samples), -min(samples)) >= MIN_PEAK


class SttError(Exception):
    """Transcription failure."""


class Transcriber(Protocol):
    async def transcribe(self, wav: bytes, language: str) -> str: ...


class GeminiStt:
    async def transcribe(self, wav: bytes, language: str) -> str:
        from app.services.rag import client  # shared google-genai client

        lang = language if language in _HINT else "es"
        if not has_signal(wav):
            logger.info(f"[STT] Skipped: audio has no signal (bytes={len(wav)})")
            return ""
        t0 = time.perf_counter()
        logger.info(f"[STT] Transcribing bytes={len(wav)} lang={lang} model={settings.model_name}")
        try:
            resp = await client.aio.models.generate_content(
                model=settings.model_name,
                contents=[types.Part.from_bytes(data=wav, mime_type="audio/wav"), _PROMPT.format(hint=_HINT[lang])],
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_budget=0),
                    max_output_tokens=300,
                ),
            )
        except Exception as e:
            logger.exception(f"[STT] Gemini transcription failed bytes={len(wav)}")
            raise SttError(str(e)) from e
        text = (resp.text or "").strip()
        logger.info(f"[STT] Done in {(time.perf_counter() - t0) * 1000:.0f}ms chars={len(text)}")
        return text


def get_stt() -> Transcriber:
    """FastAPI dependency; overridden in tests."""
    return GeminiStt()
