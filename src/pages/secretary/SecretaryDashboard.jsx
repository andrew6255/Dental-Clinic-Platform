// src/pages/secretary/SecretaryDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

import useRoleClinic from "../../hooks/useRoleClinic";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import ApptItem from "../../components/ApptItem";
import WaitlistPanel from "../../components/WaitlistPanel";
import ApptFilters from "../../components/ApptFilters";

import { hmToMinutes, overlaps, dayKey } from "../../utils/schedule";

export default function SecretaryDashboard() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();

  // live appointments
  const [appts, setAppts] = useState([]);

  // form for creating an appointment
  const [form, setForm] = useState({
    providerId: "prov-1",
    patientId: "pat-1",
    serviceId: "",
    startsAt: "",
    endsAt: "",
  });

  // services for estimate + dropdown
  const [services, setServices] = useState([]);
  const selectedService = useMemo(
    () => services.find((s) => s.id === form.serviceId),
    [services, form.serviceId]
  );

  // filters UI state
  const [filters, setFilters] = useState({ providerId: "", status: "", date: "" });

  // subscribe to appointments
  useEffect(() => {
    if (loading) return;
    const qAppts = query(
      collection(db, `clinics/${clinicId}/appointments`),
      orderBy("startsAt")
    );
    const unsub = onSnapshot(qAppts, (snap) =>
      setAppts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [clinicId, loading]);

  // subscribe to services
  useEffect(() => {
    if (loading) return;
    const unsub = onSnapshot(collection(db, `clinics/${clinicId}/services`), (snap) =>
      setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [clinicId, loading]);

  // apply filters client-side
  const shown = useMemo(() => {
    return appts.filter((a) => {
      if (filters.providerId && a.providerId !== filters.providerId) return false;
      if (filters.status && a.status !== filters.status) return false;
      if (filters.date && a.startsAt?.seconds) {
        const d = new Date(a.startsAt.seconds * 1000);
        if (d.toISOString().slice(0, 10) !== filters.date) return false;
      }
      return true;
    });
  }, [appts, filters]);

  async function createAppt(e) {
    e.preventDefault();
    const starts = form.startsAt ? new Date(form.startsAt) : new Date();
    const ends = form.endsAt
      ? new Date(form.endsAt)
      : new Date(starts.getTime() + 30 * 60000);

    // 1) Check provider availability for weekday
    const day = dayKey(starts);
    const availRef = doc(
      db,
      `clinics/${clinicId}/providers/${form.providerId}/availability/${day}`
    );
    const availSnap = await getDoc(availRef);
    if (availSnap.exists() && availSnap.data().enabled) {
      const { start, end } = availSnap.data(); // "HH:MM"
      const mins = (dt) => dt.getHours() * 60 + dt.getMinutes();
      const aStart = hmToMinutes(start),
        aEnd = hmToMinutes(end);
      const sMin = mins(starts),
        eMin = mins(ends);
      if (!(aStart <= sMin && eMin <= aEnd)) {
        alert(`Outside provider hours on ${day.toUpperCase()} (${start}-${end})`);
        return;
      }
    } else {
      alert(
        `No availability for ${form.providerId} on ${day.toUpperCase()}. Set it in Availability page.`
      );
      return;
    }

    // 2) Check for overlaps with existing appointments for this provider
    // naive: pull provider appts and check intervals in JS
    const qSnap = await getDocs(
      query(
        collection(db, `clinics/${clinicId}/appointments`),
        where("providerId", "==", form.providerId),
        orderBy("startsAt")
      )
    );
    const sEpoch = Math.floor(starts.getTime() / 1000);
    const eEpoch = Math.floor(ends.getTime() / 1000);
    for (const d of qSnap.docs) {
      const ap = d.data();
      if (!ap.startsAt?.seconds || !ap.endsAt?.seconds) continue;
      const as = ap.startsAt.seconds,
        ae = ap.endsAt.seconds;
      if (
        overlaps(sEpoch, eEpoch, as, ae) &&
        ap.status !== "cancelled" &&
        ap.status !== "no_show"
      ) {
        alert(
          `Conflict with appointment ${d.id} (${new Date(as * 1000).toLocaleTimeString()}–${new Date(
            ae * 1000
          ).toLocaleTimeString()})`
        );
        return;
      }
    }

    // 3) Create the appointment (confirmed by secretary)
    await addDoc(collection(db, `clinics/${clinicId}/appointments`), {
      clinicId,
      providerId: form.providerId,
      patientId: form.patientId,
      serviceId: form.serviceId || null,
      startsAt: { seconds: Math.floor(starts.getTime() / 1000), nanoseconds: 0 },
      endsAt: { seconds: Math.floor(ends.getTime() / 1000), nanoseconds: 0 },
      status: "confirmed",
      estimateCents: selectedService?.defaultPriceCents ?? null,
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

          {/* Filters */}
          <ApptFilters value={filters} onChange={setFilters} />

          {/* Create appointment */}
          <form
            onSubmit={createAppt}
            className="grid gap-3 max-w-xl rounded-xl border p-4 bg-white"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Provider ID</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.providerId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, providerId: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm">Patient ID</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.patientId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, patientId: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm">Service</label>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={form.serviceId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serviceId: e.target.value }))
                }
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — €{(s.defaultPriceCents / 100).toFixed(2)}
                  </option>
                ))}
              </select>
              {selectedService && (
                <div className="text-xs text-slate-600 mt-1">
                  Estimate: €
                  {(selectedService.defaultPriceCents / 100).toFixed(2)} •{" "}
                  {selectedService.defaultDurationMinutes} min
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Starts At</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startsAt: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm">Ends At</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border px-3 py-2"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAt: e.target.value }))
                  }
                />
              </div>
            </div>

            <button className="rounded-xl bg-slate-900 text-white px-3 py-2">
              Create
            </button>
          </form>

          {/* Appointments list (filtered) */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">All Appointments</h2>
            {shown.map((a) => (
              <ApptItem key={a.id} a={a} clinicId={clinicId} role={role} />
            ))}
            {shown.length === 0 && (
              <div className="text-sm text-slate-500">No matches.</div>
            )}
          </section>

          {/* Waitlist */}
          <section>
            <WaitlistPanel clinicId={clinicId} />
          </section>
        </main>
      </div>
    </div>
  );
}
