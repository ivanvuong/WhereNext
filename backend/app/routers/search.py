from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..api_services import search_listings
from ..db import get_db
from ..models import PropertySearchRequest, PropertySearchResponse

router = APIRouter(tags=["search"])


@router.post("/search", response_model=PropertySearchResponse)
async def search_endpoint(
    request: PropertySearchRequest,
    db: AsyncSession = Depends(get_db),
) -> PropertySearchResponse:
    return await search_listings(request, db)


@router.post("/properties/search", response_model=PropertySearchResponse, include_in_schema=False)
async def search_legacy_endpoint(
    request: PropertySearchRequest,
    db: AsyncSession = Depends(get_db),
) -> PropertySearchResponse:
    return await search_listings(request, db)
