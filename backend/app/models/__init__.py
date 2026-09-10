import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    STAFF = "staff"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(512), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.DOCTOR)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, foreign_keys="DoctorProfile.user_id")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    qualification = Column(String(255))
    specialization = Column(String(255))
    experience_years = Column(Integer, default=0)
    license_number = Column(String(100))
    verification_status = Column(SAEnum(VerificationStatus), default=VerificationStatus.PENDING)
    verified_at = Column(DateTime(timezone=True))
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    user = relationship("User", back_populates="doctor_profile", foreign_keys=[user_id])
    consultations = relationship("Consultation", back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    gender = Column(String(20), nullable=False)
    phone = Column(String(20))
    email = Column(String(255))
    address = Column(Text)
    blood_group = Column(String(10))
    height_cm = Column(Float)
    weight_kg = Column(Float)
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    identities = relationship("PatientIdentity", back_populates="patient")
    consultations = relationship("Consultation", back_populates="patient")
    medical_reports = relationship("MedicalReport", back_populates="patient")


class PatientIdentity(Base):
    __tablename__ = "patient_identities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    id_type = Column(String(50), nullable=False)
    id_value = Column(String(100), nullable=False)

    patient = relationship("Patient", back_populates="identities")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctor_profiles.id"), nullable=False)
    consultation_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String(50), default="in_progress")
    chief_complaint = Column(Text)
    notes = Column(Text)
    follow_up_date = Column(DateTime(timezone=True))
    outcome = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("DoctorProfile", back_populates="consultations")
    transcript = relationship("Transcript", back_populates="consultation", uselist=False)
    case_history = relationship("CaseHistory", back_populates="consultation", uselist=False)
    symptoms = relationship("Symptom", back_populates="consultation")
    treatments = relationship("Treatment", back_populates="consultation")
    medicine_suggestions = relationship("MedicineSuggestion", back_populates="consultation")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=False)
    raw_text = Column(Text, nullable=False)
    selected_language = Column(String(50))
    detected_language = Column(String(50))
    confidence_note = Column(Text)
    duration_seconds = Column(Float)
    audio_file_path = Column(String(500))
    is_edited = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    consultation = relationship("Consultation", back_populates="transcript")


class CaseHistory(Base):
    __tablename__ = "case_histories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=False)
    chief_complaint = Column(Text)
    history_of_present_illness = Column(Text)
    past_medical_history = Column(Text)
    current_medications = Column(Text)
    allergies = Column(Text)
    family_history = Column(Text)
    social_history = Column(Text)
    review_of_systems = Column(Text)
    physical_examination = Column(Text)
    investigations = Column(Text)
    diagnosis = Column(Text)
    treatment_plan = Column(Text)
    follow_up = Column(Text)
    is_ai_generated = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    doctor_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    consultation = relationship("Consultation", back_populates="case_history")


class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    duration = Column(String(100))
    severity = Column(String(50))
    body_part = Column(String(100))

    consultation = relationship("Consultation", back_populates="symptoms")


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_primary = Column(Boolean, default=False)


class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=False)
    treatment_type = Column(String(100))
    description = Column(Text)
    duration = Column(String(100))
    dosage = Column(String(100))
    frequency = Column(String(100))

    consultation = relationship("Consultation", back_populates="treatments")


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    form = Column(String(50))
    manufacturer = Column(String(255))


class MedicineSuggestion(Base):
    __tablename__ = "medicine_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=False)
    medicine_name = Column(String(255), nullable=False)
    dosage = Column(String(100))
    frequency = Column(String(100))
    duration = Column(String(100))
    reason = Column(Text)
    warnings = Column(Text)
    status = Column(String(50), default="pending")
    doctor_notes = Column(Text)
    is_ai_generated = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    consultation = relationship("Consultation", back_populates="medicine_suggestions")


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id"))
    title = Column(String(255), nullable=False)
    report_type = Column(String(100))
    file_path = Column(String(500))
    file_type = Column(String(20))
    extracted_text = Column(Text)
    ai_summary = Column(Text)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="medical_reports")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(UUID(as_uuid=True))
    details = Column(Text)
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
