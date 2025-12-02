import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || (user.role !== 'admin' && user.access_level !== 'manager')) {
             return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all employees
        const employees = await base44.entities.Employee.list('full_name', 5000);
        
        if (!employees || !Array.isArray(employees)) {
             return Response.json({ success: false, message: "No employees found" });
        }

        const groups = {};
        employees.forEach(emp => {
            if (!emp.full_name) return;
            const key = emp.full_name.trim().toLowerCase();
            if (!groups[key]) groups[key] = [];
            groups[key].push(emp);
        });

        let deletedCount = 0;
        const log = [];

        for (const nameKey of Object.keys(groups)) {
            const group = groups[nameKey];
            if (group.length < 2) continue;

            const getScore = (e) => {
                const email = (e.user_email || "").trim().toLowerCase();
                if (!email) return 0;
                if (email.includes("placeholder") || 
                    email.includes("temp") || 
                    email.includes("example") || 
                    email.includes("test") ||
                    !email.includes("@")) return 1;
                return 10; 
            };

            // Sort: High score first. Tie-break: has employee_id. Tie-break: recent update.
            group.sort((a, b) => {
                const scoreA = getScore(a);
                const scoreB = getScore(b);
                if (scoreA !== scoreB) return scoreB - scoreA;
                
                if (a.employee_id && !b.employee_id) return -1;
                if (!a.employee_id && b.employee_id) return 1;
                
                const dateA = new Date(a.updated_date || 0).getTime();
                const dateB = new Date(b.updated_date || 0).getTime();
                return dateB - dateA;
            });

            const toDelete = group.slice(1); // Keep 0, delete 1..n
            
            for (const d of toDelete) {
                try {
                    await base44.entities.Employee.delete(d.id);
                    deletedCount++;
                } catch (e) {}
            }
        }

        return Response.json({
            success: true,
            message: `Cleaned ${deletedCount} duplicates.`,
            deletedCount
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});