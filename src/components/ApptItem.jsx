import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useState } from "react";
import { createInvoiceForAppointment } from "../utils/billing";

const STATUS_OPTIONS = ["requested", "confirmed", "arrived", "completed", "cancelled", "no_show"];

export default function ApptItem({ a, clinicId, role }) {
  const canEdit = role === "secretary" || role === "doctor" || role === "admin";
  const [status, setStatus] = useState(a.status);

  async function onChangeStatus(e) {
    const newStatus = e.target.value;
    setStatus(newStatus);

    try {
      await updateDoc(doc(db, `clinics/${clinicId}/appointments/${a.id}`), {
        status: newStatus,
        updatedAt: new Date(),
      });

      // Auto-create invoice when completed (admin/secretary only by default)
      if (newStatus === "completed" && (role === "admin" || role === "secretary")) {
        await createInvoiceForAppointment(db, clinicId, a);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
      setStatus(a.status);
    }
  }
    async function offerWaitlist(){
    try {
      // naive "first in list" -> schedule at the cancelled slot times
      const listSnap = await (await import("firebase/firestore")).getDocs(
        (await import("firebase/firestore")).query(
          (await import("firebase/firestore")).collection(db, `clinics/${clinicId}/waitlist`),
          (await import("firebase/firestore")).orderBy("createdAt")
        )
      );
      if (listSnap.empty) { alert("Waitlist is empty."); return; }
      const first = listSnap.docs[0].data();

      await (await import("firebase/firestore")).addDoc(
        (await import("firebase/firestore")).collection(db, `clinics/${clinicId}/appointments`),
        {
          clinicId,
          providerId: a.providerId,
          patientId: first.patientId,
          serviceId: first.serviceId || a.serviceId,
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          status: "confirmed",
          createdAt: (await import("firebase/firestore")).serverTimestamp(),
        }
      );
      // (Optionally delete the waitlist entry)
      await (await import("firebase/firestore")).deleteDoc(
        (await import("firebase/firestore")).doc(db, `clinics/${clinicId}/waitlist/${listSnap.docs[0].id}`)
      );

      alert("Filled from waitlist.");
    } catch (e) {
      console.error(e);
      alert("Failed to offer to waitlist.");
    }
  }


  const starts =
    a.startsAt?.seconds ? new Date(a.startsAt.seconds * 1000).toLocaleString() : "";

    return (
    <div className="rounded-xl border p-3 bg-white flex flex-wrap items-center gap-3 justify-between">
      <div>
        <div className="font-semibold">{a.patientId} {a.serviceId ? `• ${a.serviceId}` : ""} </div>
        <div className="text-sm text-slate-600">{starts} — with {a.providerId}</div>
      </div>

      <div className="flex items-center gap-2">
        {canEdit ? (
          <select
            value={status}
            onChange={onChangeStatus}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span className="text-xs uppercase tracking-wide text-slate-500">{status}</span>
        )}

        {(role==="secretary" || role==="admin") && a.status==="cancelled" && (
          <button
            className="text-sm rounded-lg border px-2 py-1 hover:bg-slate-50"
            onClick={offerWaitlist}
          >
            Offer to waitlist
          </button>
        )}
      </div>
    </div>
  );

}
