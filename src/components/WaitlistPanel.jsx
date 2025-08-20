import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";

export default function WaitlistPanel({ clinicId }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ patientId:"", serviceId:"cleaning", note:"" });

  useEffect(() => {
    const q = query(collection(db, `clinics/${clinicId}/waitlist`), orderBy("createdAt"));
    const unsub = onSnapshot(q, (snap)=> setList(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return () => unsub();
  }, [clinicId]);

  async function addEntry(e){
    e.preventDefault();
    await addDoc(collection(db, `clinics/${clinicId}/waitlist`), {
      ...form,
      createdAt: serverTimestamp(),
    });
    setForm({ patientId:"", serviceId:"cleaning", note:"" });
  }

  return (
    <div className="rounded-xl border p-4 bg-white space-y-3">
      <h3 className="font-semibold">Waitlist</h3>
      <form onSubmit={addEntry} className="grid gap-2 sm:grid-cols-2">
        <input className="rounded-xl border px-3 py-2" placeholder="Patient ID"
               value={form.patientId} onChange={e=>setForm(f=>({...f, patientId:e.target.value}))}/>
        <input className="rounded-xl border px-3 py-2" placeholder="Service ID"
               value={form.serviceId} onChange={e=>setForm(f=>({...f, serviceId:e.target.value}))}/>
        <input className="sm:col-span-2 rounded-xl border px-3 py-2" placeholder="Note"
               value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))}/>
        <button className="sm:col-span-2 rounded-xl bg-slate-900 text-white px-3 py-2">Add to waitlist</button>
      </form>

      <div className="grid gap-2">
        {list.map(w=>(
          <div key={w.id} className="rounded-xl border px-3 py-2">
            <div className="font-medium">{w.patientId} • {w.serviceId}</div>
            <div className="text-sm text-slate-600">{w.note || "—"}</div>
          </div>
        ))}
        {list.length===0 && <div className="text-sm text-slate-500">Empty</div>}
      </div>
    </div>
  );
}
