import { useState } from "react";
import { storage, db } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function UploadToPatient({ clinicId, patientId }) {
  const [file, setFile] = useState(null);
  const [share, setShare] = useState(true);
  const [label, setLabel] = useState("");

  async function onUpload(e) {
    e.preventDefault();
    if (!file) return alert("Pick a file first");

    // 1) Create metadata doc first (so we have an ID/path)
    const docsCol = collection(db, `clinics/${clinicId}/documents`);
    const docRef = await addDoc(docsCol, {
      clinicId,
      patientId,
      label: label || file.name,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      storagePath: "",     // fill after upload
      shareWithPatient: share,
      createdAt: serverTimestamp(),
    });

    const storagePath = `clinics/${clinicId}/patients/${patientId}/${docRef.id}/${file.name}`;
    const storageRef = ref(storage, storagePath);

    // 2) Upload to Storage emulator
    await uploadBytes(storageRef, file, { contentType: file.type });

    // 3) Get a (emulator) download URL and update doc
    const url = await getDownloadURL(storageRef);
    await (await import("firebase/firestore")).updateDoc(docRef, {
      storagePath,
      downloadURL: url,
    });

    setFile(null);
    setLabel("");
    alert("Uploaded!");
  }

  return (
    <form onSubmit={onUpload} className="grid gap-3 rounded-xl border p-4 bg-white">
      <div className="text-sm font-semibold">Upload a file to this patient</div>
      <input
        className="rounded-xl border px-3 py-2"
        placeholder="Label (e.g., X-ray, report)"
        value={label}
        onChange={e => setLabel(e.target.value)}
      />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="rounded-xl border px-3 py-2 bg-white"
      />
      <label className="text-sm flex items-center gap-2">
        <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} />
        Share with patient
      </label>
      <button className="rounded-xl bg-slate-900 text-white px-3 py-2">Upload</button>
    </form>
  );
}
