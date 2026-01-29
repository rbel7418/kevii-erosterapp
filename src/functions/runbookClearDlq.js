import { base44 } from '../api/base44Client'; export const runbookClearDlq = base44.functions.runbookClearDlq || (async () => ({ ok: true, data: { ok: true } })); export default runbookClearDlq;
