from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Region = Literal["sf", "irvine", "custom"]
HouseholdType = Literal["single", "couple", "family", "with pets"]
HousingMode = Literal["buy", "rent"]


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
    anchor_label: str | None = None
    anchor_latitude: float | None = None
    anchor_longitude: float | None = None
    budget: int = Field(default=2500, ge=600, le=12000)
    salary: int = Field(default=80000, ge=0, le=2_000_000)
    commute_limit: int = Field(default=20, ge=1, le=120)
    radius: int = Field(default=15, ge=1, le=30)
    household: HouseholdType = "single"
    lifestyle_preferences: str = "walkable, food scene, quiet"


class RankedCommunity(BaseModel):
    id: str
    name: str
    region: Region
    latitude: float
    longitude: float
    distance_miles: float
    commute_score: float
    affordability_score: float
    lifestyle_score: float
    overall_score: float
    avg_rent: int


class AnalyzeResponse(BaseModel):
    anchor_label: str
    anchor_region: Region
    anchor_latitude: float
    anchor_longitude: float
    candidate_count: int
    communities: list[RankedCommunity]


class PropertySearchRequest(BaseModel):
    neighborhood: str = Field(min_length=1)
    city: str | None = None
    state_code: str | None = None
    anchor_latitude: float | None = None
    anchor_longitude: float | None = None
    neighborhood_latitude: float | None = None
    neighborhood_longitude: float | None = None
    budget: int = Field(default=2500, ge=600, le=12000)
    salary: int = Field(default=80000, ge=0, le=2_000_000)
    commute_limit: int = Field(default=20, ge=1, le=120)
    radius: int = Field(default=15, ge=1, le=30)
    household: HouseholdType = "single"
    housing_mode: HousingMode = "buy"
    max_home_price: int | None = Field(default=None, ge=100_000, le=10_000_000)
    limit: int = Field(default=20, ge=1, le=40)


class PropertyListing(BaseModel):
    id: str
    address: str
    status: str
    list_price: int | None = None
    beds: float | None = None
    baths: float | None = None
    sqft: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    primary_photo: str | None = None
    detail_url: str | None = None


class PropertySearchResponse(BaseModel):
    neighborhood: str
    total: int
    listings: list[PropertyListing]
