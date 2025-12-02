const __cache = {};

export async function getCached(key, ttlMs, fetcher) {
  const now = Date.now();
  const entry = __cache[key];
  if (entry && now - entry.time < ttlMs) {
    return entry.value;
  }
  const value = await fetcher();
  __cache[key] = { value, time: now };
  return value;
}

export function clearCache(keyPrefix = "") {
  Object.keys(__cache).forEach((k) => {
    if (!keyPrefix || k.startsWith(keyPrefix)) delete __cache[k];
  });
}