import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";

export default function Patients() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });

  useEffect(() => {
    if (loading) return;
    const unsub = onSnapshot(collection(db, `clinics/${clinicId}/patients`), (snap) =>
      setPatients(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [clinicId, loading]);

  async function addPatient(e) {
    e.preventDefault();
    await addDoc(collection(db, `clinics/${clinicId}/patients`), {
      ...form,
      createdAt: serverTimestamp(),
    });
    setForm({ firstName: "", lastName: "", email: "" });
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Patients</h1>

          {(role === "admin" || role === "secretary" || role === "doctor") && (
            <form onSubmit={addPatient} className="grid gap-3 max-w-md rounded-xl border p-4 bg-white">
              <div>
                <label className="block text-sm">First name</label>
                <input className="w-full rounded-xl border px-3 py-2"
                       value={form.firstName}
                       onChange={e=>setForm(f=>({...f, firstName:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm">Last name</label>
                <input className="w-full rounded-xl border px-3 py-2"
                       value={form.lastName}
                       onChange={e=>setForm(f=>({...f, lastName:e.target.value}))}/>
              </div>
              <div>
                <label className="block text-sm">Email</label>
                <input className="w-full rounded-xl border px-3 py-2"
                       value={form.email}
                       onChange={e=>setForm(f=>({...f, email:e.target.value}))}/>
              </div>
              <button className="rounded-xl bg-slate-900 text-white px-3 py-2">Add</button>
            </form>
          )}

          <div className="grid gap-2">
            {patients.map(p => (
              <div key={p.id} className="rounded-xl border p-3 bg-white">
                <div className="font-semibold">{p.firstName} {p.lastName}</div>
                <div className="text-sm text-slate-600">{p.email || "—"}</div>
                <a href={`/patients/${p.id}`} className="text-sm rounded-lg border px-3 py-1 hover:bg-slate-50">
                  Open
                </a>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
