from __future__ import annotations

from pydantic import BaseModel, Field


class NeighborhoodSummaryRequest(BaseModel):
    neighborhood: str = Field(min_length=1)
    anchor_label: str | None = None


class NeighborhoodSummaryResponse(BaseModel):
    location: str
    title: str
    bullets: list[str]


class NeighborhoodCopyRequest(BaseModel):
    neighborhood_id: str = Field(min_length=1)
    neighborhood: str = Field(min_length=1)
    anchor_label: str | None = None
    household: str
    lifestyle_preferences: str | None = None
    budget: int
    salary: int
    commute_limit: int
    avg_rent: int
    distance_miles: float
    overall_score: float
    commute_score: float
    affordability_score: float
    lifestyle_score: float


class NeighborhoodCopyResponse(BaseModel):
    overview: str = Field(max_length=140)
    good: str = Field(max_length=120)
    tradeoff: str = Field(max_length=120)
