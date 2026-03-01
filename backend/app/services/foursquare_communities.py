from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

import httpx

from ..models import Community, LifestyleScore, Region
from .anchor import ResolvedAnchor

FOURSQUARE_SEARCH_URL = "https://api.foursquare.com/v3/places/search"
CACHE_TTL_SECONDS = 600

_cache: dict[str, tuple[float, list[Community]]] = {}

_CATEGORY_HINTS: dict[str, tuple[str, ...]] = {
    "walkable": ("metro", "station", "bus", "train", "tram", "transit", "shopping", "plaza"),
    "quiet": ("library", "bookstore", "garden", "botanical"),
    "food": ("restaurant", "cafe", "coffee", "bakery", "food", "tea", "brunch"),
    "nightlife": ("bar", "club", "lounge", "pub", "brewery", "night"),
    "outdoors": ("park", "trail", "beach", "lake", "camp", "playground", "outdoor"),
    "family": ("school", "playground", "child", "museum", "community center"),
    "pets": ("pet", "veterinary", "dog", "animal"),
    "academic": ("university", "college", "school", "library", "campus"),
    "wellness": ("gym", "fitness", "yoga", "spa", "health", "pilates", "wellness"),
}


def _read_env_value_from_dotenv(key: str) -> str:
    dotenv_path = Path(__file__).resolve().parents[2] / ".env"
    if not dotenv_path.exists():
        return ""
    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        env_key, env_value = line.split("=", 1)
        if env_key.strip() == key:
            return env_value.strip().strip('"').strip("'")
    return ""


def _score_lifestyle_from_categories(categories_text: str) -> LifestyleScore:
    counts = {dimension: 0 for dimension in _CATEGORY_HINTS}
    for dimension, hints in _CATEGORY_HINTS.items():
        counts[dimension] = sum(1 for hint in hints if hint in categories_text)

    def score_for(dimension: str, baseline: int = 44) -> int:
        return max(30, min(95, baseline + counts[dimension] * 7))

    return LifestyleScore(
        walkable=score_for("walkable"),
        quiet=score_for("quiet", baseline=46),
        food=score_for("food", baseline=45),
        nightlife=score_for("nightlife", baseline=40),
        outdoors=score_for("outdoors", baseline=42),
        family=score_for("family", baseline=43),
        pets=score_for("pets", baseline=44),
        academic=score_for("academic", baseline=41),
        wellness=score_for("wellness", baseline=42),
    )


def _estimate_avg_rent(region: Region, name: str) -> int:
    base = 3000
    if region == "sf":
        base = 3350
    elif region == "irvine":
        base = 3050
    # deterministic offset to avoid all dynamic communities sharing one rent value
    offset = (abs(hash(name)) % 700) - 350
    return max(1400, base + offset)


def _fetch_nearby_categories(
    client: httpx.Client,
    *,
    lat: float,
    lng: float,
    foursquare_key: str,
) -> str:
    response = client.get(
        FOURSQUARE_SEARCH_URL,
        params={
            "ll": f"{lat},{lng}",
            "radius": 1200,
            "limit": 50,
            "fields": "categories",
        },
        headers={"Authorization": foursquare_key, "accept": "application/json"},
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    results = data.get("results") or []

    names: list[str] = []
    for item in results:
        for category in item.get("categories") or []:
            name = str(category.get("name") or "").lower()
            if name:
                names.append(name)
    return " ".join(names)


def discover_foursquare_communities(anchor: ResolvedAnchor, radius_miles: int) -> list[Community]:
    foursquare_key = os.getenv("FOURSQUARE_API_KEY", "").strip() or _read_env_value_from_dotenv("FOURSQUARE_API_KEY")
    if not foursquare_key:
        return []

    cache_key = f"{anchor.latitude:.4f}:{anchor.longitude:.4f}:{radius_miles}:{anchor.region}"
    now = time.time()
    cached = _cache.get(cache_key)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    radius_meters = max(1200, min(int(radius_miles * 1609), 35000))
    region: Region = anchor.region if anchor.region != "custom" else "custom"

    try:
        with httpx.Client(timeout=12) as client:
            response = client.get(
                FOURSQUARE_SEARCH_URL,
                params={
                    "query": "neighborhood",
                    "ll": f"{anchor.latitude},{anchor.longitude}",
                    "radius": radius_meters,
                    "limit": 20,
                    "fields": "fsq_id,name,geocodes,location",
                },
                headers={"Authorization": foursquare_key, "accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results") or []

            communities: list[Community] = []
            seen_names: set[str] = set()
            for item in results:
                fsq_id = str(item.get("fsq_id") or "")
                name = str(item.get("name") or "").strip()
                geocodes = item.get("geocodes") or {}
                main = geocodes.get("main") or {}
                lat = main.get("latitude")
                lng = main.get("longitude")

                if not fsq_id or not name or lat is None or lng is None:
                    continue
                normalized_name = name.lower()
                if normalized_name in seen_names:
                    continue
                seen_names.add(normalized_name)

                categories_text = _fetch_nearby_categories(
                    client,
                    lat=float(lat),
                    lng=float(lng),
                    foursquare_key=foursquare_key,
                )
                lifestyle = _score_lifestyle_from_categories(categories_text)

                communities.append(
                    Community(
                        id=f"fsq-{fsq_id}",
                        name=name,
                        region=region,
                        latitude=float(lat),
                        longitude=float(lng),
                        avg_rent=_estimate_avg_rent(region, name),
                        lifestyle=lifestyle,
                    )
                )
                if len(communities) >= 12:
                    break

            _cache[cache_key] = (now, communities)
            return communities
    except Exception:
        return []
