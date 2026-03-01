from __future__ import annotations

from dataclasses import dataclass

from ..models import Region


@dataclass(slots=True)
class ResolvedAnchor:
    label: str
    latitude: float
    longitude: float
    region: Region


def resolve_anchor(
    anchor_input: str,
    anchor_latitude: float | None = None,
    anchor_longitude: float | None = None,
    anchor_label: str | None = None,
) -> ResolvedAnchor:
    if anchor_latitude is not None and anchor_longitude is not None:
        return ResolvedAnchor(
            label=anchor_label or anchor_input,
            latitude=anchor_latitude,
            longitude=anchor_longitude,
            region="custom",
        )

    value = anchor_input.lower()

    if any(token in value for token in ["uci", "irvine", "tustin", "orange"]):
        return ResolvedAnchor(
            label="Irvine Anchor",
            latitude=33.6405,
            longitude=-117.8443,
            region="irvine",
        )

    if any(token in value for token in ["san francisco", "sf", "google", "stripe"]):
        return ResolvedAnchor(
            label="San Francisco Anchor",
            latitude=37.7897,
            longitude=-122.3942,
            region="sf",
        )

    return ResolvedAnchor(
        label="Default SF Anchor",
        latitude=37.7897,
        longitude=-122.3942,
        region="sf",
    )
