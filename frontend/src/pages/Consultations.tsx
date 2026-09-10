import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { api, userFacingMessage } from "../api/client";
import type { ConsultationBrief, Patient } from "../types";
import { Card, CardHeader, Spinner, EmptyState, Alert, Badge, Button, formatDateTime } from "../components/ui";

export default function Consultations() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [consultations, setConsultations] = useState<ConsultationBrief[] | null>(null);
  const [patients, setPatients] = useState<Map<string, Patient>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const startPatientId = params.get("patient");
  const shouldStart = params.get("start") === "1";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cons, pats] = await Promise.all([
          api.get<ConsultationBrief[]>("/consultations"),
          api.get<Patient[]>("/patients"),
        ]);
        if (cancelled) return;
        setConsultations(cons);
        setPatients(new Map(pats.map((p) => [p.id, p])));
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, "Could not load consultations."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (shouldStart && startPatientId && !creating) {
      setCreating(true);
      api
        .post<{ consultation_id: string }>("/consultations", { patient_id: startPatientId })
        .then((res) => navigate(`/consultations/${res.consultation_id}`, { replace: true }))
        .catch((err) => {
          setError(userFacingMessage(err, "Could not start the consultation."));
          setCreating(false);
        });
    }
  }, [shouldStart, startPatientId, creating, navigate]);

  if (creating) return <Spinner label="Starting new consultation..." />;
  if (loading) return <Spinner label="Loading consultations..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Consultations</h1>
        <p className="text-sm text-slate-500 mt-1">All patient consultations handled by your clinic</p>
      </div>

      {error && (
        <Alert kind="error" title="Error loading consultations">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader title="Consultation List" subtitle="Most recent first" />
        {!consultations || consultations.length === 0 ? (
          <EmptyState
            title="No consultations yet"
            message="Start a new consultation from a patient's record to begin."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {consultations.map((c) => {
              const p = patients.get(c.patient_id);
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/consultations/${c.id}`)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-clinical-50 text-clinical-600 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {c.chief_complaint || "General consultation"} —{" "}
                        <span className="font-normal text-clinical-600">{p?.full_name || "Patient"}</span>
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(c.consultation_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={c.status === "completed" ? "green" : "amber"}>{c.status}</Badge>
                    <Badge color="blue">{p?.patient_code}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate("/patients")}>
          Start a new consultation from patient search
        </Button>
      </div>
    </div>
  );
}