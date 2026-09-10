from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import CORS_ORIGINS
from app.routes import auth, doctors, patients, consultations, ai, stt, reports, admin, health
from app.database import Base, engine

app = FastAPI(
    title="AYUSH AI Case-Taking & Digital Patient History System",
    description="""
    AYUSH AI is a doctor-facing clinical documentation and patient-history system.
    It provides secure case-taking with speech-to-text transcription (English/Hindi/Marathi),
    AI-assisted case history extraction, medicine suggestions (doctor-reviewed), medical reports,
    and an admin panel for doctor verification.

    Security: JWT authentication with role-based access. AI runs only via the backend using
    server-side Gemini credentials. All data in this system is synthetic/demo only.
    """,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


app.include_router(auth.router)
app.include_router(doctors.router)
app.include_router(patients.router)
app.include_router(consultations.router)
app.include_router(ai.router)
app.include_router(stt.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(health.router)


@app.get("/")
def root():
    return {"message": "AYUSH AI backend is running. API docs at /docs"}


def init_db():
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)


init_db()