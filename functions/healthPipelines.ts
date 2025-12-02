import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

function toJobSummary(list = []) {
  const by = {};
  list.forEach(r => {
    const name = r.job || "job";
    if (!by[name]) by[name] = [];
    by[name].push(r);
  });
  return Object.keys(by).map(name => {
    const runs = by[name].sort((a,b) => (a.start_ts||"") < (b.start_ts||"") ? 1 : -1).slice(0, 20);
    const last = runs[0] || {};
    return {
      name,
      lastStart: last.start_ts || null,
      lastEnd: last.end_ts || null,
      status: last.status || "ok",
      duration_ms: last.duration_ms || 0,
      runs24h: runs.map(r => ({
        start: r.start_ts, end: r.end_ts, status: r.status, duration_ms: r.duration_ms, err: (r.warnings && r.warnings[0]) || null
      }))
    };
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const list = await base44.entities.JobHeartbeat.filter({ start_ts: { $gte: since } }, "-start_ts", 500);
    return Response.json({ jobs: toJobSummary(list || []) });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});