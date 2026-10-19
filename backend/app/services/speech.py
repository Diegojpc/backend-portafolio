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


_EN_WORDS = frozenset("""the and is are was were of to in with for that this these those he his she her has have had on as at by from an
i you your my me we our it its they them their can could will would should do does did not no yes what how why when where who which
about also but or if so than then there here very more most some any all just only into over after before between through like
experience skills works worked engineer developer data science software studied degree university""".split())
_ES_WORDS = frozenset("""el la los las de del y es son fue fueron en con para por que este esta estos estas su sus se lo le les un una unos unas
como más pero o si no sí qué cómo por qué cuándo dónde quién cuál sobre también muy todo todos tiene tienen ha han había hay ser estar
trabajo trabajó experiencia habilidades ingeniero desarrollador datos ciencia estudió título universidad""".split())
_WORD_RE = re.compile(r"[a-záéíóúñü]+")


def detect_language(text: str) -> str | None:
    """Cheap ES/EN detector for TTS hints. Returns "en", "es" or None when unsure (Fish then auto-detects).

    Stopword counting is enough here: the sentences are our own short model replies in one of two languages.
    """
    words = _WORD_RE.findall(text.lower())
    en = sum(w in _EN_WORDS for w in words)
    es = sum(w in _ES_WORDS for w in words)
    if en == es or max(en, es) < 2:
        return None
    return "en" if en > es else "es"
