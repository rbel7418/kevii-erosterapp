import { base44 } from "@/api/base44Client";

const JOB_INTERVAL_MS = 450; // ~2 req/sec
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 800;

let queue = [];
let running = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function keyOf(p) {
  return `${p.sheetName}|${p.date}|${p.employeeId}`;
}

export function enqueueSheetPush(payload) {
  return new Promise((resolve, reject) => {
    const key = keyOf(payload);
    const idx = queue.findIndex((j) => j.key === key);
    const job = { key, payload, resolve, reject };
    // De-dupe: keep only the latest job per cell
    if (idx >= 0) queue[idx] = job; else queue.push(job);
    if (!running) processQueue();
  });
}

async function processQueue() {
  running = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await attemptWithRetry(job.payload);
      job.resolve(true);
    } catch (e) {
      console.warn("Sheet push failed:", e?.message || e);
      job.reject(e);
    }
    await sleep(JOB_INTERVAL_MS);
  }
  running = false;
}

async function attemptWithRetry(payload) {
  let lastErr;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      const { data } = await base44.functions.invoke("liveSheetSync", {
        action: "pushShift",
        ...payload,
      });
      return data;
    } catch (e) {
      lastErr = e;
      const status = e?.response?.status;
      const msg = String(e?.response?.data || e?.message || "");
      const retryAfter = Number(e?.response?.headers?.["retry-after"] || 0);
      if (status === 429 || status === 503 || /rate limit|quota/i.test(msg)) {
        const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(BASE_DELAY_MS * 2 ** i, 12000);
        await sleep(delay);
        continue;
      }
      break;
    }
  }
  throw lastErr || new Error("Push failed");
}