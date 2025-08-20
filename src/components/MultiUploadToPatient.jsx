import { useCallback, useMemo, useRef, useState } from "react";
import { storage, db } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";

export default function MultiUploadToPatient({ clinicId, patientId, defaultShare = true }) {
  const [share, setShare] = useState(defaultShare);
  const [labelPrefix, setLabelPrefix] = useState("");
  const [items, setItems] = useState([]); // {file, progress, status, error, metaId}
  const inputRef = useRef(null);

  const onPick = (e) => queueFiles(e.target.files);
  const onClickPick = () => inputRef.current?.click();

  const onDrop = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) queueFiles(e.dataTransfer.files);
  }, []);
  const onDragOver = (e) => e.preventDefault();

  function queueFiles(fileList) {
    const newItems = Array.from(fileList).map((f) => ({
      file: f, progress: 0, status: "queued", error: null, metaId: null
    }));
    setItems((cur) => [...cur, ...newItems]);
  }

  async function startUploads() {
    const next = [...items];
    for (let i = 0; i < next.length; i++) {
      const it = next[i];
      if (it.status !== "queued") continue;

      // 1) Create Firestore metadata first
      const docsCol = collection(db, `clinics/${clinicId}/documents`);
      const metaRef = await addDoc(docsCol, {
        clinicId,
        patientId,
        label: (labelPrefix ? `${labelPrefix} - ` : "") + (it.file.name),
        fileName: it.file.name,
        contentType: it.file.type || "application/octet-stream",
        storagePath: "",
        downloadURL: "",
        shareWithPatient: share,
        createdAt: serverTimestamp(),
      });

      // 2) Upload with resumable + progress
      const storagePath = `clinics/${clinicId}/patients/${patientId}/${metaRef.id}/${it.file.name}`;
      const sref = ref(storage, storagePath);
      const task = uploadBytesResumable(sref, it.file, { contentType: it.file.type });

      next[i] = { ...it, status: "uploading", metaId: metaRef.id };
      setItems([...next]);

      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            next[i] = { ...next[i], progress: pct };
            setItems([...next]);
          },
          (err) => {
            next[i] = { ...next[i], status: "error", error: err.message };
            setItems([...next]);
            reject(err);
          },
          async () => {
            try {
              const url = await getDownloadURL(sref);
              await updateDoc(metaRef, { storagePath, downloadURL: url });
              next[i] = { ...next[i], status: "done", progress: 100 };
              setItems([...next]);
              resolve();
            } catch (e) {
              next[i] = { ...next[i], status: "error", error: e.message };
              setItems([...next]);
              reject(e);
            }
          }
        );
      });
    }
  }

  const queued = useMemo(() => items.filter(i => i.status === "queued").length, [items]);
  const uploading = useMemo(() => items.filter(i => i.status === "uploading").length, [items]);

  return (
    <div className="rounded-xl border p-4 bg-white space-y-3">
      <div className="text-sm font-semibold">Upload multiple files</div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-slate-600 cursor-pointer hover:bg-slate-50"
        onClick={onClickPick}
        title="Click or drop files"
      >
        Drag & drop files here, or <span className="underline">click to choose</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onPick}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <label className="text-sm">Share with patient</label>
          <input type="checkbox" checked={share} onChange={(e)=>setShare(e.target.checked)} />
        </div>
        <input
          className="rounded-xl border px-3 py-2"
          placeholder="Optional label prefix (e.g., X-ray series)"
          value={labelPrefix}
          onChange={e=>setLabelPrefix(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-xl border px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="font-medium truncate">{it.file.name}</div>
              <div className="text-xs uppercase tracking-wide text-slate-500">{it.status}</div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className={`h-2 ${it.status==="error" ? "bg-red-400" : "bg-slate-900"}`}
                style={{ width: `${it.progress}%` }}
              />
            </div>
            {it.error && <div className="text-xs text-red-600 mt-1">{it.error}</div>}
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-slate-500">No files queued.</div>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={startUploads}
          disabled={items.length === 0 || uploading > 0}
          className="rounded-xl bg-slate-900 text-white px-3 py-2 disabled:opacity-50"
        >
          {uploading > 0 ? "Uploading…" : queued > 0 ? `Upload ${queued} file(s)` : "Upload"}
        </button>
        <button
          onClick={()=>setItems([])}
          disabled={uploading > 0}
          className="rounded-xl border px-3 py-2 disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
