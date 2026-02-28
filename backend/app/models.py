from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Region = Literal["sf", "irvine"]
HouseholdType = Literal["single", "couple", "family", "with pets"]


class LifestyleScore(BaseModel):
    walkable: int
    quiet: int
    food: int
    nightlife: int
    outdoors: int
    family: int
    pets: int
    academic: int
    wellness: int


class Community(BaseModel):
    id: str
    name: str
    region: Region
    latitude: float
    longitude: float
    avg_rent: int
    lifestyle: LifestyleScore


class AnalyzeRequest(BaseModel):
    anchor_input: str = Field(default="Google SF", min_length=1)
    budget: int = Field(default=2500, ge=600, le=12000)
    salary: int = Field(default=80000, ge=0, le=2_000_000)
    commute_limit: int = Field(default=20, ge=1, le=120)
    radius: int = Field(default=15, ge=1, le=30)
    household: HouseholdType = "single"
    lifestyle_preferences: str = "walkable, food scene, quiet"


class RankedCommunity(BaseModel):
    id: str
    name: str
    distance_miles: float
    commute_score: float
    affordability_score: float
    lifestyle_score: float
    overall_score: float
    avg_rent: int


class AnalyzeResponse(BaseModel):
    anchor_label: str
    anchor_region: Region
    candidate_count: int
    communities: list[RankedCommunity]
