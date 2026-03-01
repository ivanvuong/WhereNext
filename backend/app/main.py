from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .engine import score
from .models import AnalyzeRequest, AnalyzeResponse

app = FastAPI(title="WhereNext API", version="0.1.0")

raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get('/health')
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post('/analyze', response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    anchor, ranked = score(request)
    return AnalyzeResponse(
        anchor_label=anchor.label,
        anchor_region=anchor.region,
        anchor_latitude=anchor.latitude,
        anchor_longitude=anchor.longitude,
        candidate_count=len(ranked),
        communities=ranked,
    )
