# Diego's 3D Portfolio + AI Chatbot

Interactive 3D portfolio website with an AI-powered chatbot assistant built with RAG (Retrieval Augmented Generation).

## Architecture

```
├── frontend/    # React + Three.js + Vite (3D portfolio)
└── backend/     # FastAPI + TinyLlama + ChromaDB (AI chatbot)
```

## Tech Stack

### Frontend
- React 18, Three.js (react-three-fiber), Vite, Tailwind CSS
- GSAP, Framer Motion, Simplex Noise
- Audio visualization + synthwave aesthetics

### Backend
- FastAPI (async), SQLite (aiosqlite), SQLAlchemy
- TinyLlama 1.1B (local LLM, CPU)
- ChromaDB + sentence-transformers (RAG pipeline)

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev    # → http://localhost:5173
```

### Backend
```bash
cd backend
uv venv .venv --python 3.12
source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env  # edit with your settings
uvicorn app.main:app --reload --port 8000
```

> **Note:** First backend startup downloads TinyLlama (~2GB) and embedding model (~80MB).

## Build for Production

```bash
cd frontend
npm run build  # → frontend/dist/
```

Upload the contents of `frontend/dist/` plus `public/models/` and `public/music/` to your hosting.

## License
Private
