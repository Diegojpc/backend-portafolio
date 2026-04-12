# services/rag.py — RAG pipeline: document ingestion, retrieval, and LLM generation

import os
import glob
from threading import Thread

import torch
import chromadb
from sentence_transformers import SentenceTransformer
from transformers import pipeline, TextIteratorStreamer
from loguru import logger

from app.config import settings

# Module-level state for loaded models
_state = {
    "llm_pipe": None,
    "embedder": None,
    "chroma_collection": None,
    "is_ready": False,
}

SYSTEM_PROMPT = """You are Diego's AI portfolio assistant. Your role is to help visitors learn about Diego José Peña Casadiegos — his skills, projects, experience, and professional background.

Rules:
- Answer questions about Diego based on the provided context.
- Be friendly, concise, and professional.
- If the context doesn't contain the answer, say so honestly.
- Always respond in the same language the user writes in.
- Keep responses under 200 words unless the user asks for detail."""

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage")


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    chunks = []
    lines = text.split("\n")
    current_chunk = []
    current_len = 0

    for line in lines:
        line_len = len(line)
        if current_len + line_len > chunk_size and current_chunk:
            chunks.append("\n".join(current_chunk))
            # Keep last few lines for overlap
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

    logger.info(f"[RAG] Chunked text into {len(chunks)} chunks (chunk_size={chunk_size}, overlap={overlap})")
    return chunks


def load_models() -> None:
    """Load the embedding model and LLM at startup."""
    try:
        # 1. Load embedding model (fast, ~80MB)
        logger.info(f"[RAG] Loading embedding model: {settings.embedding_model}...")
        _state["embedder"] = SentenceTransformer(settings.embedding_model, device="cpu")
        logger.info("[RAG] Embedding model loaded successfully.")

        # 2. Load LLM (slower, ~2GB first download)
        # Force CPU — GTX 1050 Ti (sm_61) is not supported by latest PyTorch CUDA
        device = torch.device("cpu")
        logger.info(f"[RAG] Loading LLM: {settings.model_name} on {device}...")
        _state["llm_pipe"] = pipeline(
            "text-generation",
            model=settings.model_name,
            dtype=torch.bfloat16,
            device=device,
        )
        logger.info("[RAG] LLM loaded successfully.")

    except Exception as e:
        logger.error(f"[RAG] Error loading models: {e}")
        logger.warning("[RAG] The API will start but chat will use a fallback response.")


def ingest_documents() -> None:
    """Load documents from data/ directory into ChromaDB vector store."""
    try:
        embedder = _state.get("embedder")
        if not embedder:
            logger.error("[RAG] Cannot ingest documents: embedding model not loaded.")
            return

        # Initialize ChromaDB (persistent, file-based)
        chroma_path = os.path.join(STORAGE_DIR, "chroma")
        os.makedirs(chroma_path, exist_ok=True)
        client = chromadb.PersistentClient(path=chroma_path)

        # Create or get collection
        collection = client.get_or_create_collection(
            name="diego_portfolio",
            metadata={"hnsw:space": "cosine"},
        )
        _state["chroma_collection"] = collection

        # Check if docs are already ingested
        if collection.count() > 0:
            logger.info(f"[RAG] Collection already has {collection.count()} documents. Skipping ingestion.")
            _state["is_ready"] = True
            return

        # Read all .md and .txt files from data/
        doc_files = glob.glob(os.path.join(DATA_DIR, "*.md")) + glob.glob(os.path.join(DATA_DIR, "*.txt"))
        if not doc_files:
            logger.warning(f"[RAG] No documents found in {DATA_DIR}")
            return

        all_chunks = []
        all_ids = []
        all_metadatas = []

        for filepath in doc_files:
            filename = os.path.basename(filepath)
            logger.info(f"[RAG] Processing document: {filename}")
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            chunks = _chunk_text(content)
            for i, chunk in enumerate(chunks):
                chunk_id = f"{filename}_{i}"
                all_chunks.append(chunk)
                all_ids.append(chunk_id)
                all_metadatas.append({"source": filename, "chunk_index": i})

        # Embed and store
        logger.info(f"[RAG] Embedding {len(all_chunks)} chunks...")
        embeddings = embedder.encode(all_chunks, show_progress_bar=True).tolist()

        collection.add(
            ids=all_ids,
            documents=all_chunks,
            embeddings=embeddings,
            metadatas=all_metadatas,
        )

        logger.info(f"[RAG] Ingested {len(all_chunks)} chunks from {len(doc_files)} documents.")
        _state["is_ready"] = True

    except Exception as e:
        logger.error(f"[RAG] Error during document ingestion: {e}")
        raise


def query_context(query: str, top_k: int = 3) -> str:
    """Retrieve relevant document chunks for a query."""
    collection = _state.get("chroma_collection")
    embedder = _state.get("embedder")

    if not collection or not embedder:
        logger.warning("[RAG] RAG not initialized. Returning empty context.")
        return ""

    try:
        query_embedding = embedder.encode([query]).tolist()
        results = collection.query(
            query_embeddings=query_embedding,
            n_results=top_k,
        )

        if results and results["documents"]:
            context = "\n\n---\n\n".join(results["documents"][0])
            logger.debug(f"[RAG] Retrieved {len(results['documents'][0])} chunks for query: '{query[:50]}...'")
            return context

    except Exception as e:
        logger.error(f"[RAG] Error querying context: {e}")

    return ""


def stream_response(prompt: str, conversation_history: list[dict] | None = None):
    """
    Generate a streaming response using RAG context + conversation history.
    Returns an iterator that yields text chunks.
    """
    llm_pipe = _state.get("llm_pipe")

    if not llm_pipe:
        logger.warning("[RAG] LLM not loaded. Using fallback response.")
        yield "I'm sorry, the AI model is not currently loaded. Please try again later."
        return

    # 1. Retrieve relevant context
    context = query_context(prompt)

    # 2. Build messages with context + history
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if context:
        messages.append({
            "role": "system",
            "content": f"Here is relevant information about Diego:\n\n{context}",
        })

    # Add conversation history for memory
    if conversation_history:
        messages.extend(conversation_history[-10:])  # Last 5 exchanges

    messages.append({"role": "user", "content": prompt})

    # 3. Format prompt for TinyLlama
    formatted_prompt = llm_pipe.tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    from transformers import GenerationConfig

    # 4. Stream with TextIteratorStreamer
    streamer = TextIteratorStreamer(
        llm_pipe.tokenizer,
        skip_prompt=True,
        skip_special_tokens=True,
    )

    # Use GenerationConfig to avoid deprecation warnings
    gen_config = GenerationConfig(
        max_new_tokens=256,
        do_sample=True,
        temperature=0.7,
        top_k=50,
        top_p=0.95,
        eos_token_id=llm_pipe.tokenizer.eos_token_id,
        pad_token_id=llm_pipe.tokenizer.pad_token_id,
    )

    generation_kwargs = {
        "text_inputs": formatted_prompt,
        "streamer": streamer,
        "generation_config": gen_config,
    }

    # 5. Run generation in a separate thread (non-blocking)
    thread = Thread(target=llm_pipe, kwargs=generation_kwargs)
    thread.start()

    logger.info(f"[RAG] Streaming response for prompt: '{prompt[:50]}...'")

    # 6. Yield tokens as they're generated
    for new_text in streamer:
        yield new_text

    thread.join(timeout=60)


def is_ready() -> bool:
    """Check if the RAG pipeline is fully initialized."""
    return _state["is_ready"]
