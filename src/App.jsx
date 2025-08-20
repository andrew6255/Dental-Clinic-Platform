// src/App.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { auth } from "./firebase";

import Login from "./pages/Login";
import RoleSelect from "./pages/RoleSelect";
import ClinicSelect from "./pages/ClinicSelect";

import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import SecretaryDashboard from "./pages/secretary/SecretaryDashboard";
import PatientDashboard from "./pages/patient/PatientDashboard";
import MyFiles from "./pages/patient/MyFiles";
import Book from "./pages/patient/Book";
import Reschedule from "./pages/patient/Reschedule";

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthChecked(true);
      // restore clinicId on refresh
      if (!u) localStorage.removeItem("clinicId");
    });
    return () => unsub();
  }, []);

  const router = createBrowserRouter([
    { path: "/", element: <ClinicSelect /> },
    { path: "/login", element: <Login /> },
    { path: "/role", element: <RoleSelect /> },

    { path: "/admin", element: <AdminDashboard /> },
    { path: "/doctor", element: <DoctorDashboard /> },
    { path: "/secretary", element: <SecretaryDashboard /> },
    { path: "/patient", element: <PatientDashboard /> },

    { path: "/my-files", element: <MyFiles /> },
    { path: "/book", element: <Book /> },
    { path: "/reschedule/:appointmentId", element: <Reschedule /> },
  ]);

  // IMPORTANT: Only block on the very first auth check.
  // Do NOT block later when switching clinics.
  if (!authChecked) {
    return <div className="p-6">Checking roles…</div>;
  }

  // If not signed in, router will send user to /login from pages that need auth.
  return <RouterProvider router={router} />;
}

export default App;
