// src/components/NavBar.jsx
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function NavBar({ clinicName, role }) {
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-tight">ClinicFlow</span>
          <span className="text-slate-400">•</span>
          <span className="text-sm text-slate-700">{clinicName || "Clinic"}</span>
          {role && (
            <span className="ml-2 text-xs uppercase tracking-wide rounded-full bg-slate-900 text-white px-2 py-0.5">
              {role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-sm rounded-lg border px-3 py-1 hover:bg-slate-50"
            onClick={() => nav("/clinic")}
            title="Switch clinic / dashboard"
          >
            Switch
          </button>
          <button
            className="text-sm rounded-lg border px-3 py-1 hover:bg-slate-50"
            onClick={async () => { await signOut(auth); nav("/login"); }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
