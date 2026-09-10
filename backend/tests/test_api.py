"""
Integration tests for the AYUSH AI backend.

These tests hit real API endpoints through FastAPI's TestClient.
They require a running Postgres database (see README for setup) and
the seed data from seed.py.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ADMIN_EMAIL = "admin@ayush.demo"
ADMIN_PASSWORD = "Admin@123"
DOCTOR_EMAIL = "dr.sharma@ayush.demo"
DOCTOR_PASSWORD = "Doctor@123"
PENDING_DOCTOR_EMAIL = "dr.patel@ayush.demo"
STAFF_EMAIL = "staff@ayush.demo"
STAFF_PASSWORD = "Staff@123"


@pytest.fixture(scope="module")
def admin_token():
    r = client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def doctor_token():
    r = client.post("/api/v1/auth/login", json={"email": DOCTOR_EMAIL, "password": DOCTOR_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def staff_token():
    r = client.post("/api/v1/auth/login", json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------- Health -------------------


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"


# ------------------- Auth -------------------


def test_login_invalid_password():
    r = client.post("/api/v1/auth/login", json={"email": DOCTOR_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_login_missing_fields():
    r = client.post("/api/v1/auth/login", json={"email": DOCTOR_EMAIL})
    assert r.status_code == 422


def test_me(doctor_token):
    r = client.get("/api/v1/auth/me", headers=auth(doctor_token))
    assert r.status_code == 200
    assert r.json()["email"] == DOCTOR_EMAIL


def test_me_no_token():
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_invalid_token():
    r = client.get("/api/v1/auth/me", headers=auth("not-a-real-token"))
    assert r.status_code == 401


# ------------------- Role authorization -------------------


def test_staff_blocked_from_admin(admin_token, staff_token):
    r = client.get("/api/v1/doctors/pending", headers=auth(staff_token))
    assert r.status_code == 403


def test_staff_blocked_from_ai_history(admin_token, staff_token):
    r = client.post("/api/v1/ai/case-history", headers=auth(staff_token), json={})
    assert r.status_code == 403


def test_admin_access_pending(admin_token):
    r = client.get("/api/v1/doctors/pending", headers=auth(admin_token))
    assert r.status_code == 200


# ------------------- Doctors -------------------


def test_my_profile(doctor_token):
    r = client.get("/api/v1/doctors/me", headers=auth(doctor_token))
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["email"] == DOCTOR_EMAIL
    assert body["profile"]["verification_status"] == "verified"


def test_pending_doctors_list(admin_token):
    r = client.get("/api/v1/doctors/pending", headers=auth(admin_token))
    assert r.status_code == 200
    pending = r.json()
    emails = [d["user"]["email"] for d in pending]
    assert PENDING_DOCTOR_EMAIL in emails


# ------------------- Patients -------------------


def test_patient_search(doctor_token):
    r = client.get("/api/v1/patients/search?q=Demo", headers=auth(doctor_token))
    assert r.status_code == 200
    assert len(r.json()) >= 3


def test_patient_search_by_code(doctor_token):
    r = client.get("/api/v1/patients/search?q=AYU-2026-1001", headers=auth(doctor_token))
    assert r.status_code == 200
    names = [p["full_name"] for p in r.json()]
    assert "Patient Demo 1" in names


def test_patient_detail(doctor_token):
    r = client.get("/api/v1/patients/search?q=Patient+Demo+1", headers=auth(doctor_token))
    pid = r.json()[0]["id"]
    d = client.get(f"/api/v1/patients/{pid}", headers=auth(doctor_token))
    assert d.status_code == 200
    body = d.json()
    assert body["full_name"] == "Patient Demo 1"
    assert len(body["consultations"]) >= 1


def test_patient_not_found(doctor_token):
    r = client.get("/api/v1/patients/00000000-0000-0000-0000-000000000000", headers=auth(doctor_token))
    assert r.status_code == 404


# ------------------- Consultations -------------------


def test_create_and_consultation_flow(doctor_token):
    # find patient
    r = client.get("/api/v1/patients/search?q=Patient+Demo+2", headers=auth(doctor_token))
    pid = r.json()[0]["id"]
    # create
    c = client.post(
        "/api/v1/consultations",
        headers=auth(doctor_token),
        json={"patient_id": pid, "chief_complaint": "Test complaint"},
    )
    assert c.status_code == 201, c.text
    cid = c.json()["consultation_id"]

    # transcript
    t = client.post(
        f"/api/v1/consultations/{cid}/transcript",
        headers=auth(doctor_token),
        json={"raw_text": "Patient reports mild fever and cough.", "selected_language": "English"},
    )
    assert t.status_code == 200, t.text
    assert t.json()["raw_text"] == "Patient reports mild fever and cough."

    # edit transcript
    e = client.put(
        f"/api/v1/consultations/{cid}/transcript",
        headers=auth(doctor_token),
        json={"raw_text": "Patient reports mild fever, cough and headache."},
    )
    assert e.status_code == 200
    assert e.json()["is_edited"] is True

    # case history
    ch = client.post(
        f"/api/v1/consultations/{cid}/case-history",
        headers=auth(doctor_token),
        json={
            "chief_complaint": "Fever and cough",
            "symptoms": [{"name": "Fever", "severity": "mild"}],
            "is_ai_generated": True,
        },
    )
    assert ch.status_code == 200, ch.text

    # duplicate case history -> 409
    dup = client.post(
        f"/api/v1/consultations/{cid}/case-history",
        headers=auth(doctor_token),
        json={"chief_complaint": "x"},
    )
    assert dup.status_code == 409

    # update case history
    up = client.put(
        f"/api/v1/consultations/{cid}/case-history",
        headers=auth(doctor_token),
        json={"diagnosis": "Test diagnosis", "treatment_plan": "Rest"},
    )
    assert up.status_code == 200
    assert up.json()["diagnosis"] == "Test diagnosis"

    # approve
    ap = client.post(
        f"/api/v1/consultations/{cid}/case-history/approve",
        headers=auth(doctor_token),
        json={"is_approved": True},
    )
    assert ap.status_code == 200
    assert ap.json()["is_approved"] is True

    # medicine suggestions
    ms = client.post(
        f"/api/v1/consultations/{cid}/medicine-suggestions",
        headers=auth(doctor_token),
        json={"suggestions": [{"medicine_name": "Tulsi", "dosage": "10 drops"}]},
    )
    assert ms.status_code == 200, ms.text
    sid = ms.json()[0]["id"]

    upd = client.put(
        f"/api/v1/consultations/{cid}/medicine-suggestions/{sid}",
        headers=auth(doctor_token),
        json={"status": "accepted", "doctor_notes": "approved"},
    )
    assert upd.status_code == 200
    assert upd.json()["status"] == "accepted"

    # complete
    done = client.put(
        f"/api/v1/consultations/{cid}/status",
        headers=auth(doctor_token),
        json={"status": "completed", "outcome": "Reviewed"},
    )
    assert done.status_code == 200

    # detail
    detail = client.get(f"/api/v1/consultations/{cid}", headers=auth(doctor_token))
    assert detail.status_code == 200
    body = detail.json()
    assert body["patient"]["full_name"] == "Patient Demo 2"
    assert body["case_history"]["is_approved"] is True
    assert len(body["medicine_suggestions"]) == 1


def test_create_consultation_bad_patient(doctor_token):
    c = client.post(
        "/api/v1/consultations",
        headers=auth(doctor_token),
        json={"patient_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert c.status_code == 404


# ------------------- Reports -------------------


def test_upload_and_list_report(doctor_token):
    r = client.get("/api/v1/patients/search?q=Patient+Demo+1", headers=auth(doctor_token))
    pid = r.json()[0]["id"]

    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
    files = {"file": ("demo_report.pdf", pdf_bytes, "application/pdf")}
    data = {"patient_id": pid, "title": "Synthetic Demo Report", "report_type": "Laboratory"}
    up = client.post("/api/v1/reports", headers=auth(doctor_token), files=files, data=data)
    assert up.status_code == 201, up.text
    assert up.json()["title"] == "Synthetic Demo Report"

    lst = client.get(f"/api/v1/reports?patient_id={pid}", headers=auth(doctor_token))
    assert lst.status_code == 200
    assert any(x["title"] == "Synthetic Demo Report" for x in lst.json())


def test_upload_rejects_bad_type(doctor_token):
    r = client.get("/api/v1/patients/search?q=Patient+Demo+1", headers=auth(doctor_token))
    pid = r.json()[0]["id"]
    files = {"file": ("bad.txt", "hello", "text/plain")}
    up = client.post("/api/v1/reports", headers=auth(doctor_token), files=files, data={"patient_id": pid})
    assert up.status_code == 422


# ------------------- Admin actions -------------------


def test_admin_verify_pending_doctor(admin_token):
    """Verification flow using a disposable doctor created directly in the DB.
    The seeded dr.patel must stay pending so the demo workflow remains intact."""
    from uuid import uuid4

    from app.database import SessionLocal
    from app.models import DoctorProfile, User, UserRole, VerificationStatus
    from app.utils.security import hash_password

    db = SessionLocal()
    try:
        u = User(
            id=uuid4(),
            email=f"tmp-verify-{uuid4().hex[:8]}@ayush.demo",
            hashed_password=hash_password("Tmp@123"),
            full_name="Temp Verify Doc",
            role=UserRole.DOCTOR,
            is_active=True,
        )
        db.add(u)
        db.flush()
        p = DoctorProfile(
            id=uuid4(),
            user_id=u.id,
            qualification="TEST",
            specialization="TEST",
            experience_years=1,
            verification_status=VerificationStatus.PENDING,
        )
        db.add(p)
        db.commit()
        profile_id = str(p.id)
    finally:
        db.close()

    v = client.post(f"/api/v1/doctors/{profile_id}/verify", headers=auth(admin_token))
    assert v.status_code == 200
    assert v.json()["status"] == "verified"

    again = client.get("/api/v1/doctors/pending", headers=auth(admin_token))
    ids = [d["profile"]["id"] for d in again.json()]
    assert profile_id not in ids


def test_admin_dashboard(admin_token):
    r = client.get("/api/v1/admin/dashboard", headers=auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert "total_patients" in body
    assert "pending_doctors" in body
    assert body["total_patients"] >= 3


def test_admin_audit_logs(admin_token):
    r = client.get("/api/v1/admin/audit-logs", headers=auth(admin_token))
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ------------------- AI (no key) graceful errors -------------------


def test_ai_unavailable_without_key(doctor_token):
    """Without a GEMINI_API_KEY the system must return a clear error, never a fake result."""
    r = client.get("/api/v1/health")
    if r.json()["ai_provider_configured"]:
        pytest.skip("AI provider is configured; skipping graceful-degradation test.")
    # use a real consultation id so the request reaches the AI call
    search = client.get("/api/v1/consultations", headers=auth(doctor_token))
    cid = search.json()[0]["id"]
    r = client.post(
        "/api/v1/ai/case-history",
        headers=auth(doctor_token),
        json={"consultation_id": cid, "transcript": "test"},
    )
    assert r.status_code == 503
    assert "AI provider" in r.json()["detail"]


def test_stt_empty_audio(doctor_token):
    files = {"file": ("empty.webm", b"", "audio/webm")}
    r = client.post("/api/v1/stt/transcribe", headers=auth(doctor_token), files=files, data={"language": "English"})
    assert r.status_code == 422


def test_stt_bad_mime(doctor_token):
    files = {"file": ("x.txt", b"hello world", "text/plain")}
    r = client.post("/api/v1/stt/transcribe", headers=auth(doctor_token), files=files, data={"language": "English"})
    assert r.status_code == 422