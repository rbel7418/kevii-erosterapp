import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await base44.entities.RuntimeConfig.filter({ key: "LOG_ONLY_SMS" });
    const current = rows[0];
    const next = !(current?.value_bool === true);

    if (current) {
      await base44.entities.RuntimeConfig.update(current.id, {
        value_bool: next,
        updated_by: user.email,
        updated_at: new Date().toISOString()
      });
    } else {
      await base44.entities.RuntimeConfig.create({
        key: "LOG_ONLY_SMS", value_bool: next, updated_by: user.email, updated_at: new Date().toISOString()
      });
    }

    await base44.entities.ChangeJournal.create({
      ts: new Date().toISOString(),
      actor: user.email,
      area: "messaging.mode",
      before: { log_only: current?.value_bool === true },
      after: { log_only: next }
    });

    return Response.json({ ok: true, mode: next ? "log-only" : "live" });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
});