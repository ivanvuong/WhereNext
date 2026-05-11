from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")

SQL_ECHO = os.getenv("SQL_ECHO", "false").strip().lower() == "true"


def get_sync_database_url() -> str:
    return DATABASE_URL.replace("+asyncpg", "")


engine = create_async_engine(DATABASE_URL, echo=SQL_ECHO)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
