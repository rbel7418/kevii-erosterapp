import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper: build JSON Response
function json(data, init = {}) {
  return Response.json(data, init);
}

// Google Sheets REST helpers
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function gsFetch(url, method, token, body, attempt = 0) {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const status = res.status;
    const shouldRetry = (
      status === 429 ||
      status >= 500 ||
      (status === 403 && /rateLimitExceeded|userRateLimitExceeded/i.test(text))
    );
    if (shouldRetry && attempt < 5) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '', 10);
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(30000, Math.pow(2, attempt) * 500 + Math.random() * 300);
      await sleep(backoff);
      return gsFetch(url, method, token, body, attempt + 1);
    }
    throw new Error(`Google API ${method} ${url} failed: ${status} ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res;
}

async function ensureSheetExists(spreadsheetId, sheetName, token) {
  const meta = await gsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
    'GET',
    token
  );
  const sheets = Array.isArray(meta.sheets) ? meta.sheets : [];
  const exists = sheets.some(s => s?.properties?.title === sheetName);
  if (exists) return true;
  // Add sheet
  await gsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    'POST',
    token,
    {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    }
  );
  return true;
}

function objectsToRows(objs, headers) {
  return objs.map((o) => headers.map((h) => (o[h] ?? '')));
}

function rowsToObjects(values) {
  if (!values || values.length === 0) return [];
  const headers = (values[0] || []).map((h) => String(h || '').trim());
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] ?? ''; });
    out.push(obj);
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Parse payload
    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || '').toLowerCase();

    if (!action) return json({ error: 'Missing action' }, { status: 400 });

    // Get Sheets access token (Drive is not required when using Sheets API create/read/write)
    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // CREATE or OPEN (create new spreadsheet)
    if (action === 'createSpreadsheet') {
      const title = String(payload.title || 'Base44 App Data');
      const initialSheetName = String(payload.sheetName || 'Data');

      // Create spreadsheet (Sheets API)
      const created = await gsFetch(
        'https://sheets.googleapis.com/v4/spreadsheets',
        'POST',
        sheetsToken,
        {
          properties: { title },
          sheets: [{ properties: { title: initialSheetName } }],
        }
      );

      const spreadsheetId = created?.spreadsheetId;
      return json({ spreadsheetId, url: created?.spreadsheetUrl, created });
    }

    // READ rows as JSON
    if (action === 'read') {
      const spreadsheetId = String(payload.spreadsheetId || '');
      const sheetName = String(payload.sheetName || 'Data');
      const range = payload.range
        ? String(payload.range)
        : `${sheetName}!A:Z`;

      if (!spreadsheetId) return json({ error: 'spreadsheetId required' }, { status: 400 });

      const data = await gsFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
        'GET',
        sheetsToken
      );
      const values = data?.values || [];
      return json({ rows: rowsToObjects(values), raw: values });
    }

    // WRITE rows: append or replaceAll
    if (action === 'write') {
      const spreadsheetId = String(payload.spreadsheetId || '');
      const sheetName = String(payload.sheetName || 'Data');
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const mode = (payload.mode === 'replaceAll') ? 'replaceAll' : 'append';

      if (!spreadsheetId) return json({ error: 'spreadsheetId required' }, { status: 400 });
      if (rows.length === 0) return json({ error: 'rows must be a non-empty array of objects' }, { status: 400 });

      // Ensure sheet exists
      await ensureSheetExists(spreadsheetId, sheetName, sheetsToken);

      // Determine headers (union of keys across rows, stable order)
      const headerSet = new Set();
      rows.forEach((r) => Object.keys(r || {}).forEach((k) => headerSet.add(k)));
      const headers = Array.from(headerSet);

      // Fetch current header row (if any)
      let currentHeader = [];
      try {
        const hdr = await gsFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName + '!1:1')}?majorDimension=ROWS`,
          'GET',
          sheetsToken
        );
        currentHeader = (hdr?.values?.[0] || []).map((h) => String(h || '').trim());
      } catch (_) {
        currentHeader = [];
      }

      // Prepare payloads
      const valuesToWrite = objectsToRows(rows, headers);

      // If replaceAll: clear A:Z, write new header + rows
      if (mode === 'replaceAll') {
        await gsFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName + '!A:Z')}:clear`,
          'POST',
          sheetsToken,
          {}
        );
        // Write header + rows
        await gsFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName + '!A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          'POST',
          sheetsToken,
          { values: [headers, ...valuesToWrite] }
        );
        return json({ success: true, mode, wrote: rows.length, headers });
      }

      // APPEND mode: ensure header exists/aligns; append rows
      if (currentHeader.length === 0) {
        // First write: header + rows
        await gsFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName + '!A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          'POST',
          sheetsToken,
          { values: [headers, ...valuesToWrite] }
        );
      } else {
        // Re-map rows to existing headers if possible; if headers differ, write with existing headers + missing keys as ''
        const baseHeaders = currentHeader.length > 0 ? currentHeader : headers;
        const aligned = rows.map((r) => baseHeaders.map((h) => (r[h] ?? '')));
        await gsFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName + '!A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          'POST',
          sheetsToken,
          { values: aligned }
        );
      }
      return json({ success: true, mode: 'append', wrote: rows.length, headers: currentHeader.length ? currentHeader : headers });
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return json({ error: String(error?.message || error) }, { status: 500 });
  }
});