import { useEffect, useMemo, useState } from "react";
import { db, auth } from "../../firebase";
import { collection, onSnapshot, query, orderBy, where, getDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";
import { dayKey } from "../../utils/schedule";
import { buildSlotsForDay, removeConflicts } from "../../utils/slots";

export default function Book(){
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [providerId, setProviderId] = useState("prov-1");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [appts, setAppts] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [patientId, setPatientId] = useState("");

  // link uid -> patientId
  useEffect(()=>{
    if (loading) return;
    (async ()=>{
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const qs = await (await import("firebase/firestore")).getDocs(
        query(collection(db, `clinics/${clinicId}/patients`), where("userId","==", uid))
      );
      if (!qs.empty) setPatientId(qs.docs[0].id);
    })();
  }, [clinicId, loading]);

  useEffect(()=>{
    if (loading) return;
    const unsub = onSnapshot(collection(db, `clinics/${clinicId}/services`),
      snap => setServices(snap.docs.map(d=>({id:d.id, ...d.data()}))));
    return () => unsub();
  }, [clinicId, loading]);

  // listen to appts for this provider around the chosen date
  useEffect(()=>{
    if (loading) return;
    const qA = query(collection(db, `clinics/${clinicId}/appointments`),
      where("providerId","==", providerId), orderBy("startsAt"));
    const unsub = onSnapshot(qA, snap => setAppts(snap.docs.map(d=>({id:d.id, ...d.data()}))));
    return () => unsub();
  }, [clinicId, providerId, loading]);

  // fetch availability
  useEffect(()=>{
    if (loading) return;
    (async ()=>{
      const day = dayKey(new Date(date));
      const s = await getDoc(doc(db, `clinics/${clinicId}/providers/${providerId}/availability/${day}`));
      setAvailability(s.exists()? s.data() : null);
    })();
  }, [clinicId, providerId, date, loading]);

  const slots = useMemo(()=>{
    const baseSlots = buildSlotsForDay(new Date(date), availability || {enabled:false}, 30);
    const open = removeConflicts(baseSlots, appts);
    return open;
  }, [availability, appts, date]);

  async function book(start, end){
    if (!patientId) return alert("Your account isn’t linked to a patient record yet (Patients → Link).");
    const service = services.find(s=>s.id===serviceId);
    await addDoc(collection(db, `clinics/${clinicId}/appointments`), {
      clinicId,
      providerId,
      patientId,
      serviceId: serviceId || null,
      startsAt: { seconds: Math.floor(start.getTime()/1000), nanoseconds:0 },
      endsAt: { seconds: Math.floor(end.getTime()/1000), nanoseconds:0 },
      status: "requested",
      estimateCents: service?.defaultPriceCents ?? null,
      createdAt: serverTimestamp(),
    });
    alert("Requested! Staff will confirm.");
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role || "patient"} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Book an appointment</h1>

          <div className="grid sm:grid-cols-4 gap-3 rounded-xl border p-4 bg-white">
            <div>
              <label className="block text-sm">Provider</label>
              <input className="w-full rounded-xl border px-3 py-2"
                     value={providerId} onChange={e=>setProviderId(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Service</label>
              <select className="w-full rounded-xl border px-3 py-2"
                      value={serviceId} onChange={e=>setServiceId(e.target.value)}>
                <option value="">(optional)</option>
                {services.map(s=>(
                  <option key={s.id} value={s.id}>
                    {s.name} — €{(s.defaultPriceCents/100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Date</label>
              <input type="date" className="w-full rounded-xl border px-3 py-2"
                     value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div className="self-end text-xs text-slate-600">
              {availability?.enabled ? `Hours: ${availability.start}–${availability.end}` : "No availability"}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            {slots.map((s,i)=>(
              <button key={i}
                className="rounded-xl border px-3 py-2 bg-white hover:bg-slate-50 text-left"
                onClick={()=>book(s.start, s.end)}>
                {s.start.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                {" – "}
                {s.end.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
              </button>
            ))}
            {slots.length===0 && <div className="text-sm text-slate-500">No open slots.</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
