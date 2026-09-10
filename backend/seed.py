"""
Seed script for AYUSH AI backend.

Creates synthetic demo users (admin, doctors, staff) and synthetic patients
with consultations, transcripts, case histories, and medicine suggestions.

This data is entirely SYNTHETIC. No real patient information is used.
"""
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy.orm import Session

from app.database import Base, engine, SessionLocal
from app.models import (
    User,
    UserRole,
    DoctorProfile,
    VerificationStatus,
    Patient,
    PatientIdentity,
    Consultation,
    Transcript,
    CaseHistory,
    Symptom,
    MedicineSuggestion,
    MedicalReport,
    AuditLog,
)
from app.utils.security import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    if db.query(User).count() > 0:
        print("Database already seeded. Skipping.")
        db.close()
        return

    now = datetime.now()

    # ---------- Users ----------
    admin = User(
        id=uuid4(),
        email="admin@ayush.demo",
        hashed_password=hash_password("Admin@123"),
        full_name="System Administrator",
        role=UserRole.ADMIN,
        is_active=True,
    )

    dr_verified_user = User(
        id=uuid4(),
        email="dr.sharma@ayush.demo",
        hashed_password=hash_password("Doctor@123"),
        full_name="Dr. Anjali Sharma",
        role=UserRole.DOCTOR,
        is_active=True,
    )
    dr_verified = DoctorProfile(
        id=uuid4(),
        user_id=dr_verified_user.id,
        qualification="BAMS (Bachelor of Ayurvedic Medicine and Surgery)",
        specialization="Kaya Chikitsa (General Medicine)",
        experience_years=12,
        license_number="AYUSH-DEMO-0001",
        verification_status=VerificationStatus.VERIFIED,
        verified_at=now - timedelta(days=200),
    )

    dr_pending_user = User(
        id=uuid4(),
        email="dr.patel@ayush.demo",
        hashed_password=hash_password("Doctor@123"),
        full_name="Dr. Rajesh Patel",
        role=UserRole.DOCTOR,
        is_active=True,
    )
    dr_pending = DoctorProfile(
        id=uuid4(),
        user_id=dr_pending_user.id,
        qualification="BHMS (Bachelor of Homoeopathic Medicine and Surgery)",
        specialization="Homoeopathy",
        experience_years=8,
        license_number="AYUSH-DEMO-0002",
        verification_status=VerificationStatus.PENDING,
    )

    staff_user = User(
        id=uuid4(),
        email="staff@ayush.demo",
        hashed_password=hash_password("Staff@123"),
        full_name="Meera Nair",
        role=UserRole.STAFF,
        is_active=True,
    )

    db.add_all([admin, dr_verified_user, dr_verified, dr_pending_user, dr_pending, staff_user])
    db.flush()

    # ---------- Patients ----------
    patients = []
    patient_data = [
        {
            "full_name": "Patient Demo 1",
            "date_of_birth": datetime(1985, 3, 15),
            "gender": "Male",
            "phone": "+91 90000 00001",
            "email": "patient1@demo.in",
            "address": "Pune, Maharashtra",
            "blood_group": "O+",
            "height_cm": 172,
            "weight_kg": 74,
        },
        {
            "full_name": "Patient Demo 2",
            "date_of_birth": datetime(1992, 7, 22),
            "gender": "Female",
            "phone": "+91 90000 00002",
            "email": "patient2@demo.in",
            "address": "Mumbai, Maharashtra",
            "blood_group": "A+",
            "height_cm": 160,
            "weight_kg": 58,
        },
        {
            "full_name": "Patient Demo 3",
            "date_of_birth": datetime(1978, 11, 2),
            "gender": "Male",
            "phone": "+91 90000 00003",
            "email": "patient3@demo.in",
            "address": "Nashik, Maharashtra",
            "blood_group": "B+",
            "height_cm": 168,
            "weight_kg": 69,
        },
    ]

    demo_patients = []
    for i, pdata in enumerate(patient_data, start=1):
        p = Patient(
            id=uuid4(),
            patient_code=f"AYU-2026-{1000 + i}",
            **pdata,
        )
        demo_patients.append(p)
        db.add(p)

        ident = PatientIdentity(
            id=uuid4(),
            patient_id=p.id,
            id_type="SYNTHETIC_DEMO_ID",
            id_value=f"DEMO-PATIENT-{i:04d}",  # Synthetic, never Aadhaar
        )
        db.add(ident)

    db.flush()

    # ---------- Consultations & Case data ----------
    c1 = Consultation(
        id=uuid4(),
        patient_id=demo_patients[0].id,
        doctor_id=dr_verified.id,
        consultation_date=now - timedelta(days=120),
        chief_complaint="Chronic lower back pain and stiffness",
        status="completed",
        outcome="Posture correction and traction showed improvement",
        follow_up_date=now - timedelta(days=30),
    )
    t1 = Transcript(
        id=uuid4(),
        consultation_id=c1.id,
        raw_text=(
            "Patient reports lower back pain (कमर दुखणे) for the past 4 months. "
            "Pain increases after sitting for long hours. Pain is {0} on scale of 10. "
            "Patient works as a software developer from home. No fever. No injury history."
        ).format("7"),
        selected_language="Marathi",
        detected_language="Marathi",
        duration_seconds=95.0,
        is_edited=False,
    )
    ch1 = CaseHistory(
        id=uuid4(),
        consultation_id=c1.id,
        chief_complaint="Chronic lower back pain and stiffness (कमर दुखणे)",
        history_of_present_illness="Pain for 4 months, worsens after prolonged sitting, intensity 7/10",
        past_medical_history="No significant past illness",
        current_medications=None,
        allergies=None,
        diagnosis="Kati Shula (Lumbar Spondylosis)",
        treatment_plan="Ayurvedic snehana and kati basti, posture correction",
        follow_up="Revisit after 30 days",
        is_ai_generated=True,
        is_approved=True,
        approved_by=dr_verified_user.id,
        approved_at=now - timedelta(days=119),
    )
    s1 = Symptom(
        id=uuid4(),
        consultation_id=c1.id,
        name="Lower back pain",
        description="Stiffness and aching pain in the lumbar region",
        duration="4 months",
        severity="7/10",
        body_part="Lower back",
    )
    ms1 = MedicineSuggestion(
        id=uuid4(),
        consultation_id=c1.id,
        medicine_name="Yogaraj Guggulu",
        dosage="2 tablets",
        frequency="twice daily",
        duration="30 days",
        reason="Symptomatic relief in joint and muscular pain",
        warnings="Use with care in patients with peptic ulcers",
        status="accepted",
        is_ai_generated=True,
        doctor_notes="Approved after confirming no acidity complaints",
    )
    db.add_all([c1, t1, ch1, s1, ms1])

    c2 = Consultation(
        id=uuid4(),
        patient_id=demo_patients[0].id,
        doctor_id=dr_verified.id,
        consultation_date=now - timedelta(days=30),
        chief_complaint="Recurring back pain, mild improvement",
        status="completed",
        outcome="Improved with regular panchakarma follow-up",
        follow_up_date=now + timedelta(days=60),
    )
    t2 = Transcript(
        id=uuid4(),
        consultation_id=c2.id,
        raw_text=(
            "Back pain improved by about 50 percent after kati basti. "
            "Still some stiffness in the morning (सकाळी कडकपणा). "
            "Sleep is good. Started taking prescribed medicine regularly."
        ),
        selected_language="Marathi",
        detected_language="Marathi",
        duration_seconds=78.0,
        is_edited=False,
    )
    ch2 = CaseHistory(
        id=uuid4(),
        consultation_id=c2.id,
        chief_complaint="Recurring back pain, mild improvement",
        history_of_present_illness="50% improvement after kati basti; morning stiffness persists",
        past_medical_history=None,
        current_medications="Yogaraj Guggulu 2 tablets twice daily",
        allergies=None,
        diagnosis="Kati Shula (Lumbar Spondylosis) - improving",
        treatment_plan="Continue kati basti series, add KasthuriBhairav Ras as supportive",
        follow_up="Revisit after 60 days",
        is_ai_generated=True,
        is_approved=True,
        approved_by=dr_verified_user.id,
        approved_at=now - timedelta(days=29),
    )
    s2 = Symptom(
        id=uuid4(),
        consultation_id=c2.id,
        name="Morning stiffness",
        description="Stiffness after waking, reduces after activity",
        duration="1 month",
        severity="3/10",
        body_part="Lower back",
    )
    db.add_all([c2, t2, ch2, s2])

    c3 = Consultation(
        id=uuid4(),
        patient_id=demo_patients[1].id,
        doctor_id=dr_verified.id,
        consultation_date=now - timedelta(days=45),
        chief_complaint="Frequent headaches and eye strain",
        status="completed",
        outcome="Screen-time reduction and Shirodhara reduced headache frequency",
        follow_up_date=now + timedelta(days=15),
    )
    t3 = Transcript(
        id=uuid4(),
        consultation_id=c3.id,
        raw_text=(
            "मला डोकेदुखी झपझप होतो, विशेषतः संगणकावर काम केल्यानंतर. "
            "डोळे दुखतात आणि दृष्टी कधी कधी अस्पष्ट होते. "
            "रात्री उशिरा झोपतो."
        ),
        selected_language="Marathi",
        detected_language="Marathi",
        duration_seconds=88.0,
        is_edited=False,
    )
    ch3 = CaseHistory(
        id=uuid4(),
        consultation_id=c3.id,
        chief_complaint="Frequent headaches and eye strain",
        history_of_present_illness="Recurrent headaches triggered by computer use, eye strain, blurred vision sometimes",
        past_medical_history=None,
        current_medications=None,
        allergies=None,
        diagnosis="Shirashoola (tension headache) associated with computer vision syndrome",
        treatment_plan="Shirodhara, eye exercises, screen time management",
        follow_up="Revisit after 15 days",
        is_ai_generated=True,
        is_approved=True,
        approved_by=dr_verified_user.id,
        approved_at=now - timedelta(days=44),
    )
    s3 = Symptom(
        id=uuid4(),
        consultation_id=c3.id,
        name="Headache",
        description="Bilateral headache after prolonged screen use",
        duration="3 months",
        severity="6/10",
        body_part="Head",
    )
    s3b = Symptom(
        id=uuid4(),
        consultation_id=c3.id,
        name="Eye strain",
        description="Dryness and pain in eyes",
        duration="3 months",
        severity="5/10",
        body_part="Eyes",
    )
    db.add_all([c3, t3, ch3, s3, s3b])

    c4 = Consultation(
        id=uuid4(),
        patient_id=demo_patients[2].id,
        doctor_id=dr_verified.id,
        consultation_date=now - timedelta(days=10),
        chief_complaint="Joint pain in knees while climbing stairs",
        status="completed",
        outcome="Prescribed supportive care, patient reports slight improvement",
        follow_up_date=now + timedelta(days=45),
    )
    t4 = Transcript(
        id=uuid4(),
        consultation_id=c4.id,
        raw_text=(
            "गुडघेदुखी जिना चढताना होतो. "
            "सकाळी उठल्यावर गुडघे कडक होतात. "
            "औषध २ वेळा घेतो. दिवसातून ३० मिनिटे चालतो."
        ),
        selected_language="Marathi",
        detected_language="Marathi",
        duration_seconds=72.0,
        is_edited=False,
    )
    ch4 = CaseHistory(
        id=uuid4(),
        consultation_id=c4.id,
        chief_complaint="Joint pain in knees while climbing stairs",
        history_of_present_illness="Knee pain on climbing stairs, morning stiffness in knees",
        past_medical_history="Type 2 diabetes (on medication), controlled BP",
        current_medications="Metformin 500 mg twice daily",
        allergies="None reported",
        diagnosis="Janu Sandhigata Vata (knee osteoarthritis)",
        treatment_plan="Snehana, januvasti, weight management, supportive AYUSH medicine",
        follow_up="Revisit after 45 days",
        is_ai_generated=True,
        is_approved=True,
        approved_by=dr_verified_user.id,
        approved_at=now - timedelta(days=9),
    )
    s4 = Symptom(
        id=uuid4(),
        consultation_id=c4.id,
        name="Knee pain",
        description="Pain in both knees while climbing stairs",
        duration="2 months",
        severity="6/10",
        body_part="Knees",
    )
    db.add_all([c4, t4, ch4, s4])

    # ---------- Synthetic reports ----------
    r1 = MedicalReport(
        id=uuid4(),
        patient_id=demo_patients[0].id,
        consultation_id=c1.id,
        title="Lumbar Spine X-ray",
        report_type="Radiology",
        file_path="synthetic/demo/lumbar_xray.pdf",
        file_type="pdf",
        extracted_text=(
            "[SYNTHETIC DEMO REPORT] Lumbar spine AP and lateral views performed. "
            "Mild reduction in L4-L5 disc space noted. "
            "No fracture or listhesis. Features suggestive of early lumbar spondylosis."
        ),
        ai_summary="Synthetic demo X-ray report: mild disc space narrowing at L4-L5, consistent with early spondylosis. No acute findings.",
        uploaded_by=dr_verified_user.id,
    )
    r2 = MedicalReport(
        id=uuid4(),
        patient_id=demo_patients[1].id,
        consultation_id=c3.id,
        title="CBC Report",
        report_type="Laboratory",
        file_path="synthetic/demo/cbc.pdf",
        file_type="pdf",
        extracted_text=(
            "[SYNTHETIC DEMO REPORT] Hemoglobin 12.8 g/dL, WBC 6400 /uL, "
            "Platelets 2.4 lakh/uL. Within normal limits."
        ),
        ai_summary="Synthetic demo CBC: all parameters within normal limits.",
        uploaded_by=dr_verified_user.id,
    )
    db.add_all([r1, r2])

    # ---------- Audit trail ----------
    a1 = AuditLog(
        id=uuid4(),
        user_id=dr_verified_user.id,
        action="login",
        entity_type="user",
        entity_id=dr_verified_user.id,
        details="Demo user logged in",
        ip_address="127.0.0.1",
    )
    a2 = AuditLog(
        id=uuid4(),
        user_id=admin.id,
        action="doctor_verified",
        entity_type="doctor",
        entity_id=dr_verified.id,
        details="Demo doctor verified in seed",
        ip_address="127.0.0.1",
    )
    a3 = AuditLog(
        id=uuid4(),
        user_id=dr_verified_user.id,
        action="case_history_approved",
        entity_type="case_history",
        entity_id=ch1.id,
        details="Demo case history approved",
        ip_address="127.0.0.1",
    )
    db.add_all([a1, a2, a3])

    db.commit()
    db.close()
    print("Seed complete. Demo accounts created:")
    print("  Admin  : admin@ayush.demo / Admin@123")
    print("  Doctor : dr.sharma@ayush.demo / Doctor@123")
    print("  Doctor : dr.patel@ayush.demo / Doctor@123 (pending verification)")
    print("  Staff  : staff@ayush.demo / Staff@123")
    print("  Patients: Patient Demo 1, 2, 3 (synthetic IDs DEMO-PATIENT-0001..0003)")


if __name__ == "__main__":
    seed()