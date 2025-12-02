import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const list = await base44.entities.DeadLetter.list(undefined, 200);
    let cleared = 0;
    for (const item of (list || [])) {
      await base44.entities.DeadLetter.delete(item.id);
      cleared += 1;
    }

    await base44.entities.SystemEvent.create({
      ts: new Date().toISOString(),
      level: "info",
      source: "queue",
      message: `Runbook: cleared DLQ (${cleared})`,
      meta: { requested_by: user.email }
    });

    return Response.json({ ok: true, cleared });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
});