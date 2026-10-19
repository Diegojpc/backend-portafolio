# services/speech.py — Turn streamed LLM text into speakable sentences for TTS

import re
from typing import Iterable, Iterator

from loguru import logger

_URL_RE = re.compile(r"https?://\S+")
_MD_RE = re.compile(r"[*_`#>~|]+")
_BULLET_RE = re.compile(r"^\s*(?:[-•]|\d+[.)])\s+", re.MULTILINE)
_SENTENCE_END_RE = re.compile(r"(?<=[.!?…])\s+|\n+")

# Pieces shorter than this are merged with the next one: tiny TTS requests sound choppy and cost a round trip each.
MIN_SENTENCE_CHARS = 25


def clean_for_speech(text: str) -> str:
    """Remove markdown, bullets and URLs that sound wrong when read aloud."""
    text = _URL_RE.sub("", text)
    text = _BULLET_RE.sub("", text)
    text = _MD_RE.sub("", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def split_sentences(chunks: Iterable[str]) -> Iterator[str]:
    """Consume streamed text chunks and yield cleaned sentences as soon as they are complete."""
    buffer = ""
    pending = ""
    emitted = 0

    def ready(piece: str, force: bool = False) -> str | None:
        nonlocal pending
        piece = clean_for_speech(piece)
        if not piece:
            return None
        pending = f"{pending} {piece}".strip()
        if force or len(pending) >= MIN_SENTENCE_CHARS:
            out, pending = pending, ""
            return out
        return None

    for chunk in chunks:
        buffer += chunk
        parts = _SENTENCE_END_RE.split(buffer)
        buffer = parts.pop()  # last part may be an unfinished sentence
        for part in parts:
            sentence = ready(part)
            if sentence:
                emitted += 1
                yield sentence

    tail = ready(buffer, force=True)
    if not tail and pending:
        tail, pending = pending, ""
    if tail:
        emitted += 1
        yield tail
    logger.debug(f"[Speech] Split stream into {emitted} sentences")
