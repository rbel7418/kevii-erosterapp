import React from "react";
import RagDot from "./RagDot";
export default function KpiCard({ title, state, value, note, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2"><RagDot state={state} />{title}</div>
        {typeof value !== "undefined" && <div className="text-sm text-slate-600">{value}</div>}
      </div>
      {note && <div className="text-xs text-slate-500 mt-1">{note}</div>}
      {children}
    </div>
  );
}