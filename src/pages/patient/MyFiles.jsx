import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collection, query, where, onSnapshot, getDocs, doc, setDoc } from "firebase/firestore";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";

export default function MyFiles() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const [uid, setUid] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [linkInput, setLinkInput] = useState("");
  const [files, setFiles] = useState([]);
  const [linking, setLinking] = useState(false);

  // get auth uid
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub();
  }, []);

  // try auto-link: find a patient with userId == uid
  useEffect(() => {
    if (!uid || loading) return;
    (async () => {
      const qSnap = await getDocs(
        query(collection(db, `clinics/${clinicId}/patients`), where("userId", "==", uid))
      );
      if (!qSnap.empty) setPatientId(qSnap.docs[0].id);
    })();
  }, [uid, clinicId, loading]);

  // subscribe to shared docs for this patient
  useEffect(() => {
    if (!patientId || loading) return;
    const qDocs = query(
      collection(db, `clinics/${clinicId}/documents`),
      where("patientId", "==", patientId),
      where("shareWithPatient", "==", true)
      // no orderBy => no composite index needed
    );
    const unsub = onSnapshot(qDocs, (snap) =>
      setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [patientId, clinicId, loading]);

  async function linkAccount(e) {
    e.preventDefault();
    if (!uid || !linkInput) return;
    setLinking(true);
    try {
      // set userId on the chosen patient record
      await setDoc(
        doc(db, `clinics/${clinicId}/patients/${linkInput}`),
        { userId: uid },
        { merge: true }
      );
      setPatientId(linkInput);
    } catch (e) {
      alert("Could not link. Ensure the patient ID exists (ask staff to create it).");
      console.error(e);
    } finally {
      setLinking(false);
    }
  }

  if (loading || uid === null) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role || "patient"} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">My files</h1>

          {!patientId && (
            <div className="rounded-xl border p-4 bg-white space-y-3 max-w-lg">
              <div className="text-sm">
                Your account isn’t linked to a patient record yet.
                Enter your **patient ID** (ask the clinic) to link your account.
              </div>
              <form onSubmit={linkAccount} className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border px-3 py-2"
                  placeholder="e.g. pat-1"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                />
                <button disabled={linking} className="rounded-xl bg-slate-900 text-white px-3 py-2">
                  {linking ? "Linking…" : "Link"}
                </button>
              </form>
            </div>
          )}

          {patientId && (
            <div className="space-y-3">
              <div className="text-sm text-slate-600">Linked patient ID: <b>{patientId}</b></div>
              <PatientFilesList clinicId={clinicId} patientId={patientId} role="patient" showOnlyShared />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
