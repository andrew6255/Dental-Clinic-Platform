import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";

export default function Inventory(){
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name:"", sku:"", stock:0, reorderPoint:10, expiresOn:"" });

  useEffect(()=>{
    if (loading) return;
    const unsub = onSnapshot(collection(db, `clinics/${clinicId}/inventory`),
      snap => setRows(snap.docs.map(d=>({id:d.id, ...d.data()}))));
    return () => unsub();
  }, [clinicId, loading]);

  const low = useMemo(()=> rows.filter(r => (r.stock|0) <= (r.reorderPoint|0)), [rows]);

  async function addItem(e){
    e.preventDefault();
    await addDoc(collection(db, `clinics/${clinicId}/inventory`), {
      ...form,
      stock: +form.stock || 0,
      reorderPoint: +form.reorderPoint || 0,
      createdAt: serverTimestamp(),
    });
    setForm({ name:"", sku:"", stock:0, reorderPoint:10, expiresOn:"" });
  }

  async function adjust(id, delta){
    const item = rows.find(r=>r.id===id); if (!item) return;
    await updateDoc(doc(db, `clinics/${clinicId}/inventory/${id}`), { stock: (item.stock|0)+delta });
  }

  if (loading) return <div className="p-6">Loading…</div>;

  const canEdit = role==="admin" || role==="secretary";

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Inventory</h1>

          {canEdit && (
            <form onSubmit={addItem} className="grid gap-3 max-w-md rounded-xl border p-4 bg-white">
              <input className="rounded-xl border px-3 py-2" placeholder="Name"
                     value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))}/>
              <input className="rounded-xl border px-3 py-2" placeholder="SKU"
                     value={form.sku} onChange={e=>setForm(f=>({...f, sku:e.target.value}))}/>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className="rounded-xl border px-3 py-2" placeholder="Stock"
                       value={form.stock} onChange={e=>setForm(f=>({...f, stock:e.target.value}))}/>
                <input type="number" className="rounded-xl border px-3 py-2" placeholder="Reorder point"
                       value={form.reorderPoint} onChange={e=>setForm(f=>({...f, reorderPoint:e.target.value}))}/>
              </div>
              <input type="date" className="rounded-xl border px-3 py-2" placeholder="Expiry (optional)"
                     value={form.expiresOn} onChange={e=>setForm(f=>({...f, expiresOn:e.target.value}))}/>
              <button className="rounded-xl bg-slate-900 text-white px-3 py-2">Add item</button>
            </form>
          )}

          {low.length>0 && (
            <div className="rounded-xl border p-4 bg-amber-50">
              <div className="font-semibold">Low stock alerts</div>
              <ul className="list-disc pl-5 text-sm">
                {low.map(i=>(
                  <li key={i.id}>{i.name} — {i.stock}/{i.reorderPoint}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-2">
            {rows.map(i=>(
              <div key={i.id} className="rounded-xl border p-3 bg-white flex items-center justify-between">
                <div>
                  <div className="font-semibold">{i.name} {i.sku?`(${i.sku})`:""}</div>
                  <div className="text-xs text-slate-600">Stock: {i.stock|0} • Reorder at {i.reorderPoint|0} {i.expiresOn?`• Exp: ${i.expiresOn}`:""}</div>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button className="rounded-lg border px-2 py-1" onClick={()=>adjust(i.id, -1)}>-1</button>
                    <button className="rounded-lg border px-2 py-1" onClick={()=>adjust(i.id, +1)}>+1</button>
                  </div>
                )}
              </div>
            ))}
            {rows.length===0 && <div className="text-sm text-slate-500">No items.</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
