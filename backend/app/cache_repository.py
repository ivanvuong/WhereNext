from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db_models import ApiCacheORM, ListingORM, NeighborhoodCopyCacheORM, NeighborhoodORM
from .models import NeighborhoodCopyResponse, PropertyListing


def build_cache_key(prefix: str, payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    digest = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


async def get_api_cache(db: AsyncSession, *, provider: str, cache_key: str) -> dict[str, Any] | None:
    result = await db.execute(
        select(ApiCacheORM).where(
            ApiCacheORM.provider == provider,
            ApiCacheORM.cache_key == cache_key,
            ApiCacheORM.expires_at > datetime.now(timezone.utc),
        )
    )
    entry = result.scalar_one_or_none()
    return entry.response_json if entry is not None else None


async def set_api_cache(
    db: AsyncSession,
    *,
    provider: str,
    cache_key: str,
    request_json: dict[str, Any],
    response_json: dict[str, Any],
    status_code: int | None,
    ttl_seconds: int,
) -> None:
    result = await db.execute(select(ApiCacheORM).where(ApiCacheORM.cache_key == cache_key))
    entry = result.scalar_one_or_none()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)

    if entry is None:
        entry = ApiCacheORM(
            provider=provider,
            cache_key=cache_key,
            request_json=request_json,
            response_json=response_json,
            status_code=status_code,
            expires_at=expires_at,
        )
        db.add(entry)
    else:
        entry.provider = provider
        entry.request_json = request_json
        entry.response_json = response_json
        entry.status_code = status_code
        entry.expires_at = expires_at

    await db.commit()


async def get_cached_neighborhood_copy(
    db: AsyncSession,
    *,
    neighborhood_community_id: str,
    input_hash: str,
) -> NeighborhoodCopyResponse | None:
    neighborhood_result = await db.execute(
        select(NeighborhoodORM.id).where(NeighborhoodORM.community_id == neighborhood_community_id)
    )
    neighborhood_id = neighborhood_result.scalar_one_or_none()
    if neighborhood_id is None:
        return None

    result = await db.execute(
        select(NeighborhoodCopyCacheORM).where(
            NeighborhoodCopyCacheORM.neighborhood_id == neighborhood_id,
            NeighborhoodCopyCacheORM.input_hash == input_hash,
            NeighborhoodCopyCacheORM.expires_at > datetime.now(timezone.utc),
        )
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        return None

    return NeighborhoodCopyResponse(
        overview=entry.overview,
        good=entry.good,
        tradeoff=entry.tradeoff,
    )


async def set_cached_neighborhood_copy(
    db: AsyncSession,
    *,
    neighborhood_community_id: str,
    input_hash: str,
    response: NeighborhoodCopyResponse,
    ttl_seconds: int,
) -> None:
    neighborhood_result = await db.execute(
        select(NeighborhoodORM).where(NeighborhoodORM.community_id == neighborhood_community_id)
    )
    neighborhood = neighborhood_result.scalar_one_or_none()
    if neighborhood is None:
        return

    result = await db.execute(
        select(NeighborhoodCopyCacheORM).where(
            NeighborhoodCopyCacheORM.neighborhood_id == neighborhood.id,
            NeighborhoodCopyCacheORM.input_hash == input_hash,
        )
    )
    entry = result.scalar_one_or_none()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)

    if entry is None:
        entry = NeighborhoodCopyCacheORM(
            neighborhood_id=neighborhood.id,
            input_hash=input_hash,
            overview=response.overview,
            good=response.good,
            tradeoff=response.tradeoff,
            expires_at=expires_at,
        )
        db.add(entry)
    else:
        entry.overview = response.overview
        entry.good = response.good
        entry.tradeoff = response.tradeoff
        entry.expires_at = expires_at

    await db.commit()


async def upsert_listings(
    db: AsyncSession,
    *,
    neighborhood_name: str,
    city_name: str | None,
    listings: list[PropertyListing],
    source: str = "realty",
) -> None:
    neighborhood_query = select(NeighborhoodORM).where(NeighborhoodORM.name == neighborhood_name)
    if city_name:
        neighborhood_query = neighborhood_query.where(NeighborhoodORM.city.has(name=city_name))
    neighborhood_result = await db.execute(neighborhood_query)
    neighborhood = neighborhood_result.scalar_one_or_none()

    for item in listings:
        listing_result = await db.execute(
            select(ListingORM).where(
                ListingORM.source == source,
                ListingORM.external_id == item.id,
            )
        )
        existing = listing_result.scalar_one_or_none()
        values = {
            "neighborhood_id": neighborhood.id if neighborhood is not None else None,
            "address": item.address,
            "status": item.status,
            "list_price": item.list_price,
            "beds": item.beds,
            "baths": item.baths,
            "sqft": item.sqft,
            "latitude": item.latitude,
            "longitude": item.longitude,
            "primary_photo": item.primary_photo,
            "detail_url": item.detail_url,
            "last_seen_at": datetime.now(timezone.utc),
        }
        if existing is None:
            db.add(
                ListingORM(
                    source=source,
                    external_id=item.id,
                    **values,
                )
            )
        else:
            for key, value in values.items():
                setattr(existing, key, value)

    await db.commit()
