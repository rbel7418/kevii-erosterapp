
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { SmsClient } from 'npm:@azure/communication-sms@1.1.0';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function isLikelyUKMobile(raw) {
  // 07xxxxxxxxx (11 digits) typical UK mobile
  return /^07\d{9}$/.test(raw);
}

function toE164(raw, opts = { autoFormatUK: true }) {
  if (!raw) return { ok: false, value: '', reason: 'empty' };

  let s = String(raw).trim().replace(/\s+/g, '');
  // Allow basic punctuation in user input
  s = s.replace(/[().-]/g, '');

  // If already E.164-like
  if (/^\+\d{7,15}$/.test(s)) {
    return { ok: true, value: s };
  }

  // Auto normalize common UK format 07xxxxxxxxx -> +447xxxxxxxxx (if enabled)
  if (opts?.autoFormatUK && isLikelyUKMobile(s)) {
    return { ok: true, value: '+44' + s.slice(1) };
  }

  return { ok: false, value: '', reason: 'not_e164' };
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // NORMALIZE INPUTS: accept both {message} and {body}, {tags} (array or string), and {staff_id}
    const payload = await req.json().catch(() => ({}));
    const to = payload?.to;
    const message = (typeof payload?.message === 'string' ? payload.message : payload?.body) || '';
    const autoFormatUK = payload?.autoFormatUK !== undefined ? !!payload.autoFormatUK : true;
    const staffId = payload?.staff_id || null; // New: capture staff_id
    const tagsInput = payload?.tags ?? payload?.tag ?? null;
    const tags = Array.isArray(tagsInput) ? tagsInput : (tagsInput ? [tagsInput] : []);

    // Config checks
    const connectionString = Deno.env.get('ACS_CONNECTION_STRING');
    const fromNumber = Deno.env.get('ACS_FROM');
    if (!connectionString) {
      return jsonResponse({ error: 'Missing ACS_CONNECTION_STRING secret' }, 500);
    }
    if (!fromNumber) {
      return jsonResponse({ error: 'Missing ACS_FROM secret (sender phone)' }, 500);
    }

    // Payload validation
    if (!to || typeof to !== 'string') {
      return jsonResponse({ error: 'Recipient "to" is required (string)' }, 400);
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return jsonResponse({ error: 'Message is required' }, 400);
    }
    if (message.length > 1600) {
      return jsonResponse({ error: 'Message too long (max 1600 characters)' }, 400);
    }

    // Normalize and validate phone
    const normalized = toE164(to, { autoFormatUK });
    if (!normalized.ok) {
      return jsonResponse({
        error: 'Invalid phone format',
        detail: 'Use E.164 format, e.g. +447915332297 (UK). If your number starts 07..., we can auto-convert when autoFormatUK=true.',
        input: to
      }, 400);
    }

    // Send via ACS
    const smsClient = new SmsClient(connectionString);
    const sendRes = await smsClient.send({
      from: fromNumber,
      to: [normalized.value],
      message: message,
      enableDeliveryReport: true,
      tag: tags.length > 0 ? String(tags[0]) : 'base44' // Use first tag from array, or default
    });

    // Normalize response shape across SDK versions
    const sendResults = Array.isArray(sendRes)
      ? sendRes
      : (Array.isArray(sendRes?.sendResults) ? sendRes.sendResults : [sendRes]);

    const result = sendResults[0] || null;

    // Best-effort logging to OutboundMessage
    try {
      await base44.entities.OutboundMessage.create({
        provider: 'acs',
        channel: 'sms',
        to_number: normalized.value,
        body: message,
        status: (result?.httpStatusCode === 202 || result?.successful === true) ? 'sent' : 'unknown',
        provider_message_id: result?.messageId || '',
        requested_by: user.email,
        tags: tags.map((t) => String(t)), // Ensure tags are stored as strings in an array
        staff_id: staffId // New: include staff_id
      });
    } catch (_e) { /* ignore if entity not present or user lacks perms */ }

    // Build a user-friendly response
    if (result?.httpStatusCode === 202 || result?.successful === true) {
      return jsonResponse({
        success: true,
        to: normalized.value,
        messageId: result?.messageId || null,
        statusCode: result?.httpStatusCode || 202
      });
    } else {
      // Provide meaningful diagnostics
      return jsonResponse({
        success: false,
        error: 'ACS did not accept the message',
        details: {
          to: normalized.value,
          httpStatusCode: result?.httpStatusCode ?? null,
          messageId: result?.messageId ?? null,
          raw: result ?? null
        }
      }, 502);
    }
  } catch (error) {
    // Surface helpful error details
    return jsonResponse({
      error: 'Unhandled error while sending SMS',
      details: String(error?.message || error),
      stack: (error && error.stack) ? String(error.stack).split('\n').slice(0, 3).join('\n') : undefined
    }, 500);
  }
});
