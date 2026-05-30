# routers/contact.py — Contact form submission endpoint

from fastapi import APIRouter, Request, status
from loguru import logger
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select

from app.database import DBSessionDep
from app.entities import ContactSubmission
from app.schemas import ContactCreate, ContactOut

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def submit_contact(
    request: Request,
    payload: ContactCreate,
    session: DBSessionDep,
) -> ContactOut:
    """Persist a contact form submission."""
    logger.info(f"[Contact] New submission from {payload.email}")
    submission = ContactSubmission(
        name=payload.name,
        email=payload.email,
        message=payload.message,
    )
    session.add(submission)
    await session.commit()
    await session.refresh(submission)
    logger.info(f"[Contact] Saved submission id={submission.id}")
    return ContactOut.model_validate(submission)


@router.get("", include_in_schema=False)
async def list_submissions(session: DBSessionDep) -> list[ContactOut]:
    """Internal: list all contact submissions (not publicly documented)."""
    result = await session.execute(
        select(ContactSubmission).order_by(ContactSubmission.submitted_at.desc())
    )
    return [ContactOut.model_validate(r) for r in result.scalars().all()]
