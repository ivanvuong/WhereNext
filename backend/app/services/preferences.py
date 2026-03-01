from __future__ import annotations

from typing import Iterable


def parse_preference_dimensions(text: str) -> list[str]:
    normalized = text.lower()

    mapping: dict[str, Iterable[str]] = {
        "walkable": ["walkable", "walk", "transit", "dense"],
        "quiet": ["quiet", "calm", "peaceful"],
        "food": ["food", "restaurant", "foodie", "coffee"],
        "nightlife": ["nightlife", "bar", "club", "party"],
        "outdoors": ["outdoors", "hiking", "beach", "park", "nature"],
        "family": ["family", "kids", "schools", "child"],
        "pets": ["pet", "pets", "dog", "cat"],
        "academic": ["academic", "study", "campus", "student", "university"],
        "wellness": ["wellness", "fitness", "gym", "health"],
    }

    selected = [key for key, words in mapping.items() if any(word in normalized for word in words)]
    return selected if selected else ["walkable", "food", "quiet"]
