import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Upload, FileText, FolderOpen, AlertTriangle, Loader2 } from "lucide-react";
import { api, userFacingMessage } from "../api/client";
import type { MedicalReport, Patient } from "../types";
import { Card, CardHeader, Badge, Spinner, EmptyState, Alert, Button, Select, formatDateTime } from "../components/ui";

export default function Reports() {
  const [params] = useSearchParams();
  const initialPatientId = params.get("patient") ?? "";

  const [reports, setReports] = useState<MedicalReport[] | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState(initialPatientId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (patientId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [reps, pats] = await Promise.all([
        api.get<MedicalReport[]>(patientId ? `/reports?patient_id=${patientId}` : "/reports"),
        api.get<Patient[]>("/patients"),
      ]);
      setReports(reps);
      setPatients(pats);
      if (!patientId && pats.length > 0) setSelectedPatient("");
    } catch (err) {
      setError(userFacingMessage(err, "Could not load the reports list."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(initialPatientId || undefined);
  }, [load, initialPatientId]);

  const handlePatientChange = (pid: string) => {
    setSelectedPatient(pid);
    load(pid || undefined);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError("Please choose a PDF, JPG, or PNG file to upload.");
      return;
    }
    if (!selectedPatient) {
      setUploadError("Please select the patient this report belongs to.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadMsg(null);
    const form = new FormData();
    form.append("file", file);
    form.append("patient_id", selectedPatient);
    form.append("title", title || file.name);
    if (reportType) form.append("report_type", reportType);
    try {
      await api.upload("/reports", form, 120000);
      setUploadMsg(
        "Report uploaded successfully. Text extraction and AI summary are completed where the AI provider is enabled."
      );
      setFile(null);
      setTitle("");
      setReportType("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load(selectedPatient);
    } catch (err) {
      setUploadError(userFacingMessage(err, "Report upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && f.size > 25 * 1024 * 1024) {
      setUploadError("File is larger than the 25MB limit.");
    } else {
      setUploadError(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Digital Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Upload PDF, JPG, or PNG medical reports per patient</p>
      </div>

      {error && (
        <Alert kind="error" title="Could not load reports">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Upload Report"
          subtitle="Supports PDF, JPG, PNG · Max 25MB · Synthetic demo data only"
          actions={
            <Badge color="amber">
              <AlertTriangle className="w-3 h-3" /> AI-assisted summary — Doctor verification required
            </Badge>
          }
        />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-full max-w-xs flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Patient</label>
              <Select value={selectedPatient} onChange={(e) => handlePatientChange(e.target.value)}>
                <option value="">— Select patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.patient_code})</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Report Type</label>
              <Select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-44">
                <option value="">Optional type</option>
                <option>Laboratory</option>
                <option>Radiology</option>
                <option>Physician Letter</option>
                <option>Prescription</option>
                <option>Other</option>
              </Select>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={onFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-clinical-50 file:text-clinical-700 hover:file:bg-clinical-100"
          />

          <div className="flex gap-2">
            <Button onClick={handleUpload} loading={uploading} disabled={!file}>
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Report"}
            </Button>
            {uploading && <Loader2 className="w-5 h-5 animate-spin text-slate-400 self-center" />}
          </div>

          {uploadError && (
            <Alert kind="error" title="Upload error">
              {uploadError}
            </Alert>
          )}
          {uploadMsg && (
            <Alert kind="success" title={uploadMsg}>
              <button className="text-xs underline" onClick={() => setUploadMsg(null)}>dismiss</button>
            </Alert>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Report Library"
          subtitle={selectedPatient ? "Reports for the selected patient" : "All reports"}
          actions={
            <Select value={selectedPatient} onChange={(e) => handlePatientChange(e.target.value)} className="w-56">
              <option value="">All patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </Select>
          }
        />
        {loading ? (
          <Spinner label="Loading reports..." />
        ) : !reports || reports.length === 0 ? (
          <EmptyState title="No reports yet" message="Upload a report above to see it listed here." />
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-500">
                        {r.report_type || "Report"} · {r.file_type?.toUpperCase()} · {formatDateTime(r.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge color={r.ai_summary ? "teal" : "slate"}>
                    {r.ai_summary ? "AI summarized" : "No summary"}
                  </Badge>
                </div>
                {r.extracted_text && (
                  <div className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-3 max-h-28 overflow-y-auto">
                    <p className="font-medium text-slate-600 mb-1">Extracted text:</p>
                    {r.extracted_text}
                  </div>
                )}
                {r.ai_summary && (
                  <div className="mt-2 text-xs text-slate-600 bg-brand-50 border border-brand-100 rounded-lg p-3">
                    <p className="font-medium text-brand-700 mb-1 flex items-center gap-1.5">
                      <SparkleIcon /> AI-assisted report summary — Doctor verification required
                    </p>
                    {r.ai_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SparkleIcon() {
  return <span className="w-3 h-3 inline-block">✦</span>;
}