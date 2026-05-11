from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..community_repository import list_communities
from ..db import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/db-health")
async def db_health(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}


@router.get("/db-summary")
async def db_summary(db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    communities = await list_communities(db)
    return {"communities": len(communities)}
