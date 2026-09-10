import { useState } from "react";
import { ShieldCheck, Database, Cpu, Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, Badge, Alert } from "../components/ui";
import { API_BASE_URL } from "../api/client";

export default function Settings() {
  const { user, logout } = useAuth();
  const [cleared, setCleared] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const clearLocalData = () => {
    try {
      localStorage.clear();
      setCleared(true);
      setClearError(null);
      setTimeout(() => logout(), 800);
    } catch (err) {
      setClearError("Could not clear local data: " + String(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Application configuration and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Security" subtitle="Account and session" />
          <div className="p-5 space-y-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Session
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Passwords are hashed with Argon2 on the backend. JWT tokens expire automatically and log you out.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ShieldCheck className="w-4 h-4 text-amber-600" /> Local session data
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Clears the stored token from this browser.
              </p>
              <div className="mt-3">
                <button
                  onClick={clearLocalData}
                  className="px-4 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm font-medium hover:bg-rose-100"
                >
                  Clear session &amp; log out
                </button>
              </div>
              {cleared && <p className="text-xs text-emerald-600 mt-2">Local data cleared. Logging out...</p>}
              {clearError && <Alert kind="error" title="Error clearing data">{clearError}</Alert>}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="System Status" subtitle="Backend connectivity and AI provider" />
          <div className="p-5 space-y-3">
            <div className="rounded-lg border border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Database className="w-4 h-4 text-clinical-600" /> API Base URL
              </div>
              <code className="text-xs text-slate-500">{API_BASE_URL}</code>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Cpu className="w-4 h-4 text-clinical-600" /> AI Provider
              </div>
              <Badge color="blue">Backend (server-side) · Gemini</Badge>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Globe className="w-4 h-4 text-clinical-600" /> Environment
              </div>
              <Badge color="amber">DEMO · Synthetic data</Badge>
            </div>
            <p className="text-xs text-slate-400">
              The Gemini API key is configured exclusively on the backend. It is never exposed to the browser.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}