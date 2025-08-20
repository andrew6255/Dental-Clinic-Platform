import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

export default function ClinicSelect() {
  const nav = useNavigate();
  const [role, setRole] = useState(null);
  const clinicId = "demo-clinic";

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) return nav("/login");
      const rdoc = await getDoc(doc(db, "userRoles", `${u.uid}_${clinicId}`));
      if (!rdoc.exists()) return nav("/role");
      setRole(rdoc.data().role);
    })();
  }, [nav, clinicId]);

  function enterClinic() {
    localStorage.setItem("clinicId", clinicId);
    if (role === "admin") nav("/admin");
    else if (role === "doctor") nav("/doctor");
    else if (role === "secretary") nav("/secretary");
    else nav("/patient");
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full rounded-2xl border p-6 bg-white shadow">
        <h1 className="text-xl font-bold mb-2">Select Clinic</h1>
        <p className="text-sm text-slate-600 mb-4">
          You have access to: <b>Demo Dental (demo-clinic)</b>
        </p>
        <button
          onClick={enterClinic}
          className="rounded-xl bg-slate-900 text-white px-4 py-2"
        >
          Enter clinic
        </button>
      </div>
    </div>
  );
}
