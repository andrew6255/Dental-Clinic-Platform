// src/pages/admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

import SeedDemoData from "../../components/SeedDemoData";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";
import ApptItem from "../../components/ApptItem";
import ApptFilters from "../../components/ApptFilters";

export default function AdminDashboard() {
  const nav = useNavigate();
  const { role, clinicId, clinicName, loading } = useRoleClinic();

  const [counts, setCounts] = useState({ appts: 0, patients: 0 });
  const [appts, setAppts] = useState([]);

  // filters
  const [filters, setFilters] = useState({
    providerId: "",
    status: "",
    date: "",
  });

  useEffect(() => {
    if (loading) return;

    // initial counts
    (async () => {
      const ap = await getDocs(collection(db, `clinics/${clinicId}/appointments`));
      const pt = await getDocs(collection(db, `clinics/${clinicId}/patients`));
      setCounts({ appts: ap.size, patients: pt.size });
    })();

    // live appointments stream
    const qAppts = query(
      collection(db, `clinics/${clinicId}/appointments`),
      orderBy("startsAt")
    );
    const unsub = onSnapshot(qAppts, (snap) =>
      setAppts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [clinicId, loading]);

  // apply filters client-side
  const shown = useMemo(() => {
    return appts.filter((a) => {
      if (filters.providerId && a.providerId !== filters.providerId) return false;
      if (filters.status && a.status !== filters.status) return false;
      if (filters.date && a.startsAt?.seconds) {
        const d = new Date(a.startsAt.seconds * 1000);
        if (d.toISOString().slice(0, 10) !== filters.date) return false;
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
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>

          {/* KPI cards */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Card title="Appointments (all time)" value={counts.appts} />
            <Card title="Patients" value={counts.patients} />
          </div>

          {/* Seed demo data (local) */}
          <div className="pt-2">
            <SeedDemoData />
          </div>

          {/* Filters */}
          <ApptFilters value={filters} onChange={setFilters} />

          {/* Appointments (filtered) */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">All Appointments</h2>
            {shown.map((a) => (
              <ApptItem key={a.id} a={a} clinicId={clinicId} role={role} />
            ))}
            {shown.length === 0 && (
              <div className="text-sm text-slate-500">No matches.</div>
            )}
          </section>

          <div className="pt-4">
            <button
              className="rounded-xl border px-4 py-2"
              onClick={() => nav("/clinic")}
            >
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
