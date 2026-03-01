from __future__ import annotations

import os

import httpx

from .schemas import NeighborhoodSummaryResponse


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
