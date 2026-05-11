"""create initial tables"""

from alembic import op
import sqlalchemy as sa


revision = "20250511_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "api_cache",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("cache_key", sa.String(length=255), nullable=False),
        sa.Column("request_json", sa.JSON(), nullable=False),
        sa.Column("response_json", sa.JSON(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_api_cache_cache_key"), "api_cache", ["cache_key"], unique=True)
    op.create_index(op.f("ix_api_cache_expires_at"), "api_cache", ["expires_at"], unique=False)
    op.create_index(op.f("ix_api_cache_provider"), "api_cache", ["provider"], unique=False)

    op.create_table(
        "cities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("state_code", sa.String(length=2), nullable=False),
        sa.Column("region", sa.String(length=32), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_cities_region"), "cities", ["region"], unique=False)
    op.create_index(op.f("ix_cities_slug"), "cities", ["slug"], unique=True)

    op.create_table(
        "neighborhoods",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("community_id", sa.String(length=128), nullable=False),
        sa.Column("city_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("region", sa.String(length=32), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("avg_rent", sa.Integer(), nullable=False),
        sa.Column("walkable", sa.Integer(), nullable=False),
        sa.Column("quiet", sa.Integer(), nullable=False),
        sa.Column("food", sa.Integer(), nullable=False),
        sa.Column("nightlife", sa.Integer(), nullable=False),
        sa.Column("outdoors", sa.Integer(), nullable=False),
        sa.Column("family", sa.Integer(), nullable=False),
        sa.Column("pets", sa.Integer(), nullable=False),
        sa.Column("academic", sa.Integer(), nullable=False),
        sa.Column("wellness", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["city_id"], ["cities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("community_id"),
    )
    op.create_index(op.f("ix_neighborhoods_city_id"), "neighborhoods", ["city_id"], unique=False)
    op.create_index(op.f("ix_neighborhoods_community_id"), "neighborhoods", ["community_id"], unique=True)
    op.create_index(op.f("ix_neighborhoods_region"), "neighborhoods", ["region"], unique=False)
    op.create_index(op.f("ix_neighborhoods_slug"), "neighborhoods", ["slug"], unique=True)

    op.create_table(
        "listings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=False),
        sa.Column("neighborhood_id", sa.Integer(), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("list_price", sa.Integer(), nullable=True),
        sa.Column("beds", sa.Float(), nullable=True),
        sa.Column("baths", sa.Float(), nullable=True),
        sa.Column("sqft", sa.Integer(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("primary_photo", sa.Text(), nullable=True),
        sa.Column("detail_url", sa.Text(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["neighborhood_id"], ["neighborhoods.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "external_id", name="uq_listings_source_external_id"),
    )
    op.create_index(op.f("ix_listings_source"), "listings", ["source"], unique=False)
    op.create_index(op.f("ix_listings_status"), "listings", ["status"], unique=False)

    op.create_table(
        "neighborhood_copy_cache",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("neighborhood_id", sa.Integer(), nullable=False),
        sa.Column("input_hash", sa.String(length=128), nullable=False),
        sa.Column("overview", sa.String(length=140), nullable=False),
        sa.Column("good", sa.String(length=120), nullable=False),
        sa.Column("tradeoff", sa.String(length=120), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["neighborhood_id"], ["neighborhoods.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("neighborhood_id", "input_hash", name="uq_copy_cache_neighborhood_input"),
    )
    op.create_index(op.f("ix_neighborhood_copy_cache_expires_at"), "neighborhood_copy_cache", ["expires_at"], unique=False)
    op.create_index(op.f("ix_neighborhood_copy_cache_input_hash"), "neighborhood_copy_cache", ["input_hash"], unique=False)
    op.create_index(op.f("ix_neighborhood_copy_cache_neighborhood_id"), "neighborhood_copy_cache", ["neighborhood_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_neighborhood_copy_cache_neighborhood_id"), table_name="neighborhood_copy_cache")
    op.drop_index(op.f("ix_neighborhood_copy_cache_input_hash"), table_name="neighborhood_copy_cache")
    op.drop_index(op.f("ix_neighborhood_copy_cache_expires_at"), table_name="neighborhood_copy_cache")
    op.drop_table("neighborhood_copy_cache")

    op.drop_index(op.f("ix_listings_status"), table_name="listings")
    op.drop_index(op.f("ix_listings_source"), table_name="listings")
    op.drop_table("listings")

    op.drop_index(op.f("ix_neighborhoods_slug"), table_name="neighborhoods")
    op.drop_index(op.f("ix_neighborhoods_region"), table_name="neighborhoods")
    op.drop_index(op.f("ix_neighborhoods_community_id"), table_name="neighborhoods")
    op.drop_index(op.f("ix_neighborhoods_city_id"), table_name="neighborhoods")
    op.drop_table("neighborhoods")

    op.drop_index(op.f("ix_cities_slug"), table_name="cities")
    op.drop_index(op.f("ix_cities_region"), table_name="cities")
    op.drop_table("cities")

    op.drop_index(op.f("ix_api_cache_provider"), table_name="api_cache")
    op.drop_index(op.f("ix_api_cache_expires_at"), table_name="api_cache")
    op.drop_index(op.f("ix_api_cache_cache_key"), table_name="api_cache")
    op.drop_table("api_cache")
