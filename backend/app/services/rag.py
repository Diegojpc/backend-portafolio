# services/rag.py — Bi-Modal Agentic RAG pipeline (Gemini API & Local PyTorch Fallback)

import os
import glob
import threading
import threading
import chromadb
from chromadb.utils import embedding_functions
import google.generativeai as genai
from loguru import logger

from app.config import settings
from app.services.tools import fetch_url

# Configure Google Generative AI
genai.configure(api_key=settings.gemini_api_key)

_state = {
    "chroma_collection": None,
    "is_ready": False,
    "local_llm_pipe": None
}

SYSTEM_PROMPT = """You are Diego's AI portfolio assistant. Your role is to help visitors learn about Diego José Peña Casadiegos — his skills, projects, experience, and professional background.

Rules:
- Answer questions about Diego based on the provided context in a friendly and professional manner.
- If you don't know something based on the context, state it honestly.
- Keep responses concise unless requested otherwise."""

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    chunks = []
    lines = text.split("\n")
    current_chunk = []
    current_len = 0

    for line in lines:
        line_len = len(line)
        if current_len + line_len > chunk_size and current_chunk:
            chunks.append("\n".join(current_chunk))
            
            overlap_lines = []
            overlap_len = 0
            for prev_line in reversed(current_chunk):
                if overlap_len + len(prev_line) > overlap:
                    break
                overlap_lines.insert(0, prev_line)
                overlap_len += len(prev_line)
                
            current_chunk = overlap_lines
            current_len = overlap_len
            
        current_chunk.append(line)
        current_len += line_len

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks

def load_models() -> None:
    """Pre-flights Gemini APIs."""
    # 1. Cloud
    try:
        genai.get_model(f"models/{settings.model_name}")
        logger.info(f"[RAG] Successfully bound to Gemini API: {settings.model_name}")
    except Exception as e:
        logger.error(f"[RAG] Error verifying Gemini connectivity. Check API Key: {e}")

def get_base_embedding_fn():
    """Universal persistent Cloud Embedder."""
    return embedding_functions.GoogleGenerativeAiEmbeddingFunction(
        api_key=settings.gemini_api_key
    )

def ingest_documents() -> None:
    """Load standard documents establishing context over local Universal Embeddings."""
    try:
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage")
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        
        chroma_path = os.path.join(storage_dir, "chroma")
        os.makedirs(chroma_path, exist_ok=True)
        
        client = chromadb.PersistentClient(path=chroma_path)

        collection = client.get_or_create_collection(
            name="diego_portfolio_hybrid", # Renamed internally to bypass dimension mismatch if previously launched
            metadata={"hnsw:space": "cosine"},
            embedding_function=get_base_embedding_fn()
        )
        _state["chroma_collection"] = collection

        if collection.count() > 0:
            logger.info(f"[RAG] Universal Collection already has {collection.count()} static documents.")
            _state["is_ready"] = True
            return

        doc_files = glob.glob(os.path.join(data_dir, "*.md")) + glob.glob(os.path.join(data_dir, "*.txt"))
        if not doc_files:
            logger.warning(f"[RAG] No base documents found.")
            _state["is_ready"] = True 
            return

        all_chunks = []
        all_ids = []
        all_metadatas = []

        for filepath in doc_files:
            filename = os.path.basename(filepath)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            chunks = chunk_text(content)
            for i, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_ids.append(f"{filename}_{i}")
                all_metadatas.append({"source": filename, "chunk": str(i)})

        logger.info(f"[RAG] Encoding {len(all_chunks)} chunks via Universal Local Embeddings...")
        collection.add(ids=all_ids, documents=all_chunks, metadatas=all_metadatas)
        
        logger.info("[RAG] Static Ingestion Complete.")
        _state["is_ready"] = True

    except Exception as e:
        logger.error(f"[RAG] Error during baseline generic ingestion: {e}")
        raise

def inject_dynamic_document_chunk(filename: str, content: str) -> int:
    """Injects uploaded documents into the live persistent space."""
    collection = _state.get("chroma_collection")
    chunks = chunk_text(content)
    all_chunks = []
    all_ids = []
    all_meta = []
    import uuid
    upload_idx = str(uuid.uuid4())[:8]
    
    for i, chunk in enumerate(chunks):
        all_chunks.append(chunk)
        all_ids.append(f"{filename}_{upload_idx}_{i}")
        all_meta.append({"source": filename, "upload_hash": upload_idx})
        
    collection.add(ids=all_ids, documents=all_chunks, metadatas=all_meta)
    return len(all_chunks)

def query_context(query: str, top_k: int = 8) -> str:
    collection = _state.get("chroma_collection")
    if not collection: return ""
    try:
        results = collection.query(query_texts=[query], n_results=top_k)
        if results and results["documents"]:
            extracted_context = "\n\n---\n\n".join(results["documents"][0])
            logger.info(f"[RAG] Context Engine Retrieved {len(results['documents'][0])} matched chunks for query.")
            return extracted_context
    except Exception as e:
        logger.error(f"[RAG] Context Retrieval Failure: {e}")
    return ""

def _format_history_to_gemini(conversation_history: list[dict] | None) -> list:
    gemini_history = []
    if not conversation_history: return gemini_history
    for interaction in conversation_history:
        gemini_history.append({"role": "user" if interaction["role"] == "user" else "model", "parts": [interaction["content"]]})
    return gemini_history
    
def _format_history_to_local(conversation_history: list[dict] | None) -> list:
    local_history = []
    if not conversation_history: return local_history
    for interaction in conversation_history:
         local_history.append({"role": "user" if interaction["role"] == "user" else "assistant", "content": interaction["content"]})
    return local_history

def stream_response(prompt: str, conversation_history: list[dict] | None = None, use_local_model: bool = False):
    """Dual-execution path routing based on user toggle."""
    if not _state["is_ready"]:
        yield "System configuring context architectures. Awaiting readies."
        return

    context = query_context(prompt)
    
    # ---------------- LOCAL PIPELINE PATH ---------------- #
    if use_local_model:
        logger.warning(f"[RAG] Intercepted locked Local CPU call.")
        yield "Local Engine offline. PyTorch modules were stripped from this Free-Tier Production deployment to optimize memory. Please toggle switch to 'Cloud' mode to resume."
        return

    # ---------------- CLOUD / AGENTIC PIPELINE PATH ---------------- #
    logger.info(f"[RAG] Routing prompt to CLOUD Google Gemini API: {prompt[:30]}...")
    system_instruction = SYSTEM_PROMPT + "\n- You have a WebScraper capability." + (f"\n\nCURRENT CONTEXT:\n{context}" if context else "")
    
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
                # Gemini outputs massive blocks instantly. We fragment them mathematically
                # to sustain a typing visual effect on the Chat SSE receiver client.
                words = chunk.text.split(" ")
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
    except Exception as e:
        yield f" Sorry, connection to external Cognitive APIs failed: {str(e)}"

def is_ready() -> bool:
    return _state["is_ready"]
