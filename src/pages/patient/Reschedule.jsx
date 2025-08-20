// src/pages/patient/Reschedule.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";
import { dayKey } from "../../utils/schedule";
import { buildSlotsForDay, removeConflicts } from "../../utils/slots";

export default function Reschedule() {
  const { appointmentId } = useParams();
  const nav = useNavigate();
  const { role, clinicId, clinicName, loading } = useRoleClinic();

  const [appt, setAppt] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [availability, setAvailability] = useState(null);
  const [appts, setAppts] = useState([]);
  const [patientId, setPatientId] = useState("");

  // link user -> patientId
  useEffect(() => {
    if (loading) return;
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const qs = await getDocs(
        query(collection(db, `clinics/${clinicId}/patients`), where("userId", "==", uid))
      );
      if (!qs.empty) setPatientId(qs.docs[0].id);
    })();
  }, [clinicId, loading]);

  // load original appt
  useEffect(() => {
    if (loading) return;
    (async () => {
      const s = await getDoc(doc(db, `clinics/${clinicId}/appointments/${appointmentId}`));
      if (!s.exists()) return;
      const data = { id: s.id, ...s.data() };
      setAppt(data);
      // initialize date to original appt day
      if (data.startsAt?.seconds) {
        setDate(new Date(data.startsAt.seconds * 1000).toISOString().slice(0, 10));
      }
    })();
  }, [clinicId, appointmentId, loading]);

  // listen provider appts (for conflict check)
  useEffect(() => {
    if (loading || !appt) return;
    const qA = query(
      collection(db, `clinics/${clinicId}/appointments`),
      where("providerId", "==", appt.providerId),
      orderBy("startsAt")
    );
    const unsub = onSnapshot(qA, (snap) =>
      setAppts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [clinicId, appt, loading]);

  // fetch availability for chosen date
  useEffect(() => {
    if (loading || !appt) return;
    (async () => {
      const day = dayKey(new Date(date));
      const s = await getDoc(
        doc(db, `clinics/${clinicId}/providers/${appt.providerId}/availability/${day}`)
      );
      setAvailability(s.exists() ? s.data() : null);
    })();
  }, [clinicId, appt, date, loading]);

  // build slots, but ignore the original appt when checking conflicts
  const slots = useMemo(() => {
    const avail = availability || { enabled: false };
    const baseSlots = buildSlotsForDay(new Date(date), avail, 30);
    const otherAppts = appts.filter((x) => x.id !== appointmentId);
    return removeConflicts(baseSlots, otherAppts);
  }, [availability, appts, appointmentId, date]);

  async function pick(start, end) {
    if (!appt) return;
    if (!patientId || patientId !== appt.patientId) {
      alert("This appointment does not belong to your account.");
      return;
    }
    // 1) create new requested appt (same provider/service)
    await addDoc(collection(db, `clinics/${clinicId}/appointments`), {
      clinicId,
      providerId: appt.providerId,
      patientId: appt.patientId,
      serviceId: appt.serviceId || null,
      startsAt: { seconds: Math.floor(start.getTime() / 1000), nanoseconds: 0 },
      endsAt: { seconds: Math.floor(end.getTime() / 1000), nanoseconds: 0 },
      status: "requested",
      estimateCents: appt.estimateCents ?? null,
      createdAt: serverTimestamp(),
    });
    // 2) cancel the original with a reason
    await updateDoc(doc(db, `clinics/${clinicId}/appointments/${appointmentId}`), {
      status: "cancelled",
      cancellation: {
        reason: "Reschedule requested",
        byUid: auth.currentUser?.uid || null,
        byRole: "patient",
        at: serverTimestamp(),
      },
      updatedAt: new Date(),
    });
    alert("Reschedule requested. Your original appointment was cancelled.");
    nav("/patient"); // or wherever your patient dashboard route is
  }

  if (loading || !appt) return <div className="p-6">Loading…</div>;

  const readable =
    appt.startsAt?.seconds ? new Date(appt.startsAt.seconds * 1000).toLocaleString() : "";

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role || "patient"} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role || "patient"} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Reschedule</h1>

          <div className="rounded-xl border p-4 bg-white text-sm">
            <div className="font-semibold">Current</div>
            <div>{readable} — with {appt.providerId}</div>
            <div>Service: {appt.serviceId || "—"} • Status: {appt.status}</div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 rounded-xl border p-4 bg-white">
            <div>
              <label className="block text-sm">Provider</label>
              <input className="w-full rounded-xl border px-3 py-2" value={appt.providerId} readOnly />
            </div>
            <div>
              <label className="block text-sm">Date</label>
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="self-end text-xs text-slate-600">
              {availability?.enabled ? `Hours: ${availability.start}–${availability.end}` : "No availability"}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            {slots.map((s, i) => (
              <button
                key={i}
                className="rounded-xl border px-3 py-2 bg-white hover:bg-slate-50 text-left"
                onClick={() => pick(s.start, s.end)}
              >
                {s.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                {s.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
            {slots.length === 0 && <div className="text-sm text-slate-500">No open slots.</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
