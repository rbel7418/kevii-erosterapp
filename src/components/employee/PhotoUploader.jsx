
import React from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import { Employee } from "@/entities/Employee";

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || "").join("") || "•";
}

export default function PhotoUploader({ employee, onUpdated, size = 72 }) {
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !employee?.id) return;
    setBusy(true);
    try {
      const { file_url } = await UploadFile({ file });
      await Employee.update(employee.id, { photo_url: file_url });
      onUpdated?.(file_url);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const dim = `${size}px`;

  // derive crop styles
  const zoom = Number(employee?.photo_zoom || 1);
  const offX = Number(employee?.photo_offset_x || 0);
  const offY = Number(employee?.photo_offset_y || 0);

  return (
    <div className="relative group" style={{ width: dim, height: dim }}>
      {employee?.photo_url ? (
        <div className="w-full h-full rounded-full border-2 border-blue-100 bg-slate-100 overflow-hidden relative">
          <img
            src={employee.photo_url}
            alt={employee.full_name || "Employee"}
            className="w-full h-full object-cover rounded-full will-change-transform"
            style={{
              transform: `translate(${offX}px, ${offY}px) scale(${zoom})`,
              transformOrigin: "center center"
            }}
          />
        </div>
      ) : (
        <div className="w-full h-full rounded-full border-2 border-blue-100 bg-slate-50 flex items-center justify-center text-slate-600 font-semibold">
          {initials(employee?.full_name || employee?.user_email)}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={pick}
        className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-7 px-2 rounded-full bg-white/85 hover:bg-white text-slate-700 border-blue-200 shadow-sm"
        title="Change photo"
      >
        <Upload className="w-3.5 h-3.5 mr-1" /> {busy ? "Uploading…" : "Change"}
      </Button>
    </div>
  );
}
