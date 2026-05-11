from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..api_services import get_neighborhood_copy, get_neighborhoods
from ..db import get_db
from ..models import NeighborhoodCopyRequest, NeighborhoodCopyResponse, NeighborhoodListResponse

router = APIRouter(tags=["neighborhoods"])


@router.get("/neighborhoods", response_model=NeighborhoodListResponse)
async def neighborhoods_endpoint(
    region: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> NeighborhoodListResponse:
    return await get_neighborhoods(db, region=region)


@router.post("/neighborhoods/copy", response_model=NeighborhoodCopyResponse)
async def neighborhood_copy_endpoint(
    request: NeighborhoodCopyRequest,
    db: AsyncSession = Depends(get_db),
) -> NeighborhoodCopyResponse:
    return await get_neighborhood_copy(request, db)


@router.post("/neighborhood/copy", response_model=NeighborhoodCopyResponse, include_in_schema=False)
async def neighborhood_copy_legacy_endpoint(
    request: NeighborhoodCopyRequest,
    db: AsyncSession = Depends(get_db),
) -> NeighborhoodCopyResponse:
    return await get_neighborhood_copy(request, db)
