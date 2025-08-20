import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export default function App() {
  const nav = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) nav("/login");
      else nav("/role");
    });
    return () => unsub();
  }, [nav]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">ClinicFlow (Local)</h1>
      <p>Redirecting…</p>
    </div>
  );
}
