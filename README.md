# AYUSH AI — Case-Taking & Digital Patient History System

Doctor-facing clinical documentation and patient-history platform for the
**Smart India Hackathon (SIH) 2026**, aligned with the **Ministry of AYUSH**
problem statement.

- FastAPI (Python 3.11+) backend with PostgreSQL, JWT + Argon2 security
- React (Vite + TypeScript + Tailwind) responsive frontend
- Google Gemini AI runs **only on the backend** through environment variables
- Speech-to-text (English / Hindi / Marathi, plus Auto Detect) via MediaRecorder
- AI never replaces the doctor: everything AI produces is reviewable, editable and must be approved by the doctor
- **All data is synthetic.** No real patient information is ever stored.

---

## 1. Project Structure

```
ayush-ai/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS, router mounting
│   │   ├── config.py             # Environment configuration
│   │   ├── database.py           # SQLAlchemy engine / session
│   │   ├── models/__init__.py    # All ORM models (12 tables)
│   │   ├── schemas/__init__.py   # Pydantic schemas
│   │   ├── routes/
│   │   │   ├── auth.py           # login, me
│   │   │   ├── doctors.py        # profile, verify, reject, pending
│   │   │   ├── patients.py       # list, search, detail, create
│   │   │   ├── consultations.py  # CRUD, transcript, case history, suggestions
│   │   │   ├── ai.py             # case-history + medicine suggestions (Gemini)
│   │   │   ├── stt.py            # POST /stt/transcribe (audio → Gemini)
│   │   │   ├── reports.py        # PDF/JPG/PNG upload + AI summary
│   │   │   ├── admin.py          # dashboard + audit logs
│   │   │   └── health.py         # health check
│   │   ├── services/ai_service.py  # Gemini integration (server-side only)
│   │   └── utils/                # security (JWT/Argon2), audit logging
│   ├── tests/test_api.py         # 25 integration tests
│   ├── seed.py                   # Synthetic demo data seeder
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.ts         # Centralized API client (JWT, upload, errors)
│   │   ├── context/AuthContext.tsx
│   │   ├── hooks/useRecorder.ts  # MediaRecorder hook
│   │   ├── components/           # Layout, ProtectedRoute, UI kit
│   │   └── pages/                # Login, Dashboard, Patients, PatientProfile,
│   │                             # Consultations, ConsultationWorkspace,
│   │                             # Reports, Profile, Settings, Admin* (3)
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
└── README.md
```

## 2. Installation Commands

```bash
# Backend (Python 3.11+/3.12 recommended)
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate      macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

# Frontend (Node 18+)
cd frontend
npm install
```

## 3. Environment Variables

Backend — copy `backend/.env.example` to `backend/.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://user:pass@localhost:5432/ayush_ai` |
| `JWT_SECRET_KEY` | Secret used to sign JWTs |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime (default 60) |
| `GEMINI_API_KEY` | Gemini API key (leave empty to test graceful AI-unavailable errors) |
| `GEMINI_MODEL` | e.g. `gemini-1.5-flash` / `gemini-2.0-flash` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `UPLOAD_DIR` / `MAX_UPLOAD_SIZE_MB` | Report/audio storage settings |

Frontend — copy `frontend/.env.example` to `frontend/.env`:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | e.g. `http://localhost:8001/api/v1` |

> The Gemini API key **never** appears in React code or the browser. All AI calls
> go `React → FastAPI → Gemini`.

## 4. Database Setup

```bash
# One-time: create the database (adjust to your Postgres setup)
psql -U postgres -h localhost -c "CREATE DATABASE ayush_ai;"

# Create tables + schema
cd backend
python -c "from app.main import app"   # creates all tables on startup

# Seed synthetic demo data (users, doctors, 3 patients, consultations,
# transcripts, case histories, suggestions, reports, audit logs)
python seed.py
```

## 5. Backend Start

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## 6. Frontend Start

```bash
cd frontend
npm run dev        # http://localhost:5173
```

## 7. Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ayush.demo` | `Admin@123` |
| Doctor (verified) | `dr.sharma@ayush.demo` | `Doctor@123` |
| Doctor (pending verification) | `dr.patel@ayush.demo` | `Doctor@123` |
| Staff | `staff@ayush.demo` | `Staff@123` |

Patients: **Patient Demo 1 / 2 / 3** (synthetic IDs `DEMO-PATIENT-0001..0003`,
codes `AYU-2026-1001..1003`). No Aadhaar or real information is present.

## 8. API Documentation

- Swagger UI: `http://localhost:8001/docs`
- OpenAPI JSON: `http://localhost:8001/openapi.json`
- Health: `GET /api/v1/health`

## 9. Testing the Complete Consultation Workflow

1. Open `http://localhost:5173` → click **doctor demo account** → Sign in.
2. Dashboard loads with stats. Click **Quick Start Consultation** (or **Patients**).
3. In Patient search, type `Demo` → **View Record** (Patient Demo 1).
4. Click **Start New Consultation** → the consultation workspace opens.
5. Choose a language (**English / Hindi / Marathi / Auto Detect**).
6. Click **Start Recording** → speak (demo audio from your mic) → **Stop**.
7. Click **Generate Transcript**. The transcript appears (**AI transcription — doctor review required**).
   - If no `GEMINI_API_KEY` is set, the UI shows a clear error and logs the technical detail to the console only.
8. Use **Edit Transcript** to correct anything → **Save Transcript**.
9. Click **Generate Case History** → structured fields appear. Edit/adjust any field.
10. Click **Accept & Approve Case History** → status becomes **Doctor Approved**.
11. Click **Request AI Medicine Suggestions** → review each suggestion → **Accept / Reject / Edit**.
12. Click **Complete Consultation**.
13. Open the patient record again to see the updated history and timeline.

Admin verification flow: sign in as **admin** → **Verify Doctors** → Verify or Reject
the pending doctor → check **Audit Logs** for the recorded action.

Run the automated checks:

```bash
cd backend
python -m pytest tests/test_api.py -q   # 25 integration tests
cd ../frontend
npm run build                           # type-check + production build
```

## 10. Known Limitations

- **AI availability**: Gemini features require `GEMINI_API_KEY` in `backend/.env`.
  Without it the app runs fully and returns a clear *"AI provider not configured"*
  error (503) — it never fakes AI output. Actual STT / case-history / suggestion
  responses were verified only against the error paths in this environment.
- **Recording**: `MediaRecorder` (Chrome/Edge/Firefox). Safari is supported where
  `audio/mp4` is available. Transcription preserves the patient's spoken language;
  it is not machine-translated.
- **Reports**: PDFs are text-extracted with `pypdf`. Image (JPG/PNG) summaries rely
  on Gemini multimodality; without a key the report is uploaded and stored but not summarized.
- **Demo-only**: No real patient data; doctor verification, reports and audio are
  stored locally under `backend/uploads` or in PostgreSQL.
- **Port 8000** may be occupied by an older demo backend on some machines; the new
  backend uses **8001**.