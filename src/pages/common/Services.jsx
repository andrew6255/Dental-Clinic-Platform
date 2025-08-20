import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";

function cents(n){ return (n/100)|0; }

export default function Services(){
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name:"", code:"", defaultDurationMinutes:30, defaultPriceCents:5000 });

  useEffect(()=>{
    if (loading) return;
    const unsub = onSnapshot(collection(db, `clinics/${clinicId}/services`),
      snap => setRows(snap.docs.map(d=>({id:d.id, ...d.data()}))));
    return () => unsub();
  }, [clinicId, loading]);

  async function addService(e){
    e.preventDefault();
    await addDoc(collection(db, `clinics/${clinicId}/services`), {
      ...form,
      createdAt: serverTimestamp(),
    });
    setForm({ name:"", code:"", defaultDurationMinutes:30, defaultPriceCents:5000 });
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Services</h1>

          {(role==="admin" || role==="secretary") && (
            <form onSubmit={addService} className="grid gap-3 max-w-md rounded-xl border p-4 bg-white">
              <input className="rounded-xl border px-3 py-2" placeholder="Name"
                     value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))}/>
              <input className="rounded-xl border px-3 py-2" placeholder="Code (optional)"
                     value={form.code} onChange={e=>setForm(f=>({...f, code:e.target.value}))}/>
              <input type="number" className="rounded-xl border px-3 py-2" placeholder="Duration minutes"
                     value={form.defaultDurationMinutes}
                     onChange={e=>setForm(f=>({...f, defaultDurationMinutes: +e.target.value}))}/>
              <input type="number" className="rounded-xl border px-3 py-2" placeholder="Price cents"
                     value={form.defaultPriceCents}
                     onChange={e=>setForm(f=>({...f, defaultPriceCents: +e.target.value}))}/>
              <button className="rounded-xl bg-slate-900 text-white px-3 py-2">Add</button>
            </form>
          )}

          <div className="grid gap-2">
            {rows.map(s=>(
              <div key={s.id} className="rounded-xl border p-3 bg-white flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.name} {s.code?`(${s.code})`:""}</div>
                  <div className="text-xs text-slate-600">
                    {s.defaultDurationMinutes} min • €{(s.defaultPriceCents/100).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
            {rows.length===0 && <div className="text-sm text-slate-500">No services yet.</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
