import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export const handler = Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || (user.role !== 'admin' && user.access_level !== 'manager')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all employees in Therapies
        const allStaff = await base44.entities.Employee.list({
            department_id: "6906a5fd6535449a05c43f7f"
        });

        // 2. Group by employee_id (Business ID)
        const grouped = {};
        allStaff.forEach(emp => {
            const key = emp.employee_id;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(emp);
        });

        const deletedIds = [];
        const keptIds = [];

        // 3. Process groups
        for (const [empId, records] of Object.entries(grouped)) {
            // Sort by created_date DESC (newest first)
            records.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

            // Keep the newest one
            const toKeep = records[0];
            keptIds.push(toKeep.id);

            // Delete the rest
            const toDelete = records.slice(1);
            for (const record of toDelete) {
                await base44.entities.Employee.delete(record.id);
                deletedIds.push(record.id);
            }
        }
        
        // 4. Also delete anyone NOT in the list of valid IDs? 
        // The user list: 101313, 101277, 100646, 101165, 100909, 200968, 101276, 100275, 101082, 200955, 200966, 200973, 200615, 200942, 200943
        const validIds = new Set(["101313", "101277", "100646", "101165", "100909", "200968", "101276", "100275", "101082", "200955", "200966", "200973", "200615", "200942", "200943"]);
        
        // Check if any of the kept ones are actually invalid IDs (e.g. old random ones)
        const extraCleanup = [];
        for (const [empId, records] of Object.entries(grouped)) {
             if (!validIds.has(empId)) {
                 // This employee ID shouldn't be here at all
                 // Delete ALL copies including the one we thought to keep
                 const allCopies = records; // original array
                 for (const record of allCopies) {
                     // Check if we already deleted it? 
                     // records[0] was "kept" in previous step, others deleted.
                     // So we just need to delete records[0] now.
                     // But to be safe, just try deleting all IDs in this group that haven't been deleted yet
                     if (!deletedIds.includes(record.id)) {
                         await base44.entities.Employee.delete(record.id);
                         extraCleanup.push(record.id);
                     }
                 }
             }
        }

        return Response.json({ 
            success: true, 
            deleted: deletedIds.length + extraCleanup.length,
            kept: keptIds.length - extraCleanup.length,
            details: {
                duplicates_removed: deletedIds.length,
                invalid_removed: extraCleanup.length
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});