import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";
import ApptItem from "../../components/ApptItem";

export default function DoctorDashboard() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    if (loading) return;
    const q = query(collection(db, `clinics/${clinicId}/appointments`), orderBy("startsAt"));
    const unsub = onSnapshot(q, (snap) => setAppts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [clinicId, loading]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1">
          <h1 className="text-2xl font-bold mb-4">Doctor – Today</h1>
          <div className="space-y-2">
            {appts.map((a) => (
              <ApptItem key={a.id} a={a} clinicId={clinicId} role={role} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
