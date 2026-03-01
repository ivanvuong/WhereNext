from __future__ import annotations

import os
from dataclasses import dataclass

import httpx

from .tags import TAG_TO_CATEGORIES

FOURSQUARE_URL = "https://api.foursquare.com/v3/places/search"


@dataclass(slots=True)
class Place:
    name: str
    latitude: float
    longitude: float


def _get_key() -> str:
    api_key = os.getenv("FOURSQUARE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("FOURSQUARE_API_KEY is not configured")
    return api_key


async def fetch_places(tag: str, latitude: float, longitude: float, limit: int = 20) -> list[Place]:
    categories = TAG_TO_CATEGORIES.get(tag, [])
    if not categories:
        return []

    params = {
        "ll": f"{latitude},{longitude}",
        "radius": 5000,
        "limit": limit,
        "categories": ",".join(categories),
        "sort": "DISTANCE",
    }

    headers = {
        "Authorization": _get_key(),
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(FOURSQUARE_URL, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

    places: list[Place] = []
    for item in data.get("results", []):
        geocodes = item.get("geocodes", {})
        main = geocodes.get("main") or {}
        lat = main.get("latitude")
        lng = main.get("longitude")
        if lat is None or lng is None:
            continue
        places.append(Place(name=item.get("name", "Place"), latitude=float(lat), longitude=float(lng)))

    return places
