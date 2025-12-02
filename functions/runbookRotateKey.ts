import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    // SANITIZE: accept strings containing provider names and map them
    let provider = String(payload.provider || "").toLowerCase().trim();
    if (provider.includes("twilio")) provider = "twilio";
    else if (provider.includes("acs") || provider.includes("azure") || provider.includes("communication")) provider = "acs";

    if (!["acs", "twilio"].includes(provider)) {
      return Response.json({ ok: false, error: "provider must be 'acs' or 'twilio'" }, { status: 400 });
    }

    await base44.entities.ChangeJournal.create({
      ts: new Date().toISOString(),
      actor: user.email,
      area: `keys.rotate.${provider}`,
      before: {},
      after: { rotated_at: new Date().toISOString() }
    });

    return Response.json({ ok: true, rotated: provider });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
});