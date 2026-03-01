from __future__ import annotations

import json
import os
import re

import httpx

from .schemas import NeighborhoodCopyRequest, NeighborhoodCopyResponse, NeighborhoodSummaryResponse


def _get_mistral_api_key() -> str:
    api_key = os.getenv("MISTRAL_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY is not configured")
    return api_key


def _build_location_text(neighborhood: str, anchor_label: str | None) -> str:
    if anchor_label and anchor_label.strip():
        return f"{neighborhood}, near {anchor_label.strip()}"
    return neighborhood


def _build_prompt(location: str) -> str:
    return (
        f"Describe {location} to a potential home buyer in concise bullet points. "
        "Return 8 bullet points, each 10-15 words, practical and neutral. "
        "No intro sentence, bullets only. Do not use labels or bold/markdown."
    )


def _parse_bullets(content: str) -> list[str]:
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    bullets: list[str] = []
    for line in lines:
        cleaned = line
        if cleaned.startswith("- "):
            cleaned = cleaned[2:].strip()
        elif cleaned.startswith("* "):
            cleaned = cleaned[2:].strip()
        elif cleaned[:2].isdigit() and cleaned[2:4] in {". ", ") "}:
            cleaned = cleaned[4:].strip()
        if cleaned:
            bullets.append(cleaned)

    if not bullets and content.strip():
        bullets = [content.strip()]

    return bullets[:8]


async def generate_neighborhood_summary(neighborhood: str, anchor_label: str | None) -> NeighborhoodSummaryResponse:
    api_key = _get_mistral_api_key()
    location = _build_location_text(neighborhood, anchor_label)
    preferred_model = os.getenv("MISTRAL_NEIGHBORHOOD_MODEL", "mistral-small-latest").strip()

    payload = {
        "model": preferred_model,
        "messages": [
            {
                "role": "system",
                "content": "You are a real-estate market assistant writing concise, factual area overviews.",
            },
            {
                "role": "user",
                "content": _build_prompt(location),
            },
        ],
        "temperature": 0.4,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )

    if not content:
        raise RuntimeError("Mistral returned no summary content")

    bullets = _parse_bullets(content)
    title = f"{location} - Buyer Snapshot"

    return NeighborhoodSummaryResponse(location=location, title=title, bullets=bullets)


def _truncate_text(value: str, max_len: int) -> str:
    text = " ".join((value or "").split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def _heuristic_copy(request: NeighborhoodCopyRequest) -> NeighborhoodCopyResponse:
    dims = [
        ("commute", request.commute_score, "short commute fit", "longer commute windows"),
        ("cost", request.affordability_score, "cost fit for your budget", "price pressure vs your budget"),
        ("lifestyle", request.lifestyle_score, "lifestyle preferences align", "lifestyle fit is less consistent"),
    ]
    dims.sort(key=lambda item: item[1], reverse=True)
    top = dims[0]
    second = dims[1]
    weakest = dims[2]
    include_second = second[1] >= 70 and top[1] - second[1] <= 12

    strengths = f"{top[2]} and {second[2]}" if include_second else top[2]
    overview = _truncate_text(f"{strengths}; watch for {weakest[3]}.", 140)
    good = _truncate_text(f"Good: {strengths}.", 120)
    tradeoff = _truncate_text(f"Tradeoff: {weakest[3]}.", 120)
    return NeighborhoodCopyResponse(overview=overview, good=good, tradeoff=tradeoff)


def _extract_first_json_object(text: str) -> dict | None:
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return None
    return None


def _build_copy_prompt(request: NeighborhoodCopyRequest) -> str:
    location = _build_location_text(request.neighborhood, request.anchor_label)
    return (
        "Generate short neighborhood copy for this user. "
        "Return STRICT JSON only with keys overview, good, tradeoff.\n"
        "Limits: overview<=140 chars, good<=120 chars, tradeoff<=120 chars.\n"
        "No markdown, no extra keys, no commentary.\n"
        f"Neighborhood: {location}\n"
        f"Scores: overall={request.overall_score:.1f}, commute={request.commute_score:.1f}, "
        f"cost={request.affordability_score:.1f}, lifestyle={request.lifestyle_score:.1f}\n"
        f"Distance miles: {request.distance_miles:.2f}, avg_rent={request.avg_rent}\n"
        f"User profile: household={request.household}, budget={request.budget}, salary={request.salary}, "
        f"commute_limit={request.commute_limit}, lifestyle_preferences={request.lifestyle_preferences or ''}\n"
        "Tone: practical, personalized, concise."
    )


async def generate_neighborhood_copy(request: NeighborhoodCopyRequest) -> NeighborhoodCopyResponse:
    try:
        api_key = _get_mistral_api_key()
    except RuntimeError:
        return _heuristic_copy(request)

    preferred_model = os.getenv("MISTRAL_NEIGHBORHOOD_MODEL", "mistral-small-latest").strip()
    payload = {
        "model": preferred_model,
        "messages": [
            {"role": "system", "content": "You return strict JSON for neighborhood recommendation copy."},
            {"role": "user", "content": _build_copy_prompt(request)},
        ],
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=18) as client:
            response = await client.post("https://api.mistral.ai/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
    except Exception:
        return _heuristic_copy(request)

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
    parsed = _extract_first_json_object(content)
    if not parsed:
        return _heuristic_copy(request)

    overview = _truncate_text(str(parsed.get("overview") or ""), 140)
    good = _truncate_text(str(parsed.get("good") or ""), 120)
    tradeoff = _truncate_text(str(parsed.get("tradeoff") or ""), 120)

    if not overview or not good or not tradeoff:
        return _heuristic_copy(request)

    return NeighborhoodCopyResponse(overview=overview, good=good, tradeoff=tradeoff)
