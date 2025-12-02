import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { EmailClient } from 'npm:@azure/communication-email@1.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Hard-disable switch to effectively "remove" ACS email usage
    const disabled = ['DISABLE_ACS', 'DISABLE_EMAIL'].some((k) => (Deno.env.get(k) || '').trim() === '1');
    if (disabled) {
      return Response.json({ error: 'Email disabled by admin (DISABLE_ACS/DISABLE_EMAIL=1)' }, { status: 503 });
    }

    const payload = await req.json().catch(() => ({}));
    const { to, subject, html, from_name } = payload || {};
    if (!to || !subject || !html) {
      return Response.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 });
    }

    // Only use correctly named env vars; no auto-detection from other env keys
    const conn = (Deno.env.get('ACS_CONNECTION_STRING') || '').trim();
    const fromAddr = (Deno.env.get('ACS_FROM') || '').trim();
    const toAddr = String(to).trim();

    if (!conn || !fromAddr) {
      return Response.json({
        error: 'Missing ACS configuration',
        hint: 'Set ACS_CONNECTION_STRING and ACS_FROM in Settings → Environment variables'
      }, { status: 500 });
    }

    // Validate formats
    const endpointOk = /endpoint=https:\/\/[a-z0-9.\-]+\.communication\.azure\.com\/?;?/i.test(conn);
    const accessKeyOk = /accesskey=[^;\s]+/i.test(conn);
    if (!(endpointOk && accessKeyOk)) {
      return Response.json({
        error: 'Invalid ACS_CONNECTION_STRING format',
        hint: 'Expected: endpoint=https://<resource>.communication.azure.com/;accesskey=<key>'
      }, { status: 500 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromAddr)) {
      return Response.json({ error: 'Invalid ACS_FROM address' }, { status: 500 });
    }
    if (!emailRegex.test(toAddr)) {
      return Response.json({ error: 'Invalid recipient email' }, { status: 400 });
    }

    const client = new EmailClient(conn);
    const message = {
      senderAddress: fromAddr,
      recipients: { to: [{ address: toAddr }] },
      content: { subject: from_name ? `${from_name} — ${subject}` : subject, html }
    };

    try {
      const poller = await client.beginSend(message);
      const result = await poller.pollUntilDone();
      if (!result || (result.status && String(result.status).toLowerCase() === 'failed')) {
        return Response.json({ error: 'Email send failed at provider', details: result || null }, { status: 500 });
      }
    } catch (providerErr) {
      const msg = String(providerErr?.message || providerErr || '');
      const lower = msg.toLowerCase();
      const fromDomain = (fromAddr.split('@')[1] || '').toLowerCase();
      if (
        lower.includes('sender domain has not been linked') ||
        lower.includes('domain is not verified') ||
        lower.includes('from email address is not part of a verified') ||
        lower.includes('unregistered domain')
      ) {
        return Response.json({
          error: 'Sender domain not linked to ACS',
          from_domain: fromDomain,
          hint: 'Use a sender from a verified ACS Email domain (Azure Portal → Communication Services → Email → Domains → add/verify domain and Sender Identity).'
        }, { status: 400 });
      }
      return Response.json({ error: 'Provider error (ACS)', details: msg }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});