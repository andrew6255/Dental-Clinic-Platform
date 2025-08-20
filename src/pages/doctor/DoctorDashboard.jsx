import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";
import ApptItem from "../../components/ApptItem";
import ApptFilters from "../../components/ApptFilters";

export default function DoctorDashboard() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [appts, setAppts] = useState([]);
  const [filters, setFilters] = useState({ providerId:"", status:"", date:"" });

  useEffect(() => {
    if (loading) return;
    const q = query(collection(db, `clinics/${clinicId}/appointments`), orderBy("startsAt"));
    const unsub = onSnapshot(q, (snap) => setAppts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [clinicId, loading]);

  const shown = useMemo(() => {
    return appts.filter(a => {
      if (filters.providerId && a.providerId !== filters.providerId) return false;
      if (filters.status && a.status !== filters.status) return false;
      if (filters.date && a.startsAt?.seconds) {
        const d = new Date(a.startsAt.seconds*1000);
        const ymd = d.toISOString().slice(0,10);
        if (ymd !== filters.date) return false;
      }
      return true;
    });
  }, [appts, filters]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-4">
          <h1 className="text-2xl font-bold">Doctor – Schedule</h1>
          <ApptFilters value={filters} onChange={setFilters} />
          <div className="space-y-2">
            {shown.map((a) => <ApptItem key={a.id} a={a} clinicId={clinicId} role={role} />)}
            {shown.length===0 && <div className="text-sm text-slate-500">No matches.</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
