import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Auth check - strict admin/manager
        const user = await base44.auth.me();
        if (!user || (user.role !== 'admin' && user.access_level !== 'manager')) {
             return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all employees - assuming 5000 is enough to cover the database
        const employees = await base44.entities.Employee.list('full_name', 5000);
        
        if (!employees || !Array.isArray(employees)) {
             return Response.json({ success: false, message: "No employees found or error fetching" });
        }

        // Group by normalized name
        const groups = {};
        employees.forEach(emp => {
            if (!emp.full_name) return;
            const key = emp.full_name.trim().toLowerCase();
            if (!groups[key]) groups[key] = [];
            groups[key].push(emp);
        });

        let deletedCount = 0;
        let processedGroups = 0;
        const log = [];

        // Iterate groups
        for (const nameKey of Object.keys(groups)) {
            const group = groups[nameKey];
            if (group.length < 2) continue; // No duplicates

            processedGroups++;

            // Helper to determine email quality
            const getScore = (e) => {
                const email = (e.user_email || "").trim().toLowerCase();
                if (!email) return 0; // Empty
                if (email.includes("placeholder") || 
                    email.includes("temp") || 
                    email.includes("example") || 
                    email.includes("test") ||
                    email.endsWith(".local") ||
                    !email.includes("@")) return 1; // Likely placeholder
                return 10; // Real email
            };

            // Sort group: Best email first. Tie-break with data completeness or recent update.
            group.sort((a, b) => {
                const scoreA = getScore(a);
                const scoreB = getScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA; // Higher score first
                
                // If scores equal, prefer the one with an employee_id
                if (a.employee_id && !b.employee_id) return -1;
                if (!a.employee_id && b.employee_id) return 1;
                
                // If both have/lack employee_id, prefer the most recently updated
                const dateA = new Date(a.updated_date || 0).getTime();
                const dateB = new Date(b.updated_date || 0).getTime();
                return dateB - dateA;
            });

            // Keep the first one (best), delete the rest
            const toKeep = group[0];
            const toDelete = group.slice(1);

            log.push(`Keeping: ${toKeep.full_name} (${toKeep.user_email || 'no email'})`);
            
            for (const d of toDelete) {
                try {
                    log.push(`  Deleting duplicate: ${d.full_name} (${d.user_email || 'no email'}) - ID: ${d.id}`);
                    await base44.entities.Employee.delete(d.id);
                    deletedCount++;
                } catch (err) {
                    log.push(`  ERROR deleting ${d.id}: ${err.message}`);
                }
            }
        }

        return Response.json({
            success: true,
            message: `Cleanup complete. Processed ${processedGroups} duplicate groups. Deleted ${deletedCount} records.`,
            deletedCount,
            log: log.slice(0, 100) // Return first 100 log lines to avoid massive payloads
        });

    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});