import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseHeaderDate(h) {
  if (!h) return null;
  const s = String(h).trim();
  // Try ISO-like first
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : toISODate(d);
  }
  // dd/mm/yyyy or d/m/yy
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const [d, m, y] = s.split('/').map((x) => parseInt(x, 10));
    const yyyy = y < 100 ? 2000 + y : y;
    const dt = new Date(yyyy, (m - 1), d);
    return isNaN(dt.getTime()) ? null : toISODate(dt);
  }
  // Try generic Date parse as last resort
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : toISODate(dt);
}

function extractTimes(val) {
  if (!val) return { start: undefined, end: undefined };
  const m = String(val).match(/(\d{1,2}:\d{2})\s?-\s?(\d{1,2}:\d{2})/);
  if (!m) return { start: undefined, end: undefined };
  const norm = (t) => {
    const [hh, mm] = t.split(':');
    return `${String(parseInt(hh, 10)).padStart(2, '0')}:${String(parseInt(mm, 10)).padStart(2, '0')}`;
  };
  return { start: norm(m[1]), end: norm(m[2]) };
}

function extractCode(val) {
  if (!val) return '';
  const clean = String(val).trim().toUpperCase();
  const token = clean.split(/\s+/)[0] || '';
  return token.replace(/[^A-Z0-9_]/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let { spreadsheetId, sheetName, saveConfig, enableAuto } = body || {};

    // If no incoming config, try load from ImportConfig (auto mode)
    if (!spreadsheetId || !sheetName) {
      const cfgs = await base44.asServiceRole.entities.ImportConfig.list();
      const cfg = Array.isArray(cfgs) ? cfgs[0] : null;
      if (cfg && cfg.spreadsheet_id && cfg.sheet_name) {
        spreadsheetId = cfg.spreadsheet_id;
        sheetName = cfg.sheet_name;
        enableAuto = cfg.is_enabled === true;
      }
    }

    if (saveConfig) {
      const existing = await base44.asServiceRole.entities.ImportConfig.list();
      if (Array.isArray(existing) && existing.length > 0) {
        await base44.asServiceRole.entities.ImportConfig.update(existing[0].id, {
          spreadsheet_id: spreadsheetId || '',
          sheet_name: sheetName || '',
          is_enabled: Boolean(enableAuto),
        });
      } else {
        await base44.asServiceRole.entities.ImportConfig.create({
          spreadsheet_id: spreadsheetId || '',
          sheet_name: sheetName || '',
          is_enabled: Boolean(enableAuto),
        });
      }
      return Response.json({ status: 'saved', spreadsheetId, sheetName, is_enabled: Boolean(enableAuto) });
    }

    if (!spreadsheetId || !sheetName) {
      return Response.json({ error: 'Missing spreadsheetId or sheetName' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}?majorDimension=ROWS`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const txt = await res.text();
      return Response.json({ error: 'Sheets API error', details: txt }, { status: 502 });
    }
    const data = await res.json();
    const rows = Array.isArray(data.values) ? data.values : [];
    if (rows.length === 0) {
      return Response.json({ created: 0, updated: 0, skipped: 0, message: 'No data' });
    }

    const header = rows[0];
    // Expect first 4 columns: EMP_ID, DEPT, JOB TITLE, NAME; dates start from index 4
    const dateCols = [];
    for (let j = 4; j < header.length; j++) {
      const iso = parseHeaderDate(header[j]);
      if (iso) dateCols.push({ j, iso });
    }
    if (dateCols.length === 0) {
      return Response.json({ created: 0, updated: 0, skipped: 0, message: 'No date columns detected from column 5 onwards' });
    }

    // Load employees and departments for mapping
    const employees = await base44.asServiceRole.entities.Employee.list();
    const depts = await base44.asServiceRole.entities.Department.list();
    const empById = new Map();
    const empByName = new Map();
    (employees || []).forEach((e) => {
      if (e?.employee_id) empById.set(String(e.employee_id).trim().toUpperCase(), e);
      if (e?.full_name) empByName.set(String(e.full_name).trim().toUpperCase(), e);
    });
    const deptById = new Map();
    const deptByName = new Map();
    const deptByCode = new Map();
    (depts || []).forEach((d) => {
      if (d?.department_id) deptById.set(String(d.department_id).trim().toUpperCase(), d);
      if (d?.name) deptByName.set(String(d.name).trim().toUpperCase(), d);
      if (d?.code) deptByCode.set(String(d.code).trim().toUpperCase(), d);
    });

    let created = 0, updated = 0, skipped = 0, missingEmployees = 0;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const empIdRaw = (r[0] || '').toString().trim();
      const deptRaw = (r[1] || '').toString().trim();
      const nameRaw = (r[3] || '').toString().trim();

      if (!empIdRaw && !nameRaw) { skipped++; continue; }

      const empKey = empIdRaw.toUpperCase();
      const empNameKey = nameRaw.toUpperCase();
      const emp = empById.get(empKey) || empByName.get(empNameKey) || null;
      if (!emp) { missingEmployees++; continue; }

      // Map department
      let dept = null;
      const dkey = deptRaw.toUpperCase();
      dept = deptById.get(dkey) || deptByCode.get(dkey) || deptByName.get(dkey) || null;

      for (const col of dateCols) {
        const val = r[col.j];
        if (!val) continue;
        const code = extractCode(val);
        if (!code) continue;
        const { start, end } = extractTimes(val);
        const patch = {
          employee_id: emp.employee_id,
          department_id: dept ? dept.department_id : (emp.department_id || ''),
          date: col.iso,
          shift_code: code,
        };
        if (start) patch.start_time = start;
        if (end) patch.end_time = end;

        // Upsert: try find existing shift for emp+date
        const existing = await base44.asServiceRole.entities.Shift.filter({ employee_id: emp.employee_id, date: col.iso });
        if (Array.isArray(existing) && existing.length > 0) {
          await base44.asServiceRole.entities.Shift.update(existing[0].id, patch);
          updated++;
        } else {
          await base44.asServiceRole.entities.Shift.create(patch);
          created++;
        }
      }
    }

    // Save last_run if config exists
    const configs = await base44.asServiceRole.entities.ImportConfig.list();
    if (Array.isArray(configs) && configs.length > 0) {
      await base44.asServiceRole.entities.ImportConfig.update(configs[0].id, { last_run: new Date().toISOString() });
    }

    return Response.json({ created, updated, skipped, missingEmployees });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});