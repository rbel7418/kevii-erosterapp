import { createQueue } from "./queue";
import { Shift } from "@/entities/all";
import { withRetry } from "@/components/utils/withRetry";

// Single-threaded queue with MORE spacing to avoid 429s
const enqueue = createQueue({ concurrency: 1, spacingMs: 2000 });

// Preflight: only one shift per employee per day
async function preflightSinglePerDay(payload) {
  const empId = payload?.employee_id;
  const date = payload?.date;
  if (!empId || !date) return;
  const sameDay = await withRetry(() => Shift.filter({ employee_id: empId, date }), {
    retries: 4,
    baseDelay: 1500
  });
  if (Array.isArray(sameDay) && sameDay.length > 0) {
    const err = new Error("Staff has already been booked elsewhere for this date.");
    err.code = "DUPLICATE_SHIFT_FOR_DAY";
    throw err;
  }
}

export function enqueueShiftCreate(payload) {
  return enqueue(async () => {
    await preflightSinglePerDay(payload);
    return withRetry(() => Shift.create(payload), { 
      retries: 5, 
      baseDelay: 2000 // Higher base delay
    });
  });
}