# WhereNext Backend (FastAPI)

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Postgres Setup

Set `DATABASE_URL` in `backend/.env`:

```bash
DATABASE_URL=postgresql+asyncpg://YOUR_DB_USER@localhost:5432/wherenext
CACHE_TTL_LISTINGS_SECONDS=1800
CACHE_TTL_NEIGHBORHOOD_COPY_SECONDS=86400
```

Run the initial migration:

```bash
alembic -c alembic.ini upgrade head
```

Seed the cities and neighborhoods already defined in `app/data.py`:

```bash
python -m app.seed
```

Useful checks:

```bash
curl http://localhost:8000/db-health
curl http://localhost:8000/db-summary
```

## Endpoints

- `GET /health` -> health check
- `GET /db-health` -> confirms the app can query Postgres
- `GET /db-summary` -> quick count of DB-backed communities
- `POST /rank` -> deterministic community ranking
- `POST /search` -> homes for a selected neighborhood (Realty in US via RapidAPI, cached in Postgres)
- `GET /neighborhoods` -> DB-backed neighborhood catalog
- `POST /neighborhoods/copy` -> AI/fallback neighborhood copy (cached in Postgres)

Legacy aliases still work for the current frontend:

- `POST /analyze`
- `POST /properties/search`
- `POST /neighborhood/copy`

## Environment

Required for property search:

```bash
export REALTY_RAPIDAPI_KEY="your_rapidapi_key"
```

## CORS

Default allowed origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Override with:

```bash
export CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

Example request:

```json
{
  "anchor_input": "Google SF",
  "budget": 2500,
  "salary": 80000,
  "commute_limit": 20,
  "radius": 15,
  "household": "single",
  "lifestyle_preferences": "walkable, food scene, quiet"
}
```

Property search request example:

```json
{
  "neighborhood": "Westpark",
  "city": "Irvine",
  "state_code": "CA",
  "budget": 2500,
  "salary": 80000,
  "household": "single",
  "limit": 6
}
```
