# services/rag.py — Direct-Context 1-Million Token Pipeline

import io
import os
import glob
import PyPDF2
import google.generativeai as genai
from loguru import logger

from app.config import settings
from app.services.tools import fetch_url

# Configure Google Generative AI
genai.configure(api_key=settings.gemini_api_key)

_state = {
    "is_ready": False,
    "global_context": ""
}

SYSTEM_PROMPT = """You are Diego's AI portfolio assistant. Your role is to help visitors learn about Diego José Peña Casadiegos — his skills, projects, experience, and professional background.

Rules:
- Answer questions about Diego based on the provided LIVE CONTEXT in a friendly and professional manner.
- If you don't know something based on the context, state it honestly. You must absolutely infer knowledge efficiently from the CV data provided.
- Keep responses concise unless requested otherwise."""

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
        genai.get_model(f"models/{settings.model_name}")
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

def _format_history_to_gemini(conversation_history: list[dict] | None) -> list:
    gemini_history = []
    if not conversation_history: return gemini_history
    for interaction in conversation_history:
        gemini_history.append({"role": "user" if interaction["role"] == "user" else "model", "parts": [interaction["content"]]})
    return gemini_history
    
def stream_response(prompt: str, conversation_history: list[dict] | None = None, use_local_model: bool = False):
    """Execution bounds dynamically injected against Deep Context Limits."""
    if not _state["is_ready"]:
        yield "System configuring context architectures. Awaiting readies."
        return
    
    if use_local_model:
        logger.warning(f"[RAG] Intercepted locked Local CPU call.")
        yield "Local Engine offline. PyTorch modules were stripped from this Free-Tier Production deployment to optimize memory. Please toggle switch to 'Cloud' mode to resume."
        return

    logger.info(f"[RAG] Streaming prompt natively to Cloud via 1-Million-Token pipeline...")
    context = _state["global_context"]
    
    # Absolute Direct Memory Injection
    system_instruction = SYSTEM_PROMPT + "\n- You have a WebScraper capability to explore URIs requested." + (f"\n\n=== LIVE KNOWLEDGE BASE (READ AND MEMORIZE DEEPLY) ===\n{context}" if context else "")
    
    model = genai.GenerativeModel(
        model_name=settings.model_name,
        system_instruction=system_instruction,
        tools=[fetch_url] 
    )

    formatted_history = _format_history_to_gemini(conversation_history[-10:] if conversation_history else None)
    chat_session = model.start_chat(
        history=formatted_history
    )

    try:
        response = chat_session.send_message(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                words = chunk.text.split(" ")
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower() or "RESOURCE_EXHAUSTED" in error_str:
            logger.warning("[RAG] Gemini API quota exceeded.")
            yield "Lo siento, el asistente ha alcanzado el límite de solicitudes gratuitas por hoy. Por favor, vuelve a intentarlo mañana. 🙏"
        else:
            logger.error(f"[RAG] Gemini stream error: {e}")
            yield "Lo siento, ocurrió un error al conectarme con el servidor de IA. Por favor, intenta de nuevo en unos momentos."

def is_ready() -> bool:
    return _state["is_ready"]
