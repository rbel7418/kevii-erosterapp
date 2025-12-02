import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const items = await base44.entities.Anomaly.list("-ts", 50);
    // augment with z score if missing
    const out = (items || []).map(a => {
      const mu = Number(a.mu || 0);
      const sigma = Number(a.sigma || 0.00001);
      const value = Number(a.value || 0);
      const z = (value - mu) / sigma;
      return { metric: a.metric, value, mu, sigma, z, severity: a.severity || (Math.abs(z) > 3 ? "red" : Math.abs(z) > 2 ? "amber" : "amber"), spark: a.spark || [] };
    });
    return Response.json({ items: out });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});