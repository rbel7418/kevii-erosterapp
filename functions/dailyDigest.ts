import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

function formatNumber(n) {
  return typeof n === "number" ? n.toFixed(2) : n;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Scheduled job may not have a user; allow service role if needed:
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { /* ignore unauthenticated scheduled runs */ }
    if (!user) {
      // Allow service role for scheduled invocation
      const _serviceRoleAllowed = true; // no-op to avoid empty block
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [events, anomalies, stats] = await Promise.all([
      base44.entities.SystemEvent.filter({ ts: { $gte: since } }, "-ts", 200),
      base44.entities.Anomaly.filter({ ts: { $gte: since } }, "-ts", 50),
      base44.entities.MessagingStat.filter({ ts: { $gte: since } }, undefined, 500)
    ]);

    const failures = (events || []).filter(e => e.level === "error" || e.level === "critical");
    const cost = (stats || []).reduce((a, r) => a + (Number(r.cost_est) || 0), 0);

    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" }, undefined, 100).catch(() => []);
    const body = `
      <h3>Command Centre Daily Digest</h3>
      <p>Failures: ${failures.length}</p>
      <p>Anomalies: ${(anomalies || []).length}</p>
      <p>SMS Cost (24h est): £${formatNumber(cost)}</p>
    `;

    for (const a of (admins || [])) {
      if (!a.email) continue;
      await base44.asServiceRole.integrations.SendEmail({
        to: a.email,
        subject: "Daily Command Centre Digest",
        body
      });
    }

    return Response.json({ ok: true, mailed: (admins || []).length });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
});