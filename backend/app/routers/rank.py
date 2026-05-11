from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..api_services import rank_communities
from ..db import get_db
from ..models import AnalyzeRequest, AnalyzeResponse

router = APIRouter(tags=["rank"])


@router.post("/rank", response_model=AnalyzeResponse)
async def rank_endpoint(
    request: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
) -> AnalyzeResponse:
    return await rank_communities(request, db)


@router.post("/analyze", response_model=AnalyzeResponse, include_in_schema=False)
async def analyze_legacy_endpoint(
    request: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
) -> AnalyzeResponse:
    return await rank_communities(request, db)
