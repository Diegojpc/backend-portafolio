# database.py — SQLite async database engine and session management

import os
from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from loguru import logger

from app.config import settings
from app.entities import Base

# Ensure the storage directory exists for SQLite
_db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
_storage_dir = os.path.dirname(os.path.join(
    os.path.dirname(os.path.dirname(__file__)), _db_path
))
os.makedirs(_storage_dir, exist_ok=True)

# Resolve the full path for SQLite
_full_db_url = f"sqlite+aiosqlite:///{os.path.join(os.path.dirname(os.path.dirname(__file__)), _db_path)}"

engine = create_async_engine(
    _full_db_url,
    echo=False,
    connect_args={"check_same_thread": False},  # Required for SQLite
)

async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("[Database] Tables created/verified successfully.")


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides a database session per request."""
    session = async_session()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


DBSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
