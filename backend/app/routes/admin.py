from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User,
    DoctorProfile,
    Patient,
    Consultation,
    CaseHistory,
    AuditLog,
    VerificationStatus,
)
from app.utils.security import get_current_user, require_role

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    today = datetime.now().date()
    start = datetime(today.year, today.month, today.day)
    end = start + timedelta(days=1)

    total_doctors = db.query(DoctorProfile).count()
    pending = (
        db.query(DoctorProfile)
        .filter(DoctorProfile.verification_status == VerificationStatus.PENDING)
        .count()
    )
    verified = (
        db.query(DoctorProfile)
        .filter(DoctorProfile.verification_status == VerificationStatus.VERIFIED)
        .count()
    )
    rejected = (
        db.query(DoctorProfile)
        .filter(DoctorProfile.verification_status == VerificationStatus.REJECTED)
        .count()
    )
    total_patients = db.query(Patient).count()
    total_consultations = db.query(Consultation).count()
    today_consultations = db.query(Consultation).filter(Consultation.consultation_date >= start, Consultation.consultation_date < end).count()
    pending_case_histories = (
        db.query(CaseHistory).filter(CaseHistory.is_approved == False).count()
    )
    recent_audit_logs = (
        db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(20).all()
    )

    return {
        "total_doctors": total_doctors,
        "pending_doctors": pending,
        "verified_doctors": verified,
        "rejected_doctors": rejected,
        "total_patients": total_patients,
        "total_consultations": total_consultations,
        "today_consultations": today_consultations,
        "pending_case_histories": pending_case_histories,
        "recent_audit_logs": recent_audit_logs,
    }


@router.get("/audit-logs")
def audit_logs(
    action: str | None = None,
    limit: int = 100,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs