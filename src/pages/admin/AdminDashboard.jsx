import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import SeedDemoData from "../../components/SeedDemoData";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";
import ApptItem from "../../components/ApptItem";

export default function AdminDashboard() {
  const nav = useNavigate();
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [counts, setCounts] = useState({ appts: 0, patients: 0 });
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    if (loading) return;
    (async () => {
      const ap = await getDocs(collection(db, `clinics/${clinicId}/appointments`));
      const pt = await getDocs(collection(db, `clinics/${clinicId}/patients`));
      setCounts({ appts: ap.size, patients: pt.size });
    })();
    const q = query(collection(db, `clinics/${clinicId}/appointments`), orderBy("startsAt"));
    const unsub = onSnapshot(q, snap => setAppts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [clinicId, loading]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>

          <div className="grid sm:grid-cols-2 gap-3">
            <Card title="Appointments (all time)" value={counts.appts} />
            <Card title="Patients" value={counts.patients} />
          </div>

          <div className="pt-2">
            <SeedDemoData />
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">All Appointments</h2>
            {appts.map(a => <ApptItem key={a.id} a={a} clinicId={clinicId} role={role} />)}
          </section>

          <div className="pt-4">
            <button className="rounded-xl border px-4 py-2" onClick={() => nav("/clinic")}>
              Go to switcher
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="text-3xl font-extrabold">{value}</div>
    </div>
  );
}
