import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";

function cents(n){ return (n/100).toFixed(2); }

export default function Billing() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (loading) return;
    const q = query(collection(db, `clinics/${clinicId}/invoices`), orderBy("createdAt"));
    const unsub = onSnapshot(q, (snap) =>
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [clinicId, loading]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Billing</h1>

          <div className="grid gap-2">
            {invoices.map(inv => (
              <div key={inv.id} className="rounded-xl border p-3 bg-white flex items-center justify-between">
                <div>
                  <div className="font-semibold">Invoice {inv.id.slice(0,6)}…</div>
                  <div className="text-sm text-slate-600">Patient: {inv.patientId} • Appt: {inv.appointmentId}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">€{cents(inv.totalCents || 0)}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{inv.status}</div>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="rounded-xl border p-3 bg-white text-sm text-slate-600">No invoices yet.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
