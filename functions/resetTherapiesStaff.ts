import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

export const handler = Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins / managers can run this
    if (!user || (user.role !== "admin" && user.access_level !== "manager")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch ALL employees (no department filter)
    //    If you have large volumes, switch to paging.
    const allEmployees = await base44.entities.Employee.list({});

    // Helper: detect placeholder / dummy emails
    const isPlaceholderEmail = (email) => {
      if (!email) return true; // treat empty as placeholder
      const v = String(email).toLowerCase();

      // Tweak these to match your real placeholder patterns
      if (v.includes("placeholder")) return true;
      if (v.startsWith("temp+")) return true;
      if (v.endsWith("@example.com")) return true;

      return false;
    };

    // 2. Group by business employee_id
    const grouped = {};
    for (const emp of allEmployees) {
      const key = emp.employee_id;
      if (!key) continue; // skip if no business ID
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(emp);
    }

    const deletedIds = [];
    const keptIds = [];

    // 3. Process each employee_id group
    for (const [empId, records] of Object.entries(grouped)) {
      if (records.length === 1) {
        // No duplicates → keep as is
        keptIds.push(records[0].id);
        continue;
      }

      // Split into “real email” vs “placeholder email”
      const withRealEmail = records.filter(
        (r) => !isPlaceholderEmail(r.user_email)
      );
      const withPlaceholder = records.filter((r) =>
        isPlaceholderEmail(r.user_email)
      );

      let toKeep = null;
      const toDelete = [];

      if (withRealEmail.length > 0) {
        // Prefer REAL email records.
        // Keep the newest real by created_date
        withRealEmail.sort(
          (a, b) =>
            new Date(b.created_date).getTime() -
            new Date(a.created_date).getTime()
        );
        toKeep = withRealEmail[0];

        // Everything else (other real + all placeholders) → delete
        for (const rec of records) {
          if (rec.id !== toKeep.id) {
            toDelete.push(rec);
          }
        }
      } else {
        // All are placeholders → keep newest placeholder, delete rest
        records.sort(
          (a, b) =>
            new Date(b.created_date).getTime() -
            new Date(a.created_date).getTime()
        );
        toKeep = records[0];
        for (let i = 1; i < records.length; i++) {
          toDelete.push(records[i]);
        }
      }

      keptIds.push(toKeep.id);

      // Execute deletes
      for (const rec of toDelete) {
        await base44.entities.Employee.delete(rec.id);
        deletedIds.push(rec.id);
      }
    }

    return Response.json(
      {
        success: true,
        summary: {
          totalEmployees: allEmployees.length,
          groupsProcessed: Object.keys(grouped).length,
          kept: keptIds.length,
          deleted: deletedIds.length,
        },
        details: {
          keptIds,
          deletedIds,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
