from __future__ import annotations

import os
from typing import Any

import httpx

from .models import PropertyListing, PropertySearchRequest

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
    income_based = int(payload.salary * 4.0)
    budget_based = int(payload.budget * 12 * 6.0)
    return max(150_000, min(max(income_based, budget_based), 3_000_000))


def _extract_listing(raw: dict[str, Any]) -> PropertyListing | None:
    location = raw.get("location") or {}
    address = location.get("address") or {}
    description = raw.get("description") or {}
    primary_photo = raw.get("primary_photo") or {}
    permalink = raw.get("permalink")

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

    return PropertyListing(
        id=property_id,
        address=", ".join(address_parts),
        status=str(raw.get("status") or "for_sale"),
        list_price=raw.get("list_price"),
        beds=description.get("beds"),
        baths=description.get("baths"),
        sqft=description.get("sqft"),
        primary_photo=primary_photo.get("href"),
        detail_url=detail_url,
    )


async def fetch_property_listings(payload: PropertySearchRequest) -> list[PropertyListing]:
    rapidapi_key = os.getenv("REALTY_RAPIDAPI_KEY", "").strip()
    if not rapidapi_key:
        raise RuntimeError("REALTY_RAPIDAPI_KEY is not configured")

    household_beds = {
        "single": {"min": 1, "max": 2},
        "couple": {"min": 1, "max": 3},
        "family": {"min": 2, "max": 5},
        "with pets": {"min": 1, "max": 4},
    }[payload.household]

    request_body: dict[str, Any] = {
        "limit": payload.limit,
        "offset": 0,
        "status": ["for_sale", "ready_to_build"],
        "sort": {"direction": "desc", "field": "list_date"},
        "search_location": {"radius": 10, "location": _derive_search_location(payload)},
        "list_price": {"max": _derive_price_ceiling(payload)},
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
    for raw in raw_listings:
        if not isinstance(raw, dict):
            continue
        parsed = _extract_listing(raw)
        if parsed is not None:
            listings.append(parsed)
        if len(listings) >= payload.limit:
            break

    return listings
