import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const disabled = ['DISABLE_ACS', 'DISABLE_SMS'].some((k) => (Deno.env.get(k) || '').trim() === '1');
    if (disabled) {
      return Response.json({ ok: false, disabled: true, note: "SMS disabled by admin (DISABLE_ACS/DISABLE_SMS=1)" });
    }

    const conn = (Deno.env.get("ACS_CONNECTION_STRING") || "").trim();
    const from = (Deno.env.get("ACS_FROM") || "").trim();
    const ok = !!(conn && from);

    // Extract endpoint host safely (no key)
    let endpoint = null;
    const m = conn.match(/endpoint=https:\/\/([^/;]+)\//i);
    if (m && m[1]) endpoint = m[1];

    return Response.json({ ok, from: from || null, endpoint, disabled: false });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
});