import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";

/**
 * Create an invoice for an appointment if one doesn't already exist.
 * Calculates amount from the service's defaultPriceCents if available,
 * otherwise falls back to 5000 (50.00).
 */
export async function createInvoiceForAppointment(db, clinicId, appt) {
  const invCol = collection(db, `clinics/${clinicId}/invoices`);
  const existingQ = query(invCol, where("appointmentId", "==", appt.id));
  const existing = await getDocs(existingQ);
  if (!existing.empty) return existing.docs[0].id;

  let priceCents = 5000;
  if (appt.serviceId) {
    const sdoc = await getDoc(doc(db, `clinics/${clinicId}/services/${appt.serviceId}`));
    if (sdoc.exists()) {
      priceCents = sdoc.data().defaultPriceCents ?? priceCents;
    }
  }

  const invoice = {
    clinicId,
    patientId: appt.patientId,
    appointmentId: appt.id,
    status: "draft",
    currency: "EUR",
    subtotalCents: priceCents,
    taxCents: 0,
    totalCents: priceCents,
    createdAt: serverTimestamp(),
    issuedAt: null,
    dueAt: null,
  };

  const ref = await addDoc(invCol, invoice);
  return ref.id;
}
