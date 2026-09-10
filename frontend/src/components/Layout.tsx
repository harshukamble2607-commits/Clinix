import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  UserRound,
  Settings,
  LogOut,
  Leaf,
  ShieldCheck,
  ClipboardList,
  ScrollText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";

  const navItems = isAdmin
    ? [
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { to: "/admin/doctors", label: "Verify Doctors", icon: ShieldCheck },
        { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
      ]
    : [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/patients", label: "Patients", icon: Users },
        { to: "/consultations", label: "Consultations", icon: ClipboardList },
        { to: "/reports", label: "Reports", icon: FolderOpen },
        { to: "/profile", label: "Doctor Profile", icon: UserRound },
        { to: "/settings", label: "Settings", icon: Settings },
      ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 hidden md:flex flex-col fixed inset-y-0">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 leading-tight">Clinix</p>
              <p className="text-[11px] text-slate-500">AI Case-Taking System</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-clinical-50 text-clinical-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">
                {user?.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-slate-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-slate-400 hover:text-rose-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-5 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Connected
              </span>
              <span className="text-slate-300">|</span>
              <span className="hidden sm:inline">AI Provider:{" "}
                <span className="font-medium text-slate-700">Backend (Server-side)</span>
              </span>
            </div>
          </div>
          <div className="md:hidden">
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 p-2">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {isAdmin && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 md:px-8 py-2.5 text-sm text-amber-800">
            You are viewing the <strong>Administrator Panel</strong>. Doctor accounts can be verified or rejected here.
          </div>
        )}

        <main className="flex-1 px-5 md:px-8 py-6">{children}</main>

        <footer className="px-5 md:px-8 py-4 text-xs text-slate-400 border-t border-slate-200 bg-white">
          Clinix AI-Assisted Case-Taking &amp; Digital Patient History System &middot; Smart India Hackathon 2026 &middot; Ministry of AYUSH &middot; Demo environment with synthetic patient data only
        </footer>
      </div>
    </div>
  );
}