import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { api, userFacingMessage } from "../api/client";
import type { AuditLog } from "../types";
import { Card, CardHeader, Spinner, EmptyState, Alert, Badge, formatDateTime } from "../components/ui";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<AuditLog[]>("/admin/audit-logs?limit=200");
        if (!cancelled) setLogs(data);
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, "Could not load audit logs."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const actionColor = (action: string): string => {
    if (action.includes("approve") || action.includes("verify") || action.includes("accepted")) return "green";
    if (action.includes("reject") || action.includes("rejected") || action.includes("failed")) return "red";
    if (action.includes("login") || action.includes("logout")) return "blue";
    return "slate";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Every important doctor and admin action is recorded</p>
      </div>

      {error && (
        <Alert kind="error" title="Could not load audit logs">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader title="Activity Log" subtitle="Newest first" />
        {loading ? (
          <Spinner label="Loading audit logs..." />
        ) : !logs || logs.length === 0 ? (
          <EmptyState title="No audit entries yet" />
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <ScrollText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{log.action}</p>
                    <span className="text-xs text-slate-400 shrink-0">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{log.details || "No details"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {log.entity_type && <Badge color="slate">{log.entity_type}</Badge>}
                    <Badge color={actionColor(log.action)}>{log.action}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}