import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sybbwgxcgfkqqhriebxh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5YmJ3Z3hjZ2ZrcXFocmllYnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTk4MTEsImV4cCI6MjA4NTE3NTgxMX0.RfYEVezwVH-Una1CfV1LI8dNOupiRqWa_duXBRvKxCM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TABLES = {
  HOURS: "hours_table_46fcc8fd",
  STAFF: "staff_masterlist_46fcc8fd",
  SHIFTS: "roster_shifts_46fcc8fd",
  KV_STORE: "kv_store_46fcc8fd"
};

// 28-day period normalization - anchor date is 2025-12-29 (Monday)
const PERIOD_ANCHOR = new Date('2025-12-29');
const PERIOD_DAYS = 28;

export function normalizeToPeriodStart(dateInput) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diffMs = date.getTime() - PERIOD_ANCHOR.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const periodIndex = Math.floor(diffDays / PERIOD_DAYS);
  const periodStartMs = PERIOD_ANCHOR.getTime() + (periodIndex * PERIOD_DAYS * 24 * 60 * 60 * 1000);
  return new Date(periodStartMs).toISOString().split('T')[0];
}

export function getPeriodEnd(periodStart) {
  const start = new Date(periodStart);
  start.setDate(start.getDate() + 27);
  return start.toISOString().split('T')[0];
}

async function queryTable(tableName, action, options = {}) {
  try {
    let query;
    
    switch (action) {
      case 'list': {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        return data || [];
      }
      
      case 'get': {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', options.id).single();
        if (error) throw error;
        return data;
      }
      
      case 'filter': {
        query = supabase.from(tableName).select('*');
        if (options.filters) {
          for (const [key, value] of Object.entries(options.filters)) {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }
      
      case 'create': {
        const { data, error } = await supabase.from(tableName).insert(options.data).select().single();
        if (error) throw error;
        return data;
      }
      
      case 'update': {
        const { data, error } = await supabase.from(tableName).update(options.data).eq('id', options.id).select().single();
        if (error) throw error;
        return data;
      }
      
      case 'delete': {
        const { error } = await supabase.from(tableName).delete().eq('id', options.id);
        if (error) throw error;
        return { success: true };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    console.error(`Supabase ${action} error on ${tableName}:`, err);
    throw err;
  }
}

export const SupabaseShiftCode = {
  async list() {
    return queryTable(TABLES.HOURS, 'list');
  },
  async get(id) {
    return queryTable(TABLES.HOURS, 'get', { id });
  },
  async create(data) {
    return queryTable(TABLES.HOURS, 'create', { data });
  },
  async update(id, data) {
    return queryTable(TABLES.HOURS, 'update', { id, data });
  },
  async delete(id) {
    return queryTable(TABLES.HOURS, 'delete', { id });
  },
  async filter(filters) {
    return queryTable(TABLES.HOURS, 'filter', { filters });
  }
};

export const SupabaseEmployee = {
  async list() {
    return queryTable(TABLES.STAFF, 'list');
  },
  async get(id) {
    return queryTable(TABLES.STAFF, 'get', { id });
  },
  async create(data) {
    return queryTable(TABLES.STAFF, 'create', { data });
  },
  async update(id, data) {
    return queryTable(TABLES.STAFF, 'update', { id, data });
  },
  async delete(id) {
    return queryTable(TABLES.STAFF, 'delete', { id });
  },
  async filter(filters) {
    return queryTable(TABLES.STAFF, 'filter', { filters });
  }
};

export const SupabaseShift = {
  async list() {
    return queryTable(TABLES.SHIFTS, 'list');
  },
  async get(id) {
    return queryTable(TABLES.SHIFTS, 'get', { id });
  },
  async create(data) {
    return queryTable(TABLES.SHIFTS, 'create', { data });
  },
  async update(id, data) {
    return queryTable(TABLES.SHIFTS, 'update', { id, data });
  },
  async delete(id) {
    return queryTable(TABLES.SHIFTS, 'delete', { id });
  },
  async filter(filters) {
    return queryTable(TABLES.SHIFTS, 'filter', { filters });
  }
};

export const SupabaseKV = {
  async get(key) {
    const results = await queryTable(TABLES.KV_STORE, 'filter', { filters: { key } });
    return results?.[0]?.value || null;
  },
  async set(key, value) {
    const existing = await queryTable(TABLES.KV_STORE, 'filter', { filters: { key } });
    if (existing?.length > 0) {
      return queryTable(TABLES.KV_STORE, 'update', { id: existing[0].id, data: { value } });
    }
    return queryTable(TABLES.KV_STORE, 'create', { data: { key, value } });
  }
};

// ============================================
// ROSTER SHIFTS - PERIOD-BASED OPERATIONS
// ============================================

export const RosterShifts = {
  async loadByPeriod(startDate, ward = null) {
    const periodStart = normalizeToPeriodStart(startDate);
    const periodEnd = getPeriodEnd(periodStart);
    
    try {
      let query = supabase
        .from(TABLES.SHIFTS)
        .select('*')
        .eq('period_start', periodStart);
      
      if (ward && ward !== 'All Departments') {
        query = query.eq('planned_ward', ward);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('RosterShifts.loadByPeriod error:', error);
        return {
          success: false,
          error: error.message,
          step: 'load_shifts',
          period_start: periodStart,
          period_end: periodEnd
        };
      }
      
      return {
        success: true,
        period_start: periodStart,
        period_end: periodEnd,
        ward: ward || 'All Departments',
        shift_count: data?.length || 0,
        shifts: data || []
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        step: 'load_shifts',
        period_start: periodStart
      };
    }
  },

  async saveForPeriod(startDate, ward, shifts) {
    const periodStart = normalizeToPeriodStart(startDate);
    const periodEnd = getPeriodEnd(periodStart);
    
    const diagnostics = {
      success: false,
      period_start: periodStart,
      period_end: periodEnd,
      ward,
      deleted_count: 0,
      upserted_count: 0,
      skipped_empty: 0,
      bad_keys: [],
      missing_staff_count: 0,
      errors: []
    };
    
    try {
      // Step 1: Delete existing shifts for period/ward
      let deleteQuery = supabase
        .from(TABLES.SHIFTS)
        .delete()
        .eq('period_start', periodStart);
      
      if (ward && ward !== 'All Departments') {
        deleteQuery = deleteQuery.eq('planned_ward', ward);
      }
      
      const { error: deleteError, count: deletedCount } = await deleteQuery;
      
      if (deleteError) {
        diagnostics.errors.push(`Delete failed: ${deleteError.message}`);
        diagnostics.step = 'delete_existing';
        return diagnostics;
      }
      
      diagnostics.deleted_count = deletedCount || 0;
      
      // Step 2: Insert new shifts
      const rowsToInsert = [];
      
      for (const shift of shifts) {
        if (!shift.employee_id || !shift.shift_date) {
          diagnostics.bad_keys.push(`Missing employee_id or shift_date: ${JSON.stringify(shift)}`);
          continue;
        }
        
        // Skip empty shift codes for non-custom shifts
        if (!shift.is_custom && (!shift.shift_code || shift.shift_code.trim() === '')) {
          diagnostics.skipped_empty++;
          continue;
        }
        
        rowsToInsert.push({
          period_start: periodStart,
          shift_date: shift.shift_date,
          employee_id: shift.employee_id,
          planned_ward: shift.planned_ward || ward || 'UNASSIGNED',
          worked_ward: shift.worked_ward || null,
          staff_group: shift.staff_group || '',
          shift_code: shift.is_custom ? null : (shift.shift_code?.toUpperCase().trim() || null),
          slot: shift.slot || 1,
          is_custom: shift.is_custom || false,
          start_time: shift.start_time || null,
          end_time: shift.end_time || null,
          custom_hours: shift.custom_hours || null
        });
      }
      
      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from(TABLES.SHIFTS)
          .insert(rowsToInsert);
        
        if (insertError) {
          diagnostics.errors.push(`Insert failed: ${insertError.message}`);
          diagnostics.step = 'insert_shifts';
          return diagnostics;
        }
        
        diagnostics.upserted_count = rowsToInsert.length;
      }
      
      diagnostics.success = true;
      return diagnostics;
      
    } catch (err) {
      diagnostics.errors.push(err.message);
      diagnostics.step = 'save_exception';
      return diagnostics;
    }
  }
};

// ============================================
// HOURS TABLE - SHIFT CODE LOOKUP
// ============================================

export const HoursTable = {
  _cache: null,
  _cacheTime: null,
  
  async getAll() {
    // Cache for 5 minutes
    const now = Date.now();
    if (this._cache && this._cacheTime && (now - this._cacheTime < 300000)) {
      return this._cache;
    }
    
    const { data, error } = await supabase.from(TABLES.HOURS).select('*');
    
    if (error) {
      console.error('HoursTable.getAll error:', error);
      return [];
    }
    
    this._cache = data || [];
    this._cacheTime = now;
    return this._cache;
  },
  
  async getLookupMap() {
    const hours = await this.getAll();
    const map = {};
    
    for (const h of hours) {
      const code = (h.shift_code || h.code || '').toUpperCase().trim();
      if (code) {
        map[code] = {
          hours: parseFloat(h.hours) || 0,
          is_worked: ['Y', 'TRUE', 'WORKED', '1'].includes(String(h.is_worked || '').toUpperCase()),
          finance_tag: h.finance_tag || '',
          category: h.category || '',
          day_night: h.day_night || '',
          descriptor: h.descriptor || h.name || code
        };
      }
    }
    
    return map;
  },
  
  invalidateCache() {
    this._cache = null;
    this._cacheTime = null;
  }
};

// ============================================
// STAFF MASTERLIST
// ============================================

export const StaffMaster = {
  _cache: null,
  _cacheTime: null,
  
  async getAll() {
    const now = Date.now();
    if (this._cache && this._cacheTime && (now - this._cacheTime < 300000)) {
      return this._cache;
    }
    
    const { data, error } = await supabase.from(TABLES.STAFF).select('*');
    
    if (error) {
      console.error('StaffMaster.getAll error:', error);
      return [];
    }
    
    this._cache = data || [];
    this._cacheTime = now;
    return this._cache;
  },
  
  async getLookupMap() {
    const staff = await this.getAll();
    const map = {};
    
    for (const s of staff) {
      const id = s.employee_id || s.id;
      if (id) {
        map[id] = {
          name: s.name || s.full_name || '',
          job_title: s.job_title || s.role || '',
          department: s.department || '',
          contract_type: s.contract_type || '',
          contracted_hours: parseFloat(s.contracted_hours) || 0
        };
      }
    }
    
    return map;
  },
  
  invalidateCache() {
    this._cache = null;
    this._cacheTime = null;
  }
};

// ============================================
// FINANCIAL REPORT HELPER FUNCTIONS
// ============================================

const norm = (s) => String(s ?? "").trim();
const up = (s) => norm(s).toUpperCase();

function parseBoolishIsWorked(v) {
  const x = up(v);
  if (!x) return true;
  return x === "Y" || x === "YES" || x === "TRUE" || x === "WORKED" || x === "1";
}

function getHoursForRow(row, hoursMap) {
  if (row.is_custom) return Number(row.custom_hours ?? 0) || 0;
  const code = up(row.shift_code);
  if (!code) return 0;
  const meta = hoursMap[code];
  return Number(meta?.hours ?? 0) || 0;
}

function inferDayNightFromTimes(start, end) {
  const s = norm(start).slice(0, 5);
  const e = norm(end).slice(0, 5);
  if (!s || !e) return "DAY";
  if (s >= "19:00" || e <= "08:00") return "NIGHT";
  return "DAY";
}

function classifyLeave(codeUpper, meta) {
  const financeTag = up(meta?.finance_tag);
  const cat = up(meta?.category);
  
  const isSick = codeUpper.includes("SICK") || financeTag.includes("SICK") || cat.includes("SICK");
  const isUnpaid = codeUpper.includes("UNPL") || financeTag.includes("UNPAID") || cat.includes("UNPAID");
  const isHO = codeUpper === "HO" || financeTag.includes("HO") || cat.includes("HO");
  const isPB = codeUpper === "PB" || financeTag.includes("PB") || cat.includes("PB");
  
  return { isSick, isUnpaid, isHO, isPB };
}

// ============================================
// WARD FINANCIAL PROCESSOR (DB-first)
// ============================================

export function processWardFinancial(shiftRows, ward, hoursMap, staffRecords) {
  const WARD = up(ward);

  const wardStaff = new Set();
  for (const r of shiftRows) {
    if (up(r.planned_ward) === WARD) wardStaff.add(norm(r.employee_id));
  }

  const byEmp = new Map();
  for (const r of shiftRows) {
    const empId = norm(r.employee_id);
    if (!wardStaff.has(empId)) continue;
    const arr = byEmp.get(empId) || [];
    arr.push(r);
    byEmp.set(empId, arr);
  }

  const staffById = new Map();
  for (const s of staffRecords) staffById.set(norm(s.employee_id), s);

  const out = [];

  for (const [empId, rows] of byEmp.entries()) {
    const staff = staffById.get(empId);
    const name = norm(staff?.name) || empId;
    const role = norm(staff?.job_title) || "";
    let contracted = 0;

    let rosteredToWardHours = 0;
    let actual = 0;
    let shiftCount = 0;
    let ldCount = 0;
    let nCount = 0;
    let sickCount = 0;
    let sickHours = 0;
    let unplCount = 0;
    let unplHours = 0;
    let hoHours = 0;
    let pbHours = 0;
    let redeployedOutHours = 0;
    let netWardHours = 0;

    for (const r of rows) {
      const plannedWard = up(r.planned_ward);
      const effectiveWorkedWard = up(r.worked_ward) || plannedWard;
      const hours = getHoursForRow(r, hoursMap);

      const codeUpper = up(r.shift_code);
      const meta = codeUpper ? hoursMap[codeUpper] : undefined;
      const isWorked = r.is_custom ? true : parseBoolishIsWorked(meta?.is_worked);

      if (isWorked && hours > 0) {
        shiftCount += 1;
        const dn = r.is_custom ? inferDayNightFromTimes(r.start_time, r.end_time) : up(meta?.day_night);
        if (dn.includes("NIGHT")) nCount += 1;
        else ldCount += 1;
      }

      if (isWorked) actual += hours;
      if (plannedWard === WARD && isWorked) rosteredToWardHours += hours;
      if (effectiveWorkedWard === WARD && isWorked) netWardHours += hours;
      if (plannedWard === WARD && effectiveWorkedWard !== WARD && isWorked) redeployedOutHours += hours;

      if (!r.is_custom && codeUpper) {
        const { isSick, isUnpaid, isHO, isPB } = classifyLeave(codeUpper, meta);
        if (isSick) { sickCount += 1; sickHours += hours; }
        if (isUnpaid) { unplCount += 1; unplHours += hours; }
        if (isHO) hoHours += hours;
        if (isPB) pbHours += hours;
      }
    }

    const toilBalance = hoHours - pbHours;
    const wardBalance = netWardHours - rosteredToWardHours;

    out.push({
      employeeId: empId,
      name,
      role,
      contracted,
      rosteredToWardHours,
      actual,
      shiftCount,
      ldCount,
      nCount,
      sickCount,
      sickHours,
      unplCount,
      unplHours,
      hoHours,
      pbHours,
      toilBalance,
      redeployedOutHours,
      netWardHours,
      wardBalance
    });
  }

  return out;
}

// ============================================
// FINANCIAL REPORT GENERATOR
// ============================================

export async function generateFinancialReport(startDate) {
  const periodStart = normalizeToPeriodStart(startDate);
  const periodEnd = getPeriodEnd(periodStart);
  
  const result = {
    success: false,
    period_start: periodStart,
    period_end: periodEnd,
    diagnostics: {
      shiftRowsLoaded: 0,
      staffLoaded: 0,
      hoursCodesLoaded: 0,
      missingHoursCodes: [],
      customRowsCount: 0
    },
    wards: {},
    grandTotals: {}
  };
  
  try {
    const hoursMap = await HoursTable.getLookupMap();
    result.diagnostics.hoursCodesLoaded = Object.keys(hoursMap).length;
    
    if (result.diagnostics.hoursCodesLoaded === 0) {
      result.error = 'Hours table is empty';
      result.step = 'load_hours_table';
      return result;
    }
    
    const staffRecords = await StaffMaster.getAll();
    result.diagnostics.staffLoaded = staffRecords.length;
    
    const shiftsResult = await RosterShifts.loadByPeriod(startDate);
    
    if (!shiftsResult.success) {
      result.error = shiftsResult.error;
      result.step = 'load_shifts';
      return result;
    }
    
    const shifts = shiftsResult.shifts;
    result.diagnostics.shiftRowsLoaded = shifts.length;
    result.diagnostics.customRowsCount = shifts.filter(s => s.is_custom).length;

    const missingCodes = new Set();
    for (const s of shifts) {
      if (!s.is_custom && s.shift_code) {
        const code = up(s.shift_code);
        if (!hoursMap[code]) missingCodes.add(code);
      }
    }
    result.diagnostics.missingHoursCodes = Array.from(missingCodes).slice(0, 20);

    const wards = ['ECU', 'WARD 2', 'WARD 3'];
    for (const ward of wards) {
      const staffFinancials = processWardFinancial(shifts, ward, hoursMap, staffRecords);
      result.wards[ward] = staffFinancials;
    }

    result.success = true;
    return result;
    
  } catch (err) {
    result.error = err.message;
    result.step = 'exception';
    return result;
  }
}
