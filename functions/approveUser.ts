import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const ALLOWED_DOMAIN = "kingedwardvii.co.uk";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = me.role || "user";
    const level = me.access_level || "staff";
    const allowed = role === "admin" || level === "manager";
    if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

    const { user_id, access_level } = await req.json();
    if (!user_id) return Response.json({ error: "user_id is required" }, { status: 400 });

    const target = await base44.asServiceRole.entities.User.get(user_id);
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });

    const email = String(target.email || "").toLowerCase();
    const domainOk = email.endsWith("@" + ALLOWED_DOMAIN);
    if (!domainOk) {
      return Response.json({ error: "Email domain not allowed", allowed_domain: ALLOWED_DOMAIN }, { status: 400 });
    }

    const patch = {
      status: "approved",
      is_manager_approved: true,
      approved_by_email: me.email,
      approval_date: new Date().toISOString(),
      domain_valid: true,
      access_level: access_level || target.access_level || "staff"
    };

    await base44.asServiceRole.entities.User.update(user_id, patch);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
});