from .health import router as health_router
from .neighborhoods import router as neighborhoods_router
from .rank import router as rank_router
from .search import router as search_router

__all__ = [
    "health_router",
    "neighborhoods_router",
    "rank_router",
    "search_router",
]
