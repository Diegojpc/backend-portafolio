# main.py — FastAPI application entry point

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import settings
from app.database import engine, init_db
from app.routers.conversations import router as conversations_router
from app.routers.documents import router as documents_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Application startup and shutdown lifecycle."""
    # 1. Database
    logger.info("[Startup] Initializing database...")
    await init_db()
    logger.info("[Startup] Database ready.")

    # 2. AI Models + RAG
    try:
        from app.services.rag import load_models, ingest_documents
        logger.info("[Startup] Loading AI models (this may take a few minutes on first run)...")
        load_models()
        logger.info("[Startup] Ingesting documents...")
        ingest_documents()
        logger.info("[Startup] RAG pipeline ready.")
    except Exception as e:
        logger.error(f"[Startup] AI models failed to load: {e}")
        logger.warning("[Startup] The API will start but chat will use fallback responses.")

    yield

    logger.info("[Shutdown] Closing database connection...")
    await engine.dispose()
    logger.info("[Shutdown] Cleanup complete.")


app = FastAPI(
    title="Diego's Portfolio AI Assistant",
    description="AI chatbot backend with RAG for Diego's portfolio website.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(conversations_router)
app.include_router(documents_router)


@app.get("/", tags=["Health"])
def health_check():
    """Root endpoint — health check."""
    return {"status": "ok", "service": "Diego's Portfolio AI Backend"}


@app.get("/health", tags=["Health"])
def health_detail():
    """Detailed health check with AI status."""
    from app.services.rag import is_ready

    return {
        "status": "ok",
        "database": "sqlite",
        "ai_model": settings.model_name,
        "embedding_model": settings.embedding_model,
        "rag_ready": is_ready(),
    }
