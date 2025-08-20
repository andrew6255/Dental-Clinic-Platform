import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("anna@example.com");
  const [pw, setPw] = useState("password");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, pw);
      } else {
        await createUserWithEmailAndPassword(auth, email, pw);
      }
      nav("/role");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border p-6 bg-white shadow"
      >
        <h1 className="text-xl font-bold mb-4">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full mb-3 rounded-xl border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          className="w-full mb-4 rounded-xl border px-3 py-2"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        <button className="w-full rounded-xl bg-slate-900 text-white py-2">
          {mode === "login" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          className="mt-3 text-sm underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Have an account? Log in"}
        </button>

        <button
          type="button"
          className="mt-3 text-xs"
          onClick={() => {
            signOut(auth);
          }}
        >
          Sign out (debug)
        </button>
      </form>
    </div>
  );
}
