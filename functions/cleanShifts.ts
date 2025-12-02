import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper to process promises in batches to avoid 500 errors
async function processBatch(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(item => fn(item).catch(e => ({ error: e }))));
        results.push(...batchResults);
    }
    return results;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Get Valid Shift Codes to compare against
        // This ensures we only keep shifts that match a real, defined shift code
        const validCodesList = await base44.entities.ShiftCode.list();
        const validCodes = new Set((validCodesList || []).map(sc => String(sc.code || "").toUpperCase().trim()));
        
        // Always allow these basic valid codes just in case the table is empty or incomplete
        // (Fallback for standard codes that might be missing from the table)
        ["LD", "LN", "E", "L", "N", "D", "AL", "SL", "Study", "Mat", "Par", "Off"].forEach(c => validCodes.add(c.toUpperCase()));
        
        console.log(`Valid codes loaded: ${validCodes.size}`);

        let totalDeleted = 0;
        let deletedDetails = [];
        let processedCount = 0;

        // AGGRESSIVE DEEP CLEAN
        // Strategy: Scan ALL shifts.
        // Delete if:
        // A) It's empty/whitespace
        // B) It contains garbage symbols
        // C) It is NOT in the list of valid shift codes (Strict Mode)

        let hasMore = true;
        let skip = 0;
        const BATCH_SIZE = 500; 
        const DELETE_BATCH_SIZE = 100; // Increased for speed
        const MAX_SCANS = 500000; // Increased limit to ensure full coverage

        // EXPLICIT GARBAGE LIST 
        const garbageValues = new Set([
            "?", "-", ".", "+", "UNDEFINED", "NULL", "NAN", "◇", "",
            "DIV", "<DIV>", "</DIV>", "DIV>", "<DIV", "SPAN", "<SPAN>", "BODY", "HTML"
        ]);

        while (hasMore && processedCount < MAX_SCANS) {
            // Fetch batch
            const shifts = await base44.entities.Shift.list(undefined, BATCH_SIZE, skip);
            
            if (!shifts || shifts.length === 0) {
                hasMore = false;
                break;
            }

            const idsToDelete = [];

            for (const shift of shifts) {
                const code = String(shift.shift_code || "");
                const cleanCode = code.trim().toUpperCase();
                
                processedCount++;

                // RULE 1: Delete if Empty or Whitespace only
                if (!cleanCode) {
                    idsToDelete.push(shift.id);
                    continue;
                }

                // RULE 2: Check for non-printable/weird characters
                // \x20-\x7E is printable ASCII.
                // This catches replacement chars (), diamonds, invisible spaces, etc.
                if (/[^\x20-\x7E]/.test(code)) {
                     idsToDelete.push(shift.id);
                     continue;
                }

                // RULE 3: Explicit Garbage Check (including "DIV")
                if (garbageValues.has(cleanCode)) {
                    idsToDelete.push(shift.id);
                    continue;
                }

                // RULE 4: STRICT MODE - Referential Integrity
                // If the code is not in our valid list, it's likely garbage data
                if (!validCodes.has(cleanCode)) {
                     idsToDelete.push(shift.id);
                     continue;
                }
            }

            if (idsToDelete.length > 0) {
                // Delete found bad records in safe batches
                await processBatch(idsToDelete, DELETE_BATCH_SIZE, (id) => base44.entities.Shift.delete(id));
                totalDeleted += idsToDelete.length;
                
                if (deletedDetails.length < 50) {
                     deletedDetails.push(`Batch at ${skip}: deleted ${idsToDelete.length} items`);
                }
            }

            // Pagination Logic:
            // If we delete records, the "next" records slide into our current window.
            // So we only advance 'skip' by the number of records we KEPT.
            const keptCount = shifts.length - idsToDelete.length;
            skip += keptCount;
            
            // Safety: If total processed exceeds limit
            if (processedCount > MAX_SCANS) break;
        }
        
        return Response.json({ 
            success: true, 
            deleted: totalDeleted, 
            scanned: processedCount,
            details: deletedDetails
        });

    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});