from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DoctorProfileOut(BaseModel):
    id: UUID
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: int = 0
    license_number: Optional[str] = None
    verification_status: str = "pending"
    verified_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DoctorWithProfile(BaseModel):
    user: UserOut
    profile: Optional[DoctorProfileOut] = None


class PatientCreate(BaseModel):
    full_name: str
    date_of_birth: datetime
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class PatientOut(BaseModel):
    id: UUID
    patient_code: str
    full_name: str
    date_of_birth: datetime
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PatientWithConsultations(PatientOut):
    consultations: list = []
    last_consultation: Optional[datetime] = None
    age: Optional[int] = None


class ConsultationCreate(BaseModel):
    patient_id: UUID
    chief_complaint: Optional[str] = None
    notes: Optional[str] = None


class ConsultationOut(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    consultation_date: datetime
    status: str
    chief_complaint: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    outcome: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConsultationDetail(ConsultationOut):
    patient: Optional[PatientOut] = None
    doctor: Optional[DoctorProfileOut] = None
    transcript: Optional["TranscriptOut"] = None
    case_history: Optional["CaseHistoryOut"] = None
    symptoms: list = []
    treatments: list = []
    medicine_suggestions: list = []


class TranscriptOut(BaseModel):
    id: UUID
    consultation_id: UUID
    raw_text: str
    selected_language: Optional[str] = None
    detected_language: Optional[str] = None
    confidence_note: Optional[str] = None
    duration_seconds: Optional[float] = None
    is_edited: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class TranscriptUpdate(BaseModel):
    raw_text: str


class CaseHistoryOut(BaseModel):
    id: UUID
    consultation_id: UUID
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    past_medical_history: Optional[str] = None
    current_medications: Optional[str] = None
    allergies: Optional[str] = None
    family_history: Optional[str] = None
    social_history: Optional[str] = None
    review_of_systems: Optional[str] = None
    physical_examination: Optional[str] = None
    investigations: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up: Optional[str] = None
    is_ai_generated: bool = False
    is_approved: bool = False
    doctor_notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CaseHistoryUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    history_of_present_illness: Optional[str] = None
    past_medical_history: Optional[str] = None
    current_medications: Optional[str] = None
    allergies: Optional[str] = None
    family_history: Optional[str] = None
    social_history: Optional[str] = None
    review_of_systems: Optional[str] = None
    physical_examination: Optional[str] = None
    investigations: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up: Optional[str] = None
    doctor_notes: Optional[str] = None


class CaseHistoryApprove(BaseModel):
    is_approved: bool = True


class SymptomOut(BaseModel):
    id: UUID
    consultation_id: UUID
    name: str
    description: Optional[str] = None
    duration: Optional[str] = None
    severity: Optional[str] = None
    body_part: Optional[str] = None

    model_config = {"from_attributes": True}


class MedicineSuggestionOut(BaseModel):
    id: UUID
    consultation_id: UUID
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    reason: Optional[str] = None
    warnings: Optional[str] = None
    status: str = "pending"
    doctor_notes: Optional[str] = None
    is_ai_generated: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicineSuggestionUpdate(BaseModel):
    status: str
    doctor_notes: Optional[str] = None
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    reason: Optional[str] = None
    warnings: Optional[str] = None


class MedicalReportOut(BaseModel):
    id: UUID
    patient_id: UUID
    consultation_id: Optional[UUID] = None
    title: str
    report_type: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    extracted_text: Optional[str] = None
    ai_summary: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class STTResponse(BaseModel):
    transcript: str
    detected_language: str
    selected_language: str
    confidence_note: Optional[str] = None
    duration_seconds: Optional[float] = None
