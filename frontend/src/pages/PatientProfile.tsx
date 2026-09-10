import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  Droplet,
  Ruler,
  Weight,
  UserRound,
  Stethoscope,
  Pill,
  FolderOpen,
  ClipboardList,
  ArrowLeft,
  PlusCircle,
} from "lucide-react";
import { api, userFacingMessage } from "../api/client";
import type { Patient, MedicalReport } from "../types";
import { Card, CardHeader, Badge, Spinner, EmptyState, Alert, Button, formatDate, formatDateTime } from "../components/ui";

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pat, rep] = await Promise.all([
          api.get<Patient>(`/patients/${id}`),
          api.get<MedicalReport[]>(`/reports?patient_id=${id}`),
        ]);
        if (cancelled) return;
        setPatient(pat);
        setReports(rep);
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, "Could not load the patient record."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Spinner label="Loading patient record..." />;

  if (error || !patient) {
    return (
      <Alert kind="error" title="Patient record unavailable">
        {error || "Patient not found."}
      </Alert>
    );
  }

  const cons = patient.consultations ?? [];
  const lastCons = cons[0];
  const bmi =
    patient.height_cm && patient.weight_kg
      ? (patient.weight_kg / Math.pow(patient.height_cm / 100, 2)).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{patient.full_name}</h1>
            <p className="text-sm text-slate-500">
              {patient.patient_code} &middot; {patient.age} years &middot; {patient.gender}
            </p>
          </div>
          <Button
            variant="success"
            onClick={() => navigate(`/consultations?patient=${patient.id}&start=1`)}
          >
            <PlusCircle className="w-4 h-4" /> Start New Consultation
          </Button>
        </div>
      </div>

      {error && (
        <Alert kind="error" title="Error loading record">
          {error}
        </Alert>
      )}

      {/* Overview */}
      <Card>
        <CardHeader title="Patient Overview" subtitle="Basic information" />
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <OverviewItem icon={<UserRound className="w-4 h-4" />} label="Date of Birth" value={formatDate(patient.date_of_birth)} />
          <OverviewItem icon={<Phone className="w-4 h-4" />} label="Phone" value={patient.phone || "—"} />
          <OverviewItem icon={<Mail className="w-4 h-4" />} label="Email" value={patient.email || "—"} />
          <OverviewItem icon={<MapPin className="w-4 h-4" />} label="Address" value={patient.address || "—"} />
          <OverviewItem icon={<Droplet className="w-4 h-4" />} label="Blood Group" value={patient.blood_group || "—"} />
          <OverviewItem icon={<Ruler className="w-4 h-4" />} label="Height" value={patient.height_cm ? `${patient.height_cm} cm` : "—"} />
          <OverviewItem icon={<Weight className="w-4 h-4" />} label="Weight" value={patient.weight_kg ? `${patient.weight_kg} kg` : "—"} />
          <OverviewItem
            icon={<Weight className="w-4 h-4" />}
            label="BMI"
            value={bmi ? bmi : "—"}
          />
          <OverviewItem icon={<Phone className="w-4 h-4" />} label="Emergency Contact" value={patient.emergency_contact_name || "—"} />
          <OverviewItem icon={<Phone className="w-4 h-4" />} label="Emergency Phone" value={patient.emergency_contact_phone || "—"} />
        </div>
      </Card>

      {/* Current complaints */}
      <Card>
        <CardHeader title="Current Complaints" subtitle="From the most recent consultation" />
        <div className="p-5">
          {lastCons?.chief_complaint ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">{lastCons.chief_complaint}</p>
              <p className="text-xs text-slate-400">Reported on {formatDateTime(lastCons.consultation_date)}</p>
            </div>
          ) : (
            <EmptyState title="No current complaints recorded" message="Start a consultation to record the patient's complaints." />
          )}
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader title="Consultation Timeline" subtitle="All previous consultations" />
        {cons.length === 0 ? (
          <EmptyState title="No consultations yet" />
        ) : (
          <div className="divide-y divide-slate-100">
            {cons.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/consultations/${c.id}`)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-clinical-50 text-clinical-600 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.chief_complaint || "Consultation"}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(c.consultation_date)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge color={c.status === "completed" ? "green" : "amber"}>{c.status}</Badge>
                    {c.case_history && (
                      <Badge color={c.case_history.is_approved ? "teal" : "slate"}>
                        {c.case_history.is_approved ? "Case approved" : "Case pending"}
                      </Badge>
                    )}
                  </div>
                </div>
                {c.case_history?.diagnosis && (
                  <p className="mt-2 pl-12 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Diagnosis: </span>
                    {c.case_history.diagnosis}
                  </p>
                )}
                {c.outcome && (
                  <p className="mt-1 pl-12 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Outcome: </span>
                    {c.outcome}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Previous treatments */}
      <Card>
        <CardHeader title="Previous Treatments & Outcomes" subtitle="Treatment history across consultations" />
        <div className="p-5 space-y-4">
          {cons.filter((c) => c.case_history?.treatment_plan || c.outcome).length === 0 ? (
            <EmptyState title="No treatment history available" />
          ) : (
            cons
              .filter((c) => c.case_history?.treatment_plan || c.outcome)
              .map((c) => (
                <div key={c.id} className="border border-slate-100 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{formatDate(c.consultation_date)}</p>
                  {c.case_history?.treatment_plan && (
                    <p className="text-sm text-slate-700 mt-1.5">
                      <span className="font-medium">Treatment: </span>
                      {c.case_history.treatment_plan}
                    </p>
                  )}
                  {c.outcome && (
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Outcome: </span>
                      {c.outcome}
                    </p>
                  )}
                  {c.follow_up_date && (
                    <p className="text-xs text-slate-400 mt-1">Follow-up: {formatDate(c.follow_up_date)}</p>
                  )}
                </div>
              ))
          )}
        </div>
      </Card>

      {/* Digital reports */}
      <Card>
        <CardHeader
          title="Digital Reports"
          subtitle="Lab reports, radiology, and other documents"
          actions={
            <Button size="sm" variant="ghost" onClick={() => navigate(`/reports?patient=${patient.id}`)}>
              <FolderOpen className="w-4 h-4" /> View all
            </Button>
          }
        />
        {reports.length === 0 ? (
          <EmptyState title="No reports uploaded" message="Medical reports for this patient will appear here." />
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.title}</p>
                    <p className="text-xs text-slate-500">
                      {r.report_type || "Report"} &middot; {formatDate(r.created_at)}
                    </p>
                  </div>
                </div>
                <Badge color={r.ai_summary ? "teal" : "slate"}>{r.ai_summary ? "AI summarized" : "No summary"}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* All meds */}
      <Card>
        <CardHeader title="Medicines" subtitle="Accepted prescription items across consultations" />
        <div className="p-5">
          <EmptyState
            title="Medicine records"
            message="Accepted medicine suggestions will appear here after consultations are completed."
          />
        </div>
      </Card>
    </div>
  );
}

function OverviewItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide">
        {icon} {label}
      </p>
      <p className="text-sm text-slate-700 mt-1">{value}</p>
    </div>
  );
}