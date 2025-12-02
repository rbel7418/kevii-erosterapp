import React from "react";

export default function StatCard({ title, value, sub, accent = "#0b5ed7", children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-semibold text-slate-700">{title}</div>
        <div className="h-2 w-2 rounded-full" style={{ background: accent }} />
      </div>
      <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
      {children}
    </div>
  );
}