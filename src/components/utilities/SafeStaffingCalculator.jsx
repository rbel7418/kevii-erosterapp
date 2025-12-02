
import React from "react";
import { Shift, Employee, Role, Department } from "@/entities/all";
import { WardCensus } from "@/entities/WardCensus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Users, Shield, Sun as SunIcon, Moon as MoonIcon, LayoutGrid, Lock, LockOpen } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isValid as isValidDate } from "date-fns";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { emailPrefix } from "@/components/utils/strings";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/entities/User";

function dStr(date) {
  try { return format(date, "yyyy-MM-dd"); } catch { return ""; }
}

// Shift code helpers (robust token parsing)
function codeTokens(code) {
  const s = String(code || "").toUpperCase().trim();
  if (!s) return new Set();
  return new Set(s.split(/[^A-Z0-9]+/).filter(Boolean));
}
function isCommandShift(code) {
  const t = codeTokens(code);
  return t.has("DM") || t.has("NIC");
}

// Extend helpers with tokens-based rules
function hasTokenSet(code, arr) {
  const t = codeTokens(code);
  return arr.some(tok => t.has(String(tok).toUpperCase()));
}
function isHCAByCode(code) {
  return codeTokens(code).has("HCA");
}
// Override RN detectors to exclude HCA-coded shifts even if L/E/LD/LN present
function isRNDayByCode(code) {
  const t = codeTokens(code);
  if (t.has("LN") || t.has("HCA")) return false; // Exclude night shifts and HCA shifts
  return t.has("E") || t.has("L") || t.has("LD");
}
function isRNNightByCode(code) {
  const t = codeTokens(code);
  if (t.has("HCA")) return false; // Exclude HCA shifts
  return t.has("LN");
}
// Special floater codes list (from spec)
const FLOATER_AREAS = new Set(["BCU", "ECU", "HCA", "OP", "POA", "W2", "W3"]);
function isFloaterSpecialByCode(code) {
  const t = codeTokens(code);
  const hasShift = t.has("E") || t.has("L") || t.has("LD") || t.has("LN");
  const hasArea = Array.from(FLOATER_AREAS).some(a => t.has(a));
  return hasShift && hasArea;
}
function isOutreachByCodeOrDept(code, deptName) {
  const t = codeTokens(code);
  const outreachCode = t.has("OP") || t.has("POA") || t.has("BCU") || t.has("ECU");
  const dn = String(deptName || "").toLowerCase();
  const outreachDept = /ecu|enhanced\s*care/i.test(dn);
  return outreachCode || outreachDept;
}

// Original helpers, possibly still used or need to be compatible
function isFloater(code, floater_group) {
  if (floater_group) return true;
  const c = String(code || "").toUpperCase();
  return /FLO|FLT|FLOAT/.test(c);
}
function isOvernight(start, end) {
  if (!start || !end) return false;
  const st = String(start), et = String(end);
  return st && et && et < st;
}
function isRGNRole(roleName) {
  const n = String(roleName || "").toLowerCase();
  return n.includes("rgn") || n.includes("registered nurse") || (n.includes("nurse") && !n.includes("charge") && !n.includes("assistant"));
}
function isHCARole(roleName) {
  const n = String(roleName || "").toLowerCase();
  return n.includes("hca") || n.includes("assistant");
}

export default function SafeStaffingCalculator() {
  // Load data
  const [employees, setEmployees] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [shifts, setShifts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const [emps, rs, shs] = await Promise.all([Employee.list(), Role.list(), Shift.list()]);
      setEmployees(emps || []);
      setRoles(rs || []);
      setShifts(shs || []);
      setLoading(false);
    })();
  }, []);

  // Departments + selected ward
  const [departments, setDepartments] = React.useState([]);
  const [deptId, setDeptId] = React.useState(null); // null => All wards
  React.useEffect(() => {
    (async () => {
      const list = await Department.list();
      setDepartments(list || []);
      if ((list || []).length && deptId === null) setDeptId(list[0].id); // default first ward
    })();
  }, [deptId]); // Added deptId to deps to ensure default is set if not already

  // Current user (for locking metadata)
  const [me, setMe] = React.useState(null);
  React.useEffect(() => { User.me().then(setMe).catch(() => setMe(null)); }, []);

  // Safe staffing calculator state
  const [ratio, setRatio] = React.useState(4); // 4:1 patients per RN
  const [monthAnchor, setMonthAnchor] = React.useState(new Date());
  const monthStart = React.useMemo(() => startOfMonth(monthAnchor), [monthAnchor]);
  const monthEnd = React.useMemo(() => endOfMonth(monthAnchor), [monthAnchor]);
  const days = React.useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  // Replace patients state with Day/Night separates
  const [patientsDay, setPatientsDay] = React.useState({});
  const [patientsNight, setPatientsNight] = React.useState({});

  // NEW: multi-ward ad-hoc inputs (not stored; used to compute totals)
  const [wardInputsDay, setWardInputsDay] = React.useState({});
  const [wardInputsNight, setWardInputsNight] = React.useState({});

  // NEW: date-range defaults to today (per spec)
  const today = React.useMemo(() => new Date(), []);
  const [rangeStart, setRangeStart] = React.useState(() => today);
  const [rangeEnd, setRangeEnd] = React.useState(() => today);
  const [rangeLocked, setRangeLocked] = React.useState(false);

  // NEW: parameters and toggles (kept)
  const [hcaCredit, setHcaCredit] = React.useState(0.5); // HCA contributes as partial RN credit
  const [patientsDefault, setPatientsDefault] = React.useState(0);
  const [manualPatients, setManualPatients] = React.useState(true);

  // Census map keyed by yyyy-MM-dd (includes locked_by/date if available)
  const [census, setCensus] = React.useState({}); // { [date]: { id, patients_day, patients_night, locked, locked_by, locked_date } }

  // Add ECU census state to support outreach rule
  const [ecuPatientsDayByDate, setEcuPatientsDayByDate] = React.useState({});
  const [ecuPatientsNightByDate, setEcuPatientsNightByDate] = React.useState({});

  const monthKey = React.useMemo(() => format(monthStart, "yyyy-MM"), [monthStart]);

  // Derive ECU department (for outreach rule) and three ward rows for inputs
  const ecuDept = React.useMemo(() => {
    return (departments || []).find(d => String(d.name || "").toLowerCase().includes("ecu")) || null;
  }, [departments]);
  const wardInputRows = React.useMemo(() => {
    // Prefer Ward 1..3 when present, else first three that include "ward"
    const wards = (departments || []).filter(d => /ward/i.test(String(d.name || "")));
    // Sort by name natural
    wards.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const top3 = wards.slice(0, 3);
    // Ensure ecuDept is included if it's not already in top3 and it exists
    return [...top3, ...(ecuDept && !top3.some(d => d.id === ecuDept.id) ? [ecuDept] : [])].filter(Boolean); // Filter out any null/undefined
  }, [departments, ecuDept]);

  // Update loadCensus to also derive ECU patients map (independent of selected ward)
  const loadCensus = React.useCallback(async () => {
    if (!deptId) { // Handles deptId being null ("All wards") or empty string
      setCensus({});
      setPatientsDay({});
      setPatientsNight({});
      // Do not touch ECU maps here; they are handled by a separate effect
      return;
    }
    const rows = await WardCensus.list();
    const filtered = (rows || []).filter(r => {
      const d = String(r.date || "");
      const matchesMonth = d.startsWith(monthKey);
      const matchesDept = r.department_id === deptId;
      return matchesMonth && matchesDept;
    });
    const map = {};
    filtered.forEach(r => {
      const k = String(r.date);
      map[k] = {
        id: r.id,
        patients_day: typeof r.patients_day === "number" ? r.patients_day : undefined,
        patients_night: typeof r.patients_night === "number" ? r.patients_night : undefined,
        locked: !!r.locked,
        locked_by: r.locked_by,
        locked_date: r.locked_date,
      };
    });
    setCensus(map);

    // Seed UI inputs from census for selected ward (only overwrite if defined)
    setPatientsDay(prev => {
      const next = { ...prev };
      days.forEach(d => {
        const k = dStr(d);
        if (map[k] && typeof map[k].patients_day === "number") {
          next[k] = String(map[k].patients_day);
        } else if (map[k] && typeof map[k].patients_day === "undefined") {
          // If value explicitly undefined in census, ensure it's empty in UI
          next[k] = "";
        }
      });
      return next;
    });
    setPatientsNight(prev => {
      const next = { ...prev };
      days.forEach(d => {
        const k = dStr(d);
        if (map[k] && typeof map[k].patients_night === "number") {
          next[k] = String(map[k].patients_night);
        } else if (map[k] && typeof map[k].patients_night === "undefined") {
          // If value explicitly undefined in census, ensure it's empty in UI
          next[k] = "";
        }
      });
      return next;
    });
  }, [monthKey, deptId, days]); // removed ecuDept from deps

  React.useEffect(() => {
    // Only load if deptId is not null, otherwise `loadCensus` will clear state.
    // If deptId is null, it means "All Wards", for which there's no single census to load.
    if (deptId !== null) {
      loadCensus();
    } else {
      // Clear census state when "All Wards" is selected
      setCensus({});
      setPatientsDay({});
      setPatientsNight({});
      // ECU state clearing is now handled by its dedicated effect
    }
  }, [monthKey, deptId, loadCensus]);


  // ADD: dedicated ECU loader AFTER ecuDept is initialized
  React.useEffect(() => {
    let cancelled = false;

    const fetchEcuCensus = async () => {
      // If no ECU ward found, clear outreach control maps
      if (!ecuDept?.id) {
        if (!cancelled) {
          setEcuPatientsDayByDate({});
          setEcuPatientsNightByDate({});
        }
        return;
      }

      const rows = await WardCensus.list();
      const ecuRows = (rows || []).filter(
        r => String(r.date || "").startsWith(monthKey) && r.department_id === ecuDept.id
      );

      const dMap = {};
      const nMap = {};
      days.forEach(d => { const k = dStr(d); dMap[k] = undefined; nMap[k] = undefined; }); // Initialize with undefined
      ecuRows.forEach(r => {
        const k = String(r.date);
        if (typeof r.patients_day === "number") dMap[k] = r.patients_day;
        if (typeof r.patients_night === "number") nMap[k] = r.patients_night;
      });

      if (!cancelled) {
        setEcuPatientsDayByDate(dMap);
        setEcuPatientsNightByDate(nMap);
      }
    };

    fetchEcuCensus();

    return () => { cancelled = true; };
  }, [ecuDept, monthKey, days]);

  // Helper: totals from ad-hoc ward inputs
  const adhocTotalDay = React.useMemo(() => {
    return wardInputRows.reduce((sum, d) => sum + Number(wardInputsDay[d.id] || 0), 0);
  }, [wardInputRows, wardInputsDay]);
  const adhocTotalNight = React.useMemo(() => {
    return wardInputRows.reduce((sum, d) => sum + Number(wardInputsNight[d.id] || 0), 0);
  }, [wardInputRows, wardInputsNight]);


  // Helper to bulk-fill patients for all days (both Day and Night)
  // FIX: avoid referencing saveRangeToCensus before initialization in deps.
  // Defer the call so it runs after state updates, and remove saveRangeToCensus from dependency array.
  const applyPatientsToAll = React.useCallback(() => {
    if (!deptId) return; // Cannot fill all days for "All Wards" (no single census target)

    const dayVal = String(patientsDefault || 0);
    setPatientsDay(prev => {
      const next = {};
      days.forEach(d => {
        const key = dStr(d);
        if (!census[key]?.locked) { // Don't override locked cells
          next[key] = dayVal;
        } else {
          next[key] = prev[key]; // Keep existing locked value
        }
      });
      return next;
    });
    setPatientsNight(prev => {
      const next = {};
      days.forEach(d => {
        const key = dStr(d);
        if (!census[key]?.locked) { // Don't override locked cells
          next[key] = dayVal;
        } else {
          next[key] = prev[key]; // Keep existing locked value
        }
      });
      return next;
    });
    // Persist after state has been queued, without creating a dependency cycle
    setTimeout(() => {
      if (typeof saveRangeToCensus === "function") {
        saveRangeToCensus();
      }
    }, 0);
  }, [days, patientsDefault, deptId, census]);


  // Save/lock range to WardCensus
  const inRange = React.useCallback((dateObj) => {
    if (!dateObj) return false;
    const t = dateObj.getTime();
    // Normalize rangeStart and rangeEnd to start of day for accurate comparison
    const s = rangeStart ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime() : -Infinity;
    const e = rangeEnd ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()).getTime() : Infinity;
    // Add 1 day to end of range for inclusive comparison (startOfDay for rangeEnd)
    const normalizedEnd = rangeEnd ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59, 999).getTime() : Infinity;
    return t >= s && t <= normalizedEnd;
  }, [rangeStart, rangeEnd]);

  const saveRangeToCensus = React.useCallback(async () => {
    if (!deptId) return; // require a ward to save

    const updates = [];
    for (const d of days) {
      if (!inRange(d)) continue;
      const key = dStr(d);

      const existing = census[key];
      if (existing && existing.locked && rangeLocked) { // If cell is already locked and we are trying to lock it again, skip
        continue;
      } else if (existing && existing.locked && !rangeLocked) {
        // If cell is locked, but we are trying to UNLOCK a range, allow it
        // This means the user explicitly toggled rangeLocked OFF and applies this change
        // Or if manual input changed a cell and rangeLocked is off
        // Continue to build payload to potentially unlock.
      } else if (existing && !existing.locked && rangeLocked) {
        // Cell is not locked, we are trying to lock range, allow it
      } else if (!existing && rangeLocked) {
        // New cell, trying to lock, allow it
      }

      const dayVal = patientsDay[key] !== undefined && patientsDay[key] !== "" ? Number(patientsDay[key]) : null;
      const nightVal = patientsNight[key] !== undefined && patientsNight[key] !== "" ? Number(patientsNight[key]) : null;

      const payload = {
        patients_day: dayVal,
        patients_night: nightVal,
        source: "manual",
        department_id: deptId,
      };

      if (rangeLocked) {
        payload.locked = true;
        payload.locked_by = me?.email || "";
        payload.locked_date = new Date().toISOString();
      } else if (existing && existing.locked && !rangeLocked) {
        // If rangeLocked is false, explicitly unlock only if it was previously locked.
        payload.locked = false;
        payload.locked_by = null;
        payload.locked_date = null;
      } else {
        payload.locked = false; // Default to unlocked if not explicitly locking
        payload.locked_by = null;
        payload.locked_date = null;
      }

      // Check for changes to avoid unnecessary API calls
      const isDayChanged = existing ? existing.patients_day !== dayVal : dayVal !== null;
      const isNightChanged = existing ? existing.patients_night !== nightVal : nightVal !== null;
      // If payload.locked is true, and existing was false OR existing did not exist, it's a change.
      // If payload.locked is false, and existing was true, it's a change.
      const isLockedStatusChanged = existing ? existing.locked !== payload.locked : payload.locked;

      if (!existing && (dayVal !== null || nightVal !== null || payload.locked)) {
        updates.push(WardCensus.create({
          date: key,
          ...payload
        }));
      } else if (existing && (isDayChanged || isNightChanged || isLockedStatusChanged)) {
        updates.push(WardCensus.update(existing.id, payload));
      }
    }
    await Promise.all(updates);
    await loadCensus(); // Reload data after all saves/updates
    // Also trigger ECU census reload if department changes or month changes
    // The dedicated ECU effect handles its own reloading based on its dependencies
  }, [deptId, days, inRange, patientsDay, patientsNight, census, rangeLocked, me, loadCensus]);


  // Submit handler: use ad-hoc totals, apply to range, persist
  const onSubmitPatients = React.useCallback(async () => {
    if (!deptId) {
      alert("Please select a ward to submit patient counts.");
      return;
    }

    const dVal = String(adhocTotalDay);
    const nVal = String(adhocTotalNight);

    const affectedDays = days.filter(d => inRange(d));

    // Update local state for range, respecting locks
    setPatientsDay(prev => {
      const next = { ...prev };
      affectedDays.forEach(d => {
        const key = dStr(d);
        if (census[key]?.locked) return; // Don't modify if locked
        next[key] = dVal;
      });
      return next;
    });
    setPatientsNight(prev => {
      const next = { ...prev };
      affectedDays.forEach(d => {
        const key = dStr(d);
        if (census[key]?.locked) return; // Don't modify if locked
        next[key] = nVal;
      });
      return next;
    });

    // Persist (includes lock flag if toggle is on)
    await saveRangeToCensus();
  }, [adhocTotalDay, adhocTotalNight, days, inRange, census, deptId, saveRangeToCensus]);

  // Clear handler: clears patient counts for the selected range, persists
  const onClearPatients = React.useCallback(async () => {
    if (!deptId) {
      alert("Please select a ward to clear patient counts.");
      return;
    }

    const affectedDays = days.filter(d => inRange(d));
    setPatientsDay(prev => {
      const next = { ...prev };
      affectedDays.forEach(d => {
        const key = dStr(d);
        if (census[key]?.locked) return; // Don't modify if locked
        next[key] = ""; // Clear the input field
      });
      return next;
    });
    setPatientsNight(prev => {
      const next = { ...prev };
      affectedDays.forEach(d => {
        const key = dStr(d);
        if (census[key]?.locked) return; // Don't modify if locked
        next[key] = ""; // Clear the input field
      });
      return next;
    });
    // Persist with nulls (by setting to empty string, saveRangeToCensus converts to null)
    await saveRangeToCensus();
  }, [days, inRange, census, deptId, saveRangeToCensus]);


  // Build role map
  const roleById = React.useMemo(() => {
    const m = {};
    (roles || []).forEach(r => { m[r.id] = r; });
    return m;
  }, [roles]);

  // RN/HCA counts for Day/Night, with department filter if deptId chosen, else aggregate
  const rnDayCountByDate = React.useMemo(() => {
    const map = {};
    days.forEach(d => { map[dStr(d)] = 0; });
    (shifts || []).forEach(s => {
      if (deptId && s.department_id !== deptId) return;
      const key = s.date;
      if (!(key in map)) return;
      const code = String(s.shift_code || "");
      if (isCommandShift(code)) return;
      const r = roleById[s.role_id];
      let isRN = false;
      if (isRNDayByCode(code)) isRN = true;
      else if (isRGNRole(r?.name) && !isHCAByCode(code)) { // Ensure RGN role isn't HCA-coded
        const st = s.start_time || "";
        const et = s.end_time || "";
        const crosses = isOvernight(st, et);
        if (!crosses && (!st || st < "19:00")) isRN = true;
      }
      if (isRN) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [shifts, days, roleById, deptId]);

  const rnNightCountByDate = React.useMemo(() => {
    const map = {};
    days.forEach(d => { map[dStr(d)] = 0; });
    (shifts || []).forEach(s => {
      if (deptId && s.department_id !== deptId) return;
      const key = s.date;
      if (!(key in map)) return;
      const code = String(s.shift_code || "");
      if (isCommandShift(code)) return;
      const r = roleById[s.role_id];
      let isRN = false;
      if (isRNNightByCode(code)) isRN = true;
      else if (isRGNRole(r?.name) && !isHCAByCode(code)) { // Ensure RGN role isn't HCA-coded
        const st = s.start_time || "";
        const et = s.end_time || "";
        const crosses = isOvernight(st, et);
        if (crosses || (!!st && st >= "19:00")) isRN = true;
      }
      if (isRN) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [shifts, days, roleById, deptId]);

  const hcaDayCountByDate = React.useMemo(() => {
    const map = {};
    days.forEach(d => { map[dStr(d)] = 0; });
    (shifts || []).forEach(s => {
      if (deptId && s.department_id !== deptId) return;
      const key = s.date;
      if (!(key in map)) return;
      const code = String(s.shift_code || "");
      const r = roleById[s.role_id];
      const isHCA = isHCARole(r?.name) || isHCAByCode(code);
      if (!isHCA) return;
      const st = s.start_time || "";
      const et = s.end_time || "";
      if (!(st && et && et < st) && (!st || st < "19:00")) {
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [shifts, days, roleById, deptId]);

  const hcaNightCountByDate = React.useMemo(() => {
    const map = {};
    days.forEach(d => { map[dStr(d)] = 0; });
    (shifts || []).forEach(s => {
      if (deptId && s.department_id !== deptId) return;
      const key = s.date;
      if (!(key in map)) return;
      const code = String(s.shift_code || "");
      const r = roleById[s.role_id];
      const isHCA = isHCARole(r?.name) || isHCAByCode(code);
      if (!isHCA) return;
      const st = s.start_time || "";
      const et = s.end_time || "";
      if ((st && et && et < st) || (!!st && st >= "19:00")) {
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [shifts, days, roleById, deptId]);

  // Outreach counts (aggregate; not filtered by dept)
  const outreachDayByDate = React.useMemo(() => {
    const map = {};
    days.forEach(d => { map[dStr(d)] = { rn: 0, hca: 0 }; });
    (shifts || []).forEach(s => {
      const key = s.date;
      if (!(key in map)) return;
      const code = String(s.shift_code || "");
      const deptName = (departments.find(d => d.id === s.department_id) || {}).name;
      if (!isOutreachByCodeOrDept(code, deptName)) return;
      const r = roleById[s.role_id];
      const st = s.start_time || "";
      const et = s.end_time || "";
      const crosses = st && et && et < st;
      if (crosses || (!!st && st >= "19:00")) return; // skip nights here
      if (isHCAByCode(code) || isHCARole(r?.name)) map[key].hca += 1;
      else if (isRNDayByCode(code) || isRGNRole(r?.name)) map[key].rn += 1; // Use isRNDayByCode for code-based RGN day shifts
    });
    return map;
  }, [shifts, days, roleById, departments]);

  const outreachNightByDate = React.useMemo(() => {
    const map = {};
    days.forEach(d => { map[dStr(d)] = { rn: 0, hca: 0 }; });
    (shifts || []).forEach(s => {
      const key = s.date;
      if (!(key in map)) return;
      const code = String(s.shift_code || "");
      const deptName = (departments.find(d => d.id === s.department_id) || {}).name;
      if (!isOutreachByCodeOrDept(code, deptName)) return;
      const r = roleById[s.role_id];
      const st = s.start_time || "";
      const et = s.end_time || "";
      const crosses = st && et && et < st;
      const isNight = crosses || (!!st && st >= "19:00");
      if (!isNight) return;
      if (isHCAByCode(code) || isHCARole(r?.name)) map[key].hca += 1;
      else if (isRNNightByCode(code) || isRGNRole(r?.name)) map[key].rn += 1; // Use isRNNightByCode for code-based RGN night shifts
    });
    return map;
  }, [shifts, days, roleById, departments]);


  // Demand and safety helpers
  const demandByPatients = React.useCallback((p) => {
    const pts = Number(p || 0);
    const r = Number(ratio || 1);
    if (r <= 0) return 0;
    return Math.ceil(pts / r);
  }, [ratio]);

  // Compute safety with outreach rule (include outreach only if ECU patients == 0)
  const safetyDayByDate = React.useMemo(() => {
    const res = {};
    days.forEach(d => {
      const key = dStr(d);
      const rn = rnDayCountByDate[key] || 0;
      const hca = hcaDayCountByDate[key] || 0;
      const pts = Number(patientsDay[key] || 0);
      // Outreach is credited if ECU exists and its patient count for this day is 0.
      const ecuZero = ecuDept ? Number(ecuPatientsDayByDate[key] ?? 0) === 0 : false;
      const outreachContribution = ecuZero ? (outreachDayByDate[key]?.rn || 0) + (outreachDayByDate[key]?.hca || 0) * Number(hcaCredit || 0) : 0;
      const effective = rn + hca * Number(hcaCredit || 0) + outreachContribution;
      const required = pts / Number(ratio || 1);
      res[key] = effective >= required ? "SAFE" : "UNSAFE";
    });
    return res;
  }, [days, rnDayCountByDate, hcaDayCountByDate, patientsDay, ratio, hcaCredit, outreachDayByDate, ecuDept, ecuPatientsDayByDate]);

  const safetyNightByDate = React.useMemo(() => {
    const res = {};
    days.forEach(d => {
      const key = dStr(d);
      const rn = rnNightCountByDate[key] || 0;
      const hca = hcaNightCountByDate[key] || 0;
      const pts = Number(patientsNight[key] || 0);
      // Outreach is credited if ECU exists and its patient count for this night is 0.
      const ecuZero = ecuDept ? Number(ecuPatientsNightByDate[key] ?? 0) === 0 : false;
      const outreachContribution = ecuZero ? (outreachNightByDate[key]?.rn || 0) + (outreachNightByDate[key]?.hca || 0) * Number(hcaCredit || 0) : 0;
      const effective = rn + hca * Number(hcaCredit || 0) + outreachContribution;
      const required = pts / Number(ratio || 1);
      res[key] = effective >= required ? "SAFE" : "UNSAFE";
    });
    return res;
  }, [days, rnNightCountByDate, hcaNightCountByDate, patientsNight, ratio, hcaCredit, outreachNightByDate, ecuDept, ecuPatientsNightByDate]);

  // Month picker (kept)
  const MonthPicker = (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarIcon className="w-4 h-4" />
          {format(monthAnchor, "MMMM yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Calendar mode="single" selected={monthAnchor} onSelect={(d) => d && setMonthAnchor(d)} />
      </PopoverContent>
    </Popover>
  );

  // NEW: Range pickers for applying manual patient entries
  const RangePicker = ({ label, value, onChange, disabled }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled} className="gap-2">
          <CalendarIcon className="w-4 h-4" />
          {value ? format(value, "d MMM yyyy") : "Pick date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Calendar mode="single" selected={value} onSelect={(d) => d && onChange(d)} initialFocus />
      </PopoverContent>
    </Popover>
  );

  // UI: Department selector
  const DepartmentPicker = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">Ward:</span>
      <Select value={deptId || ""} onValueChange={setDeptId}> {/* Use "" for null to make Select happy */}
        <SelectTrigger className="w-56 h-9">
          <SelectValue placeholder="Select ward" />
        </SelectTrigger>
        <SelectContent>
          {/* Note: "All wards" is not a valid selection for census input/display as it has no single census. */}
          {/* So, it's removed from here and selection is forced to a specific ward */}
          {/* <SelectItem value={null}>All wards</SelectItem> */}
          {(departments || []).map(d => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (loading) return <div className="text-slate-600">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Top widget panel */}
      <Card className="shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Safe Staffing Calculator</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {/* Patient count/acuity row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
            <div className="lg:col-span-6 bg-slate-50 rounded-lg p-3">
              <div className="text-sm font-medium text-slate-700 mb-2">Patient count / acuity</div>
              {/* Multi-ward inputs */}
              <div className="space-y-2">
                {wardInputRows.map((wd) => (
                  <div key={wd.id} className="flex items-center gap-3">
                    <div className="w-28 text-sm text-slate-700 truncate">{wd.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Day:</span>
                      <Input
                        value={wardInputsDay[wd.id] ?? ""}
                        onChange={(e) => setWardInputsDay(prev => ({ ...prev, [wd.id]: e.target.value }))}
                        type="number" min={0} className="w-20 h-8"
                        disabled={rangeLocked || !deptId}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Night:</span>
                      <Input
                        value={wardInputsNight[wd.id] ?? ""}
                        onChange={(e) => setWardInputsNight(prev => ({ ...prev, [wd.id]: e.target.value }))}
                        type="number" min={0} className="w-20 h-8"
                        disabled={rangeLocked || !deptId}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2">
                  <div className="text-sm text-slate-700">Patient count total:</div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Day</span>
                      <Input value={adhocTotalDay} readOnly className="w-20 h-8 bg-white" disabled={!deptId} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Night</span>
                      <Input value={adhocTotalNight} readOnly className="w-20 h-8 bg-white" disabled={!deptId} />
                    </div>
                  </div>
                  <Button onClick={onSubmitPatients} className="h-8" disabled={rangeLocked || !deptId}>Submit</Button>
                  <Button variant="outline" onClick={onClearPatients} className="h-8" disabled={rangeLocked || !deptId}>Clear</Button>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Clicking Submit fills the selected date range below with these totals. Clear will empty the cells for that range.
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-50 rounded-lg p-3">
              <div className="text-sm font-medium text-slate-700 mb-2">Date range for manual entries</div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">From:</span>
                  <RangePicker value={rangeStart} onChange={setRangeStart} disabled={rangeLocked || !deptId} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">To:</span>
                  <RangePicker value={rangeEnd} onChange={setRangeEnd} disabled={rangeLocked || !deptId} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rangeLocked} onCheckedChange={setRangeLocked} disabled={!deptId} />
                  <span className="text-sm text-slate-600">Lock range</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                This controls which dates will be populated when you submit patient counts.
              </div>
            </div>
          </div>

          {/* Configuration row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1 */}
            <div className="space-y-3">
              <div className="text-sm text-slate-600">Hospital standard configuration</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Safe ratio:</span>
                <Input
                  type="number"
                  min={1}
                  value={ratio}
                  onChange={(e) => setRatio(Number(e.target.value || 0))}
                  className="w-24 h-9"
                />
                <span className="text-sm text-slate-600">patients per RN</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">HCA weighting:</span>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={1}
                  value={hcaCredit}
                  onChange={(e) => setHcaCredit(Number(e.target.value || 0))}
                  className="w-24 h-9"
                />
                <span className="text-xs text-slate-500">(credit towards RN)</span>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-3">
              <div className="text-sm text-slate-600">Patients</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Default patients:</span>
                <Input
                  type="number"
                  min={0}
                  value={patientsDefault}
                  onChange={(e) => setPatientsDefault(Number(e.target.value || 0))}
                  className="w-24 h-9"
                />
                <Button variant="outline" onClick={applyPatientsToAll} className="h-9" disabled={!deptId}>
                  Fill all days
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={manualPatients} onCheckedChange={setManualPatients} disabled={!deptId} />
                <span className="text-sm text-slate-600">Manual input</span>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-3">
              <div className="text-sm text-slate-600">Date filter & Ward</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Month:</span>
                {MonthPicker}
              </div>
              {DepartmentPicker}
              <div className="text-[11px] text-slate-500">
                The month controls the visible grid; the range decides where your manual patient entries apply.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid view */}
      <div className="overflow-auto">
        <div className="min-w-[980px]">
          {/* Header */}
          <div className="grid border-t border-l border-r" style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(60px,1fr))` }}>
            <div className="bg-emerald-600 text-white px-3 py-2 text-sm font-semibold">DATE</div>
            {days.map(d => {
              const key = dStr(d);
              const isLocked = census[key]?.locked;
              const lockedBy = census[key]?.locked_by;
              return (
                <div key={"h" + key} className="bg-emerald-600 text-white px-2 py-2 text-xs text-center font-semibold border-l border-emerald-500 relative group">
                  {format(d, "dd-MMM")}
                  {isLocked && (
                    <Lock className="w-3 h-3 absolute top-1 right-1 text-emerald-100/70" />
                  )}
                  {isLocked && lockedBy && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      Locked by {emailPrefix(lockedBy)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* DAY section */}
            <div className="bg-white border-b px-3 py-2 font-semibold">DAY</div>
            {days.map(d => <div key={"day-sep" + dStr(d)} className="bg-white border-b border-l px-2 py-2" />)}

            {/* HCA row (day) */}
            <div className="bg-white border-b px-3 py-2 text-sm">HCA</div>
            {days.map(d => (
              <div key={"hcad" + dStr(d)} className="bg-white border-b border-l px-2 py-2 text-center">
                {hcaDayCountByDate[dStr(d)] || 0}
              </div>
            ))}

            {/* Nursing row (day) */}
            <div className="bg-white border-b px-3 py-2 text-sm">Nursing</div>
            {days.map(d => (
              <div key={"rnDay" + dStr(d)} className="bg-white border-b border-l px-2 py-2 text-center">
                {rnDayCountByDate[dStr(d)] || 0}
              </div>
            ))}

            {/* Patients input row (DAY patients) */}
            <div className="bg-slate-50 border-b px-3 py-2 text-sm">Patients</div>
            {days.map(d => {
              const key = dStr(d);
              const isCellLocked = census[key]?.locked;
              return (
                <div key={"pday" + key} className="bg-slate-50 border-b border-l px-2 py-1 flex items-center justify-center">
                  <Input
                    type="number"
                    min={0}
                    value={patientsDay[key] ?? ""}
                    onChange={(e) => {
                      if (!isCellLocked && deptId) { // Only allow changes if not locked and a department is selected
                        setPatientsDay(prev => ({ ...prev, [key]: e.target.value }));
                      }
                    }}
                    onBlur={() => {
                      // Save on blur if manualPatients is enabled, not locked, and a department is selected
                      if (manualPatients && !isCellLocked && deptId) saveRangeToCensus();
                    }}
                    className="h-8 w-16 text-center"
                    disabled={!manualPatients || isCellLocked || !deptId}
                  />
                </div>
              );
            })}

            {/* Demand row (day) */}
            <div className="bg-emerald-50 border-b px-3 py-2 text-sm">Demand (Staff Required)</div>
            {days.map(d => {
              const key = dStr(d);
              const val = demandByPatients(patientsDay[key]);
              return <div key={"dday" + key} className="bg-emerald-50 border-b border-l px-2 py-2 text-center">{val}</div>;
            })}

            {/* Indicator row (day) */}
            <div className="bg-white border-b px-3 py-2 text-sm">Indicator Decision</div>
            {days.map(d => {
              const key = dStr(d);
              const safe = safetyDayByDate[key] === "SAFE";
              return (
                <div key={"iday" + key} className={`border-b border-l px-2 py-2 text-xs text-center ${safe ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {safe ? "Safe" : "Unsafe"}
                </div>
              );
            })}

            {/* NIGHT section */}
            <div className="bg-white border-b px-3 py-2 font-semibold">NIGHT</div>
            {days.map(d => <div key={"night-sep" + dStr(d)} className="bg-white border-b border-l px-2 py-2" />)}

            {/* HCA row (night) */}
            <div className="bg-white border-b px-3 py-2 text-sm">HCA</div>
            {days.map(d => (
              <div key={"hcan" + dStr(d)} className="bg-white border-b border-l px-2 py-2 text-center">
                {hcaNightCountByDate[dStr(d)] || 0}
              </div>
            ))}

            {/* Nursing row (night) */}
            <div className="bg-white border-b px-3 py-2 text-sm">Nursing</div>
            {days.map(d => (
              <div key={"rnNight" + dStr(d)} className="bg-white border-b border-l px-2 py-2 text-center">
                {rnNightCountByDate[dStr(d)] || 0}
              </div>
            ))}

            {/* Patients input row (NIGHT patients) - Added as per logical requirement */}
            <div className="bg-slate-50 border-b px-3 py-2 text-sm">Patients</div>
            {days.map(d => {
              const key = dStr(d);
              const isCellLocked = census[key]?.locked;
              return (
                <div key={"pnight" + key} className="bg-slate-50 border-b border-l px-2 py-1 flex items-center justify-center">
                  <Input
                    type="number"
                    min={0}
                    value={patientsNight[key] ?? ""}
                    onChange={(e) => {
                      if (!isCellLocked && deptId) { // Only allow changes if not locked and a department is selected
                        setPatientsNight(prev => ({ ...prev, [key]: e.target.value }));
                      }
                    }}
                    onBlur={() => {
                      // Save on blur if manualPatients is enabled, not locked, and a department is selected
                      if (manualPatients && !isCellLocked && deptId) saveRangeToCensus();
                    }}
                    className="h-8 w-16 text-center"
                    disabled={!manualPatients || isCellLocked || !deptId}
                  />
                </div>
              );
            })}

            {/* Demand row (night) */}
            <div className="bg-emerald-50 border-b px-3 py-2 text-sm">Demand (Staff Required)</div>
            {days.map(d => {
              const key = dStr(d);
              const val = demandByPatients(patientsNight[key]);
              return <div key={"dnight" + key} className="bg-emerald-50 border-b border-l px-2 py-2 text-center">{val}</div>;
            })}

            {/* Indicator row (night) */}
            <div className="bg-white border-b px-3 py-2 text-sm">Indicator Decision</div>
            {days.map(d => {
              const key = dStr(d);
              const safe = safetyNightByDate[key] === "SAFE";
              return (
                <div key={"inight" + key} className={`border-b border-l px-2 py-2 text-xs text-center ${safe ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {safe ? "Safe" : "Unsafe"}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-slate-500">
        SAFE when (RN + HCA × credit + Outreach) ≥ Patients/Ratio. Outreach staff are credited only if the ECU ward's patient count for that period is zero. Use Day patients for Day rows and Night patients for Night rows. Month controls the visible grid; date range controls where your manual patient entries apply.
      </div>
    </div>
  );
}
