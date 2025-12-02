import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

function nowIso() { return new Date().toISOString(); }
function minutesAgo(min) { return new Date(Date.now() - min * 60000).toISOString(); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const since60 = minutesAgo(60);
    const since1440 = minutesAgo(1440);

    const [jobs, drifts, events, msgRes] = await Promise.all([
      base44.entities.JobHeartbeat.filter({ start_ts: { $gte: since60 } }),
      base44.entities.ConfigDrift.filter({ ts: { $gte: since1440 } }),
      base44.entities.SystemEvent.filter({ ts: { $gte: since60 } }),
      base44.functions.invoke("healthMessaging", {})
    ]);

    // Ingest RAG: red if any failed; amber if any warning
    const hasFail = (jobs || []).some(j => j.status === "failed");
    const hasWarn = (jobs || []).some(j => j.status === "warning");
    let ingest = hasFail ? "red" : hasWarn ? "amber" : "green";

    // Roster RAG: check events for roster SLO warnings
    const rosterWarn = (events || []).some(e => e.source === "roster" && (e.level === "warning" || e.level === "error"));
    const roster = rosterWarn ? "amber" : "green";

    // Messaging RAG
    const m = (msgRes?.data) || {};
    let messaging = "green";
    if (!m.connected) messaging = "amber";
    if (typeof m.success_rate_1h === "number" && m.success_rate_1h < 0.95) messaging = "amber";
    if (m.provider === "none") messaging = "grey";

    // Integrity RAG
    const anyRedDrift = (drifts || []).some(d => d.severity === "red");
    const integrity = anyRedDrift ? "red" : (drifts || []).length ? "amber" : "green";

    // Notes
    const notes = [];
    if (hasFail) notes.push("Recent job failures detected");
    if (hasWarn && !hasFail) notes.push("Jobs completed with warnings");
    if (!m.connected) notes.push("Messaging provider not connected");
    if (typeof m.success_rate_1h === "number" && m.success_rate_1h < 0.95) notes.push("SMS success < 95% over last hour");
    if (anyRedDrift) notes.push("Config drift with severity RED");

    return Response.json({
      ok: true,
      version: Deno.env.get("APP_VERSION") || "dev",
      rag: { ingest, roster, messaging, integrity },
      notes
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
});