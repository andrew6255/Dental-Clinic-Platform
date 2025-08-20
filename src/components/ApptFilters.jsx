import { useState } from "react";

export default function ApptFilters({ value, onChange }) {
  const [v, setV] = useState(value || { providerId:"", status:"", date:"" });

  function set(k, x){ const next = {...v, [k]:x}; setV(next); onChange?.(next); }

  return (
    <div className="rounded-xl border p-3 bg-white grid sm:grid-cols-3 gap-2">
      <input className="rounded-xl border px-3 py-2"
             placeholder="Provider ID (e.g., prov-1)"
             value={v.providerId}
             onChange={e=>set("providerId", e.target.value)} />
      <select className="rounded-xl border px-3 py-2"
              value={v.status}
              onChange={e=>set("status", e.target.value)}>
        <option value="">Any status</option>
        {["requested","confirmed","arrived","completed","cancelled","no_show"].map(s=>
          <option key={s} value={s}>{s}</option>
        )}
      </select>
      <input type="date" className="rounded-xl border px-3 py-2"
             value={v.date}
             onChange={e=>set("date", e.target.value)} />
    </div>
  );
}
