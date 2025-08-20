import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

export default function RoleSelect() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [error, setError] = useState("");
  const demoClinicId = "demo-clinic";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          setUid(null);
          setLoading(false);
          // not logged in → go to login
          nav("/login");
          return;
        }
        setUid(u.uid);

        // once we have a user, check if they already have a role
        const rdoc = await getDoc(doc(db, "userRoles", `${u.uid}_${demoClinicId}`));
        if (rdoc.exists()) {
          // role exists → go to clinic picker
          nav("/clinic");
          return;
        }

        // no role yet → show role choices
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("Failed to check roles. Is the Firestore emulator running?");
        setLoading(false);
      }
    });

    return () => unsub();
  }, [nav]);

  async function choose(role) {
    try {
      if (!uid) return nav("/login");
      await setDoc(doc(db, "userRoles", `${uid}_${demoClinicId}`), {
        uid,
        clinicId: demoClinicId,
        role, // 'admin' | 'doctor' | 'secretary' | 'patient'
      });
      nav("/clinic");
    } catch (e) {
      console.error(e);
      setError("Could not save role. Check emulator and rules.");
    }
  }

  if (loading) return <div className="p-6">Checking roles…</div>;

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border p-6 bg-white shadow">
        <h1 className="text-xl font-bold mb-4">Choose a role (local demo)</h1>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <div className="grid gap-2">
          {["admin", "doctor", "secretary", "patient"].map((r) => (
            <button
              key={r}
              onClick={() => choose(r)}
              className="rounded-xl border px-4 py-2 hover:bg-slate-50 text-left"
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
