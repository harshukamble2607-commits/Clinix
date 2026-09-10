import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ClipboardList,
  FileWarning,
  ScrollText,
} from "lucide-react";
import { api, userFacingMessage } from "../api/client";
import type { AdminDashboard } from "../types";
import { Card, CardHeader, StatCard, Spinner, Alert, Badge, formatDateTime } from "../components/ui";

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.get<AdminDashboard>("/admin/dashboard");
        if (!cancelled) setData(d);
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, "Could not load the admin dashboard."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner label="Loading admin dashboard..." />;

  if (error || !data) {
    return (
      <Alert kind="error" title="Admin dashboard unavailable">
        {error || "No data available."}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Administrator Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of doctors, patients, and activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Pending Doctors" value={data.pending_doctors} accent="amber" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Verified Doctors" value={data.verified_doctors} accent="green" />
        <StatCard icon={<XCircle className="w-5 h-5" />} label="Rejected Doctors" value={data.rejected_doctors} accent="red" />
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Patients" value={data.total_patients} accent="blue" />
        <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Total Consultations" value={data.total_consultations} accent="teal" />
        <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Today's Consultations" value={data.today_consultations} accent="blue" />
        <StatCard icon={<FileWarning className="w-5 h-5" />} label="Pending Case Histories" value={data.pending_case_histories} accent="amber" />
        <StatCard icon={<ScrollText className="w-5 h-5" />} label="Total Doctors" value={data.total_doctors} accent="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Recent Audit Logs"
            subtitle="Latest system activity"
            actions={
              <Link to="/admin/audit-logs" className="text-sm text-clinical-600 hover:text-clinical-700 font-medium">
                View all
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {data.recent_audit_logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{log.action}</p>
                  <p className="text-xs text-slate-500">{log.details || "No details"}</p>
                </div>
                <Badge color="slate">{formatDateTime(log.created_at)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick Actions" />
          <div className="p-5 space-y-3">
            <Link
              to="/admin/doctors"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-clinical-400 hover:bg-clinical-50 transition-colors"
            >
              <div>
                <p className="font-medium text-slate-800 text-sm">Verify Doctor Accounts</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.pending_doctors} doctor{data.pending_doctors === 1 ? "" : "s"} awaiting verification
                </p>
              </div>
              <ShieldCheck className="w-5 h-5 text-clinical-600" />
            </Link>
            <Link
              to="/admin/audit-logs"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-clinical-400 hover:bg-clinical-50 transition-colors"
            >
              <div>
                <p className="font-medium text-slate-800 text-sm">Review Audit Logs</p>
                <p className="text-xs text-slate-500 mt-0.5">Doctor verification and clinical actions</p>
              </div>
              <ScrollText className="w-5 h-5 text-clinical-600" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}