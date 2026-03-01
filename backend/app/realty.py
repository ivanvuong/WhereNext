from __future__ import annotations

import os
from typing import Any

import httpx

from .models import PropertyListing, PropertySearchRequest
from .features.lifestyle_matching.mistral import extract_preference_tags
from .features.lifestyle_matching.foursquare import fetch_places
from .features.lifestyle_matching.scoring import score_listing
from .features.lifestyle_matching.tags import TAG_DISTANCE_MILES
from .services.geo import haversine_miles

RAPIDAPI_HOST = "realty-in-us.p.rapidapi.com"
REALTY_LIST_URL = f"https://{RAPIDAPI_HOST}/properties/v3/list"


def _derive_search_location(payload: PropertySearchRequest) -> str:
    city = (payload.city or "").strip()
    state = (payload.state_code or "").strip()

    if city and state:
        return f"{payload.neighborhood}, {city}, {state}"
    if city:
        return f"{payload.neighborhood}, {city}"
    return payload.neighborhood


def _derive_price_ceiling(payload: PropertySearchRequest) -> int:
    if payload.max_home_price is not None:
        return max(100_000, min(payload.max_home_price, 10_000_000))

    income_based = int(payload.salary * 12.0)
    budget_based = int(payload.budget * 12 * 120.0)
    return max(600_000, min(max(income_based, budget_based), 5_000_000))


def _derive_neighborhood_radius(payload: PropertySearchRequest) -> float:
    return max(0.75, min(4.0, payload.radius * 0.2))


def _normalize(value: str) -> str:
    return "".join(ch.lower() for ch in value if ch.isalnum() or ch.isspace()).strip()


def _address_matches_neighborhood(payload: PropertySearchRequest, listing: PropertyListing) -> bool:
    neighborhood = _normalize(payload.neighborhood)
    address = _normalize(listing.address)
    city = _normalize(payload.city or "")
    return (not neighborhood or neighborhood in address) and (not city or city in address)


def _status_matches_mode(payload: PropertySearchRequest, listing: PropertyListing) -> bool:
    normalized = (listing.status or "").lower().replace("-", "_")
    if payload.housing_mode == "rent":
        return "rent" in normalized or "lease" in normalized
    return "sale" in normalized or "build" in normalized or normalized in {"new_construction"}


def _within_slider_constraints(payload: PropertySearchRequest, listing: PropertyListing) -> bool:
    if payload.housing_mode == "rent":
        if listing.list_price is not None and listing.list_price > payload.budget:
            return False
    else:
        price_ceiling = _derive_price_ceiling(payload)
        if listing.list_price is not None and listing.list_price > price_ceiling:
            return False

    if (
        listing.latitude is None
        or listing.longitude is None
        or payload.anchor_latitude is None
        or payload.anchor_longitude is None
        or payload.neighborhood_latitude is None
        or payload.neighborhood_longitude is None
    ):
        return _address_matches_neighborhood(payload, listing)

    distance_to_neighborhood = haversine_miles(
        payload.neighborhood_latitude,
        payload.neighborhood_longitude,
        listing.latitude,
        listing.longitude,
    )
    if distance_to_neighborhood > _derive_neighborhood_radius(payload):
        return False

    distance_to_anchor = haversine_miles(
        payload.anchor_latitude,
        payload.anchor_longitude,
        listing.latitude,
        listing.longitude,
    )
    if distance_to_anchor > payload.radius:
        return False

    estimated_commute = distance_to_anchor * 3.4 + 5
    return estimated_commute <= payload.commute_limit


def _price_match_score(payload: PropertySearchRequest, listing: PropertyListing) -> float:
    if listing.list_price is None:
        return 0.5
    if payload.housing_mode == "rent":
        target = max(600, payload.budget)
        diff = abs(listing.list_price - target)
        return max(0.0, 1.0 - (diff / target))
    target = _derive_price_ceiling(payload)
    diff = abs(listing.list_price - target)
    return max(0.0, 1.0 - (diff / target))


def _neighborhood_distance_score(payload: PropertySearchRequest, listing: PropertyListing) -> float:
    if (
        listing.latitude is None
        or listing.longitude is None
        or payload.neighborhood_latitude is None
        or payload.neighborhood_longitude is None
    ):
        return 0.0
    radius = _derive_neighborhood_radius(payload) * 1.5
    distance = haversine_miles(
        payload.neighborhood_latitude,
        payload.neighborhood_longitude,
        listing.latitude,
        listing.longitude,
    )
    return max(0.0, 1.0 - (distance / max(radius, 0.75)))


def _extract_listing(raw: dict[str, Any]) -> PropertyListing | None:
    location = raw.get("location") or {}
    address = location.get("address") or {}
    description = raw.get("description") or {}
    primary_photo = raw.get("primary_photo") or {}
    permalink = raw.get("permalink")
    coordinates = (
        (address.get("coordinate") or {})
        or (location.get("coordinate") or {})
        or (raw.get("coordinates") or {})
    )

    street = address.get("line")
    city = address.get("city")
    state_code = address.get("state_code")
    postal_code = address.get("postal_code")
    address_parts = [part for part in [street, city, state_code, postal_code] if part]
    if not address_parts:
        return None

    property_id = str(raw.get("property_id") or raw.get("listing_id") or raw.get("mls") or "")
    if not property_id:
        property_id = "-".join(address_parts).lower().replace(" ", "-")

    detail_url = f"https://www.realtor.com/realestateandhomes-detail/{permalink}" if permalink else None
    latitude = coordinates.get("lat") or coordinates.get("latitude")
    longitude = coordinates.get("lon") or coordinates.get("lng") or coordinates.get("longitude")
    list_price = (
        raw.get("list_price")
        or description.get("list_price")
        or raw.get("price")
        or description.get("price")
        or raw.get("list_price_min")
    )

    return PropertyListing(
        id=property_id,
        address=", ".join(address_parts),
        status=str(raw.get("status") or "for_sale"),
        list_price=list_price,
        beds=description.get("beds"),
        baths=description.get("baths"),
        sqft=description.get("sqft"),
        latitude=float(latitude) if latitude is not None else None,
        longitude=float(longitude) if longitude is not None else None,
        primary_photo=primary_photo.get("href"),
        detail_url=detail_url,
    )


async def fetch_property_listings(payload: PropertySearchRequest) -> list[PropertyListing]:
    rapidapi_key = os.getenv("REALTY_RAPIDAPI_KEY", "").strip()
    if not rapidapi_key:
        raise RuntimeError("REALTY_RAPIDAPI_KEY is not configured")

    household_beds = {
        "single": {"min": 1},
        "couple": {"min": 1},
        "family": {"min": 2},
        "with pets": {"min": 1},
    }[payload.household]

    request_statuses = ["for_sale", "ready_to_build"]
    if payload.housing_mode == "rent":
        request_statuses = ["for_rent"]

    request_body: dict[str, Any] = {
        "limit": min(max(payload.limit * 3, payload.limit), 80),
        "offset": 0,
        "status": request_statuses,
        "sort": {"direction": "desc", "field": "list_date"},
        "search_location": {"radius": max(2, min(10, payload.radius)), "location": _derive_search_location(payload)},
        "list_price": {"max": payload.budget if payload.housing_mode == "rent" else _derive_price_ceiling(payload)},
        "beds": household_beds,
    }

    headers = {
        "content-type": "application/json",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": rapidapi_key,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(REALTY_LIST_URL, json=request_body, headers=headers)
        response.raise_for_status()
        data = response.json()

    raw_listings = (
        data.get("data", {}).get("home_search", {}).get("results")
        or data.get("properties")
        or data.get("results")
        or []
    )

    listings: list[PropertyListing] = []
    should_score = bool(
        payload.lifestyle_preferences
        and payload.neighborhood_latitude
        and payload.neighborhood_longitude
    )
    max_results = payload.limit * 3 if should_score else payload.limit
    for raw in raw_listings:
        if not isinstance(raw, dict):
            continue
        parsed = _extract_listing(raw)
        if parsed is not None:
            if _status_matches_mode(payload, parsed) and _within_slider_constraints(payload, parsed):
                listings.append(parsed)
        if len(listings) >= max_results:
            break

    if should_score:
        try:
            tags = await extract_preference_tags(payload.lifestyle_preferences)
        except Exception:
            tags = []
        if tags:
            tag_places: dict[str, list] = {}
            for tag in tags:
                try:
                    tag_places[tag] = await fetch_places(tag, payload.neighborhood_latitude, payload.neighborhood_longitude)
                except Exception:
                    tag_places[tag] = []

            scored: list[tuple[float, PropertyListing]] = []
            for listing in listings:
                scores = score_listing(listing.latitude, listing.longitude, tag_places)
                tag_score = sum(item.score for item in scores) / max(len(scores), 1)
                price_score = _price_match_score(payload, listing)
                proximity_score = _neighborhood_distance_score(payload, listing)
                # Weight lifestyle highest, then proximity, then price fit.
                total = (tag_score * 0.55) + (proximity_score * 0.3) + (price_score * 0.15)
                scored.append((total, listing))

            scored.sort(key=lambda item: item[0], reverse=True)
            ranked = [item[1] for item in scored if item[0] > 0 or not TAG_DISTANCE_MILES]
            listings = (ranked or listings)[: payload.limit]

    return listings
