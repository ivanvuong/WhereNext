# WhereNext

WhereNext is a relocation decision engine with a React frontend and FastAPI backend.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Recommended Node.js version: `20.19+` (or `22.12+`) for Vite 7.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
