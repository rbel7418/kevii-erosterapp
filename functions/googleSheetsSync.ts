import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function json(data, init = {}) { return Response.json(data, init); }

// --- Google Sheets helpers ---
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

async function readSheet(spreadsheetId, sheetName, token) {
  const encId = encodeURIComponent(spreadsheetId);
  const encRange = encodeURIComponent(`${sheetName}!A:ZZ`);
  const data = await gapi(`https://sheets.googleapis.com/v4/spreadsheets/${encId}/values/${encRange}?majorDimension=ROWS`, 'GET', token);
  return data?.values || [];
}

async function writeSheetReplace(spreadsheetId, sheetName, values, token) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
  // clear
  await gapi(`${base}/values/${encodeURIComponent(sheetName + '!A:ZZ')}:clear`, 'POST', token, {});
  // write
  await gapi(`${base}/values/${encodeURIComponent(sheetName + '!A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, 'POST', token, { values });
}

function ymd(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function parseHeaderDate(cell) {
  if (!cell) return null;
  const s = String(cell).trim();
  // Try direct Date parse (works if sheet stores date value rendered)
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return ymd(dt);
  // Try formats like '1-Dec' '01-Dec-2025'
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

function rangeDays(start, end) {
  const s = new Date(start), e = new Date(end);
  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
    out.push(ymd(d));
  }
  return out;
}

function normalizeName(name) {
  if (!name) return '';
  const trimmed = String(name).trim();
  // If includes parentheses, take left side as the display name
  return trimmed.split('(')[0].trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || '').toLowerCase();
    if (!action) return json({ error: 'Missing action' }, { status: 400 });

    const spreadsheetId = String(payload.spreadsheetId || '');
    const sheetName = String(payload.sheetName || 'Rota');
    const departmentId = payload.department_id ? String(payload.department_id) : undefined;
    const dateStart = payload.date_start ? String(payload.date_start) : undefined;
    const dateEnd = payload.date_end ? String(payload.date_end) : undefined;
    const replaceMode = (payload.replaceMode === 'replaceAll') ? 'replaceAll' : 'append';

    // Optional overrides from client
    const headerRowIndex = Number(payload.header_row_index || 0) || undefined; // 1-based
    const nameColIndex = Number(payload.name_col_index || 0) || undefined;     // 1-based
    const rowsStart = Number(payload.rows_start || 0) || undefined;            // 1-based
    const rowsEnd = Number(payload.rows_end || 0) || undefined;                // 1-based
    const rowBlocks = Array.isArray(payload.row_blocks)
      ? payload.row_blocks
          .map((b) => ({ start: Number(b.start)||0, end: Number(b.end)||0 }))
          .filter((b) => b.start > 0 && b.end > 0 && b.end >= b.start)
      : [];

    // Compute 0-based name column index (default A)
    const nameColIdx = (nameColIndex && nameColIndex > 0) ? (nameColIndex - 1) : 0;

    if (!spreadsheetId) return json({ error: 'spreadsheetId required' }, { status: 400 });
    if (!sheetName) return json({ error: 'sheetName required' }, { status: 400 });

    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    if (action === 'export') {
      if (!dateStart || !dateEnd) return json({ error: 'date_start and date_end are required' }, { status: 400 });
      const days = rangeDays(dateStart, dateEnd);

      // Employees scope
      let employees = await base44.entities.Employee.list();
      if (departmentId) employees = employees.filter(e => e.department_id === departmentId);

      // Build map: { empId -> { 'YYYY-MM-DD': code } }
      const grid = new Map();
      for (const emp of employees) {
        grid.set(emp.id, {});
      }

      // Fetch shifts per day to avoid non-documented range filters
      for (const day of days) {
        const perDay = await base44.entities.Shift.filter({ date: day, ...(departmentId ? { department_id: departmentId } : {}) });
        for (const sh of perDay) {
          if (!grid.has(sh.employee_id)) continue;
          grid.get(sh.employee_id)[day] = (sh.shift_code || '');
        }
      }

      // Prepare values: header row then one row per employee
      const header = ['Name', ...days];
      const values = [header];
      employees.sort((a,b) => String(a.full_name||'').localeCompare(String(b.full_name||'')));
      for (const emp of employees) {
        const row = [emp.full_name || emp.employee_id || ''];
        const dayMap = grid.get(emp.id) || {};
        for (const d of days) row.push(dayMap[d] || '');
        values.push(row);
      }

      await writeSheetReplace(spreadsheetId, sheetName, values, sheetsToken);
      return json({ success: true, wrote_rows: values.length, wrote_cols: header.length });
    }

    if (action === 'import') {
      if (!dateStart || !dateEnd) return json({ error: 'date_start and date_end are required' }, { status: 400 });
      const values = await readSheet(spreadsheetId, sheetName, sheetsToken);
      if (!values.length) return json({ error: 'Sheet is empty' }, { status: 400 });

      // Header row selection: use provided index if given, else auto-detect
      let headerRowIdx = (headerRowIndex && headerRowIndex > 0) ? (headerRowIndex - 1) : 0;
      if (!(headerRowIndex && headerRowIndex > 0)) {
        for (let i=0; i<Math.min(values.length, 10); i++) {
          const row = values[i] || [];
          let parsed = 0;
          for (let c = nameColIdx + 1; c < row.length; c++) if (parseHeaderDate(row[c])) parsed++;
          if (parsed >= 2) { headerRowIdx = i; break; }
        }
      }
      const header = values[headerRowIdx] || [];
      const dateCols = [];
      for (let c = nameColIdx + 1; c < header.length; c++) {
        const d = parseHeaderDate(header[c]);
        if (d) dateCols.push({ c, d });
      }
      if (!dateCols.length) return json({ error: 'No date columns found in header' }, { status: 400 });

      const headerInfo = {
        headerRowIndex: headerRowIdx + 1,
        nameColIndex: nameColIdx + 1,
        dateCols: dateCols.map(dc => ({ colIndex: dc.c + 1, date: dc.d, header: String(header[dc.c] || '') }))
      };

      // Build employee lookup by full_name (normalized) and by employee_id
      const allEmployees = await base44.entities.Employee.list();
      const byName = new Map();
      const byId = new Map();
      for (const e of allEmployees) {
        if (e.full_name) byName.set(normalizeName(e.full_name).toLowerCase(), e);
        if (e.employee_id) byId.set(String(e.employee_id).toLowerCase(), e);
      }

      // Load shift codes to read defaults if needed
      const shiftCodes = await base44.entities.ShiftCode.list();
      const codeDefaults = new Map();
      for (const sc of shiftCodes) {
        const key = String(sc.code || '').toUpperCase();
        codeDefaults.set(key, {
          start: sc.default_start_time || undefined,
          end: sc.default_end_time || undefined,
          brk: typeof sc.default_break_minutes === 'number' ? sc.default_break_minutes : undefined,
        });
      }

      const dateSet = new Set(dateCols.map(dc => dc.d));

      // Optional: replaceAll mode clears existing shifts in range (for selected department if provided)
      if (replaceMode === 'replaceAll') {
        for (const d of dateSet) {
          const perDay = await base44.entities.Shift.filter({ date: d, ...(departmentId ? { department_id: departmentId } : {}) });
          for (const sh of perDay) {
            await base44.entities.Shift.delete(sh.id);
          }
        }
      }

      let created = 0, updated = 0, skipped = 0;
      const skipDetails = [];

      const processedBlocks = [];
      const applyRow = async (r) => {
        const row = values[r] || [];
        const rawName = normalizeName(row[nameColIdx]);
        if (!rawName) { skipped++; skipDetails.push({ row: r + 1, nameCell: row[nameColIdx] || '', reason: 'blank_name' }); return; }

        // Try exact ID match first if cell includes an ID in square brackets e.g., "Name [EMP001]"
        let emp = null;
        const idMatch = /\[(.+?)\]/.exec(row[nameColIdx] || '');
        if (idMatch) emp = byId.get(String(idMatch[1]).toLowerCase());
        if (!emp) emp = byName.get(rawName.toLowerCase()) || null;
        if (!emp) { skipped++; skipDetails.push({ row: r + 1, nameCell: row[nameColIdx] || '', reason: 'employee_not_found' }); return; }

        for (const { c, d } of dateCols) {
          const cell = String(row[c] || '').trim();
          if (!cell) continue;
          const code = cell.toUpperCase();

          // Check if a shift already exists for this emp/date (and department if provided)
          const existing = await base44.entities.Shift.filter({ employee_id: emp.id, date: d, ...(departmentId ? { department_id: departmentId } : {}) });
          if (existing && existing.length) {
            const patch = { shift_code: code };
            const def = codeDefaults.get(code);
            if (def) {
              if (!existing[0].start_time && def.start) patch.start_time = def.start;
              if (!existing[0].end_time && def.end) patch.end_time = def.end;
              if ((existing[0].break_minutes == null || existing[0].break_minutes === 0) && def.brk != null) patch.break_minutes = def.brk;
            }
            await base44.entities.Shift.update(existing[0].id, patch);
            updated++;
          } else {
            const def = codeDefaults.get(code) || {};
            await base44.entities.Shift.create({
              employee_id: emp.id,
              department_id: departmentId || emp.department_id || '',
              date: d,
              shift_code: code,
              start_time: def.start,
              end_time: def.end,
              break_minutes: def.brk ?? 0,
              status: 'scheduled'
            });
            created++;
          }
        }
      };

      if (rowBlocks.length) {
        for (const b of rowBlocks) {
          const startIdx = Math.max(0, b.start - 1);
          const endIdx = Math.min(values.length - 1, b.end - 1);
          processedBlocks.push({ from: startIdx + 1, to: endIdx + 1 });
          for (let r = startIdx; r <= endIdx; r++) {
            await applyRow(r);
          }
        }
      } else {
        const rStartIndex = (rowsStart && rowsStart > 0) ? (rowsStart - 1) : (headerRowIdx + 1);
        const rEndIndex = (rowsEnd && rowsEnd > 0) ? Math.min(values.length - 1, rowsEnd - 1) : (values.length - 1);
        processedBlocks.push({ from: rStartIndex + 1, to: rEndIndex + 1 });
        for (let r = rStartIndex; r <= rEndIndex; r++) {
          await applyRow(r);
        }
      }

      return json({ success: true, created, updated, skipped, header: headerInfo, rows_processed: processedBlocks, skip_details: skipDetails });
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return json({ error: String(error?.message || error) }, { status: 500 });
  }
});