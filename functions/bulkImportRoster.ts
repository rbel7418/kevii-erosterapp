import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper to batch promises
async function processInBatches(items, fn, batchSize = 20) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        const chunkResults = await Promise.all(chunk.map(fn));
        results.push(...chunkResults);
    }
    return results;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { shifts } = await req.json();

        if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
            return Response.json({ created: 0, deleted: 0 });
        }

        // 1. Identify scope
        const empIds = [...new Set(shifts.map(s => s.employee_id))];
        const dates = [...new Set(shifts.map(s => s.date))];
        
        if (dates.length === 0 || empIds.length === 0) {
             return Response.json({ created: 0, deleted: 0 });
        }

        const minDate = dates.reduce((a, b) => a < b ? a : b);
        const maxDate = dates.reduce((a, b) => a > b ? a : b);

        // 2. Find existing shifts to delete (conflicts)
        // Process employee fetches in batches to avoid fetching too much at once
        const existingShiftsArrays = await processInBatches(empIds, async (eid) => {
            return await base44.entities.Shift.filter({ 
                employee_id: eid, 
                date: { $gte: minDate, $lte: maxDate } 
            });
        }, 10);
        
        const allExisting = existingShiftsArrays.flat();
        
        const shiftsToDelete = [];
        const newShiftKeys = new Set(shifts.map(s => `${s.employee_id}_${s.date}`));

        for (const s of allExisting) {
            const key = `${s.employee_id}_${s.date}`;
            if (newShiftKeys.has(key)) {
                shiftsToDelete.push(s.id);
            }
        }

        // 3. Bulk Delete
        // Process deletions in safe batches
        await processInBatches(shiftsToDelete, async (id) => {
            try {
                await base44.entities.Shift.delete(id);
            } catch (e) {
                console.warn(`Failed to delete shift ${id}:`, e);
            }
        }, 20);
        
        // 4. Bulk Create
        // Split creation into chunks as well
        const createChunks = [];
        for (let i = 0; i < shifts.length; i += 50) {
            createChunks.push(shifts.slice(i, i + 50));
        }
        
        for (const chunk of createChunks) {
            await base44.entities.Shift.bulkCreate(chunk);
        }

        return Response.json({ 
            success: true, 
            created: shifts.length, 
            deleted: shiftsToDelete.length 
        });

    } catch (error) {
        console.error("bulkImportRoster error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});