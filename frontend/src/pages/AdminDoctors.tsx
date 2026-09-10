import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, GraduationCap, Stethoscope } from "lucide-react";
import { api, userFacingMessage } from "../api/client";
import type { DoctorWithProfile } from "../types";
import { Card, CardHeader, Badge, Spinner, EmptyState, Alert, Button } from "../components/ui";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<DoctorWithProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await api.get<DoctorWithProfile[]>("/doctors/all");
      const withProfiles = all.map((d) => ({
        user: d.user,
        profile: d.profile ?? {
          id: d.user.id,
          qualification: undefined,
          specialization: undefined,
          experience_years: 0,
          verification_status: "pending" as const,
        },
      }));
      setDoctors(withProfiles);
    } catch (err) {
      setError(userFacingMessage(err, "Could not load the doctor list."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (profileId: string, action: "verify" | "reject") => {
    setBusyId(profileId);
    setFlash(null);
    try {
      await api.post(`/doctors/${profileId}/${action}`);
      setFlash(action === "verify" ? "Doctor verified and audit log created." : "Doctor rejected and audit log created.");
      await load();
    } catch (err) {
      setError(userFacingMessage(err, `Could not ${action} the doctor.`));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner label="Loading doctors..." />;

  if (error) {
    return (
      <Alert kind="error" title="Doctor list unavailable">
        {error}
      </Alert>
    );
  }

  const pending = doctors?.filter((d) => d.profile?.verification_status === "pending") ?? [];
  const verified = doctors?.filter((d) => d.profile?.verification_status === "verified") ?? [];
  const rejected = doctors?.filter((d) => d.profile?.verification_status === "rejected") ?? [];

  const renderDoctor = (d: DoctorWithProfile) => {
    const p = d.profile;
    const isBusy = busyId === p?.id;
    return (
      <div key={d.user.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center font-semibold shrink-0">
            {d.user.full_name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-800">{d.user.full_name}</p>
              <Badge
                color={
                  p?.verification_status === "verified"
                    ? "green"
                    : p?.verification_status === "rejected"
                    ? "red"
                    : "amber"
                }
              >
                {p?.verification_status ?? "pending"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">{d.user.email}</p>
            <p className="text-sm text-slate-600 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> {p?.qualification || "Qualification not provided"}
            </p>
            <p className="text-sm text-slate-600 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-slate-400" /> {p?.specialization || "—"}
            </p>
            <p className="text-xs text-slate-400">Doctor ID: {p?.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 md:pl-11">
          {p?.verification_status === "pending" && (
            <>
              <Button
                size="sm"
                variant="success"
                loading={isBusy}
                disabled={isBusy}
                onClick={() => decide(p.id, "verify")}
              >
                <CheckCircle2 className="w-4 h-4" /> Verify
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={isBusy}
                disabled={isBusy}
                onClick={() => decide(p.id, "reject")}
              >
                <XCircle className="w-4 h-4" /> Reject
              </Button>
            </>
          )}
          {p?.verification_status !== "pending" && (
            <Badge color={p?.verification_status === "verified" ? "green" : "red"}>
              {p?.verification_status === "verified" ? (
                <><CheckCircle2 className="w-3 h-3" /> Verified</>
              ) : (
                <><XCircle className="w-3 h-3" /> Rejected</>
              )}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Doctor Verification</h1>
          <p className="text-sm text-slate-500 mt-1">Approve or reject doctor account registrations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="amber"><ShieldCheck className="w-3 h-3" /> {pending.length} pending</Badge>
          <Badge color="green">{verified.length} verified</Badge>
          <Badge color="red">{rejected.length} rejected</Badge>
        </div>
      </div>

      {flash && <Alert kind="success" title={flash} />}
      {error && (
        <Alert kind="error" title="Action failed">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader title="Pending Doctors" subtitle="Awaiting administrator review" />
        {pending.length === 0 ? (
          <EmptyState title="No pending doctors" message="All doctor accounts have been processed." />
        ) : (
          <div className="divide-y divide-slate-100">{pending.map(renderDoctor)}</div>
        )}
      </Card>

      {(rejected.length > 0 || verified.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Verified Doctors" />
            {verified.length === 0 ? (
              <EmptyState title="None yet" />
            ) : (
              <div className="divide-y divide-slate-100">{verified.map(renderDoctor)}</div>
            )}
          </Card>
          <Card>
            <CardHeader title="Rejected Doctors" />
            {rejected.length === 0 ? (
              <EmptyState title="None yet" />
            ) : (
              <div className="divide-y divide-slate-100">{rejected.map(renderDoctor)}</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}