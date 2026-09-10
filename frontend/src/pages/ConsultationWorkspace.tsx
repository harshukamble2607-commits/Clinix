import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Send,
  FileText,
  Sparkles,
  Pill,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserRound,
  Languages,
  Save,
  Stethoscope,
} from "lucide-react";
import { api, ApiError, userFacingMessage } from "../api/client";
import { useRecorder } from "../hooks/useRecorder";
import type {
  FullConsultation,
  STTResponse,
  ExtractedCaseHistory,
  MedicineSuggestionResult,
} from "../types";
import {
  Card,
  CardHeader,
  Badge,
  Spinner,
  EmptyState,
  Alert,
  Button,
  Textarea,
  Select,
  FieldLabel,
  formatDateTime,
  formatDuration,
} from "../components/ui";

const LANGUAGES = ["Auto Detect", "English", "Hindi", "Marathi"];

export default function ConsultationWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const recorder = useRecorder();

  const [consultation, setConsultation] = useState<FullConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [language, setLanguage] = useState("Auto Detect");

  const [transcribing, setTranscribing] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const [transcriptReady, setTranscriptReady] = useState(false);

  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");

  const [extractingCase, setExtractingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [caseRateLimited, setCaseRateLimited] = useState(false);
  const [caseDraft, setCaseDraft] = useState<any>(null);
  const [caseApproved, setCaseApproved] = useState(false);

  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionSource, setSuggestionSource] = useState<MedicineSuggestionResult | null>(null);
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editingSuggestionDraft, setEditingSuggestionDraft] = useState<any>(null);

  const [completing, setCompleting] = useState(false);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const editableCaseRef = useRef<any>(null);
  editableCaseRef.current = caseDraft;

  const caseGeneratingRef = useRef(false);
  const lastCaseTranscriptRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const c = await api.get<FullConsultation>(`/consultations/${id}`);
      setConsultation(c);
      if (c.transcript) {
        setTranscriptText(c.transcript.raw_text);
        setTranscriptReady(true);
        if (c.transcript.selected_language) setLanguage(c.transcript.selected_language);
      }
      if (c.case_history) {
        setCaseApproved(c.case_history.is_approved);
        setCaseDraft({
          bd_chief_complaint: c.case_history.chief_complaint,
          bd_hpi: c.case_history.history_of_present_illness,
          bd_pmh: c.case_history.past_medical_history,
          bd_meds: c.case_history.current_medications,
          bd_allergies: c.case_history.allergies,
          bd_dx: c.case_history.diagnosis,
          bd_tx: c.case_history.treatment_plan,
          bd_fu: c.case_history.follow_up,
          storage: {
            id: c.case_history.id,
            chief_complaint: c.case_history.chief_complaint,
            history_of_present_illness: c.case_history.history_of_present_illness,
            past_medical_history: c.case_history.past_medical_history,
            current_medications: c.case_history.current_medications,
            allergies: c.case_history.allergies,
            diagnosis: c.case_history.diagnosis,
            treatment_plan: c.case_history.treatment_plan,
            follow_up: c.case_history.follow_up,
            investigations: c.case_history.investigations,
            is_ai_generated: c.case_history.is_ai_generated,
            is_approved: c.case_history.is_approved,
          },
        });
      }
      if (c.medicine_suggestions && c.medicine_suggestions.length > 0) {
        setSuggestions(c.medicine_suggestions);
      }
    } catch (err) {
      setLoadError(userFacingMessage(err, "Could not load the consultation."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const splitList = (value: string | null | undefined): string[] => {
    if (typeof value !== "string" || !value.trim()) return [];
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const mapCaseHistoryToDraft = (res: ExtractedCaseHistory) => ({
    storage: {
      chief_complaint: res.chief_complaint ?? null,
      history_of_present_illness: res.history_of_present_illness ?? null,
      past_medical_history: res.past_medical_history ?? null,
      current_medications: Array.isArray(res.current_medications)
        ? res.current_medications.join(", ")
        : res.current_medications ?? null,
      allergies: Array.isArray(res.allergies)
        ? res.allergies.join(", ")
        : res.allergies ?? null,
      diagnosis: null,
      treatment_plan: null,
      investigations: Array.isArray(res.investigations)
        ? res.investigations.join(", ")
        : res.investigations ?? null,
      follow_up: res.follow_up ?? null,
      symptoms: res.symptoms ?? [],
      is_ai_generated: true,
      is_approved: false,
    },
  });

  const buildCaseStrings = (draft: any) => {
    const storage = draft?.storage ?? {};
    const strings: any = {};
    (Object.keys(storage) as string[]).forEach((k) => {
      if (k === "symptoms" || k === "is_ai_generated" || k === "is_approved") return;
      const val = storage[k];
      strings[k] = typeof val === "string" ? val : null;
    });
    return strings;
  };

  const persistCaseDraft = async (draft: any) => {
    if (!consultation) return;
    const strings = buildCaseStrings(draft);
    const createPayload: any = {
      ...strings,
      current_medications: splitList(strings.current_medications),
      allergies: splitList(strings.allergies),
      investigations: splitList(strings.investigations),
      is_ai_generated: true,
      symptoms: draft?.storage?.symptoms ?? [],
    };
    try {
      await api.post(`/consultations/${consultation.id}/case-history`, createPayload);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await api.put(`/consultations/${consultation.id}/case-history`, strings);
      } else {
        throw err;
      }
    }
  };

  const generateCaseFromTranscript = async (transcript: string): Promise<boolean> => {
    if (!consultation) return false;
    if (caseGeneratingRef.current) return false;
    caseGeneratingRef.current = true;
    lastCaseTranscriptRef.current = transcript;
    setCaseError(null);
    setCaseRateLimited(false);
    setExtractingCase(true);
    try {
      const caseRes = await api.post<ExtractedCaseHistory>("/ai/case-history", {
        consultation_id: consultation.id,
        transcript,
      }, 120000);
      const draft = mapCaseHistoryToDraft(caseRes);
      setCaseDraft(draft);
      setCaseApproved(false);
      await persistCaseDraft(draft);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setCaseError("AI rate limit reached. Please retry after a short wait.");
        setCaseRateLimited(true);
      } else {
        setCaseError(userFacingMessage(err, "Case history generation failed. Please try again."));
      }
      return false;
    } finally {
      setExtractingCase(false);
      caseGeneratingRef.current = false;
    }
  };

  const handleRetryCase = async () => {
    if (!consultation || caseGeneratingRef.current) return;
    const transcript = lastCaseTranscriptRef.current ?? transcriptText;
    if (!transcript.trim()) return;
    const ok = await generateCaseFromTranscript(transcript);
    if (ok) setSavedFlash("AI case history generated. Review and approve before saving.");
  };

  const handleTranscribe = async () => {
    const blob = recorder.blob;
    if (!blob) {
      setSttError("Audio recording is empty. Please record again before transcribing.");
      return;
    }
    setTranscribing(true);
    setSttError(null);
    const diag = recorder.getUploadDiagnostics();
    if (diag) {
      console.log(
        "[STT-PRE-UPLOAD] MIME:", diag.mimeType,
        "| Blob size:", diag.blobSize,
        "| duration:", diag.durationSeconds.toFixed(2) + "s",
        "| track state:", diag.track
          ? `${diag.track.readyState}/enabled=${diag.track.enabled}/muted=${diag.track.muted}`
          : "n/a",
        "| mic signal:", diag.signalDetected ? "YES" : "NO",
        "| audioContext:", diag.audioContextState,
        "| dataavailable events:", diag.dataAvailableEvents,
      );
    }
    const form = new FormData();
    form.append("file", blob, `recording_${Date.now()}.${blob.type.includes("webm") ? "webm" : "ogg"}`);
    form.append("language", language);
    try {
      const res = await api.upload<STTResponse>("/stt/transcribe", form, 120000);
      setTranscriptText(res.transcript);
      setTranscriptReady(true);
      setEditingTranscript(false);
      if (res.detected_language && language === "Auto Detect") {
        setLanguage(res.detected_language);
      }
      // persist transcript
      if (consultation) {
        await api.post(`/consultations/${consultation.id}/transcript`, {
          raw_text: res.transcript,
          selected_language: language,
          detected_language: res.detected_language,
          duration_seconds: res.duration_seconds,
          confidence_note: res.confidence_note,
        });
        if (consultation.case_history?.is_approved) {
          setSavedFlash("Transcript saved. AI transcription — doctor review required.");
        } else {
          const ok = await generateCaseFromTranscript(res.transcript);
          setSavedFlash(
            ok
              ? "Transcript saved and AI case history auto-generated. Review and approve it in Structured Case History."
              : "Transcript saved. AI transcription — doctor review required."
          );
        }
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 401)) {
        setSttError("Gemini API key is invalid or missing. Ask the administrator to configure the backend.");
      } else {
        setSttError(userFacingMessage(err, "Transcription failed. Please try recording again."));
      }
      console.error("[STT] Transcription error:", err);
    } finally {
      setTranscribing(false);
    }
  };

  const saveTranscript = async () => {
    if (!consultation) return;
    if (!transcriptText.trim()) {
      setSttError("Transcript text is empty. Please enter the transcript or re-record.");
      return;
    }
    setSttError(null);
    try {
      await api.put(`/consultations/${consultation.id}/transcript`, { raw_text: transcriptText });
      await load();
      setSavedFlash("Transcript saved.");
    } catch (err) {
      setSttError(userFacingMessage(err, "Could not save the transcript."));
    }
  };

  const handleGenerateCase = async () => {
    if (!consultation || caseGeneratingRef.current) return;
    if (!transcriptText.trim()) {
      setCaseError("Cannot generate a case history from an empty transcript.");
      return;
    }
    const ok = await generateCaseFromTranscript(transcriptText);
    if (ok) setSavedFlash("AI case history generated. Review and approve before saving.");
  };

  const updateCaseField = (field: keyof typeof caseDraft.storage, value: string) => {
    setCaseDraft((d: any) => ({ ...d, storage: { ...d.storage, [field]: value } }));
  };

  const renderCaseField = (label: string, field: string, type: "text" | "area" = "area") => {
    const value = caseDraft?.storage?.[field] ?? "";
    const doctorField = field === "diagnosis" || field === "treatment_plan";
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <Textarea
          rows={type === "text" ? 1 : 3}
          value={value ?? ""}
          onChange={(e) => updateCaseField(field as any, e.target.value)}
          placeholder={doctorField ? "Doctor to enter" : "Not stated — add if available"}
        />
      </div>
    );
  };

  const approveAndSaveCase = async () => {
    if (!consultation || !caseDraft) return;
    try {
      const payload: any = {};
      const s = caseDraft.storage;
      (Object.keys(s) as Array<keyof typeof s>).forEach((k) => {
        if (typeof s[k] === "string") payload[k] = s[k];
      });
      await api.put(`/consultations/${consultation.id}/case-history`, payload);
      await api.post(`/consultations/${consultation.id}/case-history/approve`, { is_approved: true });
      setCaseApproved(true);
      await load();
      setSavedFlash("Case history approved and finalized.");
    } catch (err) {
      setCaseError(userFacingMessage(err, "Could not save the approved case history."));
    }
  };

  const handleFetchSuggestions = async () => {
    if (!consultation) return;
    if (!caseApproved) {
      setSuggestionsError("The approved case history is required before medicine suggestions can be generated. Approve the Structured Case History first.");
      return;
    }
    const summary =
      caseDraft?.storage?.chief_complaint ||
      consultation.chief_complaint ||
      (caseDraft?.storage?.history_of_present_illness ?? "") ||
      transcriptText.slice(0, 3000);
    if (!summary.trim()) {
      setSuggestionsError("No case information available. Approve the case history first.");
      return;
    }
    setFetchingSuggestions(true);
    setSuggestionsError(null);
    try {
      const res = await api.post<MedicineSuggestionResult>("/ai/medicine-suggestions", {
        consultation_id: consultation.id,
        case_summary: summary,
      }, 120000);
      setSuggestionSource(res);
      const mapped = (res.suggestions ?? []).map((s) => ({
        medicine_name: s.medicine_name,
        dosage: s.dosage,
        frequency: s.frequency,
        duration: s.duration,
        reason: s.reason,
        warnings: s.warnings,
        status: "pending" as const,
      }));
      if (mapped.length > 0) {
        const saved = await api.post<typeof mapped>(`/consultations/${consultation.id}/medicine-suggestions`, {
          suggestions: mapped,
        });
        setSuggestions(saved);
      }
      setSavedFlash("AI-assisted medicine suggestions generated. Doctor must review and decide.");
    } catch (err) {
      setSuggestionsError(userFacingMessage(err, "Medicine suggestion request failed."));
    } finally {
      setFetchingSuggestions(false);
    }
  };

  const updateSuggestion = async (suggestionId: string, status: "accepted" | "rejected", doctorNotes?: string) => {
    if (!consultation) return;
    try {
      const upd = await api.put(`/consultations/${consultation.id}/medicine-suggestions/${suggestionId}`, {
        status,
        doctor_notes: doctorNotes,
      });
      setSuggestions((prev) => prev.map((s) => (s.id === suggestionId ? upd : s)));
      setSavedFlash(status === "accepted" ? "Suggestion accepted into the prescription." : "Suggestion rejected.");
    } catch (err) {
      setSuggestionsError(userFacingMessage(err, "Could not update the suggestion."));
    }
  };

  const startEditSuggestion = (s: any) => {
    setEditingSuggestionId(s.id);
    setEditingSuggestionDraft({
      medicine_name: s.medicine_name,
      dosage: s.dosage ?? "",
      frequency: s.frequency ?? "",
      duration: s.duration ?? "",
      reason: s.reason ?? "",
      doctor_notes: s.doctor_notes ?? "",
    });
  };

  const saveEditedSuggestion = async () => {
    if (!consultation || !editingSuggestionId || !editingSuggestionDraft) return;
    try {
      const upd = await api.put(
        `/consultations/${consultation.id}/medicine-suggestions/${editingSuggestionId}`,
        {
          status: "pending",
          medicine_name: editingSuggestionDraft.medicine_name,
          dosage: editingSuggestionDraft.dosage || null,
          frequency: editingSuggestionDraft.frequency || null,
          duration: editingSuggestionDraft.duration || null,
          reason: editingSuggestionDraft.reason || null,
          doctor_notes: editingSuggestionDraft.doctor_notes || null,
        }
      );
      setSuggestions((prev) => prev.map((s) => (s.id === editingSuggestionId ? upd : s)));
      setEditingSuggestionId(null);
      setEditingSuggestionDraft(null);
      setSavedFlash("Suggestion edited. Please review and accept or reject it.");
    } catch (err) {
      setSuggestionsError(userFacingMessage(err, "Could not save the suggestion edit."));
    }
  };

  const completeConsultation = async () => {
    if (!consultation) return;
    setCompleting(true);
    try {
      const outcome = consultation.outcome || caseDraft?.storage?.follow_up || "Consultation completed after review.";
      await api.put(`/consultations/${consultation.id}/status`, {
        status: "completed",
        outcome,
        chief_complaint: caseDraft?.storage?.chief_complaint || consultation.chief_complaint,
      });
      await load();
      setSavedFlash("Consultation marked as completed.");
    } catch (err) {
      setLoadError(userFacingMessage(err, "Could not complete the consultation."));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <Spinner label="Loading consultation workspace..." />;

  if (loadError || !consultation) {
    return (
      <div className="max-w-lg mx-auto py-10">
        <Alert kind="error" title="Consultation unavailable">
          {loadError || "Consultation not found."}
        </Alert>
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => navigate("/consultations")}>
            Back to consultations
          </Button>
        </div>
      </div>
    );
  }

  const patient = consultation.patient;
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/consultations")} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">Consultation Workspace</h1>
              <Badge color={consultation.status === "completed" ? "green" : "amber"}>
                {consultation.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">{formatDateTime(consultation.consultation_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${consultation.patient_id}`)}>
            <UserRound className="w-4 h-4" /> Patient Record
          </Button>
          {consultation.status !== "completed" && (
            <Button variant="success" loading={completing} onClick={completeConsultation}>
              <CheckCircle2 className="w-4 h-4" /> Complete Consultation
            </Button>
          )}
        </div>
      </div>

      {savedFlash && (
        <Alert kind="success" title={savedFlash}>
          <button className="text-xs underline" onClick={() => setSavedFlash(null)}>dismiss</button>
        </Alert>
      )}

      {/* Patient banner */}
      {patient && (
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center font-semibold">
                {patient.full_name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{patient.full_name}</p>
                <p className="text-xs text-slate-500">
                  {patient.patient_code} &middot; {patient.age} yrs &middot; {patient.gender} &middot; {patient.blood_group || "—"} bld
                </p>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <p><span className="text-slate-400 text-xs">Chief complaint: </span>{consultation.chief_complaint || "Not yet recorded"}</p>
              <p className="text-xs text-slate-400 mt-0.5">History of visits: {patient.consultations?.length ?? 0}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Records + Speech-to-Text */}
      <Card>
        <CardHeader
          title="Record Patient Conversation"
          subtitle="Patient's speech is transcribed in the selected language without translation"
          actions={
            <div className="flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-slate-400" />
              <Select
                className="w-44"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={recorder.status === "recording" || recorder.status === "paused"}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            </div>
          }
        />
        <div className="p-5 space-y-4">
          {!recorder.isSupported && (
            <Alert kind="warning" title="Browser does not support recording">
              Please use a recent version of Chrome, Edge, or Firefox for microphone recording.
            </Alert>
          )}

          {recorder.error && (
            <Alert kind="error" title="Recording error">
              {recorder.error.message}
            </Alert>
          )}

          {(recorder.status === "recording" ||
            recorder.status === "paused" ||
            recorder.signal === "checking") && (
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse ${
                  recorder.signal === "detected"
                    ? "bg-green-500"
                    : "bg-amber-400"
                }`}
              />
              <span
                className={
                  recorder.signal === "detected"
                    ? "text-green-700 font-medium"
                    : "text-amber-700"
                }
              >
                {recorder.signal === "detected"
                  ? "● Microphone signal detected"
                  : "● Checking microphone signal..."}
              </span>
            </div>
          )}

          {recorder.signal === "none" && (
            <Alert kind="error" title="No microphone signal detected">
              No microphone signal detected. Check browser microphone
              permission and Windows input device.
            </Alert>
          )}

          {recorder.trackInfo && (
            <p className="text-xs text-slate-500">
              Input device: {recorder.selectedMicrophone ??
                "Default input device"}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {recorder.status === "requesting" && (
              <Button variant="secondary" loading disabled>
                Requesting microphone...
              </Button>
            )}
            {(recorder.status === "idle" || recorder.status === "stopped" || recorder.status === "error") && (
              <Button variant="secondary" onClick={recorder.start}>
                <Mic className="w-4 h-4" /> Start Recording
              </Button>
            )}
            {recorder.status === "recording" && (
              <>
                <Button variant="outline" onClick={recorder.pause}>
                  <Pause className="w-4 h-4" /> Pause
                </Button>
                <Button variant="danger" onClick={recorder.stop}>
                  <Square className="w-4 h-4 text-white" /> Stop
                </Button>
              </>
            )}
            {recorder.status === "paused" && (
              <>
                <Button variant="secondary" onClick={recorder.resume}>
                  <Play className="w-4 h-4" /> Resume
                </Button>
                <Button variant="danger" onClick={recorder.stop}>
                  <Square className="w-4 h-4 text-white" /> Stop
                </Button>
              </>
            )}
            {recorder.status === "stopped" && recorder.blob && (
              <Button variant="outline" onClick={recorder.start}>
                <RotateCcw className="w-4 h-4" /> Re-record
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <StatusRow label="Recording State" value={recorder.status} highlight={recorder.status === "recording"} />
            <StatusRow label="Duration" value={formatDuration(recorder.durationSeconds)} />
            <StatusRow label="Selected Language" value={language || "Auto Detect"} />
            <StatusRow label="Detected Language" value={transcriptReady ? consultation?.transcript?.detected_language ?? language : "—"} />
            <StatusRow label="Microphone" value={recorder.status === "recording" || recorder.status === "paused" ? "Active" : "Idle"} />
            <StatusRow label="Mic Signal" value={recorder.signal} highlight={recorder.signal === "detected"} />
            <StatusRow label="Input Device" value={recorder.selectedMicrophone ?? "—"} />
            <StatusRow label="AudioContext" value={recorder.audioContextState ?? "—"} />
            <StatusRow label="Audio Upload" value={transcribing ? "Uploading..." : recorder.blob ? "Ready" : "Not sent"} />
            <StatusRow label="MIME Type" value={recorder.mimeType} />
            <StatusRow label="Audio Size" value={recorder.blob ? `${(recorder.blob.size / 1024).toFixed(1)} KB` : "—"} />
            <StatusRow label="dataavailable" value={String(recorder.dataAvailableEvents)} />
          </div>

          {transcribing && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner />
              <span>Uploading audio and requesting transcription — this can take up to 60 seconds...</span>
            </div>
          )}

          {sttError && (
            <Alert kind="error" title={sttError.includes("Transcription failed") ? "Transcription failed" : sttError}>
              {sttError.includes("Transcription failed") ? "Please try recording again." : null}
            </Alert>
          )}

          <div className="flex items-center gap-2">
            {recorder.blob && !transcribing && transcriptReady !== undefined && (
              <Button
                variant="secondary"
                loading={transcribing}
                disabled={transcribing || !recorder.blob}
                onClick={handleTranscribe}
              >
                <Send className="w-4 h-4" /> {transcriptReady ? "Re-transcribe Audio" : "Generate Transcript"}
              </Button>
            )}
            {consultation.transcript && !transcriptReady && (
              <p className="text-xs text-slate-400">A previously saved transcript exists for this consultation.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader
          title="Original Consultation Transcript"
          subtitle={
            consultation.transcript
              ? `Saved transcript · Language: ${consultation.transcript.selected_language || "N/A"} · Detected: ${consultation.transcript.detected_language || "N/A"}`
              : "No transcript saved yet"
          }
          actions={
            <>
              {transcriptReady && !editingTranscript && (
                <Button size="sm" variant="outline" onClick={() => setEditingTranscript(true)}>
                  Edit Transcript
                </Button>
              )}
            </>
          }
        />
        <div className="p-5 space-y-3">
          {editingTranscript ? (
            <>
              <Textarea
                rows={10}
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Doctor-reviewed transcript text..."
              />
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={saveTranscript}>
                  <Save className="w-4 h-4" /> Save Transcript
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingTranscript(false); setTranscriptText(consultation.transcript?.raw_text ?? transcriptText); }}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
              {transcriptReady && transcriptText ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{transcriptText}</p>
              ) : (
                <EmptyState
                  title="No transcript yet"
                  message="Record the patient conversation and click Generate Transcript."
                />
              )}
            </div>
          )}
          {transcriptReady && !editingTranscript && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-amber-600">
                AI-generated transcription — Doctor review required. Patients' words are preserved as spoken.
              </p>
            </div>
          )}

          {!consultation.case_history && !caseDraft && transcriptReady && (
            <Button variant="secondary" loading={extractingCase} onClick={handleGenerateCase}>
              <Sparkles className="w-4 h-4" /> {extractingCase ? "Generating case history..." : "Generate Case History"}
            </Button>
          )}
          {caseError && (
            <Alert
              kind="error"
              title={caseRateLimited ? "AI rate limit reached" : caseError.includes("AI provider") ? "AI provider unavailable" : "Case history error"}
            >
              {caseError}
            </Alert>
          )}
          {caseError && !extractingCase && transcriptReady && (
            <Button variant="outline" size="sm" onClick={handleRetryCase}>
              <RotateCcw className="w-4 h-4" /> Retry
            </Button>
          )}
        </div>
      </Card>

      {/* AI Case History */}
      {(caseDraft || consultation.case_history) && (
        <Card>
          <CardHeader
            title="Structured Case History"
            subtitle={
              caseApproved
                ? "Doctor reviewed and approved"
                : caseDraft?.storage?.is_ai_generated
                ? "AI generated — Doctor review required"
                : "Doctor entered"
            }
            actions={
              <div className="flex items-center gap-2">
                <Badge color={caseApproved ? "green" : "amber"}>
                  {caseApproved ? "Doctor Approved" : "AI Generated / Pending"}
                </Badge>
              </div>
            }
          />
          <div className="p-5">
            {caseApproved && consultation.case_history?.is_approved && (
              <div className="mb-4">
                <Alert kind="success" title="This case history has been finalized.">
                  Signed off by the reviewing doctor. Changes require a new edit.
                </Alert>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderCaseField("Chief Complaint", "chief_complaint")}
              {renderCaseField("History of Present Illness", "history_of_present_illness")}
              {renderCaseField("Past Medical History", "past_medical_history")}
              {renderCaseField("Current Medications", "current_medications")}
              {renderCaseField("Allergies", "allergies")}
              {renderCaseField("Diagnosis (Doctor)", "diagnosis")}
              {renderCaseField("Treatment Plan (Doctor)", "treatment_plan")}
              {renderCaseField("Investigations / Reports", "investigations")}
              {renderCaseField("Follow-up Information", "follow_up")}
            </div>

            <div className="mt-4 flex items-center gap-2">
              {!caseApproved && (
                <Button variant="success" onClick={approveAndSaveCase}>
                  <CheckCircle2 className="w-4 h-4" /> Accept & Approve Case History
                </Button>
              )}
              {caseApproved && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Approved on {consultation.case_history?.approved_at ? formatDateTime(consultation.case_history.approved_at) : "—"}
                </p>
              )}
              <p className="text-xs text-slate-400">
                AI extracts only what the patient stated; information not spoken is left blank.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Medicine suggestions */}
      <Card>
        <CardHeader
          title="AI-Assisted Medicine Suggestions"
          subtitle="Informational only. AI is NOT a doctor — you make the final prescription decision."
          actions={
            <div className="flex items-center gap-2">
              <Badge color={pendingSuggestions > 0 ? "amber" : "slate"}>{pendingSuggestions} pending</Badge>
              {suggestions.length > 0 && !caseApproved && (
                <Badge color="red"><AlertTriangle className="w-3 h-3" /> Requires approved case</Badge>
              )}
            </div>
          }
        />
        <div className="p-5 space-y-4">
          {suggestions.length === 0 && (
            <>
              <div className="flex items-start gap-2 text-sm text-slate-500">
                <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                The AI can suggest possible medicine / supportive options (Ayurveda, Homoeopathy, modern) based on the
                doctor-reviewed case information. Every suggestion must be reviewed and approved by you before it becomes
                part of the treatment.
              </div>
              <Button variant="secondary" loading={fetchingSuggestions} onClick={handleFetchSuggestions}>
                <Pill className="w-4 h-4" />
                {fetchingSuggestions ? "Requesting suggestions..." : "Request AI Medicine Suggestions"}
              </Button>
            </>
          )}

          {suggestionsError && (
            <Alert kind="error" title={suggestionsError.includes("AI provider") ? "AI provider unavailable" : "Suggestion request failed"}>
              {suggestionsError}
            </Alert>
          )}

          {suggestionSource?.disclaimer && (
            <p className="text-xs text-slate-400 italic">{suggestionSource.disclaimer}</p>
          )}

          {suggestions.map((s) => (
            <div key={s.id} className="border border-slate-200 rounded-lg p-4">
              {editingSuggestionId === s.id ? (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Medicine Name</FieldLabel>
                    <Textarea rows={1} value={editingSuggestionDraft?.medicine_name ?? ""} onChange={(e) => setEditingSuggestionDraft({ ...editingSuggestionDraft, medicine_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(["dosage", "frequency", "duration"] as const).map((f) => (
                      <div key={f}>
                        <FieldLabel>{f.charAt(0).toUpperCase() + f.slice(1)}</FieldLabel>
                        <Textarea rows={1} value={editingSuggestionDraft?.[f] ?? ""} onChange={(e) => setEditingSuggestionDraft({ ...editingSuggestionDraft, [f]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <FieldLabel>Reason</FieldLabel>
                    <Textarea rows={2} value={editingSuggestionDraft?.reason ?? ""} onChange={(e) => setEditingSuggestionDraft({ ...editingSuggestionDraft, reason: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Doctor Notes</FieldLabel>
                    <Textarea rows={2} value={editingSuggestionDraft?.doctor_notes ?? ""} onChange={(e) => setEditingSuggestionDraft({ ...editingSuggestionDraft, doctor_notes: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" onClick={saveEditedSuggestion}>
                      <Save className="w-4 h-4" /> Save Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingSuggestionId(null); setEditingSuggestionDraft(null); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{s.medicine_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[s.dosage, s.frequency, s.duration].filter(Boolean).join(" · ") || "Dosage not specified"}
                      </p>
                    </div>
                    <Badge color={s.status === "accepted" ? "green" : s.status === "rejected" ? "red" : "amber"}>
                      {s.status}
                    </Badge>
                  </div>
                  {s.reason && (
                    <p className="text-sm text-slate-600 mt-2">
                      <span className="font-medium text-slate-700">Reason: </span>
                      {s.reason}
                    </p>
                  )}
                  {s.warnings && (
                    <p className="text-xs text-amber-700 mt-1.5">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Warning: {s.warnings}
                    </p>
                  )}
                  {s.status === "pending" && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="success" onClick={() => updateSuggestion(s.id, "accepted")}>
                        <CheckCircle2 className="w-4 h-4" /> Accept
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => updateSuggestion(s.id, "rejected")}>
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => startEditSuggestion(s)}>
                        Edit
                      </Button>
                    </div>
                  )}
                  {s.doctor_notes && (
                    <p className="text-xs text-slate-500 mt-2">
                      <span className="font-medium text-slate-600">Doctor notes: </span>
                      {s.doctor_notes}
                    </p>
                  )}
                  {s.status === "accepted" && (
                    <p className="text-xs text-emerald-600 mt-3">
                      Accepted as part of the prescription after doctor review.
                    </p>
                  )}
                  {s.status === "rejected" && (
                    <p className="text-xs text-rose-500 mt-3">Rejected by the doctor.</p>
                  )}
                </>
              )}
            </div>
          ))}

          {suggestions.length === 0 && caseApproved && (
            <p className="text-xs text-slate-400">
              Note: consult first either the AI provider is configured. Medicine suggestions are only available when the backend has AI enabled.
            </p>
          )}
        </div>
      </Card>

      {loadError && (
        <Alert kind="error" title="Operation failed">
          {loadError}
        </Alert>
      )}
    </div>
  );
}

function StatusRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xs font-medium mt-0.5 ${highlight ? "text-emerald-600" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}