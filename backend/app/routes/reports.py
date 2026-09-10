import os
import uuid as uuid_lib
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Patient, MedicalReport, Consultation
from app.services.ai_service import AIService, get_ai_service, AIServiceError
from app.utils.security import get_current_user, require_role
from app.utils.audit import log_action
from app.config import UPLOAD_DIR, MAX_UPLOAD_SIZE_MB

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


ALLOWED_REPORT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


@router.get("")
def list_reports(
    patient_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(MedicalReport)
    if patient_id:
        try:
            from uuid import UUID

            query = query.filter(MedicalReport.patient_id == UUID(patient_id))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid patient ID")
    reports = query.order_by(MedicalReport.created_at.desc()).all()
    return [
        {
            "id": str(r.id),
            "patient_id": str(r.patient_id),
            "consultation_id": str(r.consultation_id) if r.consultation_id else None,
            "title": r.title,
            "report_type": r.report_type,
            "file_type": r.file_type,
            "file_path": r.file_path,
            "extracted_text": r.extracted_text,
            "ai_summary": r.ai_summary,
            "created_at": r.created_at,
        }
        for r in reports
    ]


@router.get("/{report_id}")
def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from uuid import UUID

    try:
        rid = UUID(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID")
    report = db.query(MedicalReport).filter(MedicalReport.id == rid).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("", status_code=201)
async def upload_report(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    consultation_id: str | None = Form(None),
    title: str | None = Form(None),
    report_type: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    from uuid import UUID

    try:
        pid = UUID(patient_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid patient ID")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    content_type = file.content_type or ""
    ext = Path(file.filename or "").suffix.lower()
    if content_type and content_type not in ALLOWED_REPORT_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported report type: {content_type}. Supported: PDF, JPG, PNG.")
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"Unsupported report extension: {ext}.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="Report file is empty")
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Report file too large. Maximum {MAX_UPLOAD_SIZE_MB}MB.")

    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = uuid_lib.uuid4()
    safe_name = f"{file_id}{ext}"
    file_path = upload_dir / safe_name
    file_path.write_bytes(raw)

    report_title = title or file.filename or "Medical Report"
    extracted_text = None
    ai_summary = None

    # PDF text extraction
    if content_type == "application/pdf" or ext == ".pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(file_path))
            pages = [p.extract_text() for p in reader.pages if p.extract_text()]
            if pages:
                extracted_text = "\n".join(pages)
        except Exception:
            try:
                import fitz

                doc = fitz.open(str(file_path))
                extracted_text = "\n".join(page.get_text() for page in doc)
            except Exception:
                extracted_text = None

    ai_error = None
    if ai.is_configured and (extracted_text or content_type in ("image/jpeg", "image/png")):
        try:
            if extracted_text and extracted_text.strip():
                ai_summary = ai.summarize_report(extracted_text[:15000])
            else:
                # multimodal image summary via Gemini
                import google.generativeai as genai
                from app.config import GEMINI_MODEL

                uploaded = genai.upload_file(
                    raw, display_name=f"report_{file_id}"
                )
                model = genai.GenerativeModel(
                    GEMINI_MODEL,
                    generation_config={"temperature": 0.2},
                )
                resp = model.generate_content(
                    [
                        "You are an AI assistant helping a licensed doctor read a medical report image. "
                        "Extract the visible text. Then provide a concise summary. Do not make an autonomous diagnosis.",
                        uploaded,
                    ]
                )
                ai_summary = resp.text.strip()
        except AIServiceError as e:
            ai_error = e.message
        except Exception as e:
            ai_error = str(e)

    report = MedicalReport(
        patient_id=pid,
        consultation_id=UUID(consultation_id) if consultation_id else None,
        title=report_title,
        report_type=report_type,
        file_path=str(file_path),
        file_type=ext.lstrip("."),
        extracted_text=extracted_text,
        ai_summary=ai_summary,
        uploaded_by=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    client_ip = None
    log_action(
        db,
        current_user.id,
        "report_uploaded",
        "report",
        report.id,
        f"Report {report.title} uploaded for patient {patient.full_name}",
        client_ip,
    )

    payload = {
        "id": str(report.id),
        "patient_id": str(report.patient_id),
        "consultation_id": str(report.consultation_id) if report.consultation_id else None,
        "title": report.title,
        "report_type": report.report_type,
        "file_path": report.file_path,
        "file_type": report.file_type,
        "extracted_text": report.extracted_text,
        "ai_summary": report.ai_summary,
        "ai_summary_error": ai_error,
        "created_at": report.created_at,
        "is_synthetic_demo": True,
    }
    return payload