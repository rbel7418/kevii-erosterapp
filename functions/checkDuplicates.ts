import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const employees = await base44.entities.Employee.list(undefined, 5000); // Fetch all
        
        const nameCounts = {};
        employees.forEach(e => {
            const name = (e.full_name || "").trim().toLowerCase();
            if (!name) return;
            if (!nameCounts[name]) nameCounts[name] = [];
            nameCounts[name].push({
                id: e.id,
                email: e.user_email,
                full_name: e.full_name
            });
        });

        const duplicates = {};
        let duplicateCount = 0;

        for (const [name, list] of Object.entries(nameCounts)) {
            if (list.length > 1) {
                duplicates[name] = list;
                duplicateCount++;
            }
        }

        return Response.json({
            total_employees: employees.length,
            duplicate_names_count: duplicateCount,
            duplicates: duplicates
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});