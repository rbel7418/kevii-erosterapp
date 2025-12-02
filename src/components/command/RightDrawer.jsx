
import React from "react";
import { Button } from "@/components/ui/button";
import { runbookRetry } from "@/functions/runbookRetry";
import { runbookToggleSmsMode } from "@/functions/runbookToggleSmsMode";
import { runbookClearDlq } from "@/functions/runbookClearDlq";
import { runbookRotateKey } from "@/functions/runbookRotateKey";

export default function RightDrawer({ open, onClose, changeJournal = [] }) {
  const [busy, setBusy] = React.useState(false);

  const doRetry = async () => {
    const job = prompt("Job to retry?");
    if (!job) return;
    setBusy(true);
    try { await runbookRetry({ job }); } finally { setBusy(false); }
  };

  const doToggle = async () => {
    setBusy(true);
    try { await runbookToggleSmsMode({}); } finally { setBusy(false); }
  };

  const doClear = async () => {
    setBusy(true);
    try { await runbookClearDlq({}); } finally { setBusy(false); }
  };

  // NEW: normalize provider helper so free-text like "acs=DoNotReply@..." still works
  const normalizeProvider = (s) => {
    const v = String(s || "").toLowerCase().trim();
    if (!v) return "";
    if (v.includes("twilio")) return "twilio";
    if (v.includes("acs") || v.includes("azure") || v.includes("communication")) return "acs";
    return v === "acs" || v === "twilio" ? v : "";
  };

  const doRotate = async () => {
    const input = prompt('Rotate which provider key? Type "acs" or "twilio"', "acs");
    if (input == null) return; // cancelled
    const provider = normalizeProvider(input);
    if (!provider) {
      alert('Please enter either "acs" or "twilio".');
      return;
    }
    setBusy(true);
    try { await runbookRotateKey({ provider }); } finally { setBusy(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed top-0 right-0 w-[360px] h-full bg-white border-l border-slate-200 shadow-xl p-3 z-50">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Runbooks</div>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
      <div className="space-y-2">
        <Button className="w-full" disabled={busy} onClick={doRetry}>Retry job…</Button>
        <Button className="w-full" variant="secondary" disabled={busy} onClick={doToggle}>Toggle SMS mode</Button>
        <Button className="w-full" variant="outline" disabled={busy} onClick={doClear}>Clear DLQ</Button>
        <Button className="w-full" variant="outline" disabled={busy} onClick={doRotate}>Rotate provider key…</Button>
      </div>
      <div className="mt-4 text-sm font-semibold">Change Journal (24h)</div>
      <div className="mt-1 space-y-2 overflow-auto max-h-[60vh]">
        {(changeJournal || []).map((c) => (
          <div key={c.id} className="border border-slate-200 rounded p-2">
            <div className="text-xs text-slate-500">{new Date(c.ts).toLocaleString()}</div>
            <div className="text-sm">{c.area}</div>
            <div className="text-xs text-slate-600">by {c.actor}</div>
          </div>
        ))}
        {(!changeJournal || changeJournal.length === 0) && <div className="text-xs text-slate-500">No changes</div>}
      </div>
    </div>
  );
}
