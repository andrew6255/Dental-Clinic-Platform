// src/components/ApptItem.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { createInvoiceForAppointment } from "../utils/billing";

const STATUS_OPTIONS = ["requested", "confirmed", "arrived", "completed", "cancelled", "no_show"];

// Predefined reasons
const STAFF_REASONS = [
  "Patient request",
  "No-show",
  "Patient illness",
  "Scheduling conflict",
  "Weather / transport",
  "Provider emergency",
  "Equipment issue",
  "Insurance / payment issue",
  "Double booking",
  "Other",
];

const PATIENT_REASONS = [
  "Feeling unwell",
  "Schedule conflict",
  "Transport issue",
  "Cost / insurance",
  "Found earlier slot",
  "Other",
];

export default function ApptItem({ a, clinicId, role }) {
  const nav = useNavigate();
  const canEdit = role === "secretary" || role === "doctor" || role === "admin";
  const isPatient = role === "patient";

  const [status, setStatus] = useState(a.status);

  // Cancel dialog state
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");

  const starts =
    a.startsAt?.seconds ? new Date(a.startsAt.seconds * 1000).toLocaleString() : "";

  const showPatientActions = isPatient && ["requested", "confirmed"].includes(status);

  // ----- Staff status change handler -----
  async function onChangeStatus(e) {
    const newStatus = e.target.value;

    // If switching to cancelled, collect reason first
    if (canEdit && newStatus === "cancelled") {
      setReason(STAFF_REASONS[0]);
      setOther("");
      setShowCancel(true);
      // We don't persist status yet; dialog will handle save
      return;
    }

    // Normal status changes (non-cancelled)
    setStatus(newStatus);
    try {
      await updateDoc(doc(db, `clinics/${clinicId}/appointments/${a.id}`), {
        status: newStatus,
        updatedAt: new Date(),
      });
      if (newStatus === "completed" && (role === "admin" || role === "secretary")) {
        await createInvoiceForAppointment(db, clinicId, a);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
      setStatus(a.status);
    }
  }

  // ----- Patient cancel button -----
  function openPatientCancel() {
    setReason(PATIENT_REASONS[0]);
    setOther("");
    setShowCancel(true);
  }

  // ----- Persist cancellation (common for staff/patient) -----
  async function confirmCancellation() {
    const chosen =
      (reason === "Other" ? (other.trim() || "—") : reason) || "—";
    try {
      await updateDoc(doc(db, `clinics/${clinicId}/appointments/${a.id}`), {
        status: "cancelled",
        cancellation: {
          reason: chosen,
          byUid: auth.currentUser?.uid || null,
          byRole: role,
          at: serverTimestamp(),
        },
        updatedAt: new Date(),
      });
      setStatus("cancelled");
      setShowCancel(false);
    } catch (e) {
      console.error(e);
      alert("Could not cancel. Please try again.");
    }
  }

  function closeDialog() {
    setShowCancel(false);
    // If this was staff changing status to cancelled, revert the select back to previous status
    if (canEdit) setStatus(a.status);
  }

  return (
    <div className="rounded-xl border p-3 bg-white flex flex-wrap items-center gap-3 justify-between relative">
      <div>
        <div className="font-semibold">
          {a.patientId} {a.serviceId ? `• ${a.serviceId}` : ""} 
        </div>
        <div className="text-sm text-slate-600">
          {starts} — with {a.providerId}
        </div>
        {status === "cancelled" && (
          <div className="text-xs text-slate-500 mt-1">
            Cancelled: {a.cancellation?.reason || "—"}
            {a.cancellation?.byRole ? ` • by ${a.cancellation.byRole}` : ""}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {canEdit ? (
          <select
            value={status}
            onChange={onChangeStatus}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs uppercase tracking-wide text-slate-500">
            {status}
          </span>
        )}

        {/* Patient-only actions */}
        {showPatientActions && (
          <>
            <button
              onClick={() => nav(`/reschedule/${a.id}`)}
              className="text-sm rounded-lg border px-2 py-1 hover:bg-slate-50"
              title="Request another time"
            >
              Reschedule
            </button>
            <button
              onClick={openPatientCancel}
              className="text-sm rounded-lg border px-2 py-1 hover:bg-red-50"
              title="Cancel this appointment"
            >
              Cancel
            </button>
          </>
        )}

        {/* Secretary/Admin waitlist helper when cancelled */}
        {(role === "secretary" || role === "admin") && a.status === "cancelled" && (
          <button
            className="text-sm rounded-lg border px-2 py-1 hover:bg-slate-50"
            onClick={offerWaitlist}
          >
            Offer to waitlist
          </button>
        )}
      </div>

      {/* ---- Cancel Reason Dialog ---- */}
      {showCancel && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/30">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border p-4 space-y-3">
            <div className="text-lg font-semibold">Cancellation reason</div>
            <div className="text-xs text-slate-600">
              Please select a reason{isPatient ? "" : " to record for audit logs"}.
            </div>

            <select
              className="w-full rounded-xl border px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {(isPatient ? PATIENT_REASONS : STAFF_REASONS).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {reason === "Other" && (
              <input
                className="w-full rounded-xl border px-3 py-2"
                placeholder="Type your reason"
                value={other}
                onChange={(e) => setOther(e.target.value)}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeDialog}
                className="rounded-xl border px-3 py-2"
              >
                Nevermind
              </button>
              <button
                onClick={confirmCancellation}
                className="rounded-xl bg-slate-900 text-white px-3 py-2"
              >
                Confirm cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // For secretary/admin after cancellation
  async function offerWaitlist() {
    try {
      const listSnap = await (await import("firebase/firestore")).getDocs(
        (await import("firebase/firestore")).query(
          (await import("firebase/firestore")).collection(db, `clinics/${clinicId}/waitlist`),
          (await import("firebase/firestore")).orderBy("createdAt")
        )
      );
      if (listSnap.empty) {
        alert("Waitlist is empty.");
        return;
      }
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

      await (await import("firebase/firestore")).deleteDoc(
        (await import("firebase/firestore")).doc(db, `clinics/${clinicId}/waitlist/${listSnap.docs[0].id}`)
      );

      alert("Filled from waitlist.");
    } catch (e) {
      console.error(e);
      alert("Failed to offer to waitlist.");
    }
  }
}
