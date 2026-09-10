import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, PlusCircle } from "lucide-react";
import { api, userFacingMessage } from "../api/client";
import type { Patient } from "../types";
import {
  Card,
  CardHeader,
  Spinner,
  EmptyState,
  Alert,
  Badge,
  Button,
  Input,
  formatDate,
} from "../components/ui";

export default function Patients() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await api.get<Patient[]>("/patients");
        if (cancelled) return;
        setAllPatients(all);
        setPatients(all);
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, "Could not load patients."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSearching(true);
    setError(null);
    try {
      if (!q) {
        setPatients(allPatients);
      } else {
        const results = await api.get<Patient[]>(`/patients/search?q=${encodeURIComponent(q)}`);
        setPatients(results);
      }
    } catch (err) {
      setError(userFacingMessage(err, "Patient search failed."));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
          <p className="text-sm text-slate-500 mt-1">Search by name, patient ID, phone or date of birth</p>
        </div>
        <Button variant="success" onClick={() => navigate("/patients")}>
          <PlusCircle className="w-4 h-4" /> New Patient Visit
        </Button>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code (AYU-2026-1001), phone, or DOB..."
              className="pl-9"
            />
          </div>
          <Button type="submit" loading={searching}>
            {searching ? "Searching..." : "Search"}
          </Button>
          {query && (
            <Button variant="ghost" onClick={() => { setQuery(""); setPatients(allPatients); }}>
              Clear
            </Button>
          )}
        </form>
      </Card>

      {error && (
        <Alert kind="error" title="Search error">
          {error}
        </Alert>
      )}

      {loading ? (
        <Spinner label="Loading patients..." />
      ) : (
        <Card>
          <CardHeader title="Patient Records" subtitle="Synthetic demo patients only" />
          {patients && patients.length === 0 ? (
            <EmptyState title="No patients found" message="Try a different search term." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Patient</th>
                    <th className="px-5 py-3 font-medium">Patient ID</th>
                    <th className="px-5 py-3 font-medium">Age / Gender</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Last Consultation</th>
                    <th className="px-5 py-3 font-medium">Current Treatment</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients?.map((p) => {
                    const lastCons = p.consultations?.[0];
                    const currentTreatment = lastCons?.case_history?.treatment_plan;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center font-medium">
                              {p.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{p.full_name}</p>
                              <p className="text-xs text-slate-500">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">{p.patient_code}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {p.age} yrs &middot; {p.gender}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{p.phone || "—"}</td>
                        <td className="px-5 py-3 text-slate-600">{formatDate(p.last_consultation)}</td>
                        <td className="px-5 py-3">
                          {currentTreatment ? (
                            <span className="text-xs text-slate-600 line-clamp-2 max-w-[180px]">{currentTreatment}</span>
                          ) : (
                            <Badge color="slate">None</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Button size="sm" onClick={() => navigate(`/patients/${p.id}`)}>
                            View Record
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}