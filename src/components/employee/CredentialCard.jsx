import React from "react";
import { Card } from "@/components/ui/card";

function formatDateSafe(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function CredentialCard({ label, value, secondary, isDate = false }) {
  const display = isDate ? formatDateSafe(value) : (value || "—");
  return (
    <Card className="p-3 md:p-4 h-full flex flex-col justify-center bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div
        className="font-semibold text-slate-900 text-[16px] leading-tight mt-0.5"
        style={{ fontFamily: "'Aptos Display', ui-sans-serif, system-ui" }}
      >
        {display}
      </div>
      {secondary ? (
        <div className="text-[11px] text-slate-500 mt-0.5">{secondary}</div>
      ) : null}
    </Card>
  );
}