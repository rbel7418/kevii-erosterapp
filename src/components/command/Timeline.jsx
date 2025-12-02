import React from "react";
export default function Timeline({ jobs = [] }) {
  return (
    <div className="space-y-2">
      {jobs.map(j => (
        <div key={j.name} className="bg-white border border-slate-200 rounded-lg p-2">
          <div className="text-sm font-semibold text-slate-800 mb-1">{j.name}</div>
          <div className="flex flex-wrap gap-1">
            {(j.runs24h || []).slice(0, 24).map((r, idx) => {
              const color = r.status === "failed" ? "#DC2626" : r.status === "warning" ? "#D97706" : "#059669";
              return <span key={idx} title={`${r.status} • ${r.duration_ms || 0}ms`} className="inline-block h-3 rounded" style={{ background: color, width: 16 }} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}