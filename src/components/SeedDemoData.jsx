import { db } from "../firebase";
import {
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function SeedDemoData() {
  async function seed() {
    const clinicId = "demo-clinic";
    await setDoc(doc(db, "clinics", clinicId), {
      name: "Demo Dental",
      timezone: "UTC",
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, `clinics/${clinicId}/providers`, "prov-1"), {
      displayName: "Dr. Lee",
      specialties: ["general"],
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, `clinics/${clinicId}/patients`, "pat-1"), {
      firstName: "Anna",
      lastName: "Smith",
      email: "anna@example.com",
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, `clinics/${clinicId}/services`, "cleaning"), {
      name: "Cleaning",
      defaultDurationMinutes: 30,
      defaultPriceCents: 5000,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, `clinics/${clinicId}/appointments`), {
      clinicId,
      providerId: "prov-1",
      patientId: "pat-1",
      startsAt: serverTimestamp(),
      endsAt: serverTimestamp(),
      status: "confirmed",
      createdAt: serverTimestamp(),
    });

    alert("Demo data seeded! Open the Emulator UI to see it.");
  }

  return (
    <button onClick={seed} className="rounded-xl border px-3 py-2">
      Seed Demo Data
    </button>
  );
}
