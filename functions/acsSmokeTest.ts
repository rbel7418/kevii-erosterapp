import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { EmailClient } from 'npm:@azure/communication-email@1.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const to = String(payload?.to || user.email || '').trim();

    const disabled = ['DISABLE_ACS', 'DISABLE_EMAIL'].some((k) => (Deno.env.get(k) || '').trim() === '1');
    if (disabled) {
      return Response.json({ ok: false, cause: 'DISABLED', note: 'Email disabled by admin (DISABLE_ACS/DISABLE_EMAIL=1)' });
    }

    const conn = (Deno.env.get('ACS_CONNECTION_STRING') || '').trim();
    const fromAddr = (Deno.env.get('ACS_FROM') || '').trim();

    const keyMatch = conn.match(/accesskey=([^;]+)/i);
    const last6 = keyMatch ? keyMatch[1].slice(-6) : null;

    if (!conn || !fromAddr) {
      return Response.json({
        ok: false,
        cause: 'MISSING_ENV',
        note: 'Set ACS_CONNECTION_STRING and ACS_FROM',
        details: { has_connection_string: !!conn, has_from: !!fromAddr, last6 }
      });
    }

    const endpointOk = /endpoint=https:\/\/[a-z0-9.\-]+\.communication\.azure\.com\/?;?/i.test(conn);
    const accessKeyOk = /accesskey=[^;\s]+/i.test(conn);
    if (!(endpointOk && accessKeyOk)) {
      return Response.json({
        ok: false,
        cause: 'BAD_CONNECTION_STRING',
        note: 'Connection string format incorrect',
        details: { endpointOk, accessKeyOk, last6 }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const toAddr = emailRegex.test(to) ? to : fromAddr; // fall back to from
    if (!emailRegex.test(fromAddr)) {
      return Response.json({ ok: false, cause: 'BAD_FROM', note: 'ACS_FROM is not a valid email', details: { fromAddr } });
    }

    try {
      const client = new EmailClient(conn);
      const poller = await client.beginSend({
        senderAddress: fromAddr,
        recipients: { to: [{ address: toAddr }] },
        content: { subject: 'ACS Smoke Test', html: '<p>It lives.</p>' }
      });
      const result = await poller.pollUntilDone();
      if (!result || (result.status && String(result.status).toLowerCase() === 'failed')) {
        return Response.json({ ok: false, cause: 'PROVIDER_REPORTED_FAILED', details: result || null, last6 });
      }
      return Response.json({ ok: true, status: result.status || 'unknown', operation_id: result.id || null, last6 });
    } catch (e) {
      const msg = String(e?.message || e || '');
      const lower = msg.toLowerCase();
      const fromDomain = (fromAddr.split('@')[1] || '').toLowerCase();
      if (lower.includes('authentication') || lower.includes('unauthorized') || lower.includes('signature')) {
        return Response.json({ ok: false, cause: 'BAD_KEY_OR_STRING', note: 'Connection string or access key is wrong', details: msg, last6 });
      }
      if (
        lower.includes('sender domain has not been linked') ||
        lower.includes('domain is not verified') ||
        lower.includes('from email address is not part of a verified') ||
        lower.includes('unregistered domain')
      ) {
        return Response.json({
          ok: false,
          cause: 'SENDER_DOMAIN_NOT_VERIFIED',
          note: 'ACS_FROM domain not verified/linked',
          from_domain: fromDomain,
          details: msg
        });
      }
      if (lower.includes('permission') && lower.includes('env')) {
        return Response.json({ ok: false, cause: 'ENV_NOT_BOUND', note: 'Runtime cannot read env vars', details: msg });
      }
      return Response.json({ ok: false, cause: 'PROVIDER_ERROR', note: 'ACS provider error', details: msg });
    }
  } catch (error) {
    return Response.json({ ok: false, error: error.message || String(error) }, { status: 500 });
  }
});