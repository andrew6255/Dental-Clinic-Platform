import { useParams } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Sidebar from "../../components/Sidebar";
import useRoleClinic from "../../hooks/useRoleClinic";
import UploadToPatient from "../../components/UploadToPatient";
import PatientFilesList from "../../components/PatientFilesList";
import MultiUploadToPatient from "../../components/MultiUploadToPatient";

export default function PatientDetails() {
  const { role, clinicId, clinicName, loading } = useRoleClinic();
  const { patientId } = useParams();

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen">
      <NavBar clinicName={clinicName} role={role} />
      <div className="mx-auto max-w-6xl px-4 py-6 flex gap-6">
        <Sidebar role={role} />
        <main className="flex-1 space-y-6">
          <h1 className="text-2xl font-bold">Patient: {patientId}</h1>

          {(role === "admin" || role === "doctor" || role === "secretary") && (
            <MultiUploadToPatient clinicId={clinicId} patientId={patientId} />
          )}

          <PatientFilesList clinicId={clinicId} patientId={patientId} role={role} />
        </main>
      </div>
    </div>
  );
}
