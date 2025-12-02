import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = me.role || "user";
    const level = me.access_level || "staff";
    const allowed = role === "admin" || level === "manager";
    if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

    const { user_id } = await req.json();
    if (!user_id) return Response.json({ error: "user_id is required" }, { status: 400 });

    await base44.asServiceRole.entities.User.update(user_id, {
      status: "rejected",
      is_manager_approved: false
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
});