# services/rag.py — Direct-Context 1-Million Token Pipeline

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

def load_models() -> None:
    """Pre-flights Gemini APIs."""
    try:
        genai.get_model(f"models/{settings.model_name}")
        logger.info(f"[RAG] Successfully bound to Gemini API: {settings.model_name}")
    except Exception as e:
        logger.error(f"[RAG] Error verifying Gemini connectivity. Check API Key: {e}")

def ingest_documents() -> None:
    """Loads all static documents into raw serverless RAM bypassing Vector Stores completely."""
    try:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        doc_files = glob.glob(os.path.join(data_dir, "*.md")) + glob.glob(os.path.join(data_dir, "*.txt")) + glob.glob(os.path.join(data_dir, "*.pdf"))
        
        if not doc_files:
            logger.warning(f"[RAG] No base documents found.")
            _state["is_ready"] = True
            return

        aggregated_text = ""
        for filepath in doc_files:
            filename = os.path.basename(filepath)
            try:
                content = extract_text_from_file(filepath)
                aggregated_text += f"\n\n--- DOCUMENT START: {filename} ---\n{content}\n--- DOCUMENT END: {filename} ---"
            except Exception as e:
                logger.error(f"[RAG] Failed to parse natively {filename}: {e}")
                continue
                
        _state["global_context"] = aggregated_text
        logger.info(f"[RAG] Mega-Prompt Loaded. Absorbed {len(doc_files)} underlying documents encoding {len(aggregated_text)} bytes directly to state.")
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
        enable_automatic_function_calling=True, 
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
        yield f" Sorry, connection to external Cognitive APIs failed: {str(e)}"

def is_ready() -> bool:
    return _state["is_ready"]
