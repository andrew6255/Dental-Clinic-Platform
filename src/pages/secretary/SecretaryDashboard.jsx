import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import useRoleClinic from "../../hooks/useRoleClinic";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import ApptItem from "../../components/ApptItem";
import { getDocs, where } from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { hmToMinutes, overlaps, dayKey } from "../../utils/schedule";
import WaitlistPanel from "../../components/WaitlistPanel";
import { addDoc as addDocFS, collection as collectionFS } from "firebase/firestore";

export default function SecretaryDashboard() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [appts, setAppts] = useState([]);
  const [form, setForm] = useState({
    providerId: "prov-1",
    patientId: "pat-1",
    serviceId: "cleaning",
    startsAt: "",
    endsAt: "",
  });

  useEffect(() => {
    if (loading) return;
    const q = query(collection(db, `clinics/${clinicId}/appointments`), orderBy("startsAt"));
    const unsub = onSnapshot(q, (snap) => setAppts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [clinicId, loading]);

  async function createAppt(e) {
    e.preventDefault();
    const starts = form.startsAt ? new Date(form.startsAt) : new Date();
    const ends = form.endsAt ? new Date(form.endsAt) : new Date(starts.getTime() + 30 * 60000);
    // 1) Check provider availability for weekday
   const day = dayKey(starts);
   const availRef = doc(db, `clinics/${clinicId}/providers/${form.providerId}/availability/${day}`);
   const availSnap = await getDoc(availRef);
   if (availSnap.exists() && availSnap.data().enabled) {
     const { start, end } = availSnap.data(); // "HH:MM"
     const mins = (dt)=>dt.getHours()*60 + dt.getMinutes();
     const aStart = hmToMinutes(start), aEnd = hmToMinutes(end);
     const sMin = mins(starts), eMin = mins(ends);
     if (!(aStart <= sMin && eMin <= aEnd)) {
       alert(`Outside provider hours on ${day.toUpperCase()} (${start}-${end})`);
       return;
     }
   } else {
     // If availability not set or disabled, block to be safe.
     alert(`No availability for ${form.providerId} on ${day.toUpperCase()}. Set it in Availability page.`);
     return;
   }

   // 2) Check for overlaps with existing appointments for this provider
   // naive query: pull a window of +/- 1 day and check in JS
   const oneDay = 24*3600*1000;
   const from = new Date(starts.getTime() - oneDay);
   const to   = new Date(starts.getTime() + oneDay);
   const qSnap = await getDocs(
     query(
       collection(db, `clinics/${clinicId}/appointments`),
       where("providerId","==", form.providerId),
       orderBy("startsAt")
     )
   );
   const sEpoch = Math.floor(starts.getTime()/1000);
   const eEpoch = Math.floor(ends.getTime()/1000);
   for (const d of qSnap.docs) {
     const ap = d.data();
     if (!ap.startsAt?.seconds || !ap.endsAt?.seconds) continue;
     const as = ap.startsAt.seconds, ae = ap.endsAt.seconds;
     if (overlaps(sEpoch, eEpoch, as, ae) && ap.status !== "cancelled" && ap.status !== "no_show") {
       alert(`Conflict with appointment ${d.id} (${new Date(as*1000).toLocaleTimeString()}–${new Date(ae*1000).toLocaleTimeString()})`);
       return;
     }
   }
    await addDoc(collection(db, `clinics/${clinicId}/appointments`), {
      clinicId,
      providerId: form.providerId,
      patientId: form.patientId,
      serviceId: form.serviceId,
      startsAt: { seconds: Math.floor(starts.getTime() / 1000), nanoseconds: 0 },
      endsAt: { seconds: Math.floor(ends.getTime() / 1000), nanoseconds: 0 },
      status: "confirmed",
      createdAt: serverTimestamp(),
    });
    setForm({ ...form, startsAt: "", endsAt: "" });
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Secretary – Schedule</h1>

          <form onSubmit={createAppt} className="grid gap-3 max-w-md rounded-xl border p-4 bg-white">
            <div>
              <label className="block text-sm">Provider ID</label>
              <input className="w-full rounded-xl border px-3 py-2"
                     value={form.providerId}
                     onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value }))}/>
            </div>
            <div>
              <label className="block text-sm">Patient ID</label>
              <input className="w-full rounded-xl border px-3 py-2"
                     value={form.patientId}
                     onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}/>
            </div>
            <div>
              <label className="block text-sm">Service ID</label>
              <input className="w-full rounded-xl border px-3 py-2"
                     value={form.serviceId}
                     onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}/>
            </div>
            <div>
              <label className="block text-sm">Starts At</label>
              <input type="datetime-local" className="w-full rounded-xl border px-3 py-2"
                     value={form.startsAt}
                     onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}/>
            </div>
            <div>
              <label className="block text-sm">Ends At</label>
              <input type="datetime-local" className="w-full rounded-xl border px-3 py-2"
                     value={form.endsAt}
                     onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}/>
            </div>
            <button className="rounded-xl bg-slate-900 text-white px-3 py-2">Create</button>
          </form>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">All Appointments</h2>
            {appts.map((a) => (
                  <ApptItem key={a.id} a={a} clinicId={clinicId} role={role}>
                      {/* extra right-side actions for secretary */}
                  </ApptItem>
            ))}
          </section>
          <section>
            <WaitlistPanel clinicId={clinicId} />
          </section>
        </main>
      </div>
    </div>
  );
}
