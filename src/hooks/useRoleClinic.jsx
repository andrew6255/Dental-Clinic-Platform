// src/hooks/useRoleClinic.js
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function useRoleClinic() {
  const [role, setRole] = useState(null);
  const [clinicName, setClinicName] = useState("");
  const [loading, setLoading] = useState(true);

  const clinicId = localStorage.getItem("clinicId") || "demo-clinic";

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) { setLoading(false); return; }

      // role
      const rdoc = await getDoc(doc(db, "userRoles", `${u.uid}_${clinicId}`));
      if (rdoc.exists()) setRole(rdoc.data().role || null);

      // clinic name
      const cdoc = await getDoc(doc(db, "clinics", clinicId));
      if (cdoc.exists()) setClinicName(cdoc.data().name || clinicId);

      setLoading(false);
    })();
  }, [clinicId]);

  return { role, clinicId, clinicName, loading };
}
