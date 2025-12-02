import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

function todayRange() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  return { start };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const providerEnv = (Deno.env.get("SMS_PROVIDER") || "").toLowerCase();
    let provider = providerEnv === "twilio" ? "twilio" : "acs";
    if (!Deno.env.get("ACS_CONNECTION_STRING") && provider !== "twilio") provider = "none";

    // Read runtime flag for log-only
    const cfgRows = await base44.entities.RuntimeConfig.filter({ key: "LOG_ONLY_SMS" });
    const logOnly = (cfgRows[0]?.value_bool) === true;

    // Quick connectivity heuristic
    let connected = true;
    if (provider === "acs" && (!Deno.env.get("ACS_CONNECTION_STRING") || !Deno.env.get("ACS_FROM"))) connected = false;
    if (provider === "none") connected = false;

    // Compute last hour success rate
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const msgs = await base44.entities.MessagingStat.filter({ ts: { $gte: since } }, undefined, 500);
    const ok = (msgs || []).reduce((a, r) => a + (Number(r.sent_ok) || 0), 0);
    const fail = (msgs || []).reduce((a, r) => a + (Number(r.sent_fail) || 0), 0);
    const success_rate_1h = ok + fail > 0 ? ok / (ok + fail) : 1;

    // Today aggregates
    const { start } = todayRange();
    const today = await base44.entities.MessagingStat.filter({ ts: { $gte: start } }, undefined, 1000);
    const segments_today = (today || []).reduce((a, r) => a + (Number(r.segments) || 0), 0);
    const cost_est_today = (today || []).reduce((a, r) => a + (Number(r.cost_est) || 0), 0);

    return Response.json({
      provider,
      connected,
      success_rate_1h,
      segments_today,
      cost_est_today,
      mode: logOnly ? "log-only" : "live"
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});