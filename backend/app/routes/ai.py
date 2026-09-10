from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Consultation, Transcript
from app.services.ai_service import get_ai_service, AIService, AIServiceError
from app.utils.security import get_current_user, require_role
from app.utils.audit import log_action

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


class CaseHistoryRequest(BaseModel):
    consultation_id: str
    transcript: str


class MedicineSuggestionRequest(BaseModel):
    consultation_id: str
    case_summary: str


@router.post("/case-history")
def generate_case_history(
    body: CaseHistoryRequest,
    request: Request,
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(body.consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")

    c = db.query(Consultation).filter(Consultation.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")

    transcript_text = body.transcript.strip()
    if not transcript_text:
        raise HTTPException(status_code=422, detail="Transcript is empty")

    try:
        result = ai.extract_case_history(transcript_text)
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "ai_case_history_extraction",
        "consultation",
        c.id,
        "AI case history extraction requested",
        client_ip,
    )
    result["consultation_id"] = str(cid)
    result["is_ai_generated"] = True
    return result


@router.post("/medicine-suggestions")
def generate_medicine_suggestions(
    body: MedicineSuggestionRequest,
    request: Request,
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(body.consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")

    c = db.query(Consultation).filter(Consultation.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")

    if not body.case_summary.strip():
        raise HTTPException(status_code=422, detail="Case summary is empty")

    try:
        result = ai.suggest_medicines(body.case_summary)
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "ai_medicine_suggestion_request",
        "consultation",
        c.id,
        "AI medicine suggestions requested",
        client_ip,
    )
    result["consultation_id"] = str(cid)
    return result