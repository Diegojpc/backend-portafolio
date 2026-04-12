# services/rag.py — Agentic RAG pipeline & Tool Processing with Gemini API

import os
import glob
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
import google.generativeai as genai
from google.generativeai.types import content_types
from loguru import logger

from app.config import settings
from app.services.tools import fetch_url

# Configure Google Generative AI
genai.configure(api_key=settings.gemini_api_key)

_state = {
    "chroma_collection": None,
    "is_ready": False,
}

SYSTEM_PROMPT = """You are Diego's AI portfolio assistant. Your role is to help visitors learn about Diego José Peña Casadiegos — his skills, projects, experience, and professional background.

Rules:
- Answer questions about Diego based on the provided context in a friendly and professional manner.
- If you don't know something based on the context, state it honestly.
- Keep responses concise unless requested otherwise.
- You have access to a web scraping tool (`fetch_url`). If the user provides a URL or asks you to read a specific website, use the tool to ingest its contents and reason over it."""

class GeminiEmbeddingFunction(EmbeddingFunction):
    """Custom ChromaDB Embedding Function that routes text through Gemini's API."""
    def __call__(self, input: Documents) -> Embeddings:
        response = genai.embed_content(
            model=settings.embedding_model,
            content=input,
            task_type="retrieval_document"
        )
        # Handle both single document return dict and multiple return lists natively
        return response['embedding'] if isinstance(input, list) else [response['embedding']]

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
    """Pre-flights Gemini and validates configuration."""
    try:
        # Validate API context by getting model information.
        genai.get_model(f"models/{settings.model_name}")
        logger.info(f"[RAG] Successfully bound to Gemini via external API: {settings.model_name}")
    except Exception as e:
        logger.error(f"[RAG] Error verifying Gemini connectivity. Check API Key: {e}")

def ingest_documents() -> None:
    """Load standard documents into persistent ChromaDB relying on Gemini Embeddings."""
    try:
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage")
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        
        chroma_path = os.path.join(storage_dir, "chroma")
        os.makedirs(chroma_path, exist_ok=True)
        
        client = chromadb.PersistentClient(path=chroma_path)
        gemini_embeddings = GeminiEmbeddingFunction()

        collection = client.get_or_create_collection(
            name="diego_portfolio",
            metadata={"hnsw:space": "cosine"},
            embedding_function=gemini_embeddings
        )
        _state["chroma_collection"] = collection

        if collection.count() > 0:
            logger.info(f"[RAG] Collection already has {collection.count()} documents. Skipping static ingestion.")
            _state["is_ready"] = True
            return

        doc_files = glob.glob(os.path.join(data_dir, "*.md")) + glob.glob(os.path.join(data_dir, "*.txt"))
        if not doc_files:
            logger.warning(f"[RAG] No base documents found in {data_dir}")
            _state["is_ready"] = True 
            return

        all_chunks = []
        all_ids = []
        all_metadatas = []

        for filepath in doc_files:
            filename = os.path.basename(filepath)
            logger.info(f"[RAG] Parsing base document: {filename}")
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            chunks = chunk_text(content)
            for i, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_ids.append(f"{filename}_{i}")
                all_metadatas.append({"source": filename, "chunk": str(i)})

        logger.info(f"[RAG] Hitting Gemini API to encode {len(all_chunks)} static chunks...")
        collection.add(
            ids=all_ids,
            documents=all_chunks,
            metadatas=all_metadatas,
        )
        
        logger.info("[RAG] Initial Static Ingestion Complete via Gemini API.")
        _state["is_ready"] = True

    except Exception as e:
        logger.error(f"[RAG] Error during API document ingestion: {e}")
        raise

def inject_dynamic_document_chunk(filename: str, content: str) -> int:
    """Dynamic injector executed upon Document API parsing."""
    try:
        collection = _state.get("chroma_collection")
        if not collection:
            raise Exception("ChromaDB state uninitialized")
            
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
            
        collection.add(
            ids=all_ids,
            documents=all_chunks,
            metadatas=all_meta
        )
        logger.info(f"[RAG] Successfully injected {len(all_chunks)} dynamic chunks of File {filename}")
        return len(all_chunks)
    except Exception as e:
        logger.error(f"[RAG] Injection error for document {filename}: {e}")
        raise e

def query_context(query: str, top_k: int = 3) -> str:
    """Retrieve relevant document chunks mapped contextually by Gemini."""
    collection = _state.get("chroma_collection")
    if not collection: return ""
    try:
        # Chroma internally invokes the `gemini_embeddings` function we specified upon creation
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
        )
        if results and results["documents"]:
            return "\n\n---\n\n".join(results["documents"][0])
    except Exception as e:
        logger.error(f"[RAG] Context Retrieval Failure: {e}")
    return ""

def _format_history_to_gemini(conversation_history: list[dict] | None) -> list:
    """Formats standard DB schemas [{role: 'user', content: '...'}] into Gemini acceptable iterables."""
    gemini_history = []
    if not conversation_history: return gemini_history
    
    for interaction in conversation_history:
        gemini_history.append({"role": "user" if interaction["role"] == "user" else "model", "parts": [interaction["content"]]})
    return gemini_history

def stream_response(prompt: str, conversation_history: list[dict] | None = None):
    """
    Main Agentic Loop execution wrapper. 
    Constructs an interactive ChatSession allowing tools to be queried natively over server-sent-events.
    """
    if not _state["is_ready"]:
        yield "System not bound. Awaiting APIs."
        return

    # Generate isolated system context
    context = query_context(prompt)
    system_instruction = SYSTEM_PROMPT
    if context:
        system_instruction += f"\n\nCURRENT RETRIEVED CONTEXT ABOUT DIEGO:\n{context}"

    # Build Gemini session
    model = genai.GenerativeModel(
        model_name=settings.model_name,
        system_instruction=system_instruction,
        tools=[fetch_url] 
    )

    formatted_history = _format_history_to_gemini(conversation_history[-10:] if conversation_history else None)
    chat_session = model.start_chat(history=formatted_history)

    logger.info(f"[RAG] Pushing prompt inference sequence to Gemini API...")
    
    try:
        # Stream response iteratively
        response = chat_session.send_message(prompt, stream=True)
        
        # Tools execution (Function Calling) is automatically managed by Gemini SDK Python v0.8+. 
        # If the Model wants to call a tool, it suspends block and triggers local function `fetch_url`
        for chunk in response:
            if chunk.text:
                 yield chunk.text

    except Exception as e:
        logger.error(f"[RAG] Execution iteration blocked: {e}")
        yield f" Sorry, my connection to the cognitive engine failed: {str(e)}"

def is_ready() -> bool:
    return _state["is_ready"]
