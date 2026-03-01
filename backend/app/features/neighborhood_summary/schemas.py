from __future__ import annotations

from pydantic import BaseModel, Field


class NeighborhoodSummaryRequest(BaseModel):
    neighborhood: str = Field(min_length=1)
    anchor_label: str | None = None


class NeighborhoodSummaryResponse(BaseModel):
    location: str
    title: str
    bullets: list[str]
