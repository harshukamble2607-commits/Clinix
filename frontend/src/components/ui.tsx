import { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";

const cardBase =
  "bg-white rounded-xl border border-slate-200 shadow-sm";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${cardBase} ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
      <div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  onClick,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-clinical-600 hover:bg-clinical-700 text-white",
    secondary: "bg-brand-600 hover:bg-brand-700 text-white",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
    ghost: "text-clinical-600 hover:bg-clinical-50",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-clinical-50 text-clinical-700",
    teal: "bg-brand-50 text-brand-700",
    purple: "bg-violet-100 text-violet-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <Info className="w-6 h-6" />
      </div>
      <p className="font-medium text-slate-700">{title}</p>
      {message && <p className="text-sm text-slate-500 mt-1 max-w-sm">{message}</p>}
    </div>
  );
}

export function Alert({
  kind = "error",
  title,
  children,
}: {
  kind?: "error" | "warning" | "success" | "info";
  title: string;
  children?: ReactNode;
}) {
  const configs = {
    error: { icon: AlertCircle, cls: "bg-rose-50 border-rose-200 text-rose-700", titleCls: "text-rose-800" },
    warning: { icon: AlertTriangle, cls: "bg-amber-50 border-amber-200 text-amber-700", titleCls: "text-amber-800" },
    success: { icon: CheckCircle2, cls: "bg-emerald-50 border-emerald-200 text-emerald-700", titleCls: "text-emerald-800" },
    info: { icon: Info, cls: "bg-clinical-50 border-clinical-200 text-clinical-700", titleCls: "text-clinical-800" },
  };
  const c = configs[kind];
  const Icon = c.icon;
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border p-3.5 ${c.cls}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <p className={`text-sm font-medium ${c.titleCls}`}>{title}</p>
        {children && <div className="text-sm mt-1 opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: "blue" | "teal" | "green" | "amber" | "purple" | "red";
}) {
  const accents: Record<string, string> = {
    blue: "bg-clinical-50 text-clinical-600",
    teal: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-violet-50 text-violet-600",
    red: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1.5">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accents[accent]}`}>{icon}</div>
      </div>
    </Card>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-600 mb-1">{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-clinical-500 focus:border-clinical-500 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-clinical-500 focus:border-clinical-500 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-clinical-500 focus:border-clinical-500 ${props.className ?? ""}`}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}