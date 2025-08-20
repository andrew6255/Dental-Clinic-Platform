import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

export default function ProviderAvailability() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [providerId, setProviderId] = useState("prov-1");
  const [rows, setRows] = useState(
    DAYS.map(d => ({ day:d, start:"09:00", end:"17:00", enabled:false }))
  );
  const canEdit = role === "admin" || role === "secretary";

  useEffect(() => {
    if (loading) return;
    (async () => {
      const promises = DAYS.map(day => getDoc(doc(db,
        `clinics/${clinicId}/providers/${providerId}/availability/${day}`)));
      const snaps = await Promise.all(promises);
      const next = DAYS.map((day,i)=>{
        if (!snaps[i].exists()) return { day, start:"09:00", end:"17:00", enabled:false };
        const d = snaps[i].data();
        return { day, start:d.start, end:d.end, enabled:d.enabled ?? true };
      });
      setRows(next);
    })();
  }, [clinicId, providerId, loading]);

  async function save() {
    await Promise.all(rows.map(r =>
      setDoc(doc(db, `clinics/${clinicId}/providers/${providerId}/availability/${r.day}`),
        { start:r.start, end:r.end, enabled:r.enabled }, { merge:true })
    ));
    alert("Saved availability");
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Provider availability</h1>
          <div className="max-w-md grid gap-3 rounded-xl border p-4 bg-white">
            <label className="text-sm">Provider ID</label>
            <input className="rounded-xl border px-3 py-2"
                   value={providerId} onChange={e=>setProviderId(e.target.value)} />
            <div className="grid gap-2">
              {rows.map((r,idx)=>(
                <div key={r.day} className="flex items-center gap-2">
                  <input type="checkbox" checked={r.enabled}
                         onChange={e=>setRows(x=>x.map((y,i)=>i===idx?{...y,enabled:e.target.checked}:y))}/>
                  <div className="w-16 capitalize">{r.day}</div>
                  <input type="time" className="rounded-xl border px-2 py-1"
                         value={r.start}
                         onChange={e=>setRows(x=>x.map((y,i)=>i===idx?{...y,start:e.target.value}:y))}/>
                  <span>–</span>
                  <input type="time" className="rounded-xl border px-2 py-1"
                         value={r.end}
                         onChange={e=>setRows(x=>x.map((y,i)=>i===idx?{...y,end:e.target.value}:y))}/>
                </div>
              ))}
            </div>
            {canEdit && (
              <button onClick={save} className="rounded-xl bg-slate-900 text-white px-3 py-2">
                Save
              </button>
            )}
            {!canEdit && <div className="text-xs text-slate-500">Read-only for your role.</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
