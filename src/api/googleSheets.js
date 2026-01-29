import { base44 } from './base44Client';

export function extractSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function extractSheetGid(url) {
  const match = url.match(/[#&]gid=(\d+)/);
  return match ? match[1] : '0';
}

export async function fetchSheetData(spreadsheetId, range = 'Sheet1') {
  const result = await base44.functions.invoke('googleSheets', {
    action: 'getData',
    spreadsheetId,
    sheetName: range
  });
  
  if (!result.data?.ok) {
    throw new Error(result.data?.error || 'Failed to fetch spreadsheet data');
  }
  
  return result.data.data || [];
}

export async function fetchSpreadsheetInfo(spreadsheetId) {
  const result = await base44.functions.invoke('googleSheets', {
    action: 'getSheets',
    spreadsheetId
  });
  
  if (!result.data?.ok) {
    throw new Error(result.data?.error || 'Failed to fetch spreadsheet info');
  }
  
  return result.data.sheets || [];
}

export function parseShiftCodesFromSheet(rows) {
  if (!rows || rows.length < 2) return [];
  
  const headers = rows[0].map(h => h?.toString().toLowerCase().trim() || '');
  const codeIdx = headers.findIndex(h => h.includes('shift_code') || h.includes('code') || h === 'shift');
  const descIdx = headers.findIndex(h => h.includes('descriptor') || h.includes('description') || h.includes('name'));
  const fromIdx = headers.findIndex(h => h.includes('time_from') || h.includes('start') || h.includes('from'));
  const toIdx = headers.findIndex(h => h.includes('time_to') || h.includes('end') || h.includes('to'));
  const hoursIdx = headers.findIndex(h => h.includes('hours'));
  const categoryIdx = headers.findIndex(h => h.includes('category'));
  const financeIdx = headers.findIndex(h => h.includes('finance') || h.includes('billable') || h.includes('tag'));
  const workedIdx = headers.findIndex(h => h.includes('is_worked') || h.includes('worked'));
  const dayNightIdx = headers.findIndex(h => h.includes('day_night') || h.includes('shift_type'));

  if (codeIdx === -1) {
    throw new Error('Could not find shift code column. Expected column named "shift_code" or "code".');
  }

  return rows.slice(1).filter(row => row[codeIdx]?.trim()).map(row => ({
    code: row[codeIdx]?.toString().trim().toUpperCase() || '',
    name: descIdx >= 0 ? row[descIdx]?.toString().trim() || '' : '',
    start_time: fromIdx >= 0 ? row[fromIdx]?.toString().trim() || '' : '',
    end_time: toIdx >= 0 ? row[toIdx]?.toString().trim() || '' : '',
    hours: hoursIdx >= 0 ? parseFloat(row[hoursIdx]) || 0 : 0,
    category: categoryIdx >= 0 ? row[categoryIdx]?.toString().trim() || '' : '',
    finance_tag: financeIdx >= 0 ? row[financeIdx]?.toString().trim() || '' : '',
    is_worked: workedIdx >= 0 ? row[workedIdx]?.toString().toUpperCase() === 'Y' : true,
    day_night: dayNightIdx >= 0 ? row[dayNightIdx]?.toString().trim() || '' : ''
  }));
}

export function parseStaffFromSheet(rows) {
  if (!rows || rows.length < 2) return [];
  
  const headers = rows[0].map(h => h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || '');
  
  const empIdIdx = headers.findIndex(h => h.includes('employee_id') || h.includes('emp_id') || h === 'id');
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('full_name'));
  const jobIdx = headers.findIndex(h => h.includes('job_title') || h.includes('job') || h.includes('role') || h.includes('title'));
  const deptIdx = headers.findIndex(h => h.includes('department') || h.includes('dept'));
  const reportsIdx = headers.findIndex(h => h.includes('reports_to') || h.includes('manager'));
  const contractIdx = headers.findIndex(h => h.includes('contract') || h.includes('type'));
  const hoursIdx = headers.findIndex(h => h.includes('contracted_hours') || h.includes('hours'));
  const joinIdx = headers.findIndex(h => h.includes('date_of_join') || h.includes('join_date') || h.includes('start_date'));

  if (empIdIdx === -1 || nameIdx === -1) {
    throw new Error('Could not find required columns. Expected "employee_id" and "name" columns.');
  }

  return rows.slice(1).filter(row => row[empIdIdx]?.toString().trim() && row[nameIdx]?.toString().trim()).map(row => ({
    employee_id: row[empIdIdx]?.toString().trim() || '',
    full_name: row[nameIdx]?.toString().trim() || '',
    role: jobIdx >= 0 ? row[jobIdx]?.toString().trim() || '' : '',
    department_name: deptIdx >= 0 ? row[deptIdx]?.toString().trim() || '' : '',
    reports_to: reportsIdx >= 0 ? row[reportsIdx]?.toString().trim() || '' : '',
    contract_type: contractIdx >= 0 ? row[contractIdx]?.toString().trim() || 'Permanent' : 'Permanent',
    contracted_hours: hoursIdx >= 0 ? parseFloat(row[hoursIdx]) || 0 : 0,
    date_of_join: joinIdx >= 0 ? row[joinIdx]?.toString().trim() || '' : ''
  }));
}

export function parseRosterGridFromSheet(rows, year = new Date().getFullYear()) {
  if (!rows || rows.length < 2) return { employees: [], shifts: [] };
  
  const headers = rows[0].map(h => h?.toString().trim() || '');
  
  const empIdIdx = headers.findIndex(h => 
    h.toLowerCase().includes('emp_id') || 
    h.toLowerCase().includes('employee') ||
    h.toLowerCase() === 'id'
  );
  const deptIdx = headers.findIndex(h => h.toLowerCase().includes('dept'));
  const jobIdx = headers.findIndex(h => 
    h.toLowerCase().includes('job') || 
    h.toLowerCase().includes('title') ||
    h.toLowerCase().includes('role')
  );
  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));

  const dateColumns = [];
  headers.forEach((h, idx) => {
    const dateMatch = h.match(/^(\d{1,2})-([A-Za-z]{3})$/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const monthStr = dateMatch[2].toLowerCase();
      const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const month = months[monthStr];
      if (month !== undefined && day >= 1 && day <= 31) {
        const date = new Date(year, month, day);
        dateColumns.push({ 
          index: idx, 
          date: date.toISOString().split('T')[0]
        });
      }
    }
  });

  if (empIdIdx === -1 && nameIdx === -1) {
    throw new Error('Could not find employee identifier column. Expected "EMP_ID" or "NAME" column.');
  }
  if (dateColumns.length === 0) {
    throw new Error('Could not find date columns. Expected format like "6-Oct", "7-Oct", etc.');
  }

  const employees = [];
  const shifts = [];

  rows.slice(1).forEach(row => {
    const empId = empIdIdx >= 0 ? row[empIdIdx]?.toString().trim() : '';
    const name = nameIdx >= 0 ? row[nameIdx]?.toString().trim() : '';
    const dept = deptIdx >= 0 ? row[deptIdx]?.toString().trim() : '';
    const job = jobIdx >= 0 ? row[jobIdx]?.toString().trim() : '';

    if (!empId && !name) return;
    if (name?.toLowerCase().includes('last update')) return;

    const empInfo = {
      employee_id: empId,
      full_name: name,
      department_name: dept,
      role: job
    };
    
    if (!employees.find(e => e.employee_id === empId)) {
      employees.push(empInfo);
    }

    dateColumns.forEach(dc => {
      let code = row[dc.index]?.toString().trim() || '';
      code = code.replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, '').trim();
      
      const blacklist = ['', ' ', ',', '.', '-', '?', 'UNDEFINED', 'NULL', '#VALUE!', '#REF!', '#N/A'];
      if (code && !blacklist.includes(code.toUpperCase())) {
        shifts.push({
          employee_id: empId,
          employee_name: name,
          date: dc.date,
          shift_code: code.toUpperCase().trim()
        });
      }
    });
  });

  return { employees, shifts };
}

export async function importShiftCodes(spreadsheetUrl, sheetName = 'Sheet1') {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL');
  }

  const rows = await fetchSheetData(spreadsheetId, sheetName);
  const shiftCodes = parseShiftCodesFromSheet(rows);
  
  const { ShiftCode } = await import('./entities');
  const existing = await ShiftCode.list();
  const existingCodes = new Set(existing.map(s => s.code.toUpperCase()));
  
  let created = 0;
  let updated = 0;
  
  for (const sc of shiftCodes) {
    if (existingCodes.has(sc.code.toUpperCase())) {
      const existingItem = existing.find(e => e.code.toUpperCase() === sc.code.toUpperCase());
      if (existingItem) {
        await ShiftCode.update(existingItem.id, sc);
        updated++;
      }
    } else {
      await ShiftCode.create(sc);
      created++;
    }
  }
  
  return { created, updated, total: shiftCodes.length };
}

export async function importStaffMaster(spreadsheetUrl, sheetName = 'Sheet1') {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL');
  }

  const rows = await fetchSheetData(spreadsheetId, sheetName);
  const staffList = parseStaffFromSheet(rows);
  
  const { Employee, Department } = await import('./entities');
  const existingEmployees = await Employee.list();
  const existingDepts = await Department.list();
  
  const empByBusinessId = {};
  existingEmployees.forEach(e => {
    if (e.employee_id) empByBusinessId[e.employee_id] = e;
  });
  
  const deptByName = {};
  existingDepts.forEach(d => {
    const normalized = d.name.toLowerCase().replace(/\s+/g, ' ').trim();
    deptByName[normalized] = d;
  });
  
  let created = 0;
  let updated = 0;
  let deptsCreated = 0;
  
  for (const staff of staffList) {
    let deptName = staff.department_name?.toLowerCase().replace(/\s+/g, ' ').trim() || '';
    if (deptName.includes(' - ')) {
      deptName = deptName.split(' - ')[0].trim();
    }
    
    let dept = deptByName[deptName];
    if (!dept && deptName) {
      const cleanName = staff.department_name.split(' - ')[0].trim();
      dept = await Department.create({ 
        name: cleanName, 
        is_active: true,
        published_months: []
      });
      deptByName[deptName] = dept;
      deptsCreated++;
    }
    
    const empData = {
      employee_id: staff.employee_id,
      full_name: staff.full_name,
      role: staff.role,
      department_id: dept?.id || null,
      contract_type: staff.contract_type,
      is_active: true
    };
    
    if (empByBusinessId[staff.employee_id]) {
      await Employee.update(empByBusinessId[staff.employee_id].id, empData);
      updated++;
    } else {
      await Employee.create(empData);
      created++;
    }
  }
  
  return { created, updated, deptsCreated, total: staffList.length };
}

export async function importMonthlyRoster(spreadsheetUrl, sheetName = 'Sheet1', year = new Date().getFullYear()) {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL');
  }

  const rows = await fetchSheetData(spreadsheetId, sheetName);
  const { employees, shifts } = parseRosterGridFromSheet(rows, year);
  
  const { Employee, Shift, Department } = await import('./entities');
  const existingEmployees = await Employee.list();
  const existingShifts = await Shift.list();
  const existingDepts = await Department.list();
  
  const empByBusinessId = {};
  existingEmployees.forEach(e => {
    if (e.employee_id) empByBusinessId[e.employee_id] = e;
  });
  
  const deptByName = {};
  existingDepts.forEach(d => {
    const normalized = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    deptByName[normalized] = d;
  });
  
  const shiftKey = (empId, date) => `${empId}_${date}`;
  const existingShiftMap = {};
  existingShifts.forEach(s => {
    existingShiftMap[shiftKey(s.employee_id, s.date)] = s;
  });
  
  let empsCreated = 0;
  let shiftsCreated = 0;
  let shiftsUpdated = 0;
  
  for (const empInfo of employees) {
    if (!empByBusinessId[empInfo.employee_id]) {
      let deptName = empInfo.department_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      let dept = deptByName[deptName];
      
      if (!dept && empInfo.department_name) {
        for (const [key, d] of Object.entries(deptByName)) {
          if (key.includes(deptName) || deptName.includes(key)) {
            dept = d;
            break;
          }
        }
      }
      
      const newEmp = await Employee.create({
        employee_id: empInfo.employee_id,
        full_name: empInfo.full_name,
        role: empInfo.role,
        department_id: dept?.id || null,
        is_active: true
      });
      empByBusinessId[empInfo.employee_id] = newEmp;
      empsCreated++;
    }
  }
  
  for (const shift of shifts) {
    const emp = empByBusinessId[shift.employee_id];
    if (!emp) {
      console.warn(`Employee not found: ${shift.employee_id}`);
      continue;
    }
    
    const key = shiftKey(emp.id, shift.date);
    const existing = existingShiftMap[key];
    
    if (existing) {
      if (existing.shift_code !== shift.shift_code) {
        await Shift.update(existing.id, { shift_code: shift.shift_code });
        shiftsUpdated++;
      }
    } else {
      await Shift.create({
        employee_id: emp.id,
        department_id: emp.department_id,
        date: shift.date,
        shift_code: shift.shift_code,
        is_published: false
      });
      shiftsCreated++;
    }
  }
  
  return { 
    empsCreated, 
    shiftsCreated, 
    shiftsUpdated, 
    totalEmployees: employees.length,
    totalShifts: shifts.length 
  };
}
