from __future__ import annotations

import json
import os
import re

import httpx
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from .cache_repository import build_cache_key, get_cached_neighborhood_copy, set_cached_neighborhood_copy
from .models import NeighborhoodCopyRequest, NeighborhoodCopyResponse

MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
NEIGHBORHOOD_COPY_CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_NEIGHBORHOOD_COPY_SECONDS", "86400"))


def _truncate(value: str, limit: int) -> str:
    text = " ".join((value or "").split())
    if len(text) <= limit:
        return text
    cut = text[:limit].rstrip()
    if " " in cut and limit < len(text):
        cut = cut.rsplit(" ", 1)[0].rstrip()
    return cut


def _heuristic_copy(request: NeighborhoodCopyRequest) -> NeighborhoodCopyResponse:
    dims = [
        ("commute", request.commute_score, "short commute fit", "longer commute windows"),
        ("cost", request.affordability_score, "strong budget fit", "rent pressure against budget"),
        ("lifestyle", request.lifestyle_score, "good lifestyle alignment", "fewer lifestyle matches"),
    ]
    dims.sort(key=lambda item: item[1], reverse=True)
    top = dims[0]
    second = dims[1]
    weakest = dims[2]

    strengths = f"{top[2]} and {second[2]}" if second[1] >= 70 and top[1] - second[1] <= 14 else top[2]
    overview = _truncate(f"{strengths}; watch for {weakest[3]}.", 140)
    good = _truncate(f"Good: {strengths}.", 120)
    tradeoff = _truncate(f"Tradeoff: {weakest[3]}.", 120)
    return NeighborhoodCopyResponse(overview=overview, good=good, tradeoff=tradeoff)


def _build_prompt(request: NeighborhoodCopyRequest) -> str:
    return (
        "Generate short neighborhood recommendation copy for this user.\n"
        "Return STRICT JSON only with keys: overview, good, tradeoff.\n"
        "Limits: overview<=140 chars, good<=120 chars, tradeoff<=120 chars.\n"
        "Make copy specific to the named neighborhood and avoid generic repetition across neighborhoods.\n"
        "Mention the neighborhood name in the overview.\n"
        "No markdown, no extra keys, no commentary.\n"
        f"Neighborhood: {request.neighborhood}\n"
        f"Anchor: {request.anchor_label or ''} ({request.anchor_region or ''})\n"
        f"Scores: overall={request.overall_score:.1f}, commute={request.commute_score:.1f}, "
        f"cost={request.affordability_score:.1f}, lifestyle={request.lifestyle_score:.1f}\n"
        f"Rent={request.avg_rent}, distance={request.distance_miles:.2f} miles\n"
        f"User: household={request.household}, budget={request.budget}, salary={request.salary}, "
        f"commute_limit={request.commute_limit}, lifestyle_preferences={request.lifestyle_preferences or ''}"
    )


def _extract_json_dict(content: str) -> dict | None:
    match = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
    except Exception:
        return None
    return parsed if isinstance(parsed, dict) else None


async def generate_neighborhood_copy(
    request: NeighborhoodCopyRequest,
    db: AsyncSession | None = None,
) -> NeighborhoodCopyResponse:
    cache_payload = request.model_dump(mode="json")
    cache_key = build_cache_key("neighborhood_copy", cache_payload)

    if db is not None:
        try:
            cached = await get_cached_neighborhood_copy(
                db,
                neighborhood_community_id=request.neighborhood_id,
                input_hash=cache_key,
            )
        except SQLAlchemyError:
            cached = None
        if cached is not None:
            return cached

    api_key = os.getenv("MISTRAL_API_KEY", "").strip()
    if not api_key:
        response = _heuristic_copy(request)
        if db is not None:
            try:
                await set_cached_neighborhood_copy(
                    db,
                    neighborhood_community_id=request.neighborhood_id,
                    input_hash=cache_key,
                    response=response,
                    ttl_seconds=NEIGHBORHOOD_COPY_CACHE_TTL_SECONDS,
                )
            except SQLAlchemyError:
                pass
        return response

    payload = {
        "model": os.getenv("MISTRAL_NEIGHBORHOOD_MODEL", "mistral-small-latest").strip(),
        "messages": [
            {"role": "system", "content": "You return strict JSON for neighborhood recommendation copy."},
            {"role": "user", "content": _build_prompt(request)},
        ],
        "temperature": 0.0,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=18) as client:
            response = await client.post(MISTRAL_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
        parsed = _extract_json_dict(content)
        if not parsed:
            response = _heuristic_copy(request)
            if db is not None:
                try:
                    await set_cached_neighborhood_copy(
                        db,
                        neighborhood_community_id=request.neighborhood_id,
                        input_hash=cache_key,
                        response=response,
                        ttl_seconds=NEIGHBORHOOD_COPY_CACHE_TTL_SECONDS,
                    )
                except SQLAlchemyError:
                    pass
            return response

        overview = _truncate(str(parsed.get("overview") or ""), 140)
        good = _truncate(str(parsed.get("good") or ""), 120)
        tradeoff = _truncate(str(parsed.get("tradeoff") or ""), 120)
        if not overview or not good or not tradeoff:
            response = _heuristic_copy(request)
            if db is not None:
                try:
                    await set_cached_neighborhood_copy(
                        db,
                        neighborhood_community_id=request.neighborhood_id,
                        input_hash=cache_key,
                        response=response,
                        ttl_seconds=NEIGHBORHOOD_COPY_CACHE_TTL_SECONDS,
                    )
                except SQLAlchemyError:
                    pass
            return response
        response = NeighborhoodCopyResponse(overview=overview, good=good, tradeoff=tradeoff)
        if db is not None:
            try:
                await set_cached_neighborhood_copy(
                    db,
                    neighborhood_community_id=request.neighborhood_id,
                    input_hash=cache_key,
                    response=response,
                    ttl_seconds=NEIGHBORHOOD_COPY_CACHE_TTL_SECONDS,
                )
            except SQLAlchemyError:
                pass
        return response
    except Exception:
        response = _heuristic_copy(request)
        if db is not None:
            try:
                await set_cached_neighborhood_copy(
                    db,
                    neighborhood_community_id=request.neighborhood_id,
                    input_hash=cache_key,
                    response=response,
                    ttl_seconds=NEIGHBORHOOD_COPY_CACHE_TTL_SECONDS,
                )
            except SQLAlchemyError:
                pass
        return response
