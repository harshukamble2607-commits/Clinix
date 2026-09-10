from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.config import GEMINI_API_KEY

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unavailable"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "ai_provider_configured": bool(GEMINI_API_KEY),
        "message": "AYUSH AI backend is running",
    }