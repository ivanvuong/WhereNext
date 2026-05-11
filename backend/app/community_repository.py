from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db_models import CityORM, NeighborhoodORM
from .models import Community, LifestyleScore, NeighborhoodRecord


async def list_communities(db: AsyncSession) -> list[Community]:
    result = await db.execute(
        select(NeighborhoodORM)
        .join(CityORM, NeighborhoodORM.city_id == CityORM.id)
        .order_by(CityORM.name.asc(), NeighborhoodORM.name.asc())
    )
    neighborhoods = result.scalars().all()

    return [
        Community(
            id=item.community_id,
            name=item.name,
            region=item.region,  # type: ignore[arg-type]
            latitude=item.latitude,
            longitude=item.longitude,
            avg_rent=item.avg_rent,
            lifestyle=LifestyleScore(
                walkable=item.walkable,
                quiet=item.quiet,
                food=item.food,
                nightlife=item.nightlife,
                outdoors=item.outdoors,
                family=item.family,
                pets=item.pets,
                academic=item.academic,
                wellness=item.wellness,
            ),
        )
        for item in neighborhoods
    ]


async def list_neighborhood_records(db: AsyncSession, *, region: str | None = None) -> list[NeighborhoodRecord]:
    query = (
        select(NeighborhoodORM, CityORM)
        .join(CityORM, NeighborhoodORM.city_id == CityORM.id)
        .order_by(CityORM.name.asc(), NeighborhoodORM.name.asc())
    )
    if region:
        query = query.where(NeighborhoodORM.region == region)

    result = await db.execute(query)
    rows = result.all()

    return [
        NeighborhoodRecord(
            id=neighborhood.community_id,
            name=neighborhood.name,
            region=neighborhood.region,  # type: ignore[arg-type]
            city=city.name,
            state_code=city.state_code,
            latitude=neighborhood.latitude,
            longitude=neighborhood.longitude,
            avg_rent=neighborhood.avg_rent,
            lifestyle=LifestyleScore(
                walkable=neighborhood.walkable,
                quiet=neighborhood.quiet,
                food=neighborhood.food,
                nightlife=neighborhood.nightlife,
                outdoors=neighborhood.outdoors,
                family=neighborhood.family,
                pets=neighborhood.pets,
                academic=neighborhood.academic,
                wellness=neighborhood.wellness,
            ),
        )
        for neighborhood, city in rows
    ]
