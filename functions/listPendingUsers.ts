import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Allow admins and managers to review
    const role = me.role || "user";
    const level = me.access_level || "staff";
    const allowed = role === "admin" || level === "manager";
    if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

    // Service role to list all users
    const users = await base44.asServiceRole.entities.User.filter({ status: "pending" }, "-created_date", 500);

    // Minimal shape for UI
    const rows = (users || []).map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      status: u.status,
      access_level: u.access_level || "staff",
      domain_valid: !!u.domain_valid,
      requested_department_id: u.requested_department_id || "",
      job_title: u.job_title || "",
      phone: u.phone || "",
      created_date: u.created_date
    }));

    return Response.json({ rows });
  } catch (error) {
    return Response.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
});