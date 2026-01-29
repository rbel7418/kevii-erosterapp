import { base44 } from '../api/base44Client'; export const runbookRetry = base44.functions.runbookRetry || (async () => ({ ok: true, data: { ok: true } })); export default runbookRetry;
