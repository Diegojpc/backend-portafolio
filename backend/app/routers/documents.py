# routers/documents.py — Dynamic Document Injection Endpoints
from fastapi import APIRouter, File, UploadFile, HTTPException
from loguru import logger
import io

from app.services.rag import inject_dynamic_document_chunk

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", summary="Dynamically uploads and indexes a document for the active RAG sequence.", status_code=201)
async def upload_document(file: UploadFile = File(...)):
    """
    Parses an uploaded static document (.txt, .md, .pdf), strips text, 
    and pipes data into the Vector Engine via Gemini Embeddings.
    """
    logger.info(f"Incoming Upload Request processing memory injection: {file.filename}")
    
    # Validation filters
    valid_extensions = (".txt", ".md", ".pdf")
    if not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload text, markdown or PDF files.")

    try:
        content = await file.read()
        parsed_text = ""
        
        # Branch parsing by format
        if file.filename.lower().endswith(".pdf"):
            import PyPDF2
            # Use PyPDF2 to parse binary PDF data
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                extracted = page.extract_text()
                if extracted:
                    parsed_text += extracted + "\n"
        else:
            # Handle standardized raw-string objects
            parsed_text = content.decode("utf-8")

        if not parsed_text.strip():
            raise HTTPException(status_code=422, detail="Unable to extract any readable text from the provided document.")

        # Ingestion pipeline routing
        chunks_indexed = inject_dynamic_document_chunk(filename=file.filename, content=parsed_text)
        
        return {
            "status": "success", 
            "message": f"Successfully parsed and ingested {file.filename}.",
            "chunks_loaded": chunks_indexed
        }
        
    except httpx.HTTPError:
        logger.error(f"[Router] Backend embedding failed for {file.filename}")
        raise HTTPException(status_code=502, detail="Failed to reach Gemini Embedding APIs")
    except Exception as e:
        logger.error(f"[Router] Document ingestion fatally crashed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
