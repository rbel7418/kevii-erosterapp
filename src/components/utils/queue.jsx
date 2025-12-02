export function createQueue({ concurrency = 1, spacingMs = 150 } = {}) {
  let active = 0;
  const q = [];

  async function runNext() {
    if (active >= concurrency) return;
    const job = q.shift();
    if (!job) return;
    active += 1;
    try {
      const res = await job.fn();
      job.resolve(res);
    } catch (e) {
      job.reject(e);
    } finally {
      active -= 1;
      // Space out requests slightly to avoid burst 429s
      setTimeout(runNext, spacingMs);
    }
  }

  return function enqueue(fn) {
    return new Promise((resolve, reject) => {
      q.push({ fn, resolve, reject });
      runNext();
    });
  };
}