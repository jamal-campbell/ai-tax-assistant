"""Health check endpoints."""
from fastapi import APIRouter
from ..models.schemas import HealthResponse
from ..services.vector_store import get_vector_store
from ..services.chat_history import get_chat_history_service
from ..services.llm import get_llm_service

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/ping")
async def ping():
    """Lightweight liveness check for Fly.io health checks."""
    return {"status": "ok"}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check the health of all services."""
    vector_store = get_vector_store()
    chat_history = get_chat_history_service()
    llm = get_llm_service()

    services = {
        "qdrant": vector_store.health_check(),
        "redis": chat_history.health_check(),
        "claude": llm.health_check()
    }

    all_healthy = all(services.values())

    return HealthResponse(
        status="healthy" if all_healthy else "degraded",
        services=services
    )
