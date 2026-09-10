# 🩺 Clinix — AI-Assisted Digital Consultation Platform

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,50:1e3a5f,100:0ea5e9&height=180&section=header&text=Clinix&fontSize=55&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=AI-Assisted%20Digital%20Patient%20Case-Taking&descAlignY=58&descSize=18" />

### 🧑‍⚕️ AI-assisted documentation • 🎙️ Speech-to-text • 📋 Digital patient history

**Built for Smart India Hackathon (SIH) 2026**

<br/>

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge\&logo=python\&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge\&logo=fastapi\&logoColor=white)
![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=for-the-badge\&logo=react\&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge\&logo=postgresql\&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge\&logo=docker\&logoColor=white)
![Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4?style=for-the-badge\&logo=google\&logoColor=white)

</div>

---

## 📌 About Clinix

**Clinix** is a doctor-facing digital consultation and patient-history platform designed to reduce manual documentation during consultations.

The system captures the patient's conversation, converts speech into text, and uses AI to create a structured draft of the case history.

The important principle is:

> **AI assists the doctor — the doctor remains in control.**

AI-generated content is always **reviewable, editable, and requires explicit doctor approval** before being used in the consultation workflow.

**All project data is synthetic. No real patient information is stored.**

---

# ✨ Key Features

### 🎙️ Speech-to-Text

* Real-time microphone recording
* English, Hindi and Marathi support
* Auto Detect language option
* MediaRecorder-based audio capture
* Audio MIME-type normalization
* Microphone signal detection
* Upload diagnostics
* Transcript remains editable by the doctor

### 📝 AI Case History

Gemini converts the approved transcript into a structured draft containing information such as:

* Chief Complaint
* History of Present Illness
* Symptoms
* Relevant patient history

The doctor can:

**Generate → Review → Edit → Approve**

AI output is never automatically treated as the final medical record.

### 💊 AI Medicine Suggestions

Medicine suggestions are intentionally protected by an approval workflow:

```text
Patient Conversation
        ↓
Speech-to-Text
        ↓
Doctor Reviews Transcript
        ↓
AI Generates Case History
        ↓
Doctor Reviews & Approves
        ↓
Medicine Suggestions Available
        ↓
Doctor Accepts / Rejects / Edits
```

This prevents AI-generated suggestions from being presented as final treatment decisions.

---

# 🧠 AI Safety Design

Clinix follows a **Human-in-the-Loop** approach.

| AI Function             | Doctor Control         |
| ----------------------- | ---------------------- |
| Speech transcription    | Review & edit          |
| Case history generation | Review, edit & approve |
| Medicine suggestions    | Accept, reject or edit |
| Diagnosis               | **Doctor controlled**  |
| Treatment plan          | **Doctor controlled**  |

### 🔐 Core Rule

**The AI does not replace the doctor.**

The system is designed to assist with documentation and information organization while keeping clinical decisions with the practitioner.

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │    React Frontend   │
                    │ TypeScript + Vite   │
                    └──────────┬──────────┘
                               │
                               │ REST API + JWT
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend   │
                    │      Python         │
                    └──────┬───────┬──────┘
                           │       │
                 ┌─────────┘       └──────────┐
                 ▼                            ▼
        ┌─────────────────┐          ┌─────────────────┐
        │   PostgreSQL    │          │  Gemini API     │
        │ Patient History │          │ AI Processing   │
        │ Consultations   │          └─────────────────┘
        │ Audit Logs      │
        └─────────────────┘

                           │
                           ▼
                    ┌─────────────────┐
                    │ Local Uploads   │
                    │ Audio / Reports │
                    └─────────────────┘
```

### 🔒 AI Request Flow

```text
React
  │
  ▼
FastAPI
  │
  ├── Authentication
  ├── Validation
  ├── Business Logic
  │
  ▼
Gemini API
  │
  ▼
FastAPI
  │
  ▼
React
```

The Gemini API key is **never exposed to the frontend or browser**.

---

# 🛠️ Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* MediaRecorder API

## Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* JWT Authentication
* Argon2 Password Hashing

## Database

* PostgreSQL

## AI

* Google Gemini API

## Development & Infrastructure

* Docker
* Git
* GitHub
* Pytest

---

# 📂 Project Structure

```text
clinix/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   │
│   │   ├── models/
│   │   │   └── __init__.py
│   │   │
│   │   ├── schemas/
│   │   │   └── __init__.py
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── doctors.py
│   │   │   ├── patients.py
│   │   │   ├── consultations.py
│   │   │   ├── ai.py
│   │   │   ├── stt.py
│   │   │   ├── reports.py
│   │   │   ├── admin.py
│   │   │   └── health.py
│   │   │
│   │   ├── services/
│   │   │   └── ai_service.py
│   │   │
│   │   └── utils/
│   │
│   ├── tests/
│   │   └── test_api.py
│   │
│   ├── seed.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── pages/
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
└── README.md
```

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd clinix
```

---

## 2. Backend Setup

```bash
cd backend

python -m venv .venv
```

### Windows

```powershell
.venv\Scripts\activate
```

### macOS / Linux

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 🔑 Environment Variables

Create:

```text
backend/.env
```

from:

```text
backend/.env.example
```

Example:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/clinix

JWT_SECRET_KEY=change-this-secret

JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=gemini-2.0-flash

CORS_ORIGINS=http://localhost:5173

UPLOAD_DIR=uploads

MAX_UPLOAD_SIZE_MB=25
```

### ⚠️ Security

Never commit `.env` to GitHub.

```text
.env
.env.local
```

should remain in `.gitignore`.

---

# 🗄️ Database Setup

Clinix uses PostgreSQL.

Create the database:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE clinix;"
```

Initialize the application:

```bash
cd backend

python -c "from app.main import app"
```

Seed synthetic demo data:

```bash
python seed.py
```

---

# ▶️ Run the Backend

From the `backend` directory:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Backend:

```text
http://localhost:8001
```

Swagger documentation:

```text
http://localhost:8001/docs
```

OpenAPI:

```text
http://localhost:8001/openapi.json
```

Health check:

```text
http://localhost:8001/api/v1/health
```

---

# 💻 Run the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🔐 Demo Accounts

The project uses synthetic demo accounts.

| Role           | Email                  | Purpose                              |
| -------------- | ---------------------- | ------------------------------------ |
| Admin          | `admin@ayush.demo`     | Doctor verification & administration |
| Doctor         | `dr.sharma@ayush.demo` | Consultation workflow                |
| Pending Doctor | `dr.patel@ayush.demo`  | Verification workflow                |
| Staff          | `staff@ayush.demo`     | Staff access                         |

> Demo passwords are defined by the local seed configuration and should never be used in production.

---

# 🧪 Testing

Backend integration tests:

```bash
cd backend
python -m pytest tests/test_api.py -q
```

Current test suite:

**24+ passing tests**

Frontend production build:

```bash
cd frontend
npm run build
```

---

# 🔄 Complete Consultation Workflow

```text
1. Doctor Login
       ↓
2. Search Patient
       ↓
3. Open Patient Record
       ↓
4. Start Consultation
       ↓
5. Select Language
       ↓
6. Record Conversation
       ↓
7. Generate Transcript
       ↓
8. Doctor Reviews Transcript
       ↓
9. Edit / Save Transcript
       ↓
10. Generate Case History
       ↓
11. Doctor Reviews Case History
       ↓
12. Doctor Approves Case
       ↓
13. Request AI Medicine Suggestions
       ↓
14. Doctor Reviews Suggestions
       ↓
15. Accept / Reject / Edit
       ↓
16. Complete Consultation
```

---

# 👨‍⚕️ Doctor Verification

Clinix also includes an administrative verification workflow.

```text
Doctor Registration
        ↓
Pending Verification
        ↓
Admin Review
        ↓
Verify / Reject
        ↓
Audit Log
```

Administrative actions are recorded for traceability.

---

# 📊 Patient Records

The platform supports:

* Patient search
* Patient profiles
* Consultation history
* Digital case history
* Transcripts
* Reports
* Consultation timeline
* Audit logging

All demo records are synthetic.

---

# 📄 Reports

Supported report formats:

* PDF
* JPG
* PNG

PDF reports can be text-extracted.

Image reports can be processed using Gemini multimodal capabilities when the API key is configured.

---

# 🔒 Security

Clinix implements:

* JWT authentication
* Argon2 password hashing
* Role-based access control
* Backend-only Gemini API access
* Environment-based secrets
* Protected API routes
* Doctor verification
* Audit logging
* Input validation
* File upload restrictions

---

# ⚠️ Current Limitations

Clinix is currently a **prototype / SIH demonstration project**, not a production medical system.

### AI Availability

Gemini features require:

```text
GEMINI_API_KEY
```

If the key is unavailable, the backend returns a clear AI-provider error instead of generating fake output.

### Speech Recognition

Speech-to-text depends on the configured AI service and supported audio formats.

### Data

All current data is synthetic.

**No real patient records should be uploaded.**

### Production Readiness

A production deployment would require additional work around:

* Healthcare compliance
* Encryption and key management
* Secure cloud storage
* Production-grade monitoring
* Stronger access policies
* Data retention policies
* Formal security testing
* Regulatory requirements

---

# 🎯 Project Goals

Clinix is designed around three main goals:

### 1️⃣ Reduce Documentation Work

Convert spoken consultation information into structured digital records.

### 2️⃣ Improve Patient History Management

Keep consultation information organized and easier for practitioners to review.

### 3️⃣ Keep Doctors in Control

Use AI as an assistant rather than an autonomous medical decision-maker.

---

# 🧩 Key Engineering Lessons

During development, several real-world engineering problems were encountered.

### 🎙️ Audio Handling

Microphone recordings required:

* Signal validation
* MIME normalization
* Upload diagnostics
* Empty/silent audio detection

### 🤖 AI Rate Limits

Gemini quota limits can produce HTTP `429` responses.

Clinix handles this with a clear retry experience rather than exposing confusing technical errors to the user.

### 🔐 Backend-Only AI

The Gemini API key is intentionally kept on the backend:

```text
❌ React → Gemini

✅ React → FastAPI → Gemini
```

This prevents exposing the API credential in browser code.

---

# 🌟 Project Highlights

<div align="center">

| Feature                   | Status |
| ------------------------- | ------ |
| 🔐 JWT Authentication     | ✅      |
| 👨‍⚕️ Doctor Verification | ✅      |
| 👥 Patient Management     | ✅      |
| 🎙️ Speech-to-Text        | ✅      |
| 📝 AI Case History        | ✅      |
| 💊 AI Suggestions         | ✅      |
| 📄 Report Upload          | ✅      |
| 📊 Patient Timeline       | ✅      |
| 🧾 Audit Logs             | ✅      |
| 🧪 Automated Tests        | ✅      |
| 🐳 Docker Database        | ✅      |

</div>

---

# 📈 Future Improvements

* 🌐 Cloud deployment
* 📱 Improved mobile experience
* 🔊 More robust multilingual speech processing
* 🗂️ Advanced patient-history search
* 📊 Analytics dashboard
* 🔐 Production-grade encryption
* 🧪 Expanded automated test coverage
* ☁️ Secure cloud storage
* ⚡ Improved AI response handling

---

# 👨‍💻 Developer

<div align="center">

### Harshvardhan Kamble

**Computer Science Engineering Student | Full-Stack Developer**

<a href="https://github.com/harshukamble2607-commits">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
</a>

<a href="https://www.linkedin.com/in/harshvardhan-kamble-36820132a">
<img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" />
</a>

</div>

---

# 🏆 Smart India Hackathon 2026

**Problem Area:** MedTech / BioTech / HealthTech

**Problem Statement:** Ministry of AYUSH

**Project:** Clinix

**Focus:** Digital patient case-taking, consultation documentation and AI-assisted clinical workflow.

---

<div align="center">

### 🚀 Build. Learn. Improve.

⭐ If you find Clinix interesting, consider giving the repository a star!

<br/>

<img src="https://komarev.com/ghpvc/?username=harshukamble2607-commits&label=Profile%20Views&color=0ea5e9&style=for-the-badge" />

</div>
