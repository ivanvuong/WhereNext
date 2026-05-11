from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CityORM(TimestampMixin, Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    state_code: Mapped[str] = mapped_column(String(2))
    region: Mapped[str] = mapped_column(String(32), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    neighborhoods: Mapped[list["NeighborhoodORM"]] = relationship(
        back_populates="city",
        cascade="all, delete-orphan",
    )


class NeighborhoodORM(TimestampMixin, Base):
    __tablename__ = "neighborhoods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    community_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    region: Mapped[str] = mapped_column(String(32), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    avg_rent: Mapped[int] = mapped_column(Integer)
    walkable: Mapped[int] = mapped_column(Integer)
    quiet: Mapped[int] = mapped_column(Integer)
    food: Mapped[int] = mapped_column(Integer)
    nightlife: Mapped[int] = mapped_column(Integer)
    outdoors: Mapped[int] = mapped_column(Integer)
    family: Mapped[int] = mapped_column(Integer)
    pets: Mapped[int] = mapped_column(Integer)
    academic: Mapped[int] = mapped_column(Integer)
    wellness: Mapped[int] = mapped_column(Integer)

    city: Mapped[CityORM] = relationship(back_populates="neighborhoods")
    listings: Mapped[list["ListingORM"]] = relationship(back_populates="neighborhood")
    copy_cache_entries: Mapped[list["NeighborhoodCopyCacheORM"]] = relationship(back_populates="neighborhood")


class ListingORM(TimestampMixin, Base):
    __tablename__ = "listings"
    __table_args__ = (UniqueConstraint("source", "external_id", name="uq_listings_source_external_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(32), index=True)
    external_id: Mapped[str] = mapped_column(String(255))
    neighborhood_id: Mapped[int | None] = mapped_column(ForeignKey("neighborhoods.id", ondelete="SET NULL"), nullable=True)
    address: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(64), index=True)
    list_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    beds: Mapped[float | None] = mapped_column(Float, nullable=True)
    baths: Mapped[float | None] = mapped_column(Float, nullable=True)
    sqft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    primary_photo: Mapped[str | None] = mapped_column(Text, nullable=True)
    detail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    neighborhood: Mapped[NeighborhoodORM | None] = relationship(back_populates="listings")


class ApiCacheORM(Base):
    __tablename__ = "api_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(64), index=True)
    cache_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    request_json: Mapped[dict] = mapped_column(JSON)
    response_json: Mapped[dict] = mapped_column(JSON)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class NeighborhoodCopyCacheORM(Base):
    __tablename__ = "neighborhood_copy_cache"
    __table_args__ = (UniqueConstraint("neighborhood_id", "input_hash", name="uq_copy_cache_neighborhood_input"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    neighborhood_id: Mapped[int] = mapped_column(ForeignKey("neighborhoods.id", ondelete="CASCADE"), index=True)
    input_hash: Mapped[str] = mapped_column(String(128), index=True)
    overview: Mapped[str] = mapped_column(String(140))
    good: Mapped[str] = mapped_column(String(120))
    tradeoff: Mapped[str] = mapped_column(String(120))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    neighborhood: Mapped[NeighborhoodORM] = relationship(back_populates="copy_cache_entries")
