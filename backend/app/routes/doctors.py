from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, DoctorProfile, VerificationStatus
from app.schemas import DoctorProfileOut, UserOut, DoctorWithProfile
from app.utils.security import get_current_user, require_role
from app.utils.audit import log_action

router = APIRouter(prefix="/api/v1/doctors", tags=["doctors"])


@router.get("/me", response_model=DoctorWithProfile)
def my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    return {"user": current_user, "profile": profile}


@router.get("/pending")
def pending_doctors(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(User, DoctorProfile)
        .join(DoctorProfile, DoctorProfile.user_id == User.id)
        .filter(DoctorProfile.verification_status == VerificationStatus.PENDING)
        .all()
    )
    return [serialize_doctor(u, p) for u, p in rows]


@router.get("/all")
def all_doctors(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(User, DoctorProfile)
        .join(DoctorProfile, DoctorProfile.user_id == User.id)
        .all()
    )
    return [serialize_doctor(u, p) for u, p in rows]


def serialize_doctor(u: User, p: DoctorProfile) -> dict:
    return {
        "user": {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value if hasattr(u.role, "value") else str(u.role),
            "is_active": u.is_active,
            "created_at": u.created_at,
        },
        "profile": {
            "id": str(p.id),
            "qualification": p.qualification,
            "specialization": p.specialization,
            "experience_years": p.experience_years,
            "license_number": p.license_number,
            "verification_status": p.verification_status.value
            if hasattr(p.verification_status, "value")
            else str(p.verification_status),
            "verified_at": p.verified_at,
            "verified_by": str(p.verified_by) if p.verified_by else None,
        },
    }


@router.post("/{doctor_id}/verify")
def verify_doctor(
    doctor_id: str,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    from uuid import UUID

    profile = db.query(DoctorProfile).filter(DoctorProfile.id == UUID(doctor_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    if profile.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot verify your own account")
    profile.verification_status = VerificationStatus.VERIFIED
    profile.verified_at = datetime.now(timezone.utc)
    profile.verified_by = current_user.id
    db.commit()
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "doctor_verified",
        "doctor",
        profile.id,
        f"Doctor {profile.user_id} verified",
        client_ip,
    )
    return {"status": "verified"}


@router.post("/{doctor_id}/reject")
def reject_doctor(
    doctor_id: str,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    from uuid import UUID

    profile = db.query(DoctorProfile).filter(DoctorProfile.id == UUID(doctor_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    profile.verification_status = VerificationStatus.REJECTED
    db.commit()
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "doctor_rejected",
        "doctor",
        profile.id,
        f"Doctor {profile.user_id} rejected",
        client_ip,
    )
    return {"status": "rejected"}