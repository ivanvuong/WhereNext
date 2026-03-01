from __future__ import annotations

from fastapi import APIRouter, HTTPException
import httpx

from .schemas import NeighborhoodSummaryRequest, NeighborhoodSummaryResponse
from .service import generate_neighborhood_summary

router = APIRouter(prefix="/neighborhood", tags=["neighborhood"])


@router.post("/summary", response_model=NeighborhoodSummaryResponse)
async def neighborhood_summary(request: NeighborhoodSummaryRequest) -> NeighborhoodSummaryResponse:
    try:
        return await generate_neighborhood_summary(request.neighborhood, request.anchor_label)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Neighborhood summary failed: {exc}") from exc
