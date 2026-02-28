# WhereNext Backend (FastAPI)

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health` -> health check
- `POST /analyze` -> deterministic community ranking

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
