# routers/realtime.py — Voice call turns: visitor text in, cloned-voice audio out

import asyncio
import hashlib
import time
from datetime import datetime, timezone
from typing import Annotated, AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from loguru import logger
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, select
from starlette.concurrency import iterate_in_threadpool

from app.config import settings
from app.database import DBSessionDep, async_session
from app.entities import Conversation, VoiceTurn
from app.schemas import VoiceTurnRequest
from app.services.conversations import ConversationService
from app.services.speech import split_sentences
from app.services.tts_fish import TtsError, TtsProvider, get_tts

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/realtime", tags=["Realtime"])


def _ip_hash(request: Request) -> str:
    """Stable, non-reversible visitor key (the raw IP is never stored)."""
    ip = get_remote_address(request)
    return hashlib.sha256(f"{settings.app_secret}:{ip}".encode()).hexdigest()[:16]


def _utc_midnight() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def _check_budget(session, conversation_id: int) -> None:
    """Raise 429 when the per-call turn cap or the global daily TTS budget is exhausted."""
    turns = (await session.execute(
        select(func.count(VoiceTurn.id)).where(VoiceTurn.conversation_id == conversation_id)
    )).scalar_one()
    if turns >= settings.realtime_max_turns:
        logger.warning(f"[Realtime] Turn cap reached conversation_id={conversation_id} turns={turns}")
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="call_limit_reached")

    used = (await session.execute(
        select(func.coalesce(func.sum(VoiceTurn.tts_chars), 0)).where(VoiceTurn.created_at >= _utc_midnight())
    )).scalar_one()
    if used >= settings.realtime_daily_chars:
        logger.warning(f"[Realtime] Daily TTS budget exhausted used={used} cap={settings.realtime_daily_chars}")
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="daily_limit_reached")


@router.post("/voice/turn", summary="Speak one turn and stream the avatar's audio reply")
@limiter.limit("12/minute")
async def voice_turn(
    request: Request,
    payload: VoiceTurnRequest,
    session: DBSessionDep,
    tts: Annotated[TtsProvider, Depends(get_tts)],
):
    from app.services.rag import stream_response, is_ready

    if not settings.realtime_enabled:
        logger.info("[Realtime] Rejected: REALTIME_ENABLED is false")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="voice_disabled")

    text = payload.text.strip()
    if not text or len(text) > settings.realtime_max_input_chars:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_input_length")
    if not is_ready():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="assistant_not_ready")

    conversation = await session.get(Conversation, payload.conversation_id)
    if not conversation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    await _check_budget(session, conversation.id)
    history = await ConversationService(session).get_conversation_history(conversation.id, limit=10)
    ip_hash = _ip_hash(request)
    logger.info(f"[Realtime] Turn conversation_id={conversation.id} chars={len(text)} history={len(history)} ip={ip_hash}")

    queue: asyncio.Queue = asyncio.Queue()

    async def produce() -> None:
        try:
            async for sentence in iterate_in_threadpool(
                split_sentences(stream_response(text, history, mode="voice"))
            ):
                await queue.put(sentence)
        except Exception as e:  # surfaced to the consumer so the turn fails loudly
            logger.exception(f"[Realtime] LLM producer failed conversation_id={conversation.id}")
            await queue.put(e)
        finally:
            await queue.put(None)

    t_start = time.perf_counter()
    producer = asyncio.create_task(produce())
    spoken: list[str] = []
    tts_chars = 0

    async def audio_chunks() -> AsyncIterator[bytes]:
        nonlocal tts_chars
        first_sentence = True
        first_audio = True
        while True:
            item = await queue.get()
            if item is None:
                return
            if isinstance(item, Exception):
                raise item
            room = settings.realtime_max_tts_chars - tts_chars
            if room <= 0:
                logger.warning(f"[Realtime] Per-turn TTS cap hit ({settings.realtime_max_tts_chars}); dropping the rest")
                return
            sentence = item[:room]
            if first_sentence:
                first_sentence = False
                logger.info(f"[Realtime] First sentence from LLM after {(time.perf_counter() - t_start) * 1000:.0f}ms ({len(sentence)} chars)")
            async for chunk in tts.synthesize_stream(sentence):
                if first_audio:
                    first_audio = False
                    logger.info(f"[Realtime] First audio byte after {(time.perf_counter() - t_start) * 1000:.0f}ms")
                yield chunk
            spoken.append(sentence)
            tts_chars += len(sentence)

    chunks = audio_chunks()
    try:
        first = await chunks.__anext__()
    except StopAsyncIteration:
        producer.cancel()
        logger.error(f"[Realtime] No audio produced conversation_id={conversation.id}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="no_audio")
    except TtsError as e:
        producer.cancel()
        code = status.HTTP_503_SERVICE_UNAVAILABLE if e.status in (None, 402, 503) else status.HTTP_502_BAD_GATEWAY
        logger.error(f"[Realtime] TTS unavailable before first byte: {e} (upstream={e.status})")
        raise HTTPException(code, detail="voice_provider_unavailable")
    except Exception:
        producer.cancel()
        logger.exception(f"[Realtime] Turn failed before first audio byte conversation_id={conversation.id}")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="turn_failed")

    async def body() -> AsyncIterator[bytes]:
        try:
            yield first
            async for chunk in chunks:
                yield chunk
        except Exception:
            logger.exception(f"[Realtime] Stream aborted mid-turn conversation_id={conversation.id}")
        finally:
            producer.cancel()
            # Own session: the request-scoped one may already be closed when the stream ends.
            try:
                async with async_session() as s:
                    reply = " ".join(spoken)
                    if reply:
                        await ConversationService(s).save_interaction(conversation.id, text, reply)
                    s.add(VoiceTurn(conversation_id=conversation.id, ip_hash=ip_hash, input_chars=len(text), tts_chars=tts_chars))
                    await s.commit()
                logger.info(f"[Realtime] Turn saved conversation_id={conversation.id} tts_chars={tts_chars}")
            except Exception:
                logger.exception(f"[Realtime] Failed to persist turn conversation_id={conversation.id}")

    return StreamingResponse(body(), media_type=getattr(tts, "media_type", "audio/mpeg"))
