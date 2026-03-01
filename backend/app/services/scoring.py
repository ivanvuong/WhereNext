from __future__ import annotations

from ..data import COMMUNITIES
from ..models import AnalyzeRequest, RankedCommunity
from .anchor import ResolvedAnchor, resolve_anchor
from .geo import clamp, haversine_miles
from .preferences import parse_preference_dimensions


def score(request: AnalyzeRequest) -> tuple[ResolvedAnchor, list[RankedCommunity]]:
    anchor = resolve_anchor(
        request.anchor_input,
        anchor_latitude=request.anchor_latitude,
        anchor_longitude=request.anchor_longitude,
        anchor_label=request.anchor_label,
    )
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
        if anchor.region != "custom" and community.region != anchor.region:
            continue

        distance_miles = haversine_miles(anchor.latitude, anchor.longitude, community.latitude, community.longitude)
        if distance_miles > request.radius:
            continue

        estimated_commute = distance_miles * 3.4 + 5
        if estimated_commute > request.commute_limit:
            continue
        commute_gap = abs(estimated_commute - request.commute_limit)
        commute_score = clamp(100 - commute_gap * 3.2, 0, 100)

        affordability_delta = community.avg_rent - effective_budget
        if affordability_delta > 0:
            continue
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
