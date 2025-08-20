import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import App from "./App";
import Login from "./pages/Login";
import RoleSelect from "./pages/RoleSelect";
import ClinicSelect from "./pages/ClinicSelect";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import SecretaryDashboard from "./pages/secretary/SecretaryDashboard";
import PatientDashboard from "./pages/patient/PatientDashboard";
import Patients from "./pages/common/Patients";
import Billing from "./pages/common/Billing";
import ProviderAvailability from "./pages/common/ProviderAvailability";
import PatientDetails from "./pages/common/PatientDetails";
import MyFiles from "./pages/patient/MyFiles";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/login", element: <Login /> },
  { path: "/role", element: <RoleSelect /> },
  { path: "/clinic", element: <ClinicSelect /> },
  { path: "/admin", element: <AdminDashboard /> },
  { path: "/doctor", element: <DoctorDashboard /> },
  { path: "/secretary", element: <SecretaryDashboard /> },
  { path: "/patient", element: <PatientDashboard /> },
  { path: "/patients", element: <Patients /> },
  { path: "/availability", element: <ProviderAvailability /> },
  { path: "/billing", element: <Billing /> },
  { path: "/patients/:patientId", element: <PatientDetails /> },
  { path: "/my-files", element: <MyFiles /> },

]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
