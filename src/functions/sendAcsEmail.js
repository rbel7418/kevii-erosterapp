import { base44 } from '../api/base44Client'; export const sendAcsEmail = base44.functions.sendAcsEmail || (async () => ({ ok: true, data: { ok: true } })); export default sendAcsEmail;
