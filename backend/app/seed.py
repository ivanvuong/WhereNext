from __future__ import annotations

import asyncio
from dataclasses import dataclass

from sqlalchemy import select

from .data import COMMUNITIES
from .db import SessionLocal
from .db_models import CityORM, NeighborhoodORM


@dataclass(frozen=True)
class SeedCity:
    slug: str
    name: str
    state_code: str
    region: str
    latitude: float
    longitude: float


CITY_SEEDS: dict[str, SeedCity] = {
    "sf": SeedCity(
        slug="san-francisco-ca",
        name="San Francisco",
        state_code="CA",
        region="sf",
        latitude=37.7749,
        longitude=-122.4194,
    ),
    "irvine": SeedCity(
        slug="irvine-ca",
        name="Irvine",
        state_code="CA",
        region="irvine",
        latitude=33.6846,
        longitude=-117.8265,
    ),
}


def _slugify(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-").replace("--", "-")


async def seed_reference_data() -> None:
    async with SessionLocal() as session:
        city_result = await session.execute(select(CityORM))
        existing_cities = {city.region: city for city in city_result.scalars().all()}

        for region, seed in CITY_SEEDS.items():
            city = existing_cities.get(region)
            if city is None:
                city = CityORM(
                    slug=seed.slug,
                    name=seed.name,
                    state_code=seed.state_code,
                    region=seed.region,
                    latitude=seed.latitude,
                    longitude=seed.longitude,
                )
                session.add(city)
                await session.flush()
                existing_cities[region] = city
            else:
                city.slug = seed.slug
                city.name = seed.name
                city.state_code = seed.state_code
                city.latitude = seed.latitude
                city.longitude = seed.longitude

        neighborhood_result = await session.execute(select(NeighborhoodORM))
        existing_neighborhoods = {row.community_id: row for row in neighborhood_result.scalars().all()}

        for community in COMMUNITIES:
            city = existing_cities[community.region]
            neighborhood = existing_neighborhoods.get(community.id)
            values = {
                "slug": _slugify(community.name),
                "community_id": community.id,
                "city_id": city.id,
                "name": community.name,
                "region": community.region,
                "latitude": community.latitude,
                "longitude": community.longitude,
                "avg_rent": community.avg_rent,
                "walkable": community.lifestyle.walkable,
                "quiet": community.lifestyle.quiet,
                "food": community.lifestyle.food,
                "nightlife": community.lifestyle.nightlife,
                "outdoors": community.lifestyle.outdoors,
                "family": community.lifestyle.family,
                "pets": community.lifestyle.pets,
                "academic": community.lifestyle.academic,
                "wellness": community.lifestyle.wellness,
            }
            if neighborhood is None:
                session.add(NeighborhoodORM(**values))
            else:
                for key, value in values.items():
                    setattr(neighborhood, key, value)

        await session.commit()


def main() -> None:
    asyncio.run(seed_reference_data())


if __name__ == "__main__":
    main()
