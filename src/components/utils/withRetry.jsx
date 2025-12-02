// Improved retry logic with aggressive 429 handling
export async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function withRetry(fn, { retries = 3, baseDelay = 1000, shouldRetry } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status || err?.status;
      const rawMsg = err?.message || err?.response?.data?.message || err?.response?.data?.detail || "";
      const msg = String(rawMsg || "").toLowerCase();

      const isNetwork =
        (!status && /network error|failed to fetch|timeout|load failed|fetch/i.test(msg)) ||
        err?.code === "ECONNABORTED";

      const isExplicitRateLimit = /rate limit|too many requests|429/.test(msg);
      const is429 = status === 429 || isExplicitRateLimit;
      
      const isRetriable = is429 || (status >= 500 && status < 600) || isNetwork;
      
      // Custom shouldRetry check
      if (shouldRetry && !shouldRetry(err)) {
        throw err;
      }
      
      if (!isRetriable || attempt >= retries) {
        throw err;
      }

      // Respect Retry-After header when provided (in seconds)
      const headers = err?.response?.headers || {};
      const raRaw = headers["retry-after"] ?? headers["Retry-After"];
      const retryAfterMs = raRaw ? Number(raRaw) * 1000 : null;

      // AGGRESSIVE backoff for 429s - start at 3s base
      const penalty = is429 ? 4 : 1;
      const jitter = Math.floor(Math.random() * 500);
      let delay = baseDelay * Math.pow(2, attempt) * penalty + jitter;

      if (retryAfterMs && !Number.isNaN(retryAfterMs)) {
        delay = Math.max(delay, retryAfterMs);
      }

      // Cap to 30s per attempt for 429s, 12s for others
      delay = Math.min(delay, is429 ? 30_000 : 12_000);

      console.warn(`⚠️ API call failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${Math.round(delay/1000)}s...`, {
        status,
        message: msg,
        delay: `${Math.round(delay/1000)}s`
      });

      await sleep(delay);
      attempt += 1;
    }
  }
}

export default withRetry;