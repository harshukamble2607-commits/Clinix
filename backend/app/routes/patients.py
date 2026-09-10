from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Patient, Consultation, CaseHistory
from app.schemas import PatientCreate, PatientOut
from app.utils.security import get_current_user
from app.utils.audit import log_action

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])


def calculate_age(dob: datetime) -> int:
    today = datetime.now()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def consultation_brief(c: Consultation) -> dict:
    return {
        "id": str(c.id),
        "consultation_date": c.consultation_date,
        "status": c.status,
        "chief_complaint": c.chief_complaint,
        "notes": c.notes,
        "outcome": c.outcome,
        "follow_up_date": c.follow_up_date,
        "doctor_id": str(c.doctor_id),
        "patient_id": str(c.patient_id),
    }


def serialize_patient(patient: Patient, consultations=None) -> dict:
    data = {
        "id": str(patient.id),
        "patient_code": patient.patient_code,
        "full_name": patient.full_name,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "phone": patient.phone,
        "email": patient.email,
        "address": patient.address,
        "blood_group": patient.blood_group,
        "height_cm": patient.height_cm,
        "weight_kg": patient.weight_kg,
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
        "is_active": patient.is_active,
        "created_at": patient.created_at,
        "age": calculate_age(patient.date_of_birth),
    }
    if consultations is not None:
        data["consultations"] = consultations
        data["last_consultation"] = max(
            (c["consultation_date"] for c in consultations), default=None
        )
    return data


@router.get("", response_model=list)
def list_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()
    return [serialize_patient(p) for p in patients]


@router.get("/search")
def search_patients(
    q: str = Query("", description="Search by name, patient code, phone, or DOB"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Patient)
    if q:
        search = f"%{q}%"
        query = query.filter(
            (Patient.full_name.ilike(search))
            | (Patient.patient_code.ilike(search))
            | (Patient.phone.ilike(search))
            | (Patient.email.ilike(search))
        )
    patients = query.order_by(Patient.full_name).all()
    result = []
    for p in patients:
        cons = (
            db.query(Consultation)
            .filter(Consultation.patient_id == p.id)
            .order_by(Consultation.consultation_date.desc())
            .all()
        )
        result.append(serialize_patient(p, [consultation_brief(c) for c in cons]))
    return result


@router.get("/{patient_id}")
def get_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        pid = UUID(patient_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid patient ID")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    cons = (
        db.query(Consultation)
        .filter(Consultation.patient_id == pid)
        .order_by(Consultation.consultation_date.desc())
        .all()
    )
    consultations = []
    for c in cons:
        item = consultation_brief(c)
        ch = db.query(CaseHistory).filter(CaseHistory.consultation_id == c.id).first()
        item["case_history"] = (
            {
                "id": str(ch.id),
                "chief_complaint": ch.chief_complaint,
                "diagnosis": ch.diagnosis,
                "treatment_plan": ch.treatment_plan,
                "is_ai_generated": ch.is_ai_generated,
                "is_approved": ch.is_approved,
            }
            if ch
            else None
        )
        consultations.append(item)
    return serialize_patient(patient, consultations)


@router.post("", response_model=PatientOut)
def create_patient(
    body: PatientCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient_count = db.query(Patient).count()
    patient = Patient(
        patient_code=f"AYU-{datetime.now().strftime('%Y')}-{patient_count+1:04d}",
        **body.model_dump(),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    client_ip = request.client.host if request.client else None
    log_action(
        db,
        current_user.id,
        "patient_created",
        "patient",
        patient.id,
        f"Patient {patient.full_name} created",
        client_ip,
    )
    return patient