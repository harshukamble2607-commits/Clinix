from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User,
    Patient,
    Consultation,
    CaseHistory,
    Transcript,
    Symptom,
    MedicineSuggestion,
)
from app.schemas import (
    ConsultationCreate,
    ConsultationOut,
    ConsultationDetail,
    TranscriptOut,
    TranscriptUpdate,
    CaseHistoryOut,
    CaseHistoryUpdate,
    CaseHistoryApprove,
    MedicineSuggestionOut,
    MedicineSuggestionUpdate,
)
from app.utils.security import get_current_user, require_role
from app.utils.audit import log_action

router = APIRouter(prefix="/api/v1/consultations", tags=["consultations"])


@router.get("")
def list_consultations(
    patient_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Consultation)
    if patient_id:
        try:
            query = query.filter(Consultation.patient_id == UUID(patient_id))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid patient ID")
    consultations = query.order_by(Consultation.consultation_date.desc()).all()
    return [
        {
            "id": str(c.id),
            "patient_id": str(c.patient_id),
            "doctor_id": str(c.doctor_id),
            "chief_complaint": c.chief_complaint,
            "status": c.status,
            "consultation_date": c.consultation_date,
        }
        for c in consultations
    ]


@router.get("/{consultation_id}")
def get_consultation(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    c = db.query(Consultation).filter(Consultation.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")

    patient = db.query(Patient).filter(Patient.id == c.patient_id).first()
    transcript = db.query(Transcript).filter(Transcript.consultation_id == c.id).first()
    case_history = db.query(CaseHistory).filter(CaseHistory.consultation_id == c.id).first()
    symptoms = db.query(Symptom).filter(Symptom.consultation_id == c.id).all()
    suggestions = (
        db.query(MedicineSuggestion)
        .filter(MedicineSuggestion.consultation_id == c.id)
        .order_by(MedicineSuggestion.created_at)
        .all()
    )

    return {
        "id": str(c.id),
        "patient_id": str(c.patient_id),
        "doctor_id": str(c.doctor_id),
        "consultation_date": c.consultation_date,
        "status": c.status,
        "chief_complaint": c.chief_complaint,
        "notes": c.notes,
        "follow_up_date": c.follow_up_date,
        "outcome": c.outcome,
        "created_at": c.created_at,
        "patient": patient,
        "transcript": transcript,
        "case_history": case_history,
        "symptoms": symptoms,
        "medicine_suggestions": suggestions,
    }


@router.post("", status_code=201)
def create_consultation(
    body: ConsultationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    from app.models import DoctorProfile

    doctor = (
        db.query(DoctorProfile)
        .filter(DoctorProfile.user_id == current_user.id)
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=400, detail="Doctor profile not found")

    c = Consultation(
        patient_id=body.patient_id,
        doctor_id=doctor.id,
        chief_complaint=body.chief_complaint,
        notes=body.notes,
        status="in_progress",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "consultation_created",
        "consultation",
        c.id,
        f"Consultation created for patient {patient.full_name}",
        client_ip,
    )
    return {"id": str(c.id), "status": "created", "consultation_id": str(c.id)}


@router.put("/{consultation_id}/status")
def update_consultation_status(
    consultation_id: str,
    body: dict,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    c = db.query(Consultation).filter(Consultation.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    status = body.get("status")
    if status not in ("in_progress", "completed"):
        raise HTTPException(status_code=422, detail="Invalid status value")
    c.status = status
    if "outcome" in body:
        c.outcome = body.get("outcome")
    if "chief_complaint" in body:
        c.chief_complaint = body.get("chief_complaint")
    if "notes" in body:
        c.notes = body.get("notes")
    db.commit()
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "consultation_updated",
        "consultation",
        c.id,
        f"Consultation status set to {status}",
        client_ip,
    )
    return {"status": status}


@router.post("/{consultation_id}/transcript", response_model=TranscriptOut)
def save_transcript(
    consultation_id: str,
    body: dict,
    request: Request,
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    c = db.query(Consultation).filter(Consultation.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")

    raw_text = body.get("raw_text", "")
    if not raw_text or not raw_text.strip():
        raise HTTPException(status_code=422, detail="Transcript text is empty")

    transcript = db.query(Transcript).filter(Transcript.consultation_id == cid).first()
    if transcript:
        transcript.raw_text = raw_text
        transcript.selected_language = body.get("selected_language", transcript.selected_language)
        transcript.detected_language = body.get("detected_language", transcript.detected_language)
        transcript.duration_seconds = body.get("duration_seconds", transcript.duration_seconds)
        transcript.confidence_note = body.get("confidence_note", transcript.confidence_note)
    else:
        transcript = Transcript(
            consultation_id=cid,
            raw_text=raw_text,
            selected_language=body.get("selected_language"),
            detected_language=body.get("detected_language"),
            duration_seconds=body.get("duration_seconds"),
            confidence_note=body.get("confidence_note"),
        )
        db.add(transcript)
    db.commit()
    db.refresh(transcript)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "transcript_saved",
        "transcript",
        transcript.id,
        "Consultation transcript saved",
        client_ip,
    )
    return transcript


@router.put("/{consultation_id}/transcript", response_model=TranscriptOut)
def edit_transcript(
    consultation_id: str,
    body: TranscriptUpdate,
    request: Request,
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    transcript = db.query(Transcript).filter(Transcript.consultation_id == cid).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    if not body.raw_text or not body.raw_text.strip():
        raise HTTPException(status_code=422, detail="Transcript text is empty")
    transcript.raw_text = body.raw_text
    transcript.is_edited = True
    db.commit()
    db.refresh(transcript)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "transcript_edited",
        "transcript",
        transcript.id,
        "Consultation transcript edited by doctor",
        client_ip,
    )
    return transcript


@router.post("/{consultation_id}/case-history", response_model=CaseHistoryOut)
def create_case_history(
    consultation_id: str,
    body: dict,
    request: Request,
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    c = db.query(Consultation).filter(Consultation.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")

    existing = db.query(CaseHistory).filter(CaseHistory.consultation_id == cid).first()
    if existing:
        raise HTTPException(status_code=409, detail="Case history already exists for this consultation")

    ch = CaseHistory(
        consultation_id=cid,
        chief_complaint=body.get("chief_complaint"),
        history_of_present_illness=body.get("history_of_present_illness"),
        past_medical_history=body.get("past_medical_history"),
        current_medications=", ".join(body.get("current_medications", [])) or None,
        allergies=", ".join(body.get("allergies", [])) or None,
        investigations=", ".join(body.get("investigations", [])) or None,
        follow_up=body.get("follow_up"),
        is_ai_generated=body.get("is_ai_generated", True),
        is_approved=False,
    )
    db.add(ch)
    db.flush()

    for s in body.get("symptoms", []):
        symptom = Symptom(
            consultation_id=cid,
            name=s.get("name", ""),
            description=s.get("description"),
            duration=s.get("duration"),
            severity=s.get("severity"),
            body_part=s.get("body_part"),
        )
        db.add(symptom)
    db.commit()
    db.refresh(ch)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "case_history_created",
        "case_history",
        ch.id,
        "Case history generated",
        client_ip,
    )
    return ch


@router.put("/{consultation_id}/case-history", response_model=CaseHistoryOut)
def update_case_history(
    consultation_id: str,
    body: CaseHistoryUpdate,
    request: Request,
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    ch = db.query(CaseHistory).filter(CaseHistory.consultation_id == cid).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Case history not found")
    for field in body.model_dump(exclude_unset=True):
        setattr(ch, field, body.model_dump()[field])
    db.commit()
    db.refresh(ch)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "case_history_updated",
        "case_history",
        ch.id,
        "Case history updated by doctor",
        client_ip,
    )
    return ch


@router.post("/{consultation_id}/case-history/approve", response_model=CaseHistoryOut)
def approve_case_history(
    consultation_id: str,
    body: dict,
    request: Request,
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    ch = db.query(CaseHistory).filter(CaseHistory.consultation_id == cid).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Case history not found")
    ch.is_approved = body.get("is_approved", True)
    ch.approved_by = current_user.id
    ch.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ch)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "case_history_approved",
        "case_history",
        ch.id,
        "Case history approved by doctor",
        client_ip,
    )
    return ch


@router.post("/{consultation_id}/medicine-suggestions")
def create_medicine_suggestions(
    consultation_id: str,
    body: dict,
    request: Request,
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation ID")
    c = db.query(Consultation).filter(Consultation.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")

    suggestions = body.get("suggestions", [])
    if not suggestions:
        raise HTTPException(status_code=422, detail="No suggestions provided")

    created = []
    for s in suggestions:
        ms = MedicineSuggestion(
            consultation_id=cid,
            medicine_name=s.get("medicine_name", ""),
            dosage=s.get("dosage"),
            frequency=s.get("frequency"),
            duration=s.get("duration"),
            reason=s.get("reason"),
            warnings=s.get("warnings"),
            status="pending",
            is_ai_generated=s.get("is_ai_generated", True),
        )
        db.add(ms)
        created.append(ms)
    db.commit()
    for ms in created:
        db.refresh(ms)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "medicine_suggestions_created",
        "consultation",
        c.id,
        f"{len(created)} AI medicine suggestions saved for doctor review",
        client_ip,
    )
    return [
        {
            "id": str(ms.id),
            "consultation_id": str(ms.consultation_id),
            "medicine_name": ms.medicine_name,
            "dosage": ms.dosage,
            "frequency": ms.frequency,
            "duration": ms.duration,
            "reason": ms.reason,
            "warnings": ms.warnings,
            "status": ms.status,
            "doctor_notes": ms.doctor_notes,
            "is_ai_generated": ms.is_ai_generated,
            "created_at": ms.created_at,
        }
        for ms in created
    ]


@router.put("/{consultation_id}/medicine-suggestions/{suggestion_id}", response_model=MedicineSuggestionOut)
def update_medicine_suggestion(
    consultation_id: str,
    suggestion_id: str,
    body: MedicineSuggestionUpdate,
    request: Request,
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    try:
        cid = UUID(consultation_id)
        sid = UUID(suggestion_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    ms = (
        db.query(MedicineSuggestion)
        .filter(MedicineSuggestion.id == sid, MedicineSuggestion.consultation_id == cid)
        .first()
    )
    if not ms:
        raise HTTPException(status_code=404, detail="Medicine suggestion not found")
    if body.status not in ("pending", "accepted", "rejected"):
        raise HTTPException(status_code=422, detail="Invalid status value")
    ms.status = body.status
    if body.doctor_notes is not None:
        ms.doctor_notes = body.doctor_notes
    if body.medicine_name is not None:
        ms.medicine_name = body.medicine_name
    if body.dosage is not None:
        ms.dosage = body.dosage
    if body.frequency is not None:
        ms.frequency = body.frequency
    if body.duration is not None:
        ms.duration = body.duration
    if body.reason is not None:
        ms.reason = body.reason
    if body.warnings is not None:
        ms.warnings = body.warnings
    ms.is_ai_generated = ms.is_ai_generated
    db.commit()
    db.refresh(ms)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "medicine_suggestion_updated",
        "medicine_suggestion",
        ms.id,
        f"Suggestion {ms.medicine_name} marked as {body.status}",
        client_ip,
    )
    return ms