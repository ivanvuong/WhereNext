from __future__ import annotations

from dataclasses import dataclass

from .foursquare import Place
from .tags import TAG_DISTANCE_MILES
from ...services.geo import haversine_miles


@dataclass(slots=True)
class TagScore:
    tag: str
    distance_miles: float | None
    score: float


def score_listing(latitude: float | None, longitude: float | None, tag_places: dict[str, list[Place]]) -> list[TagScore]:
    results: list[TagScore] = []
    if latitude is None or longitude is None:
        for tag in tag_places:
            results.append(TagScore(tag=tag, distance_miles=None, score=0.0))
        return results

    for tag, places in tag_places.items():
        max_distance = TAG_DISTANCE_MILES.get(tag, 2.0)
        best_distance: float | None = None
        for place in places:
            distance = haversine_miles(latitude, longitude, place.latitude, place.longitude)
            if best_distance is None or distance < best_distance:
                best_distance = distance
        if best_distance is None:
            results.append(TagScore(tag=tag, distance_miles=None, score=0.0))
            continue
        score = max(0.0, 1.0 - (best_distance / max_distance))
        results.append(TagScore(tag=tag, distance_miles=best_distance, score=score))

    return results
