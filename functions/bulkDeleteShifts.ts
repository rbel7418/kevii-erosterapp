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
        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return Response.json({ deleted: 0 });
        }

        // Perform deletions in batched parallel chunks
        let deletedCount = 0;
        await processInBatches(ids, async (id) => {
            try {
                await base44.entities.Shift.delete(id);
                deletedCount++;
            } catch (e) {
                console.warn(`Failed to delete shift ${id}:`, e);
            }
        }, 20);

        return Response.json({ 
            success: true, 
            deleted: deletedCount 
        });

    } catch (error) {
        console.error("bulkDeleteShifts error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});