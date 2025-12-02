import { createQueue } from "./queue";
import { Shift, Employee } from "@/entities/all";
import { withRetry } from "@/components/utils/withRetry";

// Single-flight queue with MORE spacing to avoid 429s
const enqueue = createQueue({ concurrency: 1, spacingMs: 1500 });

// Helper: treat 404 as already-deleted (no-op) and don't retry on 404
async function safeDelete(fn) {
  try {
    return await fn();
  } catch (err) {
    const status = err?.response?.status || err?.status;
    const msg = String(err?.message || err?.response?.data?.message || "").toLowerCase();
    
    if (status === 404 || msg.includes("not found")) {
      console.log("Delete target not found (already deleted), ignoring");
      return { ok: true, ignored: true, reason: "not_found" };
    }
    throw err;
  }
}

export function enqueueShiftDelete(id) {
  return enqueue(() =>
    safeDelete(() =>
      withRetry(() => Shift.delete(id), { 
        retries: 4, 
        baseDelay: 1500,
        shouldRetry: (err) => {
          const status = err?.response?.status || err?.status;
          const msg = String(err?.message || err?.response?.data?.message || "").toLowerCase();
          if (status === 404 || msg.includes("not found")) {
            return false;
          }
          return true;
        }
      })
    )
  );
}

export function enqueueEmployeeDelete(id) {
  return enqueue(() =>
    safeDelete(() =>
      withRetry(() => Employee.delete(id), { 
        retries: 4, 
        baseDelay: 1500,
        shouldRetry: (err) => {
          const status = err?.response?.status || err?.status;
          const msg = String(err?.message || err?.response?.data?.message || "").toLowerCase();
          if (status === 404 || msg.includes("not found")) {
            return false;
          }
          return true;
        }
      })
    )
  );
}