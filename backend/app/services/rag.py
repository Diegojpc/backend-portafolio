# services/rag.py — Direct-Context 1-Million Token Pipeline

import io
import os
import glob
import PyPDF2
from google import genai
from google.genai import types
from loguru import logger

from app.config import settings
from app.services.persona import build_system_instruction

# Single client for all Gemini calls (google-genai SDK)
client = genai.Client(api_key=settings.gemini_api_key)

_state = {
    "is_ready": False,
    "global_context": ""
}

def extract_text_from_file(filepath: str) -> str:
    if filepath.lower().endswith('.pdf'):
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            return "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
    else:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()


def _extract_text_from_bytes(filename: str, data: bytes) -> str:
    """Extract text from in-memory bytes (used for S3-loaded files)."""
    if filename.lower().endswith('.pdf'):
        reader = PyPDF2.PdfReader(io.BytesIO(data))
        return "\n".join([p.extract_text() for p in reader.pages if p.extract_text()])
    return data.decode("utf-8", errors="replace")


def _load_from_s3(bucket: str) -> str:
    """Download and aggregate all RAG documents from an S3 bucket."""
    import boto3
    from botocore.exceptions import ClientError

    s3 = boto3.client("s3")
    aggregated = ""
    try:
        objects = s3.list_objects_v2(Bucket=bucket).get("Contents", [])
        doc_keys = [o["Key"] for o in objects if o["Key"].endswith((".pdf", ".md", ".txt"))]
        logger.info(f"[RAG] Found {len(doc_keys)} documents in s3://{bucket}/")
        for key in doc_keys:
            try:
                obj = s3.get_object(Bucket=bucket, Key=key)
                content = _extract_text_from_bytes(key, obj["Body"].read())
                aggregated += f"\n\n--- DOCUMENT START: {key} ---\n{content}\n--- DOCUMENT END: {key} ---"
                logger.debug(f"[RAG] Loaded s3://{bucket}/{key} ({len(content)} chars)")
            except ClientError as e:
                logger.error(f"[RAG] Failed to load s3://{bucket}/{key}: {e}")
    except ClientError as e:
        logger.error(f"[RAG] Cannot list s3://{bucket}: {e}")
    return aggregated


def load_models() -> None:
    """Pre-flights Gemini APIs."""
    try:
        client.models.get(model=settings.model_name)
        logger.info(f"[RAG] Successfully bound to Gemini API: {settings.model_name}")
    except Exception as e:
        logger.error(f"[RAG] Error verifying Gemini connectivity. Check API Key: {e}")

def ingest_documents() -> None:
    """Loads all RAG documents — from S3 if S3_BUCKET is set, otherwise from local data/ dir."""
    try:
        s3_bucket = os.environ.get("S3_BUCKET", "")
        if s3_bucket:
            logger.info(f"[RAG] S3_BUCKET={s3_bucket} — loading documents from S3")
            aggregated_text = _load_from_s3(s3_bucket)
        else:
            logger.info("[RAG] No S3_BUCKET set — loading documents from local data/ directory")
            data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
            doc_files = (
                glob.glob(os.path.join(data_dir, "*.md"))
                + glob.glob(os.path.join(data_dir, "*.txt"))
                + glob.glob(os.path.join(data_dir, "*.pdf"))
            )
            if not doc_files:
                logger.warning("[RAG] No base documents found in data/ — starting with empty context.")
                _state["is_ready"] = True
                return
            aggregated_text = ""
            for filepath in doc_files:
                filename = os.path.basename(filepath)
                try:
                    content = extract_text_from_file(filepath)
                    aggregated_text += f"\n\n--- DOCUMENT START: {filename} ---\n{content}\n--- DOCUMENT END: {filename} ---"
                except Exception as e:
                    logger.error(f"[RAG] Failed to parse {filename}: {e}")

        _state["global_context"] = aggregated_text
        logger.info(f"[RAG] Mega-Prompt ready — {len(aggregated_text):,} bytes of context loaded.")
        _state["is_ready"] = True

    except Exception as e:
        logger.error(f"[RAG] Error assembling Mega-Prompt: {e}")
        raise

def inject_dynamic_document_chunk(filename: str, content: str) -> int:
    """Appends live visitor uploads into the conversational prompt natively."""
    _state["global_context"] += f"\n\n--- VISITOR DYNAMIC UPLOAD: {filename} ---\n{content}"
    return 1

def query_context(query: str, top_k: int = 8) -> str:
    """Deprecated vector approach. Now blindly returns the entire global context to harness 1M tokens."""
    return _state["global_context"]

def _format_history_to_gemini(conversation_history: list[dict] | None) -> list[types.Content]:
    """Convert stored messages into google-genai Content objects."""
    if not conversation_history:
        return []
    return [
        types.Content(
            role="user" if interaction["role"] == "user" else "model",
            parts=[types.Part(text=interaction["content"])],
        )
        for interaction in conversation_history
    ]


def stream_response(prompt: str, conversation_history: list[dict] | None = None, use_local_model: bool = False, mode: str = "chat"):
    """Stream a Gemini answer using the full knowledge base as system instruction."""
    if not _state["is_ready"]:
        logger.warning("[RAG] stream_response called before the knowledge base was ready.")
        yield "System configuring context architectures. Awaiting readies."
        return

    if use_local_model:
        logger.warning("[RAG] Intercepted locked Local CPU call.")
        yield "Local Engine offline. PyTorch modules were stripped from this Free-Tier Production deployment to optimize memory. Please toggle switch to 'Cloud' mode to resume."
        return

    logger.info(f"[RAG] Streaming prompt to Gemini model={settings.model_name} mode={mode} history={len(conversation_history or [])}")

    config = types.GenerateContentConfig(
        system_instruction=build_system_instruction(mode, _state["global_context"]),
        # Spoken answers are short; cap output so a verbose model cannot burn TTS budget.
        # gemini-3.8-flash spends output tokens on hidden "thinking": without disabling it, a 300-token cap
        # left ~8 tokens for the actual answer. Spoken turns also need the lowest latency.
        max_output_tokens=300 if mode in ("voice", "video") else None,
        thinking_config=types.ThinkingConfig(thinking_budget=0) if mode in ("voice", "video") else None,
        # No tools on purpose: fetch_url would let visitors make the server request arbitrary URLs (SSRF).
    )
    chat_session = client.chats.create(
        model=settings.model_name,
        config=config,
        history=_format_history_to_gemini(conversation_history[-10:] if conversation_history else None),
    )

    try:
        for chunk in chat_session.send_message_stream(prompt):
            if chunk.text:
                words = chunk.text.split(" ")
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
        logger.info("[RAG] Stream completed.")
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower() or "RESOURCE_EXHAUSTED" in error_str:
            logger.warning(f"[RAG] Gemini API quota exceeded: {error_str[:200]}")
            yield "Lo siento, el asistente ha alcanzado el límite de solicitudes gratuitas por hoy. Por favor, vuelve a intentarlo mañana. 🙏"
        else:
            logger.exception(f"[RAG] Gemini stream error (model={settings.model_name}, prompt_chars={len(prompt)})")
            yield "Lo siento, ocurrió un error al conectarme con el servidor de IA. Por favor, intenta de nuevo en unos momentos."


def is_ready() -> bool:
    return _state["is_ready"]
