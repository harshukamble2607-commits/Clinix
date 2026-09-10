import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  ClipboardList,
  FileWarning,
  UserRound,
  PlusCircle,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, userFacingMessage } from "../api/client";
import type { Patient, ConsultationBrief, DoctorWithProfile } from "../types";
import {
  Card,
  CardHeader,
  StatCard,
  Spinner,
  EmptyState,
  Alert,
  Badge,
  Button,
  formatDate,
} from "../components/ui";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<ConsultationBrief[]>([]);
  const [profile, setProfile] = useState<DoctorWithProfile | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingHistories, setPendingHistories] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pats, cons, prof] = await Promise.all([
          api.get<Patient[]>("/patients"),
          api.get<ConsultationBrief[]>("/consultations"),
          api.get<DoctorWithProfile>("/doctors/me"),
        ]);
        if (cancelled) return;
        setPatients(pats);
        setConsultations(cons);
        setProfile(prof);
        const today = new Date().toDateString();
        setTodayCount(
          cons.filter((c) => new Date(c.consultation_date).toDateString() === today).length
        );
        setPendingHistories(cons.filter((c) => c.status === "in_progress").length);
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, "Could not load the dashboard. Check that the backend is running."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading dashboard..." />;

  const recentPatients = patients.slice(0, 5);
  const recentConsultations = consultations.slice(0, 6);
  const verified = profile?.profile?.verification_status === "verified";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Doctor Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, {user?.full_name}. Ready to see your next patient?
          </p>
        </div>
        <div className="flex items-center gap-2">
          {verified ? (
            <Badge color="green">
              <CheckCircle2 className="w-3 h-3" /> Verified Doctor
            </Badge>
          ) : (
            <Badge color="amber">
              <ShieldAlert className="w-3 h-3" /> Verification Pending
            </Badge>
          )}
          <Link to="/patients">
            <Button variant="success">
              <PlusCircle className="w-4 h-4" /> Quick Start Consultation
            </Button>
          </Link>
        </div>
      </div>

      {!verified && (
        <Alert kind="warning" title="Your doctor account is pending verification.">
          The administrator needs to verify your account before some privileged actions are available in the demo.
        </Alert>
      )}

      {error && (
        <Alert kind="error" title="Dashboard error">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Patients" value={patients.length} accent="blue" />
        <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Today's Consultations" value={todayCount} accent="teal" />
        <StatCard icon={<FileWarning className="w-5 h-5" />} label="Pending Case Histories" value={pendingHistories} accent="amber" />
        <StatCard
          icon={<UserRound className="w-5 h-5" />}
          label="Verification Status"
          value={verified ? "Verified" : "Pending"}
          accent={verified ? "green" : "amber"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Recent Patients" subtitle="Latest registered patients" />
          {recentPatients.length === 0 ? (
            <EmptyState title="No patients yet" message="Patients will appear here once they are registered." />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPatients.map((p) => (
                <Link
                  key={p.id}
                  to={`/patients/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center font-medium text-sm">
                      {p.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {p.patient_code} &middot; {p.age} yrs &middot; {p.gender}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {p.last_consultation && (
                      <p className="text-xs text-slate-400">Last: {formatDate(p.last_consultation)}</p>
                    )}
                    <Badge color={p.consultations && p.consultations.length > 0 ? "blue" : "slate"}>
                      {p.consultations?.length ?? 0} visits
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent Consultations"
            subtitle="Latest patient consultations"
            actions={
              <Link to="/consultations" className="text-sm text-clinical-600 hover:text-clinical-700 font-medium">
                View all
              </Link>
            }
          />
          {recentConsultations.length === 0 ? (
            <EmptyState title="No consultations yet" />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentConsultations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/consultations/${c.id}`)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.chief_complaint || "Consultation"}</p>
                    <p className="text-xs text-slate-500">{formatDate(c.consultation_date)}</p>
                  </div>
                  <Badge color={c.status === "completed" ? "green" : "amber"}>{c.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}