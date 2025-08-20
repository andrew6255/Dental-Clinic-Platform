// src/pages/patient/PatientDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
} from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";
import ApptItem from "../../components/ApptItem";
import ApptFilters from "../../components/ApptFilters";

export default function PatientDashboard() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();

  const [patientId, setPatientId] = useState(null);
  const [appts, setAppts] = useState([]);
  const [filters, setFilters] = useState({ providerId: "", status: "", date: "" });

  // Link current user -> patientId
  useEffect(() => {
    if (loading) return;
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDocs(
        query(collection(db, `clinics/${clinicId}/patients`), where("userId", "==", uid))
      );
      if (!snap.empty) setPatientId(snap.docs[0].id);
    })();
  }, [clinicId, loading]);

  // Subscribe to ONLY this patient's appointments
  useEffect(() => {
    if (loading || !patientId) return;
    const qAppts = query(
      collection(db, `clinics/${clinicId}/appointments`),
      where("patientId", "==", patientId),
      orderBy("startsAt")
    );
    const unsub = onSnapshot(qAppts, (snap) =>
      setAppts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [clinicId, patientId, loading]);

  const shown = useMemo(() => {
    return appts.filter((a) => {
      if (filters.providerId && a.providerId !== filters.providerId) return false; // optional for patient
      if (filters.status && a.status !== filters.status) return false;
      if (filters.date && a.startsAt?.seconds) {
        const d = new Date(a.startsAt.seconds * 1000);
        if (d.toISOString().slice(0, 10) !== filters.date) return false;
      }
      return true;
    });
  }, [appts, filters]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role || "patient"} />
        <main className="flex-1 space-y-4">
          <h1 className="text-2xl font-bold">My Appointments</h1>

          {/* Filters (provider is optional for patients; leave blank to see all) */}
          <ApptFilters value={filters} onChange={setFilters} />

          <div className="grid gap-2">
            {shown.map((a) => (
              <ApptItem key={a.id} a={a} clinicId={clinicId} role={role || "patient"} />
            ))}
            {patientId && shown.length === 0 && (
              <div className="text-sm text-slate-500">No matches.</div>
            )}
            {!patientId && (
              <div className="text-sm text-slate-500">
                Your account isn’t linked to a patient record yet. Go to <b>My files</b> and link
                your patient ID (or ask the clinic to link you).
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
