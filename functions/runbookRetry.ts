import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const job = String(payload.job || "").trim();
    if (!job) return Response.json({ ok: false, error: "Missing job" }, { status: 400 });

    await base44.entities.SystemEvent.create({
      ts: new Date().toISOString(),
      level: "info",
      source: "ingest",
      message: `Runbook: retry requested for ${job}`,
      meta: { requested_by: user.email }
    });

    // Mark a queued heartbeat record
    await base44.entities.JobHeartbeat.create({
      job, start_ts: new Date().toISOString(), status: "queued", duration_ms: 0, rows_in: 0, rows_out: 0
    });

    return Response.json({ ok: true, started: new Date().toISOString() });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
});