import json
import os
import io
import google.generativeai as genai
from google import genai as genai_client
from google.genai import types as genai_types
from fastapi import HTTPException
from app.config import GEMINI_API_KEY, GEMINI_MODEL


class AIServiceError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AIService:
    def __init__(self):
        self.model = None
        self.is_configured = False
        try:
            if GEMINI_API_KEY:
                genai.configure(api_key=GEMINI_API_KEY)
                self.model = genai.GenerativeModel(
                    GEMINI_MODEL,
                    generation_config={"temperature": 0.2},
                )
                self.is_configured = True
        except Exception as e:
            print(f"AI provider configuration error: {e}")

    def check_configured(self):
        if not self.is_configured:
            raise AIServiceError(
                "AI provider not configured. Set GEMINI_API_KEY in backend/.env.",
                503,
            )

    def generate(self, prompt: str, json_mode: bool = True):
        self.check_configured()
        try:
            if json_mode:
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        response_mime_type="application/json"
                    ),
                )
            else:
                response = self.model.generate_content(prompt)
            text = response.text.strip()
            if json_mode:
                return self._parse_json(text)
            return text
        except Exception as e:
            err = str(e).lower()
            if "api key" in err:
                raise AIServiceError("Gemini API key is invalid or missing.", 401)
            if "quota" in err or "rate" in err:
                raise AIServiceError("AI provider rate limit exceeded.", 429)
            if "unavailable" in err or "500" in err:
                raise AIServiceError("AI provider is currently unavailable.", 503)
            raise AIServiceError(f"AI provider error: {str(e)}", 502)

    def _parse_json(self, text: str) -> dict:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            try:
                start = text.find("{")
                end = text.rfind("}")
                if start != -1 and end != -1:
                    return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
            raise AIServiceError("AI provider returned invalid JSON.", 502)

    def _ai_error(self, e: Exception, context: str) -> AIServiceError:
        err = str(e).lower()
        code = getattr(e, "code", None)
        if code == 401 or "api key" in err:
            return AIServiceError("Gemini API key is invalid or missing.", 401)
        if code == 429 or "quota" in err or "rate" in err:
            return AIServiceError("AI provider rate limit exceeded.", 429)
        if code in (500, 502, 503) or "unavailable" in err:
            return AIServiceError("AI provider is currently unavailable.", 503)
        return AIServiceError(f"{context}: {str(e)}", 502)

    def transcribe_audio(self, audio_bytes: bytes, mime_type: str, selected_language: str) -> dict:
        self.check_configured()
        try:
            lang_directive = (
                f"The user selected language is {selected_language} (Auto Detect is also valid)."
                if selected_language and selected_language != "Auto Detect"
                else "Language is set to Auto Detect."
            )
            prompt_parts = [
                "You are a medical speech transcription engine.",
                "Transcribe the provided patient's speech as accurately as possible.",
                "Rules:",
                "1. Preserve the speaker's actual words.",
                "2. Do not invent content.",
                "3. Do not summarize.",
                "4. Do not diagnose.",
                "5. Do not add symptoms that were not spoken.",
                "6. Do not replace unclear speech with a plausible medical statement.",
                "7. Preserve medicine names, disease names, numbers and names.",
                "8. Preserve Marathi speech as Marathi.",
                "9. Preserve Hindi speech as Hindi.",
                "10. Preserve English speech as English.",
                "11. If the speaker mixes Marathi, Hindi and English, preserve the mixed language naturally.",
                "12. Do not translate.",
                "13. If a portion is genuinely unintelligible, mark it as [unclear] rather than guessing.",
                lang_directive,
                "Return ONLY a JSON object with these fields:",
                '{"transcript": "...", "detected_language": "Marathi|Hindi|English", "confidence_note": "..."}',
            ]
            instruction = "\n".join(prompt_parts)

            content_type = mime_type or "audio/webm"
            audio_ext = ".webm" if "webm" in content_type else ".m4a" if "m4a" in content_type else ".mp3" if "mp3" in content_type else ".wav"
            client = genai_client.Client(api_key=GEMINI_API_KEY)
            try:
                uploaded = client.files.upload(
                    file=io.BytesIO(audio_bytes),
                    config=genai_types.UploadFileConfig(
                        mime_type=content_type,
                        display_name=f"consultation_audio{audio_ext}",
                    ),
                )
            except Exception as e:
                raise self._ai_error(e, "Audio file upload (Gemini Files API) failed")
            try:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=genai_types.Content(
                        parts=[
                            genai_types.Part(text=instruction),
                            genai_types.Part(
                                file_data=genai_types.FileData(
                                    file_uri=uploaded.uri,
                                    mime_type=content_type,
                                )
                            ),
                        ]
                    ),
                    config=genai_types.GenerateContentConfig(
                        response_mime_type="application/json"
                    ),
                )
            except Exception as e:
                raise self._ai_error(e, "Audio transcription failed")
            result = self._parse_json(response.text.strip())
            result.setdefault("transcript", "")
            result.setdefault("detected_language", selected_language or "English")
            return result
        except AIServiceError:
            raise
        except Exception as e:
            raise self._ai_error(e, "Audio transcription failed")

    def extract_case_history(self, transcript_text: str) -> dict:
        self.check_configured()
        prompt = f"""
You are a medical documentation assistant. Convert the given patient consultation transcript into structured case information.

IMPORTANT RULES:
1. Only extract information explicitly present in the transcript.
2. If information is missing, return null or an empty array.
3. NEVER invent medical information.
4. Do not diagnose. Present the patient's reported complaints as stated.
5. Return ONLY valid JSON.

Transcript:
{transcript_text}

Return JSON exactly in this shape:
{{
  "chief_complaint": "string or null",
  "history_of_present_illness": "string or null",
  "past_medical_history": "string or null",
  "current_medications": [],
  "allergies": [],
  "symptoms": [
    {{
      "name": "string",
      "description": "string or null",
      "duration": "string or null",
      "severity": "string or null",
      "body_part": "string or null"
    }}
  ],
  "investigations": [],
  "treatment_history": [],
  "follow_up": "string or null"
}}
"""
        return self.generate(prompt)

    def suggest_medicines(self, case_summary: str) -> dict:
        self.check_configured()
        prompt = f"""
You are an AI assistant providing medicine information and supportive care options to licensed doctors.

CRITICAL:
- You are NOT a doctor. You must NEVER present yourself as the doctor.
- You MUST NOT prescribe medicine autonomously. The doctor makes all final decisions.
- Suggestions are informational only, based on the doctor-reviewed case information provided.
- AYUSH (Ayurveda, Yoga, Unani, Siddha, Homoeopathy) and modern supportive options may be mentioned.
- Include warnings and contraindications only where supported by available information.
- If insufficient information is available, state that.

Doctor-reviewed case information:
{case_summary}

Return ONLY valid JSON in this shape:
{{
  "suggestions": [
    {{
      "medicine_name": "string",
      "category": "Ayurveda|Homoeopathy|Modern|Supportive",
      "dosage": "string or null",
      "frequency": "string or null",
      "duration": "string or null",
      "reason": "string or null",
      "warnings": "string or null",
      "relevant_context": "string or null"
    }}
  ],
  "disclaimer": "AI-assisted suggestions only. Doctor must review and verify all suggestions before prescribing."
}}
"""
        return self.generate(prompt)

    def summarize_report(self, extracted_text: str) -> str:
        self.check_configured()
        prompt = f"""
You are an AI assistant helping a licensed doctor understand a medical report.

- Do NOT make an autonomous diagnosis.
- Provide a concise summary of the report text for the doctor.
- Highlight any abnormal values or notable findings.
- If text is empty or unreadable, state that.

Report text:
{extracted_text}

Return ONLY a plain-text summary (no JSON).
"""
        return self.generate(prompt, json_mode=False)


def get_ai_service() -> AIService:
    return AIService()