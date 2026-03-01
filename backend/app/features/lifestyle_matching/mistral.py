from __future__ import annotations

import os
from typing import Iterable

import httpx

from .tags import PREFERENCE_TAGS

MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"


def _get_mistral_key() -> str:
    api_key = os.getenv("MISTRAL_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY is not configured")
    return api_key


def _fallback_tags(text: str) -> list[str]:
    normalized = text.lower()
    mapping: dict[str, Iterable[str]] = {
        "schools": ["school", "schools", "kids", "kid", "family", "education", "daycare", "preschool"],
        "university": ["university", "campus", "college", "uci", "uc", "csu"],
        "nightlife": ["nightlife", "bars", "clubs", "party", "music", "concert", "dining", "food scene"],
        "parks": ["parks", "park", "outdoors", "hiking", "trails", "nature", "beach", "quiet", "safe"],
        "transit": ["transit", "public", "train", "bart", "metro", "subway", "bus", "station", "commute", "walkable"],
        "grocery": ["grocery", "market", "markets", "supermarket", "shopping"],
        "coffee": ["coffee", "cafe", "cafes", "brunch"],
        "fitness": ["fitness", "gym", "workout", "yoga", "pilates"],
        "healthcare": ["hospital", "healthcare", "clinic", "doctor", "urgent care", "pharmacy"],
    }
    tags = [tag for tag, words in mapping.items() if any(word in normalized for word in words)]
    if tags:
        return list(dict.fromkeys(tags))
    return ["parks"]


async def extract_preference_tags(text: str) -> list[str]:
    cleaned = text.strip()
    if not cleaned:
        return []

    prompt = (
        "Extract preference tags from the user text. "
        f"Allowed tags: {', '.join(PREFERENCE_TAGS)}. "
        "Return a JSON array of tags, no extra text. "
        "If unclear, infer the most likely tag."
    )

    payload = {
        "model": os.getenv("MISTRAL_PREFERENCE_MODEL", "mistral-small-latest"),
        "messages": [
            {"role": "system", "content": "You map lifestyle text to tags."},
            {"role": "user", "content": f"{prompt}\nUser text: {cleaned}"},
        ],
        "temperature": 0.0,
    }

    headers = {
        "Authorization": f"Bearer {_get_mistral_key()}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(MISTRAL_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )

    tags: list[str] = []
    if content.startswith("["):
        try:
            import json

            tags = json.loads(content)
        except Exception:
            tags = []

    tags = [tag for tag in tags if tag in PREFERENCE_TAGS]
    if tags:
        return list(dict.fromkeys(tags))

    return _fallback_tags(cleaned)
