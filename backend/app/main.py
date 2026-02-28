from __future__ import annotations

from fastapi import FastAPI

from .engine import score
from .models import AnalyzeRequest, AnalyzeResponse

app = FastAPI(title="WhereNext API", version="0.1.0")


@app.get('/health')
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post('/analyze', response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    anchor, ranked = score(request)
    return AnalyzeResponse(
        anchor_label=anchor.label,
        anchor_region=anchor.region,
        candidate_count=len(ranked),
        communities=ranked,
    )
