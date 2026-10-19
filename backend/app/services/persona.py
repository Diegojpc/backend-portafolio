# services/persona.py — Single source of truth for how Diego's AI persona is instructed.
# Shared by the text chat and the voice/video call modes so all of them "know" the same things.

from typing import Literal

from loguru import logger

Mode = Literal["chat", "voice", "video"]

_BASE_PROMPT = """You are Diego's AI portfolio assistant. Your role is to help visitors learn about Diego José Peña Casadiegos — his skills, projects, experience, and professional background.

Rules:
- Answer questions about Diego based on the provided LIVE CONTEXT in a friendly and professional manner.
- If you don't know something based on the context, state it honestly. You must absolutely infer knowledge efficiently from the CV data provided.
- Keep responses concise unless requested otherwise."""

# Spoken modes: the output is read aloud, so markdown and long answers are harmful.
_SPOKEN_RULES = """

Spoken-conversation rules (your words are converted to speech):
- Begin the very first turn by saying you are Diego's AI avatar, not Diego himself (in the visitor's language).
- Answer in at most 35 words (two short sentences is ideal), even for broad questions: give the single most relevant point and offer to continue. No markdown, lists, emojis, or URLs read aloud.
- Reply in the language the visitor speaks (Spanish or English).
- Never claim to be a human or to be Diego. Speak about Diego in the third person unless the visitor asks you to roleplay as his assistant.
- If you do not know something, say so briefly and offer to talk about what the CV covers."""

_MODE_RULES: dict[str, str] = {
    "chat": "",
    "voice": _SPOKEN_RULES,
    "video": _SPOKEN_RULES,
}


def build_system_instruction(mode: Mode, context: str) -> str:
    """Compose the system instruction for a given interaction mode.

    Args:
        mode: "chat", "voice" or "video".
        context: the aggregated knowledge base (CVs + profile + visitor uploads).
    """
    if mode not in _MODE_RULES:
        logger.error(f"[Persona] Unknown mode={mode!r}")
        raise ValueError(f"Unknown persona mode: {mode}")

    instruction = _BASE_PROMPT + _MODE_RULES[mode]
    if context:
        instruction += f"\n\n=== LIVE KNOWLEDGE BASE (READ AND MEMORIZE DEEPLY) ===\n{context}"
    logger.debug(f"[Persona] Built instruction mode={mode} context_chars={len(context)} total_chars={len(instruction)}")
    return instruction
