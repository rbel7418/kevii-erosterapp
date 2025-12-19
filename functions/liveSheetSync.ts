import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function json(data, init = {}) { return Response.json(data, init); }

// Utilities
function ymd(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function colToIndex(col) {
  // A -> 1, B -> 2 ... Z -> 26, AA -> 27
  let result = 0;
  const s = String(col).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    result = result * 26 + (s.charCodeAt(i) - 64);
  }
  return result;
}

function indexToCol(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function parseA1Range(range) {
  // e.g. "B4:AC25" => { startCol:2, startRow:4, endCol:29, endRow:25 }
  const m = /([A-Z]+)(\d+):([A-Z]+)(\d+)/i.exec(String(range));
  if (!m) throw new Error(`Invalid A1 range: ${range}`);
  return {
    startCol: colToIndex(m[1]),
    startRow: Number(m[2]),
    endCol: colToIndex(m[3]),
    endRow: Number(m[4]),
  };
}

function parseHeaderDate(cell) {
  if (!cell) return null;
  const s = String(cell).trim();
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return ymd(dt);
  const two = /^(\d{1,2})[-\s]?([A-Za-z]{3,})[-\s]?(\d{2,4})?$/.exec(s);
  if (two) {
    const day = Number(two[1]);
    const mon = two[2].slice(0,3).toLowerCase();
    const map = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const m = map[mon];
    const year = two[3] ? Number(two[3].length === 2 ? ('20'+two[3]) : two[3]) : (new Date()).getFullYear();
    if (m!=null) return ymd(new Date(year, m, day));
  }
  return null;
}

async function gapi(url, method, token, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Google API ${method} ${url} failed: ${res.status} ${t}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
}

async function readValues(spreadsheetId, a1, token) {
  const encId = encodeURIComponent(spreadsheetId);
  const encRange = encodeURIComponent(a1);
  const data = await gapi(`https://sheets.googleapis.com/v4/spreadsheets/${encId}/values/${encRange}?majorDimension=ROWS`, 'GET', token);
  return data?.values || [];
}

function normalizeName(name) {
  if (!name) return '';
  return String(name).split('(')[0].trim().toLowerCase();
}

function extractIdFromCell(cell) {
  const m = /\[(.+?)\]/.exec(String(cell||''));
  return m ? String(m[1]).trim().toLowerCase() : null;
}

// Optional built-in mapping by tab name (can be overridden by payload.ranges)
const SHEET_MAP = {
  "Ward 2": { nurses: 'A4:A17', hcas: 'A20:A22', dateHeaders: 'B3:AC3', grid: 'B4:AC25' },
  "Ward 3": { nurses: 'A4:A21', hcas: 'A24:A28', dateHeaders: 'B3:AC3', grid: 'B4:AC31' },
  "ECU":     { nurses: 'A4:A8',  hcas: 'A11:A12', dateHeaders: 'B3:AC3', grid: 'B4:AC14' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || '').toLowerCase();

    if (action !== 'pushShift') {
      return json({ error: 'Unknown action' }, { status: 400 });
    }

    const spreadsheetId = String(payload.spreadsheetId || '').trim();
    const sheetName = String(payload.sheetName || '').trim();
    const date = String(payload.date || '').trim(); // YYYY-MM-DD
    const code = payload.code == null ? '' : String(payload.code).trim(); // allow empty to clear
    const employeeId = payload.employeeId ? String(payload.employeeId) : '';

    if (!spreadsheetId || !sheetName || !date || !employeeId) {
      return json({ error: 'spreadsheetId, sheetName, date, employeeId are required' }, { status: 400 });
    }

    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Load employee for name/id
    const emps = await base44.asServiceRole.entities.Employee.filter({ id: employeeId });
    const emp = emps?.[0];
    if (!emp) return json({ error: 'Employee not found' }, { status: 404 });

    // Resolve ranges
    const ranges = payload.ranges || SHEET_MAP[sheetName];
    if (!ranges?.nurses || !ranges?.hcas || !ranges?.dateHeaders || !ranges?.grid) {
      return json({ error: 'Missing ranges for this sheet; provide ranges or configure mapping' }, { status: 400 });
    }

    // 1) Build date column map from dateHeaders (e.g., 'B3:AC3')
    const headerA1 = `${sheetName}!${ranges.dateHeaders}`;
    const headerVals = await readValues(spreadsheetId, headerA1, sheetsToken);
    const headerRow = headerVals[0] || [];
    const headerRect = parseA1Range(ranges.dateHeaders);
    const dateIdx = headerRow.findIndex((cell) => parseHeaderDate(cell) === date);
    if (dateIdx < 0) {
      return json({ error: `Date ${date} not found in header ${ranges.dateHeaders}` }, { status: 400 });
    }

    const gridRect = parseA1Range(ranges.grid); // aligns with staff rows
    const targetColIndex = gridRect.startCol + dateIdx; // 1-based
    const targetColA1 = indexToCol(targetColIndex);

    // 2) Find staff row number (search A column within nurses + hcas blocks)
    const nursesA1 = `${sheetName}!${ranges.nurses}`;
    const hcasA1 = `${sheetName}!${ranges.hcas}`;
    const [nurseVals, hcaVals] = await Promise.all([
      readValues(spreadsheetId, nursesA1, sheetsToken),
      readValues(spreadsheetId, hcasA1, sheetsToken),
    ]);

    const nurseRect = parseA1Range(ranges.nurses);
    const hcaRect = parseA1Range(ranges.hcas);

    const wantId = String(emp.employee_id || '').toLowerCase();
    const wantName = normalizeName(emp.full_name || '');

    function findRow(rows, rectStartRow) {
      for (let i = 0; i < rows.length; i++) {
        const cell = rows[i]?.[0] ?? '';
        const idInCell = extractIdFromCell(cell);
        if (idInCell && wantId && idInCell === wantId) return rectStartRow + i;
        if (normalizeName(cell) === wantName && wantName) return rectStartRow + i;
      }
      return null;
    }

    let targetRow = findRow(nurseVals, nurseRect.startRow);
    if (targetRow == null) targetRow = findRow(hcaVals, hcaRect.startRow);
    if (targetRow == null) {
      return json({ error: `Employee not found in nurses ${ranges.nurses} or hcas ${ranges.hcas}` }, { status: 404 });
    }

    // 3) Update the single cell in the grid range
    if (targetRow < gridRect.startRow || targetRow > gridRect.endRow) {
      return json({ error: `Resolved row ${targetRow} is outside grid ${ranges.grid}` }, { status: 400 });
    }

    const targetA1 = `${sheetName}!${targetColA1}${targetRow}`;

    await gapi(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(targetA1)}?valueInputOption=USER_ENTERED`,
      'PUT',
      sheetsToken,
      { values: [[code]] }
    );

    return json({ success: true, cell: `${targetColA1}${targetRow}`, sheetName, date, code });
  } catch (error) {
    return json({ error: String(error?.message || error) }, { status: 500 });
  }
});