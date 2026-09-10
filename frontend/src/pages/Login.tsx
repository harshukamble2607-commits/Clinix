import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Leaf, LogIn, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError, userFacingMessage } from "../api/client";
import { Alert, Button, Input } from "../components/ui";

const demoAccounts = [
  { role: "Doctor (verified)", email: "dr.sharma@ayush.demo", password: "Doctor@123" },
  { role: "Doctor (pending)", email: "dr.patel@ayush.demo", password: "Doctor@123" },
  { role: "Admin", email: "admin@ayush.demo", password: "Admin@123" },
  { role: "Staff", email: "staff@ayush.demo", password: "Staff@123" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      const role = email.includes("admin") ? "admin" : "dashboard";
      navigate(role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError("Could not reach the server. Is the backend running?");
      } else {
        setError(userFacingMessage(err, "Login failed. Please check your credentials."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clinical-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-xl text-slate-800 leading-tight">Clinix</p>
              <p className="text-xs text-slate-500">AI-Assisted Digital Patient Case-Taking</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Doctor Sign In</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ministry of AYUSH &middot; Smart India Hackathon 2026
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dr.sharma@ayush.demo"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <Alert kind="error" title="Login failed">
                {error}
              </Alert>
            )}

            <Button type="submit" loading={loading} className="w-full" disabled={loading}>
              <LogIn className="w-4 h-4" />
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Demo accounts (synthetic data)
            </p>
            <div className="space-y-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                    setError(null);
                  }}
                  className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-clinical-400 hover:bg-clinical-50 transition-colors"
                >
                  <span className="text-sm text-slate-700">{acc.role}</span>
                  <span className="text-xs text-slate-400 font-mono">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <AlertCircle className="w-3.5 h-3.5" />
          DEMO environment &middot; No real patient data is stored
        </div>
      </div>
    </div>
  );
}