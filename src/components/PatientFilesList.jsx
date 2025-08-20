import { useEffect, useState } from "react";
import { db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import FilePreview from "./FilePreview";

export default function PatientFilesList({ clinicId, patientId, role, showOnlyShared = false }) {
  const [files, setFiles] = useState([]);
  const isStaff = role === "admin" || role === "doctor" || role === "secretary";

  useEffect(() => {
    let qBase = query(
      collection(db, `clinics/${clinicId}/documents`),
      where("patientId", "==", patientId),
      orderBy("createdAt")
    );
    // When used on the patient "My files" page, show only shareWithPatient == true
    if (showOnlyShared) {
      // NOTE: Firestore requires an index if you combine where+orderBy on different fields.
      // With only where shareWithPatient == true and no orderBy, it's fine;
      // but we keep orderBy(createdAt) — if emulator asks, let it auto-create the index or remove orderBy.
      qBase = query(
        collection(db, `clinics/${clinicId}/documents`),
        where("patientId", "==", patientId),
        where("shareWithPatient", "==", true),
        orderBy("createdAt")
      );
    }

    const unsub = onSnapshot(qBase, (snap) =>
      setFiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [clinicId, patientId, showOnlyShared]);

  async function handleDelete(f) {
    const ok = confirm(`Delete "${f.label || f.fileName}"? This cannot be undone.`);
    if (!ok) return;

    try {
      if (f.storagePath) {
        const objRef = ref(storage, f.storagePath);
        await deleteObject(objRef).catch((e) => console.warn("Storage delete warning:", e?.message || e));
      }
      await deleteDoc(doc(db, `clinics/${clinicId}/documents/${f.id}`));
    } catch (e) {
      console.error(e);
      alert("Failed to delete file. See console for details.");
    }
  }

  return (
    <div className="rounded-xl border p-4 bg-white space-y-3">
      <div className="text-sm font-semibold">Files</div>
      <div className="grid gap-3">
        {files.map((f) => (
          <div key={f.id} className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{f.label || f.fileName}</div>
                <div className="text-xs text-slate-600">
                  {f.contentType || "file"} • {f.shareWithPatient ? "Shared with patient" : "Staff only"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {f.downloadURL && (
                  <a
                    href={f.downloadURL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm rounded-lg border px-2 py-1 hover:bg-slate-50"
                  >
                    Open
                  </a>
                )}
                {!showOnlyShared && isStaff && (
                  <button
                    onClick={() => handleDelete(f)}
                    className="text-sm rounded-lg border px-2 py-1 hover:bg-red-50"
                    title="Delete file (Storage + Firestore)"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Inline preview */}
            <div className="mt-3">
              <FilePreview file={f} />
            </div>
          </div>
        ))}
        {files.length === 0 && <div className="text-sm text-slate-500">No files yet.</div>}
      </div>
    </div>
  );
}
