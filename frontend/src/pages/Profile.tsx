import { useEffect, useState } from "react";
import { UserRound, ShieldCheck, BadgeCheck, GraduationCap, Stethoscope, Phone, Award, Calendar } from "lucide-react";
import { api, userFacingMessage } from "../api/client";
import type { DoctorWithProfile } from "../types";
import { Card, CardHeader, Badge, Spinner, Alert, formatDate } from "../components/ui";

export default function Profile() {
  const [profile, setProfile] = useState<DoctorWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await api.get<DoctorWithProfile>("/doctors/me");
        if (!cancelled) setProfile(p);
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, "Could not load the doctor profile."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner label="Loading profile..." />;

  if (error || !profile) {
    return (
      <Alert kind="error" title="Profile unavailable">
        {error || "Doctor profile not found."}
      </Alert>
    );
  }

  const u = profile.user;
  const p = profile.profile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Doctor Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Your professional information</p>
      </div>

      <Card>
        <div className="p-6 flex flex-col md:flex-row items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center text-2xl font-semibold">
            {u.full_name.charAt(0)}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h2 className="text-xl font-bold text-slate-800">{u.full_name}</h2>
              <Badge color={p?.verification_status === "verified" ? "green" : "amber"}>
                {p?.verification_status === "verified" ? (
                  <><BadgeCheck className="w-3 h-3" /> Verified</>
                ) : (
                  <><ShieldCheck className="w-3 h-3" /> {p?.verification_status ?? "pending"}</>
                )}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">{u.email}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Professional Details" />
          <div className="p-5 space-y-4">
            <ProfileRow icon={<GraduationCap className="w-4 h-4" />} label="Qualification" value={p?.qualification || "—"} />
            <ProfileRow icon={<Stethoscope className="w-4 h-4" />} label="Specialization" value={p?.specialization || "—"} />
            <ProfileRow icon={<Award className="w-4 h-4" />} label="Experience" value={p?.experience_years != null ? `${p.experience_years} years` : "—"} />
            <ProfileRow icon={<Calendar className="w-4 h-4" />} label="License Number" value={p?.license_number || "—"} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Verification" subtitle="Status on this platform" />
          <div className="p-5 space-y-4">
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRound className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Account type</span>
              </div>
              <Badge color="blue">{u.role}</Badge>
            </div>
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <span className="text-sm text-slate-600">Verification status</span>
              <Badge color={p?.verification_status === "verified" ? "green" : "amber"}>
                {p?.verification_status ?? "pending"}
              </Badge>
            </div>
            {p?.verified_at && (
              <div className="rounded-lg border p-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">Verified on</span>
                <span className="text-sm text-slate-700">{formatDate(p.verified_at)}</span>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Verification is performed by an administrator from the admin panel. All verification actions are recorded in audit logs.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-50 pb-3 last:border-0">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm text-slate-700 text-right">{value}</span>
    </div>
  );
}