import os
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from app.database import get_db
from app.models import User, Consultation
from app.services.ai_service import get_ai_service, AIService, AIServiceError
from app.schemas import STTResponse
from app.utils.security import get_current_user, require_role
from app.config import MAX_UPLOAD_SIZE_MB, UPLOAD_DIR

router = APIRouter(prefix="/api/v1/stt", tags=["speech-to-text"])


ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/ogg", "audio/mp4", "audio/m4a", "audio/mpeg", "audio/wav", "audio/x-wav"}
ALLOWED_EXTENSIONS = {".webm", ".ogg", ".m4a", ".mp3", ".mp4", ".wav"}


@router.post("/transcribe", response_model=STTResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("Auto Detect"),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(require_role("doctor")),
    db=Depends(get_db),
):
    content_type = file.content_type or ""
    ext = Path(file.filename or "").suffix.lower()

    if content_type and content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported audio type: {content_type}. Supported: webm, ogg, m4a, mp3, wav.",
        )
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported audio file extension: {ext}.",
        )

    raw = await file.read()
    if not raw or len(raw) == 0:
        raise HTTPException(status_code=422, detail="Audio file is empty")

    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large. Maximum {MAX_UPLOAD_SIZE_MB}MB.",
        )

    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    try:
        safe_name = f"stt_{current_user.id}_{os.urandom(8).hex()}{ext or '.webm'}"
        temp_path = upload_dir / safe_name
        temp_path.write_bytes(raw)

        result = ai.transcribe_audio(raw, content_type or "audio/webm", language)

        # Keep audio file for audit
        result["confidence_note"] = result.get("confidence_note", "")
        return STTResponse(
            transcript=result["transcript"],
            detected_language=result.get("detected_language", language),
            selected_language=language,
            confidence_note=result.get("confidence_note"),
            duration_seconds=None,
        )
    except AIServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Audio processing failed: {str(e)}")
    finally:
        try:
            if temp_path and temp_path.exists():
                pass
        except Exception:
            pass