# services/tts_fish.py — Fish Audio text-to-speech client (HTTP streaming)

from typing import AsyncIterator, Protocol

import httpx
from loguru import logger

from app.config import settings

FISH_TTS_URL = "https://api.fish.audio/v1/tts"


class TtsError(Exception):
    """TTS provider failure. `status` is the upstream HTTP status when known."""

    def __init__(self, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


class TtsProvider(Protocol):
    def synthesize_stream(self, text: str) -> AsyncIterator[bytes]: ...


# One pooled client for the whole process: a fresh TLS handshake per sentence cost ~2s on the first byte.
_shared_client: httpx.AsyncClient | None = None


def _get_shared_client() -> httpx.AsyncClient:
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0))
        logger.info("[Fish] Created shared HTTP client")
    return _shared_client


async def close_shared_client() -> None:
    """Called on app shutdown."""
    global _shared_client
    if _shared_client is not None and not _shared_client.is_closed:
        await _shared_client.aclose()
        logger.info("[Fish] Closed shared HTTP client")
    _shared_client = None


class FishTts:
    """Streams mp3 audio for one piece of text using the configured cloned voice."""

    media_type = "audio/mpeg"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        if not settings.fish_api_key:
            raise TtsError("FISH_API_KEY is not configured", status=503)
        body = {
            "text": text,
            "format": "mp3",
            "latency": "balanced",
            "normalize": True,
        }
        if settings.fish_voice_id:
            body["reference_id"] = settings.fish_voice_id
        headers = {"Authorization": f"Bearer {settings.fish_api_key}", "model": settings.fish_model}

        logger.info(f"[Fish] TTS request chars={len(text)} model={settings.fish_model} voice={'set' if settings.fish_voice_id else 'default'}")
        client = self._client or _get_shared_client()
        try:
            async with client.stream("POST", FISH_TTS_URL, json=body, headers=headers) as resp:
                if resp.status_code != 200:
                    detail = (await resp.aread()).decode("utf-8", "replace")[:200]
                    logger.error(f"[Fish] TTS failed status={resp.status_code} body={detail!r} chars={len(text)}")
                    raise TtsError(f"Fish TTS HTTP {resp.status_code}", status=resp.status_code)
                total = 0
                async for chunk in resp.aiter_bytes():
                    if chunk:
                        total += len(chunk)
                        yield chunk
                logger.info(f"[Fish] TTS done bytes={total}")
        except httpx.HTTPError as e:
            logger.error(f"[Fish] TTS transport error: {e!r} chars={len(text)}")
            raise TtsError(f"Fish TTS transport error: {e}") from e


def get_tts() -> TtsProvider:
    """FastAPI dependency; overridden in tests."""
    return FishTts()
