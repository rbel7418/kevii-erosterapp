import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Plus, Filter, Play, RefreshCcw, ChevronLeft, ChevronRight, TrendingUp, Info, X } from "lucide-react";
import { Shift, Employee, Department, Role, WardCensus, ShiftCode } from "@/entities/all";
import { PTListAdmission } from "@/entities/PTListAdmission";
import { calcShiftHoursSafe } from "@/components/utils/time";
import { HealthBanner } from "@/components/common/HealthWidget";
// Probe for health check
const shiftProbe = async () => await Shift.list("-date", 50);
import MiniSparkline from "@/components/common/MiniSparkline";

/**
 * Report Generator (RepGen)
 * Compose report “cocktails” from components, preview paginated tables,
 * export to CSV or print-to-PDF (via window.print on a print area).
 */

const CATALOG = [
  {
    id: "staffing-rota",
    label: "Staffing • Rota Table",
    description: "Tabular roster with employee, date, shift, hours, cost.",
    defaultColumns: ["date", "dept", "employee_id", "name", "role", "shift", "hours", "cost"],
    source: "staff",
  },
  {
    id: "redeployment-analysis",
    label: "Staffing • Redeployment",
    description: "Analysis of staff movements between wards.",
    defaultColumns: ["date", "employee", "home_dept", "deployed_to", "shift", "hours", "notes"],
    source: "redeployment",
  },
  {
    id: "finance-hours",
    label: "Finance • Hours & Cost (by role)",
    description: "Daily hours and estimated cost by department and role.",
    defaultColumns: ["date", "dept", "pay_code", "hours", "cost"],
    source: "finance",
  },
  {
    id: "flow-census",
    label: "Flow • Census (Day/Night)",
    description: "Ward census for day and night counts.",
    defaultColumns: ["date", "ward", "patients_day", "patients_night"],
    source: "beds",
  },
  {
    id: "ptlist-admissions",
    label: "Patient Admissions • PTList",
    description: "Admissions/discharges and clinical attributes from PTListDB.",
    defaultColumns: [
      "admission_date",
      "patient_id",
      "bed",
      "discharge_date",
      "admission_time",
      "length_of_stay_days",
      "date_of_birth",
      "age_at_admission",
      "gender",
      "clinician_lead",
      "clinician_specialty_lead",
      "primary_procedure",
      "cancellation_reason",
      "purchaser"
    ],
    source: "ptlist",
  },
];

const SOURCE_COLUMNS = {
  staff: ["date", "dept", "employee_id", "name", "role", "shift", "hours", "cost", "notes"],
  redeployment: ["date", "employee", "home_dept", "deployed_to", "shift", "hours", "notes"],
  finance: ["date", "dept", "pay_code", "hours", "cost"],
  beds: ["date", "ward", "patients_day", "patients_night"],
  ptlist: [
    "admission_date",
    "patient_id",
    "bed",
    "ward", // NEW: derived ward name (from department mapping)
    "discharge_date",
    "admission_time",
    "last_discharge_date",
    "length_of_stay_days",
    "date_of_birth",
    "age_at_admission",
    "gender",
    "clinician_lead",
    "clinician_specialty_lead",
    "primary_procedure",
    "booking_instructions",
    "cancellation_reason",
    "purchaser"
  ]
};

// Add numeric helpers
const sum = (arr) => (arr || []).reduce((a, b) => a + (Number(b) || 0), 0);
const avg = (arr) => {
  const nums = (arr || []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  return nums.length ? (sum(nums) / nums.length) : 0;
};

// Add moving average utility
function movingAverage(arr, windowSize = 3) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const win = arr.slice(start, i + 1);
    const avgVal = win.reduce((a, b) => a + (Number(b) || 0), 0) / win.length;
    out.push(avgVal);
  }
  return out;
}

// Helper to build ymd series between two dates
function enumerateDays(startISO, endISO) {
  const out = [];
  const d = new Date(startISO);
  const end = new Date(endISO);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}


// Helper: fuzzy map PTList bed to a Department (by code or name)
function mapBedToDepartment(bedValue, departments) {
  const bed = String(bedValue || "").toUpperCase().trim();
  if (!bed || !Array.isArray(departments) || departments.length === 0) {
    return { deptId: null, wardName: "" };
  }
  // Try match by department code prefix or word boundary
  for (const d of departments) {
    const code = String(d.code || "").toUpperCase().trim();
    const name = String(d.name || "").toUpperCase().trim();
    if (code && (bed.startsWith(code) || new RegExp(`\\b${code}\\b`).test(bed))) {
      return { deptId: d.id, wardName: d.name || code };
    }
    if (name && new RegExp(`\\b${name}\\b`).test(bed)) {
      return { deptId: d.id, wardName: d.name };
    }
  }
  // Fallback: take first token letters as a pseudo-code (e.g., W2 -> Ward 2)
  const token = (bed.match(/^[A-Z]+[0-9]*/)?.[0] || "").toUpperCase();
  if (token) {
    const d = departments.find(dd => String(dd.code || "").toUpperCase() === token);
    if (d) return { deptId: d.id, wardName: d.name || token };
  }
  return { deptId: null, wardName: "" };
}

// Helpers
const toCSV = (rows) => {
  if (!rows?.length) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return "";
    const s = String(v).replaceAll('"', '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
};

function download(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime + ";charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Print only #print-area
function printArea() {
  const printContents = document.getElementById("print-area")?.innerHTML || "";
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>RepGen</title>
    <style>
      body{font-family:ui-sans-serif,system-ui;}
      table{width:100%; border-collapse: collapse;}
      th,td{border:1px solid #ddd; padding:6px; font-size:11px;}
      th{background:#f8fafc;}
      h3{margin:8px 0;}
      @page{size:A4; margin:10mm}
    </style>
  </head><body>${printContents}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export default function RepGen() {
  // Filters
  // Extend default window to 30 days to surface PTList data
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // NEW: Quick Y/M/D filters (override date range when Year is selected)
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const overrideActive = !!yearFilter;

  const daysInSelectedMonth = useMemo(() => {
    if (!yearFilter || !monthFilter) return 31;
    const y = Number(yearFilter);
    const m = Number(monthFilter); // 1..12
    // day 0 of next month gives last day of current month
    return new Date(y, m, 0).getDate();
  }, [yearFilter, monthFilter]);

  // Apply override to start/end when Year/Month/Day are selected
  useEffect(() => {
    if (!yearFilter) return; // no override
    const y = Number(yearFilter);
    let start = new Date(y, 0, 1);
    let end = new Date(y, 11, 31);

    if (monthFilter) {
      const mIdx = Number(monthFilter) - 1; // 0..11
      start = new Date(y, mIdx, 1);
      end = new Date(y, mIdx + 1, 0); // Last day of selected month
      if (dayFilter) {
        const d = Math.min(Number(dayFilter), new Date(y, mIdx + 1, 0).getDate()); // Ensure day is valid for month
        start = new Date(y, mIdx, d);
        end = new Date(y, mIdx, d);
      }
    }
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  }, [yearFilter, monthFilter, dayFilter]);

  // Helper to clear Y/M/D override
  const clearYMD = () => {
    setYearFilter("");
    setMonthFilter("");
    setDayFilter("");
    // Revert to default 30-day range
    const d = new Date(); d.setDate(d.getDate() - 30);
    setStartDate(d.toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
  };

  const [deptFilter, setDeptFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [shiftCodeFilter, setShiftCodeFilter] = useState("all");
  const [redeployFilter, setRedeployFilter] = useState("all"); // all, redeployed, home
  const [query, setQuery] = useState("");

  // Data
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [shiftCodes, setShiftCodes] = useState([]);
  const [census, setCensus] = useState([]);
  const [ptlist, setPtlist] = useState([]);
  const [loading, setLoading] = useState(false);

  // Builder state
  const [selected, setSelected] = useState(["staffing-rota"]);
  const [activeTab, setActiveTab] = useState("staffing-rota");

  // Per-component column selection
  const [columnsByComp, setColumnsByComp] = useState(() => {
    const initial = {};
    CATALOG.forEach(c => initial[c.id] = c.defaultColumns.slice());
    return initial;
  });

  // NEW: pagination per component
  const [pageByComp, setPageByComp] = useState({});      // {compId: pageIndex}
  const [pageSizeByComp, setPageSizeByComp] = useState({}); // {compId: size}

  // NEW: UI state for metric dialog and highlight/insights
  const [metricOpen, setMetricOpen] = useState(false);
  const [metricSpec, setMetricSpec] = useState({ title: "", series: [], unit: "" });
  const [showInsights, setShowInsights] = useState(false);
  const [summaryPulse, setSummaryPulse] = useState(false);
  const [componentsOpen, setComponentsOpen] = useState(false); // NEW: floating components panel


  const pageFor = (id) => Math.max(0, Number(pageByComp[id] ?? 0));
  const sizeFor = (id) => Math.max(5, Number(pageSizeByComp[id] ?? 25));
  const setPage = (id, v) => setPageByComp((s) => ({ ...s, [id]: Math.max(0, v) }));
  const setSize = (id, v) => {
    setPageSizeByComp((s) => ({ ...s, [id]: v }));
    setPage(id, 0); // reset page when size changes
  };

  const paginate = (rows, id) => {
    const size = sizeFor(id);
    const page = pageFor(id);
    const start = page * size;
    return rows.slice(start, start + size);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [sh, emps, depts, rl, wc, pl, sc] = await Promise.all([
        Shift.list("-date", 2000).catch(() => []),
        Employee.list().catch(() => []),
        Department.list().catch(() => [],),
        Role.list().catch(() => []),
        WardCensus.list("-date", 1000).catch(() => []),
        PTListAdmission.list("-admission_date", 5000).catch(() => []),
        ShiftCode.list().catch(() => []),
      ]);
      setShifts(sh || []);
      setEmployees(emps || []);
      setDepartments(depts || []);
      setRoles(rl || []);
      setCensus(wc || []);
      setPtlist(pl || []);
      setShiftCodes(sc || []);
    } finally {
      setLoading(false);
    }
  };

  // Index helpers
  const deptById = useMemo(() => {
    const m = {};
    (departments || []).forEach(d => { m[d.id] = d; });
    return m;
  }, [departments]);

  const roleById = useMemo(() => {
    const m = {};
    (roles || []).forEach(r => { m[r.id] = r; });
    return m;
  }, [roles]);

  const empById = useMemo(() => {
    const m = {};
    (employees || []).forEach(e => { m[e.id] = e; });
    return m;
  }, [employees]);

  // Filter helpers
  const inDateRange = (iso) => {
    if (!iso) return false;
    const d = iso.slice(0,10);
    return d >= startDate && d <= endDate;
  };

  const matchesFilters = (s) => {
    if (!s) return false;
    const dKey = String(s.date || "").slice(0, 10);
    if (!inDateRange(dKey)) return false;
    
    if (deptFilter !== "all" && s.department_id !== deptFilter) return false;
    if (employeeFilter !== "all" && s.employee_id !== employeeFilter) return false;
    if (shiftCodeFilter !== "all" && s.shift_code !== shiftCodeFilter) return false;
    
    if (redeployFilter === "redeployed" && !s.is_redeployed) return false;
    if (redeployFilter === "home" && s.is_redeployed) return false;

    return true;
  };

  // STAFF rows (safe)
  const staffRows = useMemo(() => {
    const rows = [];
    (shifts || []).forEach((s) => {
      if (!matchesFilters(s)) return;

      const emp = s.employee_id ? empById[s.employee_id] : null;
      const role = s.role_id ? roleById[s.role_id] : null;
      const dept = s.department_id ? deptById[s.department_id] : null;
      const hrs = Number(calcShiftHoursSafe(s.start_time, s.end_time, s.break_minutes));
      const rate = Number(emp?.custom_hourly_rate || role?.hourly_rate || 0);
      const cost = Math.round((Number.isFinite(hrs) ? hrs : 0) * rate);

      rows.push({
        date: String(s.date || "").slice(0, 10),
        dept: dept?.name || "",
        employee_id: emp?.employee_id || "",
        name: emp?.full_name || emp?.user_email || "",
        role: role?.name || "",
        shift: s.shift_code || "",
        hours: Number.isFinite(hrs) ? Number(hrs.toFixed(2)) : 0,
        cost: Number.isFinite(cost) ? cost : 0,
        notes: s.notes || "",
      });
    });
    return applyQuery(rows, query);
  }, [shifts, employees, departments, roles, startDate, endDate, deptFilter, employeeFilter, shiftCodeFilter, redeployFilter, query, empById, roleById, deptById]);

  // REDEPLOYMENT rows
  const redeploymentRows = useMemo(() => {
    const rows = [];
    (shifts || []).forEach((s) => {
      if (!matchesFilters(s)) return;
      if (!s.is_redeployed && redeployFilter !== "home") {
        if (!s.is_redeployed) return; 
      }

      const emp = s.employee_id ? empById[s.employee_id] : null;
      const toDept = s.department_id ? deptById[s.department_id] : null;
      const fromDept = s.redeployed_from_id ? deptById[s.redeployed_from_id] : null;
      const hrs = Number(calcShiftHoursSafe(s.start_time, s.end_time, s.break_minutes));

      rows.push({
        date: String(s.date || "").slice(0, 10),
        employee: emp?.full_name || "",
        home_dept: fromDept?.name || "Unknown",
        deployed_to: toDept?.name || "Unknown",
        shift: s.shift_code || "",
        hours: Number.isFinite(hrs) ? Number(hrs.toFixed(2)) : 0,
        notes: s.redeploy_meta?.notes || s.notes || "",
      });
    });
    return applyQuery(rows, query);
  }, [shifts, employees, departments, startDate, endDate, deptFilter, employeeFilter, shiftCodeFilter, redeployFilter, query, empById, deptById]);

  // FINANCE rows (safe)
  const financeRows = useMemo(() => {
    const map = new Map(); // key: date|dept|role
    (shifts || []).forEach((s) => {
      if (!matchesFilters(s)) return;

      const role = s.role_id ? roleById[s.role_id] : null;
      const dept = s.department_id ? deptById[s.department_id] : null;
      const hrs = Number(calcShiftHoursSafe(s.start_time, s.end_time, s.break_minutes));
      const rate = Number(role?.hourly_rate || 0);
      const key = `${String(s.date).slice(0,10)}|${dept?.name || ""}|${role?.name || "Unknown"}`;
      const prev = map.get(key) || {
        date: String(s.date).slice(0,10),
        dept: dept?.name || "",
        pay_code: role?.name || "Unknown",
        hours: 0,
        cost: 0,
      };
      prev.hours += Number.isFinite(hrs) ? hrs : 0;
      prev.cost += (Number.isFinite(hrs) ? hrs : 0) * rate;
      map.set(key, prev);
    });
    const rows = Array.from(map.values()).map((r) => ({
      ...r,
      hours: Number(r.hours.toFixed(2)),
      cost: Math.round(r.cost),
    }));
    return applyQuery(rows, query);
  }, [shifts, departments, roles, startDate, endDate, deptFilter, employeeFilter, shiftCodeFilter, redeployFilter, query, roleById, deptById]);

  // BEDS rows (safe)
  const bedRows = useMemo(() => {
    const rows = (census || [])
      .filter((c) => {
        if (!c) return false;
        const dKey = String(c.date || "").slice(0, 10);
        if (!inDateRange(dKey)) return false;
        if (deptFilter !== "all" && c.department_id !== deptFilter) return false;
        return true;
      })
      .map((c) => ({
        date: String(c.date || "").slice(0, 10),
        ward: (c.department_id && deptById[c.department_id]?.name) || "",
        patients_day: Number(c.patients_day || 0),
        patients_night: Number(c.patients_night || 0),
      }));
    return applyQuery(rows, query);
  }, [census, departments, startDate, endDate, deptFilter, query, deptById]);

  // PTList rows (admissions anchored by admission_date in range; search applied)
  const ptRows = useMemo(() => {
    const rows = (ptlist || [])
      .filter(r => {
        const dKey = String(r.admission_date || "").slice(0,10);
        if (!inDateRange(dKey)) return false;
        // Apply department filter using bed->department mapping
        if (deptFilter !== "all") {
          const { deptId } = mapBedToDepartment(r.bed, departments);
          if (!deptId || deptId !== deptFilter) return false;
        }
        return true;
      })
      .map(r => {
        const mapRes = mapBedToDepartment(r.bed, departments);
        return {
          admission_date: String(r.admission_date || "").slice(0,10),
          patient_id: r.patient_id || "",
          bed: r.bed || "",
          ward: mapRes.wardName || "", // NEW derived column
          discharge_date: r.discharge_date ? String(r.discharge_date).slice(0,10) : "",
          admission_time: r.admission_time || "",
          last_discharge_date: r.last_discharge_date ? String(r.last_discharge_date).slice(0,10) : "",
          length_of_stay_days: r.length_of_stay_days ?? "",
          date_of_birth: r.date_of_birth || "",
          age_at_admission: r.age_at_admission ?? "",
          gender: r.gender || "",
          clinician_lead: r.clinician_lead || "",
          clinician_specialty_lead: r.clinician_specialty_lead || "",
          primary_procedure: r.primary_procedure || "",
          booking_instructions: r.booking_instructions || "",
          cancellation_reason: r.cancellation_reason || "",
          purchaser: r.purchaser || "",
          // internal fields for filtering/metrics (not shown unless selected)
          _dept_id: mapRes.deptId || null
        };
      });
    return applyQuery(rows, query);
  }, [ptlist, query, startDate, endDate, deptFilter, departments]);

  const dataByComp = useMemo(() => ({
    "staffing-rota": staffRows,
    "redeployment-analysis": redeploymentRows,
    "finance-hours": financeRows,
    "flow-census": bedRows,
    "ptlist-admissions": ptRows,
  }), [staffRows, redeploymentRows, financeRows, bedRows, ptRows]);

  // Safer search filter
  function applyQuery(rows, q) {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return (rows || []).filter((r) => r && typeof r === "object");
    return (rows || [])
      .filter((r) => r && typeof r === "object")
      .filter((r) =>
        Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(s))
      );
  }

  // Hardened summaries to avoid undefined rows
  const staffSummary = useMemo(() => {
    const rows = (staffRows || []).filter(Boolean);
    const hoursArr = rows.map(r => Number(r?.hours)).filter(Number.isFinite);
    const costArr = rows.map(r => Number(r?.cost)).filter(Number.isFinite);
    return {
      shifts: rows.length,
      hours: sum(hoursArr),
      cost: sum(costArr),
      avgHours: hoursArr.length ? sum(hoursArr) / hoursArr.length : 0,
      headcount: new Set(rows.map(r => r?.employee_id || r?.name).filter(Boolean)).size
    };
  }, [staffRows]);

  const redeploymentSummary = useMemo(() => {
    const rows = (redeploymentRows || []).filter(Boolean);
    const hoursArr = rows.map(r => Number(r?.hours)).filter(Number.isFinite);
    return {
      movements: rows.length,
      totalHours: sum(hoursArr),
      avgHours: hoursArr.length ? sum(hoursArr) / hoursArr.length : 0,
      uniqueStaff: new Set(rows.map(r => r?.employee).filter(Boolean)).size,
      uniqueDestinations: new Set(rows.map(r => r?.deployed_to).filter(Boolean)).size
    };
  }, [redeploymentRows]);

  const financeSummary = useMemo(() => {
    const rows = (financeRows || []).filter(Boolean);
    const hoursArr = rows.map(r => Number(r?.hours)).filter(Number.isFinite);
    const costArr = rows.map(r => Number(r?.cost)).filter(Number.isFinite);
    return {
      days: new Set(rows.map(r => r?.date).filter(Boolean)).size,
      hours: sum(hoursArr),
      cost: sum(costArr),
      roles: new Set(rows.map(r => r?.pay_code).filter(Boolean)).size
    };
  }, [financeRows]);

  const bedsSummary = useMemo(() => {
    const rows = (bedRows || []).filter(Boolean);
    const d = rows.map(r => Number(r?.patients_day)).filter(Number.isFinite);
    const n = rows.map(r => Number(r?.patients_night)).filter(Number.isFinite);
    const avgLocal = (arr) => (arr.length ? sum(arr) / arr.length : 0); // Renamed to avoid conflict with global avg
    return {
      days: rows.length,
      patientsDay: sum(d),
      patientsNight: sum(n),
      avgDay: avgLocal(d),
      avgNight: avgLocal(n),
      maxDay: d.length ? Math.max(...d) : 0,
      maxNight: n.length ? Math.max(...n) : 0
    };
  }, [bedRows]);

  const ptSummary = useMemo(() => {
    const rows = (ptRows || []).filter(Boolean);
    const los = rows.map(r => Number(r?.length_of_stay_days)).filter(Number.isFinite);
    return {
      admissions: rows.length,
      withLOS: los.length,
      avgLOS: los.length ? sum(los) / los.length : 0,
      maxLOS: los.length ? Math.max(...los) : 0
    };
  }, [ptRows]);

  // Build daily series per dataset for trends
  const daysInRange = useMemo(() => enumerateDays(startDate, endDate), [startDate, endDate]);

  const staffDaily = useMemo(() => {
    // hours and cost per day
    const map = {};
    daysInRange.forEach(d => (map[d] = { d, hours: 0, cost: 0 }));
    (shifts || []).forEach(s => {
      if (!s) return;
      const dKey = String(s.date || "").slice(0,10);
      if (dKey < startDate || dKey > endDate) return;
      if (deptFilter !== "all" && s.department_id !== deptFilter) return;
      const hours = calcShiftHoursSafe(s.start_time, s.end_time, s.break_minutes);
      const role = s.role_id ? roleById[s.role_id] : null;
      const emp = s.employee_id ? empById[s.employee_id] : null;
      const rate = Number(emp?.custom_hourly_rate || role?.hourly_rate || 0);
      if (!map[dKey]) map[dKey] = { d: dKey, hours: 0, cost: 0 }; // NEW guard
      map[dKey].hours += Number.isFinite(hours) ? hours : 0;
      map[dKey].cost += (Number.isFinite(hours) ? hours : 0) * rate;
    });
    return daysInRange.map(d => ({
      d,
      hours: Number((map[d]?.hours ?? 0).toFixed(2)),
      cost: Math.round(map[d]?.cost ?? 0)
    }));
  }, [shifts, startDate, endDate, deptFilter, roleById, empById, daysInRange]);

  const redeploymentDaily = useMemo(() => {
    const map = {};
    daysInRange.forEach(d => (map[d] = { d, count: 0 }));
    (shifts || []).forEach(s => {
      if (!s) return;
      const dKey = String(s.date || "").slice(0, 10);
      if (dKey < startDate || dKey > endDate) return;
      // Only count if it's a redeployed shift AND matches general filters (excluding redeployFilter itself)
      if (s.is_redeployed && inDateRange(dKey) && (deptFilter === "all" || s.department_id === deptFilter) && (employeeFilter === "all" || s.employee_id === employeeFilter) && (shiftCodeFilter === "all" || s.shift_code === shiftCodeFilter)) {
        if (!map[dKey]) map[dKey] = { d: dKey, count: 0 };
        map[dKey].count += 1;
      }
    });
    return daysInRange.map(d => ({
      d,
      count: map[d]?.count ?? 0
    }));
  }, [shifts, startDate, endDate, deptFilter, employeeFilter, shiftCodeFilter, daysInRange, inDateRange]);


  const financeDaily = useMemo(() => {
    const map = {};
    daysInRange.forEach(d => (map[d] = { d, cost: 0, hours: 0 }));
    (shifts || []).forEach(s => {
      if (!s) return;
      const dKey = String(s.date || "").slice(0,10);
      if (dKey < startDate || dKey > endDate) return;
      if (deptFilter !== "all" && s.department_id !== deptFilter) return;
      const hours = calcShiftHoursSafe(s.start_time, s.end_time, s.break_minutes);
      const role = s.role_id ? roleById[s.role_id] : null;
      const rate = Number(role?.hourly_rate || 0);
      if (!map[dKey]) map[dKey] = { d: dKey, cost: 0, hours: 0 }; // NEW guard
      map[dKey].hours += Number.isFinite(hours) ? hours : 0;
      map[dKey].cost += (Number.isFinite(hours) ? hours : 0) * rate;
    });
    return daysInRange.map(d => ({
      d,
      hours: Number((map[d]?.hours ?? 0).toFixed(2)),
      cost: Math.round(map[d]?.cost ?? 0)
    }));
  }, [shifts, startDate, endDate, deptFilter, roleById, daysInRange]);

  const bedsDaily = useMemo(() => {
    const map = {};
    daysInRange.forEach(d => (map[d] = { d, day: 0, night: 0 }));
    (census || []).forEach(c => {
      if (!c) return;
      const dKey = String(c.date || "").slice(0,10);
      if (dKey < startDate || dKey > endDate) return;
      if (deptFilter !== "all" && c.department_id !== deptFilter) return;
      if (!map[dKey]) map[dKey] = { d: dKey, day: 0, night: 0 }; // NEW guard
      map[dKey].day += Number(c.patients_day || 0);
      map[dKey].night += Number(c.patients_night || 0);
    });
    // Aggregate day and night patients for a single 'patients' value for sparkline
    return daysInRange.map(d => ({
      d,
      patients: (map[d]?.day ?? 0) + (map[d]?.night ?? 0)
    }));
  }, [census, startDate, endDate, deptFilter, daysInRange]);

  // Build daily series for PTList from the already-filtered ptRows (so dept filter + mapping apply)
  const ptDaily = useMemo(() => {
    const days = daysInRange;
    const map = {};
    days.forEach(d => (map[d] = { d, losSum: 0, cnt: 0, admissions: 0 }));
    (ptRows || []).forEach(r => {
      const dKey = String(r.admission_date || "").slice(0,10);
      // No need to check date range and department filter again, as ptRows is already filtered
      // but keeping the date check for robustness if ptRows processing changes
      if (dKey < startDate || dKey > endDate) return;
      if (!map[dKey]) map[dKey] = { d: dKey, losSum: 0, cnt: 0, admissions: 0 }; // NEW guard
      const v = Number(r.length_of_stay_days);
      if (Number.isFinite(v)) {
        map[dKey].losSum += v;
        map[dKey].cnt += 1;
      }
      map[dKey].admissions += 1;
    });
    return days.map(d => {
      const avgLos = map[d]?.cnt ? (map[d]?.losSum ?? 0) / (map[d]?.cnt ?? 0) : 0;
      return { d, avg_los: Number(avgLos.toFixed(2)), admissions: map[d]?.admissions ?? 0 };
    });
  }, [ptRows, daysInRange, startDate, endDate]);


  // Compute insights vs previous equal-length period
  const insights = useMemo(() => {
    const spanDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1);
    const prevEnd = new Date(startDate); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (spanDays - 1));
    const pStart = prevStart.toISOString().slice(0,10);
    const pEnd = prevEnd.toISOString().slice(0,10);

    // Finance cost totals current and prev (safe)
    const currCost = (financeDaily || []).reduce((a, b) => a + (Number(b?.cost) || 0), 0);
    const prevCost = (shifts || []).reduce((acc, s) => {
      if (!s) return acc;
      const dKey = String(s.date || "").slice(0,10);
      if (!dKey || dKey < pStart || dKey > pEnd) return acc;
      if (deptFilter !== "all" && s.department_id !== deptFilter) return acc;
      const role = s.role_id ? roleById[s.role_id] : null;
      const rate = Number(role?.hourly_rate || 0);
      const hrs = Number(calcShiftHoursSafe(s.start_time, s.end_time, s.break_minutes)) || 0;
      return acc + hrs * rate;
    }, 0);

    const costDeltaPct = prevCost ? ((currCost - prevCost) / prevCost) * 100 : 0;

    // Top role by cost in current range (safe)
    const roleMap = {};
    (shifts || []).forEach(s => {
      if (!s) return;
      const dKey = String(s.date || "").slice(0,10);
      if (!dKey || dKey < startDate || dKey > endDate) return;
      if (deptFilter !== "all" && s.department_id !== deptFilter) return;
      const role = s.role_id ? roleById[s.role_id] : null;
      const name = role?.name || "Unknown";
      const hrs = Number(calcShiftHoursSafe(s.start_time, s.end_time, s.break_minutes)) || 0;
      const cost = hrs * Number(role?.hourly_rate || 0);
      roleMap[name] = (roleMap[name] || 0) + (Number.isFinite(cost) ? cost : 0);
    });
    const topRole = Object.entries(roleMap).sort((a,b) => b[1]-a[1])[0] || null;

    // Avg LOS for current period (safe)
    const currLos = (ptDaily || []).reduce((a,b) => a + (Number(b?.avg_los) || 0), 0) / Math.max(1, (ptDaily || []).length);

    // Avg LOS for previous equal-length period (robust)
    const prevLosAgg = (() => {
      const map = {};
      const daysPrev = enumerateDays(pStart, pEnd);
      daysPrev.forEach(d => { map[d] = { s: 0, c: 0 }; });
      (ptlist || []).forEach(r => {
        if (!r) return;
        const dKey = String(r.admission_date || "").slice(0,10);
        if (!dKey || dKey < pStart || dKey > pEnd) return;
        if (deptFilter !== "all") {
          const { deptId } = mapBedToDepartment(r.bed, departments);
          if (!deptId || deptId !== deptFilter) return;
        }
        const v = Number(r.length_of_stay_days);
        if (!map[dKey]) map[dKey] = { s: 0, c: 0 }; // guard missing bucket
        if (Number.isFinite(v)) { map[dKey].s += v; map[dKey].c += 1; }
      });
      const sumAvgLos = daysPrev.reduce((acc, d) => {
        const bucket = map[d] || { s: 0, c: 0 };
        const dailyAvg = bucket.c ? (bucket.s / bucket.c) : 0;
        return acc + dailyAvg;
      }, 0);
      return daysPrev.length ? (sumAvgLos / daysPrev.length) : 0;
    })();

    const losDelta = Number(currLos) - Number(prevLosAgg);

    return {
      costDeltaPct: Number(costDeltaPct.toFixed(1)),
      topRoleName: topRole ? topRole[0] : null,
      topRoleCost: topRole ? Math.round(topRole[1]) : 0,
      avgLos: Number(currLos.toFixed(2)),
      avgLosDelta: Number(losDelta.toFixed(2)),
    };
  }, [financeDaily, shifts, roleById, deptFilter, startDate, endDate, ptDaily, ptlist, departments]);

  // Auto-show insights and pulse summary when filters change
  useEffect(() => {
    // Only show insights if there's actual data to display
    if (insights.costDeltaPct !== 0 || insights.topRoleName || insights.avgLos !== 0) {
      setShowInsights(true);
      const t1 = setTimeout(() => setShowInsights(false), 8000);
      return () => { clearTimeout(t1); };
    }
    return () => {};
  }, [startDate, endDate, deptFilter, activeTab, insights]); // activeTab also triggers it, to show context

  useEffect(() => {
    setSummaryPulse(true);
    const t2 = setTimeout(() => setSummaryPulse(false), 1200); // Fixed: should clear the timeout
    return () => { clearTimeout(t2); }; // Cleanup for unmount
  }, [startDate, endDate, deptFilter, activeTab]);

  // Auto-add PTList tab once data is present if user hasn’t customized selection yet
  useEffect(() => {
    // Check if ptlist data is loaded and is not empty
    // Check if only "staffing-rota" is currently selected (implies default state)
    // Check if "ptlist-admissions" is not already in the selection
    if (
      (ptlist || []).length > 0 &&
      selected.length === 1 &&
      selected[0] === "staffing-rota" &&
      !selected.includes("ptlist-admissions")
    ) {
      setSelected(prev => [...prev, "ptlist-admissions"]);
    }
  }, [ptlist, selected]);

  // Helper: open metric dialog
  const openMetric = (title, series, unit = "") => {
    setMetricSpec({ title, series, unit });
    setMetricOpen(true);
  };

  // Totals row calculator (safe)
  const totalsForColumns = (rows, cols) => {
    const safeRows = (rows || []).filter(r => r && typeof r === "object");
    const totals = {};
    (cols || []).forEach((c) => {
      const numeric = safeRows
        .map((r) => Number(r?.[c]))
        .filter((v) => Number.isFinite(v));
      totals[c] = numeric.length ? sum(numeric) : "";
    });
    return totals;
  };

  const addComponent = (id) => {
    if (!selected.includes(id)) {
      setSelected(prev => [...prev, id]);
      setActiveTab(id);
    }
  };

  // Utility to remove a component and fallback active tab
  const removeComponent = (id) => {
    setSelected(prev => {
      const newSelected = prev.filter(x => x !== id);
      if (activeTab === id) {
        const newActiveTab = newSelected[0] || ""; // Fallback to first remaining, or empty
        setActiveTab(newActiveTab);
      }
      return newSelected;
    });
  };

  const toggleColumn = (compId, col) => {
    setColumnsByComp(prev => {
      const curr = new Set(prev[compId] || []);
      if (curr.has(col)) curr.delete(col); else curr.add(col);
      return { ...prev, [compId]: Array.from(curr) };
    });
  };

  // CSV export (safe access)
  const exportCSV = (compId) => {
    const cols = columnsByComp[compId] || [];
    const rows = (dataByComp[compId] || []).filter(Boolean).map(r => {
      const pruned = {};
      cols.forEach(c => { pruned[c] = r?.[c]; });
      return pruned;
    });
    download(`${compId}_${startDate}_${endDate}.csv`, toCSV(rows), "text/csv");
  };

  // Helper to format numbers nicely
  const fmt = (v, digits = 2) => {
    if (v === "" || v === null || v === undefined) return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return n.toLocaleString(undefined, { maximumFractionDigits: digits });
  };


  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Data health indicator for key datasets (defaults to PTListAdmission) */}
        <HealthBanner probe={shiftProbe} />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Report Generator</h1>
            <p className="text-sm text-slate-600">Compose staffing, finance, and flow tables; export CSV or print-to-PDF.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCcw className="w-4 h-4" /> Refresh data
            </Button>
            <Button variant="outline" onClick={() => setComponentsOpen(true)} className="gap-2">
              <Filter className="w-4 h-4" /> Components
            </Button>
            <Button onClick={printArea} className="gap-2">
              <Play className="w-4 h-4" /> Print / PDF
            </Button>
          </div>
        </div>


        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-7 gap-3 items-end">
              {/* NEW: Quick filters - Year / Month / Day */}
              <div className="md:col-span-3">
                <Label className="text-xs text-slate-600">Quick filter (Year / Month / Day)</Label>
                <div className="flex gap-2">
                  <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); if (!v) { clearYMD(); } }}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Years</SelectItem>
                      {(() => {
                        const nowY = new Date().getFullYear();
                        const years = Array.from({ length: 8 }, (_, i) => String(nowY - 4 + i));
                        return years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>);
                      })()}
                    </SelectContent>
                  </Select>
                  <Select value={monthFilter} disabled={!yearFilter} onValueChange={(v) => { setMonthFilter(v); setDayFilter(""); }}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Months</SelectItem>
                      {[
                        ["1", "Jan"], ["2", "Feb"], ["3", "Mar"], ["4", "Apr"], ["5", "May"], ["6", "Jun"],
                        ["7", "Jul"], ["8", "Aug"], ["9", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"]
                      ].map(([v, lbl]) => (
                        <SelectItem key={v} value={v}>{lbl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={dayFilter} disabled={!yearFilter || !monthFilter} onValueChange={setDayFilter}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Days</SelectItem>
                      {Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1)).map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={clearYMD} disabled={!overrideActive}>Reset</Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600">Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={overrideActive} className={overrideActive ? "opacity-60 pointer-events-none" : ""} />
              </div>
              <div>
                <Label className="text-xs text-slate-600">End date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={overrideActive} className={overrideActive ? "opacity-60 pointer-events-none" : ""} />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Department</Label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-slate-600">Employee</Label>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger><SelectValue placeholder="All employees" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name || e.user_email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-600">Shift Code</Label>
                <Select value={shiftCodeFilter} onValueChange={setShiftCodeFilter}>
                  <SelectTrigger><SelectValue placeholder="All codes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {shiftCodes.map(sc => <SelectItem key={sc.id} value={sc.code}>{sc.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-600">Redeployment</Label>
                <Select value={redeployFilter} onValueChange={setRedeployFilter}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="redeployed">Redeployed Only</SelectItem>
                    <SelectItem value="home">Home Dept Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <Label className="text-xs text-slate-600">Search</Label>
                <div className="flex gap-2">
                  <Input placeholder="Filter rows…" value={query} onChange={(e) => setQuery(e.target.value)} />
                  <Button variant="outline" onClick={() => setQuery("")}><Filter className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full-width preview area (removed left sidebar) */}
        <div className="grid lg:grid-cols-1 gap-4">
          {/* Preview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div id="print-area">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    {/* Tabs across the top for selected components with close buttons */}
                    <TabsList className="flex flex-wrap">
                      {selected.map((id) => {
                        const def = CATALOG.find(c => c.id === id);
                        if (!def) return null;
                        return (
                          <div key={`tabwrap-${id}`} className="relative mr-1 mb-1">
                            <TabsTrigger value={id} className="text-xs pr-6">{def.label}</TabsTrigger>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeComponent(id); }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </TabsList>

                    {/* Tab contents (existing logic, full width) */}
                    {selected.map(id => {
                      const def = CATALOG.find(c => c.id === id);
                      if (!def) return null;
                      const rows = dataByComp[id] || [];
                      const cols = (columnsByComp[id] || []).filter(c => (SOURCE_COLUMNS[def.source] || []).includes(c));

                      // pagination setup
                      const totalRows = rows.length;
                      const pageRows = paginate(rows, id);
                      const pageSize = sizeFor(id);
                      const pageIndex = pageFor(id);
                      const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
                      const hasPrev = pageIndex > 0;
                      const hasNext = pageIndex + 1 < totalPages;

                      // totals row
                      const totals = totalsForColumns(rows, cols);

                      // summary assembly (as implemented earlier)
                      const summary = (() => {
                        if (id === "staffing-rota") {
                          const hoursSeries = staffDaily.map(x => ({ d: x.d, v: x.hours }));
                          const avgHoursSeries = movingAverage(staffDaily.map(x => x.hours), 3).map((v, i) => ({ d: staffDaily[i].d, v }));
                          return [
                            { k: "Shifts", v: staffSummary.shifts, series: staffDaily.map(x => ({d:x.d, v:1})) },
                            { k: "Hours", v: fmt(staffSummary.hours), series: hoursSeries },
                            { k: "Avg hrs/shift", v: fmt(staffSummary.avgHours), series: avgHoursSeries },
                            { k: "Cost", v: "£" + fmt(staffSummary.cost, 0), series: staffDaily.map(x => ({ d: x.d, v: x.cost })), unit: "£" },
                            { k: "Headcount", v: staffSummary.headcount, series: [] }
                          ];
                        }
                        if (id === "redeployment-analysis") {
                          const redeploySeries = redeploymentDaily.map(x => ({ d: x.d, v: x.count }));
                          return [
                            { k: "Movements", v: redeploymentSummary.movements, series: redeploySeries },
                            { k: "Total Hours", v: fmt(redeploymentSummary.totalHours), series: [] },
                            { k: "Avg Shift", v: fmt(redeploymentSummary.avgHours), series: [] },
                            { k: "Unique Staff", v: redeploymentSummary.uniqueStaff, series: [] },
                            { k: "Destinations", v: redeploymentSummary.uniqueDestinations, series: [] }
                          ];
                        }
                        if (id === "finance-hours") {
                          const hoursSeries = financeDaily.map(x => ({ d: x.d, v: x.hours }));
                          const costSeries = financeDaily.map(x => ({ d: x.d, v: x.cost }));
                          return [
                            { k: "Days", v: financeSummary.days, series: [] },
                            { k: "Roles", v: financeSummary.roles, series: [] },
                            { k: "Hours", v: fmt(financeSummary.hours), series: hoursSeries },
                            { k: "Cost", v: "£" + fmt(financeSummary.cost, 0), series: costSeries, unit: "£" }
                          ];
                        }
                        if (id === "flow-census") {
                          const patientsDaySeries = bedsDaily.map(x => ({ d: x.d, v: x.patients }));
                          const avgPatientsDaySeries = movingAverage(bedsDaily.map(x => x.patients), 3).map((v,i)=>({ d: bedsDaily[i].d, v }));
                          return [
                            { k: "Days", v: bedsSummary.days, series: [] },
                            { k: "Patients (Σ)", v: fmt(bedsSummary.patientsDay + bedsSummary.patientsNight, 0), series: patientsDaySeries },
                            { k: "Avg Day", v: fmt(bedsSummary.avgDay), series: avgPatientsDaySeries },
                            { k: "Avg Night", v: fmt(bedsSummary.avgNight), series: [] },
                            { k: "Max Day", v: fmt(bedsSummary.maxDay, 0), series: [] },
                            { k: "Max Night", v: fmt(bedsSummary.maxNight, 0), series: [] }
                          ];
                        }
                        if (id === "ptlist-admissions") {
                          // existing series
                          const avgLosSeries = (ptDaily || []).map(x => ({ d: x.d, v: x.avg_los }));
                          const admissionsSeries = (ptDaily || []).map(x => ({ d: x.d, v: x.admissions }));
                          const avgLosMovingAvgSeries = movingAverage((ptDaily || []).map(x => x.avg_los), 3).map((v,i)=>({ d: (ptDaily[i] || {}).d, v }));

                          // NEW: Daily Patient Flow calculations for the selected day (endDate)
                          const focusDay = String(endDate || "").slice(0,10);

                          const all = (ptRows || []).filter(r => r && typeof r === "object");

                          const todaysAdmissions = all.filter(r => String(r.admission_date || "").slice(0,10) === focusDay);
                          const totalAdmissions = todaysAdmissions.length;

                          const isDayCase = (r) => {
                            const ad = String(r.admission_date || "").slice(0,10);
                            const dd = r.discharge_date ? String(r.discharge_date).slice(0,10) : "";
                            const los = Number(r.length_of_stay_days);
                            return (dd && dd === ad) || (Number.isFinite(los) && los === 0);
                          };
                          const expectedDayCases = todaysAdmissions.filter(isDayCase).length;
                          const expectedInpatients = Math.max(0, totalAdmissions - expectedDayCases);

                          const totalDischarges = all.filter(r => String(r.discharge_date || "").slice(0,10) === focusDay).length;

                          const activeInpatients = all.filter(r => {
                            const ad = String(r.admission_date || "").slice(0,10);
                            const dd = r.discharge_date ? String(r.discharge_date).slice(0,10) : "";
                            return ad <= focusDay && (!dd || dd > focusDay);
                          }).length;

                          const censusEOD = activeInpatients + totalAdmissions - totalDischarges;

                          // Time blocks
                          const toMin = (t) => {
                            if (!t) return null;
                            const parts = String(t).split(":");
                            const h = Number(parts[0]); const m = Number(parts[1]);
                            if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
                            return h * 60 + m;
                          };
                          let b0608 = 0, b0812 = 0, b1216 = 0, b1620 = 0;
                          todaysAdmissions.forEach(r => {
                            const mins = toMin(r.admission_time);
                            if (mins == null) return;
                            if (mins >= 6*60 && mins < 8*60) b0608 += 1;
                            else if (mins >= 8*60 && mins < 12*60) b0812 += 1;
                            else if (mins >= 12*60 && mins < 16*60) b1216 += 1;
                            else if (mins >= 16*60 && mins < 20*60) b1620 += 1;
                          });
                          const timeBlockSum = b0608 + b0812 + b1216 + b1620;
                          const timeBlockBadge = `${timeBlockSum}${timeBlockSum === totalAdmissions ? " ✓" : ""}`;

                          return [
                            // Core flow cards
                            { k: "Day Cases", v: expectedDayCases, series: [] },
                            { k: "Inpatients", v: expectedInpatients, series: [] },
                            { k: "Total Admissions", v: totalAdmissions, series: admissionsSeries },
                            { k: "Discharges", v: totalDischarges, series: [] },
                            { k: "Active Inpatients", v: activeInpatients, series: [] },
                            { k: "Census EOD", v: censusEOD, series: [] },
                            { k: "Time-block arrivals", v: timeBlockBadge, series: [] },
                            // Existing PTList cards
                            { k: "Avg LOS", v: fmt(ptSummary.avgLOS), series: avgLosSeries },
                            { k: "Max LOS", v: fmt(ptSummary.maxLOS, 0), series: avgLosMovingAvgSeries }
                          ];
                        }
                        return [];
                      })();

                      return (
                        <TabsContent key={`content-${id}`} value={id} className="p-3">
                          {/* Sticky summary bar */}
                          {summary.length > 0 && (
                            <div className={`sticky top-0 z-10 bg-slate-100/80 backdrop-blur p-2 rounded-md shadow-sm mb-2 ${summaryPulse ? "ring-2 ring-sky-300" : ""}`}>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                {summary.map((s, i) => (
                                  <button key={i} onClick={() => openMetric(`${def.label} • ${s.k}`, s.series, s.unit)}
                                    className="group text-left bg-white border rounded-md p-2 hover:shadow transition">
                                    <div className="text-[16px] text-slate-500">{s.k}</div>
                                    <div className="text-sm font-semibold text-slate-900">{s.v}</div>
                                    {Array.isArray(s.series) && s.series.length > 0 && (
                                      <div className="mt-1 h-8">
                                        <MiniSparkline data={s.series} dataKey="v" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Toolbar: page size + pagination + CSV */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Rows/page</span>
                              <Select value={String(pageSize)} onValueChange={(v) => setSize(id, Number(v))}>
                                <SelectTrigger className="h-8 w-20">
                                  <SelectValue placeholder={String(pageSize)} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                  <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="outline" disabled={!hasPrev} onClick={() => setPage(id, pageIndex - 1)}>
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <div className="text-xs w-[90px] text-center text-slate-600">
                                {Math.min(totalRows, pageIndex * pageSize + 1)}–
                                {Math.min(totalRows, (pageIndex + 1) * pageSize)} of {totalRows}
                              </div>
                              <Button size="icon" variant="outline" disabled={!hasNext} onClick={() => setPage(id, pageIndex + 1)}>
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => exportCSV(id)} className="gap-2 ml-2">
                                <Download className="w-4 h-4" /> CSV
                              </Button>
                            </div>
                          </div>

                          <div className="overflow-auto border rounded-md">
                            <table className="min-w-full">
                              <thead>
                                <tr>
                                  {cols.map(c => (
                                    <th key={`${id}-h-${c}`} className="text-left text-xs font-semibold bg-slate-50 border-b p-2 capitalize">
                                      {c.replaceAll("_", " ")}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {pageRows.length === 0 ? (
                                  <tr><td colSpan={cols.length} className="p-3 text-xs text-slate-500 text-center">No rows</td></tr>
                                ) : pageRows.map((r, i) => (
                                  <tr key={`${id}-r-${i}-${pageIndex}`} className="odd:bg-white even:bg-slate-50/50">
                                    {cols.map(c => (
                                      <td key={`${id}-d-${i}-${c}`} className="p-2 text-xs border-b">
                                        {String(r[c] ?? "")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                              {/* totals footer */}
                              {cols.length > 0 && (
                                <tfoot>
                                  <tr className="bg-slate-50">
                                    {cols.map((c, idx) => (
                                      <td key={`${id}-t-${c}-${idx}`} className="p-2 text-xs border-t font-semibold text-slate-800">
                                        {idx === 0 ? "Totals" : (totals[c] !== "" ? (c === "cost" ? "£" : "") + fmt(totals[c], (c === "cost" ? 0 : 2)) : "")}
                                      </td>
                                    ))}
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-2">
                            Showing {pageRows.length} of {rows.length} rows. Date range {startDate} → {endDate}{deptFilter !== "all" && def.source !== "ptlist" ? ` • Department: ${(deptById[deptFilter]?.name)||"?"}` : ""}.
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {loading && (
          <div className="mt-3 text-xs text-slate-600">Loading data…</div>
        )}
      </div>

      {/* Floating Insights Panel (unchanged from previous enhancement) */}
      {showInsights && (
        <div className="fixed bottom-4 right-4 bg-white border border-slate-200 shadow-lg rounded-md p-4 w-[300px] z-50">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold">Insights</h4>
            <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowInsights(false)}>
              <Info className="w-4 h-4" />
            </button>
          </div>
          <ul className="text-xs space-y-1">
            <li>
              {insights.costDeltaPct >= 0 ? "↑" : "↓"} Cost {Math.abs(insights.costDeltaPct).toLocaleString(undefined, {maximumFractionDigits:1})}% vs prev period
            </li>
            {insights.topRoleName && (
              <li>Top role: {insights.topRoleName} (£{insights.topRoleCost.toLocaleString()})</li>
            )}
            <li>
              Avg LOS {insights.avgLos}d ({insights.avgLosDelta >= 0 ? "+" : ""}{insights.avgLosDelta}d vs prev)
            </li>
          </ul>
        </div>
      )}

      {/* Floating Components Panel */}
      {componentsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4"> {/* Added overlay for modal behavior */}
          <Card className="bg-white border rounded-xl shadow-2xl overflow-hidden w-[380px] max-w-[92vw]">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white">
              <div className="text-sm font-semibold">Components</div>
              <button className="text-white/80 hover:text-white" onClick={() => setComponentsOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              {/* Add component */}
              <div className="flex items-center gap-2">
                <Select onValueChange={addComponent}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add component…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATALOG.map(c =>
                      <SelectItem key={c.id} value={c.id} disabled={selected.includes(c.id)}>
                        {c.label}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected components and column pickers */}
              <div className="space-y-2">
                {selected.length === 0 && (
                  <div className="text-xs text-slate-500">No components selected. Add one above.</div>
                )}
                {selected.map((id) => {
                  const def = CATALOG.find(c => c.id === id);
                  if (!def) return null;
                  const cols = SOURCE_COLUMNS[def.source] || [];
                  const chosen = new Set(columnsByComp[id] || []);
                  return (
                    <div key={id} className="border rounded-md p-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{def.label}</div>
                        <Button variant="ghost" size="sm" onClick={() => removeComponent(id)}>Remove</Button>
                      </div>
                      <div className="text-[11px] text-slate-500 mb-2">{def.description}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {cols.map(c => (
                          <label key={`${id}-${c}`} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={chosen.has(c)}
                              onCheckedChange={() => toggleColumn(id, c)}
                            />
                            <span className="capitalize">{c.replaceAll("_", " ")}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Metric dialog (unchanged) */}
      <Dialog open={metricOpen} onOpenChange={setMetricOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {metricSpec.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {Array.isArray(metricSpec.series) && metricSpec.series.length > 0 ? (
              <div className="h-56">
                <MiniSparkline data={metricSpec.series} dataKey="v" area={false} unit={metricSpec.unit} />
              </div>
            ) : (
              <div className="text-sm text-slate-600">No trend data available for this metric.</div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  const rows = (metricSpec.series || []).map(x => ({ date: x.d, value: x.v }));
                  const csv = ["date,value"].concat(rows.map(r => `${r.date},${r.value}`)).join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${metricSpec.title.toLowerCase().replaceAll(" ", "_")}_series.csv`; a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}