from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from .community_repository import list_communities, list_neighborhood_records
from .engine import score
from .models import (
    AnalyzeRequest,
    AnalyzeResponse,
    NeighborhoodCopyRequest,
    NeighborhoodCopyResponse,
    NeighborhoodListResponse,
    PropertySearchRequest,
    PropertySearchResponse,
)
from .neighborhood_copy import generate_neighborhood_copy
from .realty import fetch_property_listings


async def rank_communities(request: AnalyzeRequest, db: AsyncSession) -> AnalyzeResponse:
    try:
        communities = await list_communities(db)
    except SQLAlchemyError:
        communities = []

    anchor, ranked = score(request, communities=communities or None)
    return AnalyzeResponse(
        anchor_label=anchor.label,
        anchor_region=anchor.region,
        anchor_latitude=anchor.latitude,
        anchor_longitude=anchor.longitude,
        candidate_count=len(ranked),
        communities=ranked,
    )


async def search_listings(request: PropertySearchRequest, db: AsyncSession) -> PropertySearchResponse:
    try:
        listings = await fetch_property_listings(request, db=db)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Property search failed: {exc}") from exc

    return PropertySearchResponse(
        neighborhood=request.neighborhood,
        total=len(listings),
        listings=listings,
    )


async def get_neighborhood_copy(request: NeighborhoodCopyRequest, db: AsyncSession) -> NeighborhoodCopyResponse:
    try:
        return await generate_neighborhood_copy(request, db=db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Neighborhood copy failed: {exc}") from exc


async def get_neighborhoods(db: AsyncSession, region: str | None = None) -> NeighborhoodListResponse:
    records = await list_neighborhood_records(db, region=region)
    return NeighborhoodListResponse(total=len(records), neighborhoods=records)
