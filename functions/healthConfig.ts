import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

function diffManifest(manifest, env) {
  const diffs = [];
  const expected = (manifest?.data) || {};
  const keys = Object.keys(expected);
  keys.forEach(k => {
    const exp = expected[k];
    const act = env[k] ?? null;
    if (String(exp) !== String(act)) {
      diffs.push({ key: k, expected: exp, actual: act, severity: /SECRET|KEY|TOKEN|PASSWORD/i.test(k) ? "red" : "amber" });
    }
  });
  return diffs;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await base44.entities.ConfigManifest.list();
    const manifest = rows?.[0] || { version: "unversioned", data: {} };

    // Safe subset of env (only whitelisted keys)
    const whitelist = ["APP_VERSION", "SMS_PROVIDER", "ACS_FROM"];
    const env = {};
    whitelist.forEach(k => env[k] = Deno.env.get(k) || null);

    const drift = diffManifest(manifest, env);
    const warnings = drift.length ? ["Differences detected between manifest and runtime"] : [];

    return Response.json({ manifest, drift, warnings });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});