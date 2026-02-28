from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

from .data import COMMUNITIES
from .models import AnalyzeRequest, RankedCommunity, Region


@dataclass(slots=True)
class ResolvedAnchor:
    label: str
    latitude: float
    longitude: float
    region: Region


def clamp(value: float, min_value: float, max_value: float) -> float:
    return min(max(value, min_value), max_value)


def parse_preference_dimensions(text: str) -> list[str]:
    normalized = text.lower()

    mapping: dict[str, Iterable[str]] = {
        "walkable": ["walkable", "walk", "transit", "dense"],
        "quiet": ["quiet", "calm", "peaceful"],
        "food": ["food", "restaurant", "foodie", "coffee"],
        "nightlife": ["nightlife", "bar", "club", "party"],
        "outdoors": ["outdoors", "hiking", "beach", "park", "nature"],
        "family": ["family", "kids", "schools", "child"],
        "pets": ["pet", "pets", "dog", "cat"],
        "academic": ["academic", "study", "campus", "student", "university"],
        "wellness": ["wellness", "fitness", "gym", "health"],
    }

    selected = [key for key, words in mapping.items() if any(word in normalized for word in words)]
    return selected if selected else ["walkable", "food", "quiet"]


def resolve_anchor(anchor_input: str) -> ResolvedAnchor:
    value = anchor_input.lower()

    if any(token in value for token in ["uci", "irvine", "tustin", "orange"]):
        return ResolvedAnchor(
            label="Irvine Anchor",
            latitude=33.6405,
            longitude=-117.8443,
            region="irvine",
        )

    if any(token in value for token in ["san francisco", "sf", "google", "stripe"]):
        return ResolvedAnchor(
            label="San Francisco Anchor",
            latitude=37.7897,
            longitude=-122.3942,
            region="sf",
        )

    return ResolvedAnchor(
        label="Default SF Anchor",
        latitude=37.7897,
        longitude=-122.3942,
        region="sf",
    )


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_miles = 3958.8
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return earth_radius_miles * c


def score(request: AnalyzeRequest) -> tuple[ResolvedAnchor, list[RankedCommunity]]:
    anchor = resolve_anchor(request.anchor_input)
    dimensions = parse_preference_dimensions(request.lifestyle_preferences)

    household_weight = {
        "family": "family",
        "with pets": "pets",
        "couple": "quiet",
        "single": "nightlife",
    }[request.household]

    salary_budget = (request.salary / 12) * 0.34
    effective_budget = max(request.budget, salary_budget)

    ranked: list[RankedCommunity] = []

    for community in COMMUNITIES:
        if community.region != anchor.region:
            continue

        distance_miles = haversine_miles(anchor.latitude, anchor.longitude, community.latitude, community.longitude)
        if distance_miles > request.radius:
            continue

        estimated_commute = distance_miles * 3.4 + 5
        commute_gap = abs(estimated_commute - request.commute_limit)
        commute_score = clamp(100 - commute_gap * 3.2, 0, 100)

        affordability_delta = community.avg_rent - effective_budget
        affordability_score = clamp(100 - max(affordability_delta, 0) / 14, 12, 100)

        lifestyle_base = sum(getattr(community.lifestyle, dim) for dim in dimensions) / len(dimensions)
        weighted_lifestyle = clamp(
            lifestyle_base * 0.84 + getattr(community.lifestyle, household_weight) * 0.16,
            0,
            100,
        )

        overall_score = commute_score * 0.4 + affordability_score * 0.3 + weighted_lifestyle * 0.3

        ranked.append(
            RankedCommunity(
                id=community.id,
                name=community.name,
                region=community.region,
                latitude=community.latitude,
                longitude=community.longitude,
                distance_miles=round(distance_miles, 2),
                commute_score=round(commute_score, 2),
                affordability_score=round(affordability_score, 2),
                lifestyle_score=round(weighted_lifestyle, 2),
                overall_score=round(overall_score, 2),
                avg_rent=community.avg_rent,
            )
        )

    ranked.sort(key=lambda item: item.overall_score, reverse=True)
    return anchor, ranked[:10]
