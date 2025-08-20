// src/hooks/useRoleClinic.js
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function useRoleClinic() {
  const [role, setRole] = useState(null);
  const [clinicId, setClinicId] = useState(() => localStorage.getItem("clinicId") || "demo-clinic");
  const [clinicName, setClinicName] = useState("Clinic");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setRole(null);
        setLoading(false);
        return;
      }

      // restore clinic id if user refreshed or just selected
      const saved = localStorage.getItem("clinicId");
      if (saved && saved !== clinicId) setClinicId(saved);

      try {
        const rdoc = await getDoc(doc(db, "userRoles", `${u.uid}_${saved || clinicId}`));
        if (rdoc.exists()) {
          setRole(rdoc.data().role);
        } else {
          setRole(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
    // include clinicId so when it changes (after Enter Clinic) we refetch role
  }, [clinicId]);

  return { role, clinicId, clinicName, loading };
}
