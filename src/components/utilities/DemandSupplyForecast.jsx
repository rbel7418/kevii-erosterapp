
import React from "react";
import { AdmissionEvent } from "@/entities/AdmissionEvent";
import { UnplannedDaily } from "@/entities/UnplannedDaily";
import { Department } from "@/entities/Department";
import { User } from "@/entities/User";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Upload, FileSpreadsheet, Trash2, AlertCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isValid as isValidDate, isAfter, isBefore } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { UploadLog } from "@/entities/UploadLog";
import { Loader2, CheckCircle2, Info } from "lucide-react";
import { WardCensus } from "@/entities/WardCensus";
import { Bed } from "@/entities/Bed"; // NEW: Bed entity for bed-to-ward mapping

function dStr(date) { try { return format(date, "yyyy-MM-dd"); } catch { return ""; } }

// Replace the strict HH:MM parser with a flexible one that accepts HH:MM and HH:MM:SS
function parseTimeFlexible(val) {
  const s = String(val || "").trim();
  const m = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3] || 0); // seconds are optional
  return { h, min, sec, total: h * 60 + min + Math.floor(sec / 60) }; // total in minutes
}

// Update time-of-day bucketing; do NOT warn for outside 06:00–20:00 anymore.
// We'll return one of golden/morning/afternoon/evening, else null (no warning).
function timeOfDayFromTime(s) {
  const t = parseTimeFlexible(s);
  if (!t) return null;
  const mins = t.total;
  const inRange = (a, b) => mins >= a && mins < b;
  const H = (h, m = 0) => h * 60 + m;
  if (inRange(H(6), H(8))) return "golden";
  if (inRange(H(8), H(12))) return "morning";
  if (inRange(H(12), H(16))) return "afternoon";
  if (inRange(H(16), H(20))) return "evening";
  // outside our elective buckets -> ignore (no warning)
  return null;
}

// Helper: normalize keys for flexible header matching
function getField(row, candidates) {
  const map = {};
  Object.keys(row || {}).forEach((k) => { map[normKeyGetField(k)] = row[k]; });
  for (const c of candidates) {
    const v = map[normKeyGetField(c)];
    if (v !== undefined && v !== null) return v;
  }
  return "";
}

// Helper for getField (original normKey functionality)
function normKeyGetField(k) {
  return String(k || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Make type detection robust (accept synonyms and infer when missing)
function normaliseType(raw1, raw2, los, dischargeDate, admissionDate) {
  const v = String(raw1 || raw2 || "").trim().toUpperCase();
  // Match various synonyms for Day Case
  if (/^(DC|DAY\s*CASE|DAY-?CASE|DAYCASE|SDC|SAME\s*DAY\s*CASE)$/.test(v)) return "DC";
  // Match various synonyms for Inpatient
  if (/^(IP|IN\s*PATIENT|INPATIENT|IN-PATIENT|IPD|OVERNIGHT)$/.test(v)) return "IP";

  // Heuristic: same-day discharge and no LOS -> Day Case, otherwise assume Inpatient
  const losNum = Number(los || 0);
  if (String(dischargeDate || "") && String(admissionDate || "") && String(dischargeDate) === String(admissionDate) && losNum <= 0) {
    return "DC";
  }
  return "IP"; // default to IP if unknown or unable to infer (reduces noise and makes it safer)
}


const COMBINED_ID = "__COMBINED_W2_W3_ECU__";

export default function DemandSupplyForecast() {
  const [departments, setDepartments] = React.useState([]);
  const [deptId, setDeptId] = React.useState("");
  const fileInputRef = React.useRef(null);
  const [monthAnchor, setMonthAnchor] = React.useState(new Date());
  const monthStart = React.useMemo(() => startOfMonth(monthAnchor), [monthAnchor]);
  const monthEnd = React.useMemo(() => endOfMonth(monthAnchor), [monthAnchor]);
  const days = React.useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const monthKey = React.useMemo(() => format(monthStart, "yyyy-MM"), [monthAnchor]);

  const [events, setEvents] = React.useState([]);
  const [unplanned, setUnplanned] = React.useState({});
  const [me, setMe] = React.useState(null);

  // Upload preview
  const [preview, setPreview] = React.useState({ rows: [], warnings: [], dateSpan: null, fileName: "" });
  const [busy, setBusy] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(null);

  // NEW: upload UX + last log
  const [uploadStatus, setUploadStatus] = React.useState(null); // {type:'success'|'error'|'info', message:string}
  const [lastLog, setLastLog] = React.useState(null);

  const [beds, setBeds] = React.useState([]); // NEW
  const backfillRanRef = React.useRef(false); // NEW

  // Helper normalizer + resolvers (NEW)
  const normKey = React.useCallback((s) => {
    const str = String(s || "").toLowerCase();
    const alnum = str.replace(/[^a-z0-9]/g, "");
    // Prefer full alnum (for ecu1/dsu2). If it looks like pure digits, use digits.
    const digits = alnum.match(/\d+/);
    if (/[a-z]/.test(alnum)) return alnum; // keep alnum for keys like ecu1
    return digits ? digits[0] : alnum;
  }, []);

  const bedIndex = React.useMemo(() => {
    const idx = {};
    (beds || []).forEach((b) => {
      const key = normKey(b.bed_name);
      if (key) idx[key] = b;
    });
    return idx;
  }, [beds, normKey]);

  const codeToDeptId = React.useMemo(() => {
    const m = {};
    (departments || []).forEach((d) => {
      if (d.code) m[String(d.code).toUpperCase()] = d.id;
      if (d.name) m[String(d.name).toUpperCase()] = d.id;
    });
    return m;
  }, [departments]);

  const resolveDeptIdForBed = React.useCallback((bedName) => {
    const key = normKey(bedName);
    const rec = key ? bedIndex[key] : null;
    if (!rec) return "";
    const asId = String(rec.department_id || "");
    if (asId && asId.length > 20) return asId; // naive id test for actual ID
    const code = String(rec.department_code || "").toUpperCase();
    return codeToDeptId[code] || "";
  }, [bedIndex, codeToDeptId, normKey]);


  // Replace refreshLastLog with a resilient version
  const refreshLastLog = React.useCallback(async () => {
    try {
      const all = await UploadLog.list();
      const scoped = (all || []).filter(r => r.scope === "admissions");
      scoped.sort((a,b) => new Date(b.uploaded_at || b.created_date || 0).getTime() - new Date(a.uploaded_at || a.created_date || 0).getTime());
      setLastLog(scoped[0] || null);
    } catch (e) {
      // If logs service has a hiccup, don't surface an app error
      setLastLog(null);
      console.warn("UploadLog.list failed (non-fatal):", e?.message || e);
    }
  }, []);

  React.useEffect(() => { User.me().then(setMe).catch(()=>{}); }, []);

  // Replace the departments loading effect to also fetch Beds
  React.useEffect(() => {
    (async () => {
      const list = await Department.list();
      setDepartments(list || []);
      if (!deptId && (list || []).length) {
        setDeptId(list[0].id); // Default to first ward to simplify initial state
      }
      const b = await Bed.list().catch(() => []);
      setBeds(b || []);
    })();
  }, [deptId]); // deptId added as dependency for `setDeptId`

  React.useEffect(() => { refreshLastLog(); }, [refreshLastLog]);


  // Detect W2/W3/ECU for combined mode (still relevant for UnplannedDaily aggregation)
  const combinedIds = React.useMemo(() => {
    const find = (needle) =>
      (departments || []).find(d => String(d.name || "").toLowerCase().includes(needle))?.id;
    const w2 = find("ward 2");
    const w3 = find("ward 3");
    const ecu = (departments || []).find(d => /ecu|enhanced\s*care/i.test(String(d.name || "")))?.id;
    return [w2, w3, ecu].filter(Boolean);
  }, [departments]);

  const loadData = React.useCallback(async () => {
    // Admission Events are now globally scoped (department_id: ""), so always load all.
    const allEvents = await AdmissionEvent.list();
    const filteredEvents = (allEvents || []).filter(r => String(r.admission_date || "").startsWith(monthKey));
    setEvents(filteredEvents);

    // NEW: one-time backfill for records missing department_id but with a known bed mapping
    if (!backfillRanRef.current && (filteredEvents || []).some(e => (!e.department_id || e.department_id === "") && e.bed)) {
      backfillRanRef.current = true;
      const toFix = filteredEvents.filter(e => (!e.department_id || e.department_id === "") && e.bed).slice(0, 200);
      for (const ev of toFix) {
        const depId = resolveDeptIdForBed(ev.bed);
        if (depId) {
          await AdmissionEvent.update(ev.id, { department_id: depId });
        }
      }
      // Reload after backfill if changes were made
      if (toFix.length > 0) {
        const refreshed = await AdmissionEvent.list();
        const refFiltered = (refreshed || []).filter(r => String(r.admission_date || "").startsWith(monthKey));
        setEvents(refFiltered);
      }
    }


    // Unplanned: continue to filter/aggregate based on selected deptId, as they are department-specific
    const allUnplanned = await UnplannedDaily.list();
    const map = {};
    days.forEach(d => { map[dStr(d)] = 0; }); // Initialize all days to 0

    if (deptId === COMBINED_ID) {
      const setIds = new Set(combinedIds);
      (allUnplanned || []).forEach(r => {
        if (setIds.has(r.department_id) && String(r.date || "").startsWith(monthKey)) {
          map[r.date] = (map[r.date] || 0) + Number(r.unplanned_count || 0);
        }
      });
    } else if (deptId) { // Specific ward selected
      (allUnplanned || []).forEach(r => {
        if (r.department_id === deptId && String(r.date || "").startsWith(monthKey)) {
          map[r.date] = Number(r.unplanned_count || 0);
        }
      });
    }
    setUnplanned(map);
  }, [deptId, monthKey, days, combinedIds, resolveDeptIdForBed]);

  React.useEffect(() => { loadData(); }, [deptId, monthKey, loadData]);

  // Template download
  const downloadTemplate = () => {
    // CHANGE: privacy — remove Patient Name from the template headers
    const headers = [
      "Booking Status (Admission)",
      "Date of Admission",
      "Time of Admission",
      "Bed",
      "Patient Id",
      "Clinician (Lead)",
      "Length of Stay (Days)",
      "Patient Category (Inpatient Booking)",
      "Date of Discharge"
    ].join(",");
    const blob = new Blob([headers + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "admission_template_upstream.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Upload + transform
  const handleUpload = async (file) => {
    if (!file) return;
    setBusy(true);
    setUploadStatus({ type: "info", message: "Uploading and parsing CSV..." });
    try {
      const { file_url } = await UploadFile({ file });
      // Schema matching UPSTREAM column names (these are just examples, getField is flexible)
      // CHANGE: privacy — do not expect Patient Name in the CSV schema
      const schema = {
        type: "object",
        properties: {
          "Booking Status (Admission)": { type: "string" },
          "Date of Admission": { type: "string" },
          "Time of Admission": { type: "string" },
          "Bed": { type: "string" },
          "Patient Id": { type: "string" },
          "Clinician (Lead)": { type: "string" },
          "Length of Stay (Days)": { anyOf: [{ type: "string" }, { type: "number" }] },
          "Patient Category (Inpatient Booking)": { type: "string" },
          "Date of Discharge": { type: "string" }
        }
      };
      const res = await ExtractDataFromUploadedFile({ file_url, json_schema: schema });

      const rows = Array.isArray(res?.output) ? res.output : [];
      const warnings = [];
      const transformed = [];
      let minDate = null, maxDate = null;
      
      rows.forEach((r, idx) => {
        // Flexible field mapping (Patient Name intentionally NOT read)
        const admDate = String(getField(r, ["Date of Admission", "Admission Date", "Admit Date", "Date"])).trim();
        const admTime = String(getField(r, ["Time of Admission", "Admission Time", "Time", "Admit Time"])).trim();
        const bed = String(getField(r, ["Bed", "Bed No", "Bed Number"]));
        // PRIVACY: do not read patient name at all
        const pt_id = String(getField(r, ["Patient Id", "Patient ID", "MRN", "URN", "Hospital Number"]));
        const clinician = String(getField(r, ["Clinician (Lead)", "Clinician", "Consultant", "Doctor"]));
        const losRaw = getField(r, ["Length of Stay (Days)", "LOS", "Length of Stay"]);
        const los = Number(losRaw || 0);
        const cat1 = getField(r, ["Booking Status (Admission)", "Admission Type", "Type"]);
        const cat2 = getField(r, ["Patient Category (Inpatient Booking)", "Patient Category", "Category"]);
        const discharge_date = String(getField(r, ["Date of Discharge", "Discharge Date"])).trim();

        // Determine type with robust normaliser
        const type = normaliseType(cat1, cat2, los, discharge_date, admDate);

        // Time-of-day bucket: only warn if time string is invalid format
        let tod = null;
        if (admTime) {
          const parsed = parseTimeFlexible(admTime);
          if (!parsed) {
            warnings.push(`Row ${idx + 1}: Time '${admTime}' is not a valid time; skipping time-of-day bucket.`);
          } else {
            tod = timeOfDayFromTime(admTime); // may be null (outside elective buckets) without warning
          }
        }

        if (!admDate) {
          warnings.push(`Row ${idx + 1}: Missing Date of Admission`);
        } else {
          // Update min/max dates if admission date is valid
          if (!minDate || admDate < minDate) minDate = admDate;
          if (!maxDate || admDate > maxDate) maxDate = admDate;
        }

        const department_id = resolveDeptIdForBed(bed); // NEW: assign ward directly from Bed DB
        if (!department_id) {
          warnings.push(`Row ${idx + 1}: Bed '${bed}' not found in Bed database or not mapped to a department; defaulting to global scope.`);
        }

        transformed.push({
          admission_date: admDate,
          admission_time: admTime,
          bed,
          pt_id,
          clinician,
          los,
          type, // "DC" or "IP"
          discharge_date,
          timeofday: tod, // can be null; UI ignores null bucket
          is_day_case: type === "DC",
          is_inpatient: type === "IP",
          department_id, // NEW: now dynamically resolved
          source_file: file.name,
          uploaded_by: me?.email || "",
          uploaded_at: new Date().toISOString()
        });
      });

      setPreview({
        rows: transformed,
        warnings,
        dateSpan: minDate && maxDate ? { min: minDate, max: maxDate } : null,
        fileName: file.name
      });
      // Show success irrespective of logging
      setUploadStatus({ type: "success", message: `Parsed ${transformed.length} rows${warnings.length ? ` with ${warnings.length} warning(s)` : ""}. Ready to import.` });
      // Best-effort logging (do not break UX if this fails)
      try {
        await UploadLog.create({
          scope: "admissions",
          department_id: "", // Log is global for the upload action
          file_name: file.name,
          status: "uploaded",
          rows_count: transformed.length,
          details: warnings.length ? `${warnings.length} warning(s)` : "Parsed",
          uploaded_by: me?.email || "",
          uploaded_at: new Date().toISOString()
        });
        await refreshLastLog();
      } catch (logErr) {
        console.warn("UploadLog.create (uploaded) failed (non-fatal):", logErr?.message || logErr);
      }
    } catch (e) {
      const msg = e?.message || "Upload failed";
      setUploadStatus({ type: "error", message: msg });
      // Persist failure
      try {
        await UploadLog.create({
          scope: "admissions",
          department_id: "", // global scope for logs
          file_name: file?.name || "",
          status: "failed",
          rows_count: 0,
          details: msg,
          uploaded_by: me?.email || "",
          uploaded_at: new Date().toISOString()
        });
        await refreshLastLog();
      } catch (logError) {
        console.error("Failed to log upload failure:", logError);
      }
    } finally {
      setBusy(false);
      // NEW: allow choosing the same file again by clearing the input value
      if (fileInputRef.current) {
        try { fileInputRef.current.value = ""; } catch {}
      }
    }
  };

  // Metrics
  const byDate = React.useMemo(() => {
    const map = {};
    days.forEach(d => {
      const k = dStr(d);
      map[k] = {
        dayCases: 0,
        inpatients: 0,
        totalAdmissions: 0,
        arrivals: { golden: 0, morning: 0, afternoon: 0, evening: 0 },
        activeInpatients: 0,
        aimDischargeToday: 0,
        totalDischarges: 0,
        censusEoD: 0
      };
    });

    const ev = events || [];

    // Expected admissions and arrivals by block
    ev.forEach(e => {
      const d = String(e.admission_date || "");
      if (!(d in map)) return;
      if (e.type === "DC") map[d].dayCases += 1;
      if (e.type === "IP") map[d].inpatients += 1;
      if (e.timeofday && map[d].arrivals[e.timeofday] !== undefined) {
        map[d].arrivals[e.timeofday] += 1;
      }
    });

    // Active inpatients baseline at start of day D
    days.forEach(d => {
      const D = dStr(d);
      map[D].activeInpatients = ev.filter(e =>
        e.type === "IP" &&
        String(e.admission_date || "") < D &&
        (!e.discharge_date || String(e.discharge_date) > D)
      ).length;
    });

    // FIXED: Aim-discharge - ONLY count inpatients admitted BEFORE today
    ev.forEach(e => {
      const dis = String(e.discharge_date || "");
      const adm = String(e.admission_date || "");
      if (dis in map && e.type === "IP" && adm < dis) {
        // Only count as discharge if admitted on a PREVIOUS day
        map[dis].aimDischargeToday += 1;
      }
    });

    // Day cases discharge same day (correct)
    ev.forEach(e => {
      const adm = String(e.admission_date || "");
      if (e.type === "DC" && adm in map) {
        map[adm].totalDischarges += 1;
      }
    });

    days.forEach(d => {
      const D = dStr(d);
      map[D].totalAdmissions = map[D].dayCases + map[D].inpatients;
      map[D].totalDischarges += map[D].aimDischargeToday;
      
      // FIXED: Census = start + new admissions - discharges of PREVIOUS patients
      // Note: This census represents inpatients remaining at the end of the day.
      // Day cases are not included as they discharge on the same day.
      map[D].censusEoD = Math.max(0, 
        (map[D].activeInpatients || 0) + 
        (map[D].inpatients || 0) - 
        (map[D].aimDischargeToday || 0)
      );
    });

    return map;
  }, [days, events]);

  // NEW: Derive day/night patients FOR A SPECIFIC WARD based on its admissions
  const derivePatientsForDayAndWard = React.useCallback((dateKey, wardId) => {
    // AdmissionEvents now have department_id assigned.
    // Therefore, filter events strictly by the wardId.
    const wardEvents = (events || []).filter(e => e.department_id === wardId);

    let activeInpatients = 0; // Patients admitted before dateKey, not discharged by dateKey
    let newInpatients = 0;    // Patients admitted on dateKey
    let aimDischargeToday = 0; // Patients admitted before dateKey, discharged on dateKey

    wardEvents.forEach(e => {
      const adm = String(e.admission_date || "");
      const dis = String(e.discharge_date || "");

      // Active inpatients at start of day (on previous days, still present)
      if (e.type === "IP" && adm < dateKey && (!dis || dis > dateKey)) {
        activeInpatients += 1;
      }

      // New inpatients admitted today
      if (e.type === "IP" && adm === dateKey) {
        newInpatients += 1;
      }

      // Discharges today (of patients admitted before today)
      if (e.type === "IP" && dis === dateKey && adm < dateKey) {
        aimDischargeToday += 1;
      }
    });

    // Day patients: Total inpatients expected at some point during the day.
    // This is essentially the census at the start of the day PLUS new admissions MINUS discharges for that day.
    const day = Math.max(0, activeInpatients + newInpatients); // Day patients could be start_of_day + new_admissions. Discharges happen during the day.
    // Night patients: Census at End of Day.
    // Equivalent to patients present at the end of the day.
    const night = Math.max(0, activeInpatients + newInpatients - aimDischargeToday);

    return { day, night };
  }, [events]);


  // Add demo generator for 30-day sample
  const loadDemoMonth = async () => {
    setBusy(true);
    setUploadStatus({ type: "info", message: "Generating demo data…" });
    try {
      const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const rows = [];
      // Generate demo data for the combined/global scope
      days.forEach(d => {
        const k = dStr(d);
        const dc = rand(0,3);
        const ip = rand(0,4);
        for (let i=0;i<dc;i++){
          const h = [6,8,12,16][rand(0,3)];
          const m = ["00","15","30","45"][rand(0,3)];
          const bedName = String(rand(41,66)); // NEW: align with Bed DB by generating numeric bed names
          rows.push({
            admission_date: k,
            admission_time: `${String(h).padStart(2,"0")}:${m}`,
            bed: bedName,
            pt_id: `D${k.replace(/-/g,"")}${i}`,
            clinician: "Team",
            los: 0,
            type: "DC",
            discharge_date: k,
            timeofday: h<8?"golden":h<12?"morning":h<16?"afternoon":"evening",
            is_day_case: true,
            is_inpatient: false,
            department_id: resolveDeptIdForBed(bedName), // NEW: resolve department_id from bed
            source_file: "demo",
            uploaded_by: me?.email || "demo",
            uploaded_at: new Date().toISOString()
          });
        }
        for (let j=0;j<ip;j++){
          const admitH = [8,12,16][rand(0,2)];
          const m = ["00","30"][rand(0,1)];
          const losDays = rand(1,4);
          const disc = new Date(d.getTime());
          disc.setDate(disc.getDate()+losDays);
          const bedName = String(rand(41,66)); // NEW: align with Bed DB
          rows.push({
            admission_date: k,
            admission_time: `${String(admitH).padStart(2,"0")}:${m}`,
            bed: bedName,
            pt_id: `I${k.replace(/-/g,"")}${j}`,
            clinician: "Team",
            los: losDays,
            type: "IP",
            discharge_date: dStr(disc),
            timeofday: admitH<12?"morning":admitH<16?"afternoon":"evening",
            is_day_case: false,
            is_inpatient: true,
            department_id: resolveDeptIdForBed(bedName), // NEW: resolve department_id from bed
            source_file: "demo",
            uploaded_by: me?.email || "demo",
            uploaded_at: new Date().toISOString()
          });
        }
      });
      // Clear existing month for global scope
      const existing = await AdmissionEvent.list();
      const del = [];
      (existing || []).forEach(ev => {
        const inMonth = String(ev.admission_date || "").startsWith(monthKey);
        if (inMonth) del.push(AdmissionEvent.delete(ev.id)); // Delete all global events for the month
      });
      await Promise.all(del);
      await AdmissionEvent.bulkCreate(rows);
      
      // Reload data to reflect new demo admissions before updating census
      await loadData(); 

      // After creating demo admissions, update WardCensus for all wards.
      const allWards = departments;
      const existingCensus = await WardCensus.list();
      const monthKeyPrefix = format(monthStart, "yyyy-MM");
      let totalUpdated = 0;

      for (const ward of allWards) {
        const wardOps = [];
        days.forEach((dayDate) => {
          const k = dStr(dayDate);
          if (!String(k).startsWith(monthKeyPrefix)) return;
          
          // Recalculate patients for this specific ward and day using the new function
          const { day, night } = derivePatientsForDayAndWard(k, ward.id);
          const row = (existingCensus || []).find(r => r.department_id === ward.id && r.date === k);
          
          const payload = {
            department_id: ward.id,
            date: k,
            patients_day: day,
            patients_night: night,
            source: "demo_data", // Indicating it's derived from demo admissions
            locked: false
          };
          
          if (row) {
            const changed = (row.patients_day || 0) !== day || (row.patients_night || 0) !== night;
            if (changed && !row.locked) { // Only update if values differ and not locked
              wardOps.push(WardCensus.update(row.id, payload));
              totalUpdated++;
            }
          } else if (day > 0 || night > 0) { // Only create if there are patients
            wardOps.push(WardCensus.create(payload));
            totalUpdated++;
          }
        });
        await Promise.all(wardOps);
      }

      setUploadStatus({ type: "success", message: `Demo month populated. Updated census for ${totalUpdated} ward-days.` });
      try {
        await UploadLog.create({
          scope: "admissions",
          department_id: "",
          file_name: "demo",
          status: "imported",
          rows_count: rows.length,
          details: `Demo month populated, Census updated for ${totalUpdated} ward-days`,
          uploaded_by: me?.email || "demo",
          uploaded_at: new Date().toISOString()
        });
        await refreshLastLog();
      } catch (logErr) {
        console.warn("UploadLog.create (demo import) failed (non-fatal):", logErr?.message || logErr);
      }
    } catch (e) {
      const msg = e?.message || "Demo populate failed";
      setUploadStatus({ type: "error", message: msg });
      try {
        await UploadLog.create({
          scope: "admissions",
          department_id: "", // Global scope for log
          file_name: "demo",
          status: "failed",
          rows_count: 0,
          details: msg,
          uploaded_by: me?.email || "",
          uploaded_at: new Date().toISOString()
        });
        await refreshLastLog();
      } catch (logError) {
        console.error("Failed to log demo populate failure:", logError);
      }
    } finally {
      setBusy(false);
    }
  };

  // UPDATED: confirmImport with correct ward-specific census calculation
  const confirmImport = async () => {
    if (!preview.rows.length) return;
    setBusy(true);
    setUploadStatus({ type: "info", message: "Importing admissions and calculating ward census..." });
    
    try {
      // Delete existing admissions in date range
      const toPurge = await AdmissionEvent.list();
      const purgeSet = new Set();
      const spanMin = preview.dateSpan?.min || dStr(monthStart);
      const spanMax = preview.dateSpan?.max || dStr(monthEnd);

      (toPurge || []).forEach(ev => {
        const d = String(ev.admission_date || "");
        if (d >= spanMin && d <= spanMax) {
          purgeSet.add(ev.id);
        }
      });
      await Promise.all(Array.from(purgeSet).map(id => AdmissionEvent.delete(id)));

      // Bulk insert new admissions
      await AdmissionEvent.bulkCreate(preview.rows);
      
      // Reload events to get fresh data
      await loadData();

      // AUTO-UPDATE: Calculate and write census for each ward
      const existingCensus = await WardCensus.list();
      const monthKeyPrefix = format(monthStart, "yyyy-MM");
      
      let totalUpdated = 0;
      for (const ward of departments) {
        const ops = [];
        
        for (const d of days) {
          const k = dStr(d);
          if (!String(k).startsWith(monthKeyPrefix)) continue;
          
          // Calculate ward-specific census using the new function
          const { day, night } = derivePatientsForDayAndWard(k, ward.id);
          
          const row = (existingCensus || []).find(r => r.department_id === ward.id && r.date === k);
          
          const payload = {
            department_id: ward.id,
            date: k,
            patients_day: day,
            patients_night: night,
            source: "csv_import",
            locked: false
          };
          
          if (row) {
            const changed = (row.patients_day || 0) !== day || (row.patients_night || 0) !== night;
            if (changed && !row.locked) { // Do not override manually locked entries
              ops.push(WardCensus.update(row.id, payload));
              totalUpdated++;
            }
          } else if (day > 0 || night > 0) { // Only create new entries if there are actual patients
            ops.push(WardCensus.create(payload));
            totalUpdated++;
          }
        }
        
        await Promise.all(ops);
      }

      setPreview({ rows: [], warnings: [], dateSpan: null, fileName: "" });

      setUploadStatus({ 
        type: "success", 
        message: `Imported ${preview.rows.length} admissions. Updated census for ${totalUpdated} ward-days.` 
      });
      
      try {
        await UploadLog.create({
          scope: "admissions",
          department_id: "",
          file_name: preview.fileName || "uploaded.csv",
          status: "imported",
          rows_count: preview.rows.length,
          details: `Census updated for ${totalUpdated} ward-days`,
          uploaded_by: me?.email || "",
          uploaded_at: new Date().toISOString()
        });
        await refreshLastLog();
      } catch (logErr) {
        console.warn("Logging failed:", logErr);
      }
    } catch (e) {
      const msg = e?.message || "Import failed";
      setUploadStatus({ type: "error", message: msg });
      try {
        await UploadLog.create({
          scope: "admissions",
          department_id: "", // Global scope for log
          file_name: preview.fileName || "",
          status: "failed",
          rows_count: 0,
          details: msg,
          uploaded_by: me?.email || "",
          uploaded_at: new Date().toISOString()
        });
        await refreshLastLog();
      } catch (logError) {
        console.error("Failed to log import failure:", logError);
      }
    } finally {
      setBusy(false);
    }
  };

  // REMOVED: writeWardCensus function entirely

  // Interactive chart data
  const barData = React.useMemo(() => {
    return days.map(d => {
      const k = dStr(d);
      return { day: format(d, "dd-MMM"), key: k, admissions: (byDate[k]?.totalAdmissions || 0) + (unplanned[k] || 0) };
    });
  }, [days, byDate, unplanned]);

  const totalsForSlice = React.useMemo(() => {
    let dc = 0, ip = 0;
    if (selectedDate) {
      const k = selectedDate;
      dc = byDate[k]?.dayCases || 0;
      ip = (byDate[k]?.inpatients || 0) + (unplanned[k] || 0); // Include unplanned as inpatients for simplicity
    } else {
      // month totals
      days.forEach(d => {
        const k = dStr(d);
        dc += byDate[k]?.dayCases || 0;
        ip += (byDate[k]?.inpatients || 0) + (unplanned[k] || 0);
      });
    }
    return { dayCases: dc, inpatients: ip };
  }, [selectedDate, byDate, unplanned, days]);


  // Unplanned admissions IO
  const handleUnplannedChange = async (dateKey, value) => {
    const v = Number(value || 0);
    setUnplanned(prev => ({ ...prev, [dateKey]: v }));
  };
  const saveUnplanned = async (dateKey) => {
    const v = Number(unplanned[dateKey] || 0);
    // UnplannedDaily records are still department-specific
    const existing = (await UnplannedDaily.list()).find(r => r.department_id === deptId && r.date === dateKey);
    if (existing) await UnplannedDaily.update(existing.id, { unplanned_count: v });
    else await UnplannedDaily.create({ department_id: deptId, date: dateKey, unplanned_count: v });
  };

  // UI bits
  const MonthPicker = (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarIcon className="w-4 h-4" />
          {format(monthAnchor, "MMMM yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Calendar mode="single" selected={monthAnchor} onSelect={(d) => { if (d) { setSelectedDate(null); setMonthAnchor(d); } }} />
      </PopoverContent>
    </Popover>
  );

  // Ward selector with Combined option
  const WardPicker = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">Ward:</span>
      <Select value={deptId || ""} onValueChange={(v) => { setSelectedDate(null); setDeptId(v); }}>
        <SelectTrigger className="w-64 h-9">
          <SelectValue placeholder="Select ward" />
        </SelectTrigger>
        <SelectContent>
          {combinedIds.length > 0 && (
            <SelectItem value={COMBINED_ID}>Combined (Ward 2 + Ward 3 + ECU)</SelectItem>
          )}
          {(departments || []).map(d => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Colors for donut
  const donutColors = ["#0ea5e9", "#f59e0b"];

  return (
    <div className="space-y-4">
      {/* Top visual summary - full width */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-8 shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Daily Admissions</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} onClick={(e) => {
                  const key = e?.activePayload?.[0]?.payload?.key;
                  if (key) setSelectedDate(prev => prev === key ? null : key);
                }}>
                  <XAxis dataKey="day" interval={0} angle={-30} dy={15} height={50} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="admissions" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {selectedDate ? `Slice: ${format(new Date(selectedDate), "dd-MMM")} — click again to clear.` : "Showing month totals. Click a bar or a date header below to slice."}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4 shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Case Mix {selectedDate ? `(on ${format(new Date(selectedDate), "dd-MMM")})` : "(month)"}</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: "Day Cases", value: totalsForSlice.dayCases },
                    { name: "Inpatients", value: totalsForSlice.inpatients }
                  ]} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8">
                    {donutColors.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-sm font-medium text-slate-700">
              Total: {totalsForSlice.dayCases + totalsForSlice.inpatients}
            </div>
          </CardContent>
        </Card>

        {/* Controls aligned to the right, full-width friendly */}
        <div className="xl:col-span-12 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Month:</span>
            {MonthPicker}
          </div>
          {WardPicker}
          <Badge variant="outline" className="text-xs">{events.length} events</Badge>
          <Button variant="outline" onClick={() => setSelectedDate(null)} className="ml-auto h-8">Clear slice</Button>
        </div>
      </div>

      {/* Forecast table - stretched (no horizontal scroll on desktop) */}
      <div className="w-full overflow-auto"> {/* Added overflow-auto here */}
        <div className="grid border rounded-md" style={{ gridTemplateColumns: `220px repeat(${days.length}, 1fr)`, minWidth: `${220 + days.length * 60}px` }}> {/* minWidth for horizontal scroll */}
          {/* Header dates (clickable for slicing) */}
          <div className="bg-white px-3 py-2 font-semibold"> </div>
          {days.map(d => {
            const k = dStr(d);
            const isSel = selectedDate === k;
            return (
              <div
                key={"h"+k}
                onClick={() => setSelectedDate(prev => prev === k ? null : k)}
                className={`${isSel ? "bg-slate-900" : "bg-slate-800"} text-white px-2 py-2 text-xs text-center font-semibold border-l border-slate-700 cursor-pointer hover:brightness-110`}
                title="Click to slice charts by this date"
              >
                {format(d, "dd-MMM")}
              </div>
            );
          })}

          {/* Expected DC */}
          <div className="bg-white border-t border-b px-3 py-2 text-sm">EXPECTED DAY CASES:</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"dc"+k} className="bg-white border-t border-b border-l px-2 py-2 text-center">{byDate[k]?.dayCases || 0}</div>;
          })}

          {/* Expected IP */}
          <div className="bg-white border-b px-3 py-2 text-sm">EXPECTED INPATIENTS:</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"ip"+k} className="bg-white border-b border-l px-2 py-2 text-center">{byDate[k]?.inpatients || 0}</div>;
          })}

          {/* Total admissions */}
          <div className="bg-yellow-100 border-b px-3 py-2 text-sm font-semibold">TOTAL ADMISSIONS:</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"ta"+k} className="bg-yellow-100 border-b border-l px-2 py-2 text-center font-semibold">{byDate[k]?.totalAdmissions || 0}</div>;
          })}

          {/* Arrivals by time blocks header row */}
          <div className="bg-slate-50 border-b px-3 py-2 text-sm">ARRIVALS BY TIME BLOCK OF DAY:</div>
          {days.map(d => <div key={"sep1"+dStr(d)} className="bg-slate-50 border-b border-l px-2 py-2" />)}

          {/* Golden */}
          <div className="bg-white border-b px-3 py-2 text-sm">06:00–08:00</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"g"+k} className="bg-white border-b border-l px-2 py-2 text-center">{byDate[k]?.arrivals.golden || 0}</div>;
          })}

          {/* Morning */}
          <div className="bg-white border-b px-3 py-2 text-sm">08:00–12:00</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"m"+k} className="bg-white border-b border-l px-2 py-2 text-center">{byDate[k]?.arrivals.morning || 0}</div>;
          })}

          {/* Afternoon */}
          <div className="bg-white border-b px-3 py-2 text-sm">12:00–16:00</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"a"+k} className="bg-white border-b border-l px-2 py-2 text-center">{byDate[k]?.arrivals.afternoon || 0}</div>;
          })}

          {/* Evening */}
          <div className="bg-white border-b px-3 py-2 text-sm">16:00–20:00</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"e"+k} className="bg-white border-b border-l px-2 py-2 text-center">{byDate[k]?.arrivals.evening || 0}</div>;
          })}

          {/* Active inpatients */}
          <div className="bg-white border-b px-3 py-2 text-sm">ACTIVE INPATIENTS:</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"act"+k} className="bg-white border-b border-l px-2 py-2 text-center">{byDate[k]?.activeInpatients || 0}</div>;
          })}

          {/* IP aim discharged today */}
          <div className="bg-white border-b px-3 py-2 text-sm">INPATIENTS AIM DISCHARGED TODAY:</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"aim"+k} className="bg-white border-b border-l px-2 py-2 text-center">{byDate[k]?.aimDischargeToday || 0}</div>;
          })}

          {/* Total discharges today */}
          <div className="bg-yellow-100 border-b px-3 py-2 text-sm font-semibold">TOTAL DISCHARGES TODAY:</div>
          {days.map(d => {
            const k = dStr(d);
            return <div key={"td"+k} className="bg-yellow-100 border-b border-l px-2 py-2 text-center font-semibold">{byDate[k]?.totalDischarges || 0}</div>;
          })}

          {/* Census end of day */}
          <div className="bg-yellow-100 border-b px-3 py-2 text-sm font-semibold">CENSUS BY END OF THE DAY:</div>
          {days.map(d => {
            const k = dStr(d);
            const val = byDate[k]?.censusEoD || 0;
            const cls = val < 0 ? "bg-rose-100 text-rose-700" : "bg-yellow-100";
            return <div key={"ce"+k} className={`${cls} border-b border-l px-2 py-2 text-center font-semibold`}>{val}</div>;
          })}

          {/* Unplanned (combined = read-only aggregate) */}
          <div className="bg-white border-b px-3 py-2 text-sm">UNPLANNED ADMISSIONS:</div>
          {days.map(d => {
            const k = dStr(d);
            const val = unplanned[k] ?? 0;
            const readOnly = deptId === COMBINED_ID; // Unplanned is read-only when "Combined" is selected
            return (
              <div key={"up"+k} className="bg-white border-b border-l px-2 py-1 text-center">
                <Input
                  type="number"
                  min={0}
                  value={val}
                  onChange={(e) => !readOnly && handleUnplannedChange(k, e.target.value)}
                  onBlur={() => !readOnly && saveUnplanned(k)}
                  className="h-8 w-16 mx-auto text-center"
                  disabled={readOnly}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload + preview moved to bottom */}
      <Card className="shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Import admissions (CSV) or load demo month</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {/* Status banner */}
          {uploadStatus && (
            <div className={`rounded-md px-3 py-2 text-sm border ${uploadStatus.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : uploadStatus.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-sky-50 border-sky-200 text-sky-700"}`}>
              <div className="flex items-center gap-2">
                {uploadStatus.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : uploadStatus.type === "error" ? <AlertCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                <span>{uploadStatus.message}</span>
              </div>
            </div>
          )}

          {/* Busy progress bar */}
          {busy && (
            <div className="w-full h-1 bg-slate-200 rounded overflow-hidden">
              <div className="h-1 bg-sky-500 animate-[progress_1.2s_ease_infinite]" style={{ width: "45%" }} />
              <style>{`@keyframes progress{0%{transform:translateX(-100%)}50%{transform:translateX(20%)}100%{transform:translateX(220%)}}`}</style>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="h-8">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Download CSV template
            </Button>

            {/* CHANGE: use a ref + explicit onClick so the dialog always opens */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              disabled={busy} // Uploads now allowed regardless of deptId selection
            />
            <Button
              className="h-8"
              disabled={busy} // Uploads now allowed regardless of deptId selection
              onClick={() => {
                if (!busy) fileInputRef.current?.click();
              }}
            >
              {busy && (uploadStatus?.type === "info" && uploadStatus?.message.includes("Uploading") )
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Upload className="w-4 h-4 mr-2" />}
              Upload CSV
            </Button>

            {/* Replaced old combined-id badge with a new one reflecting global scope */}
            <Badge variant="outline" className="text-xs">All admissions are imported in combined scope (W2+W3+ECU)</Badge>

            <Button variant="outline" onClick={loadDemoMonth} className="h-8" disabled={busy}>
              Populate demo month
            </Button>

            {preview.rows.length > 0 && (
              <>
                <Badge className="bg-emerald-100 text-emerald-700">{preview.rows.length} rows ready</Badge>
                {preview.dateSpan && (
                  <Badge variant="outline" className="text-xs">Range {preview.dateSpan.min} → {preview.dateSpan.max}</Badge>
                )}
                <Button onClick={confirmImport} disabled={busy} className="h-8 bg-sky-600 hover:bg-sky-700">
                  {busy && (uploadStatus?.type === "info" && uploadStatus?.message.includes("Importing") ) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Confirm import
                </Button>
                <Button variant="outline" onClick={() => setPreview({ rows: [], warnings: [], dateSpan: null, fileName: "" })} className="h-8">
                  <Trash2 className="w-4 h-4 mr-2" /> Clear preview
                </Button>
              </>
            )}
          </div>

          <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded p-2 flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>When you import admissions, the Safe Staffing Calculator will automatically update with projected patient counts for all wards.</span>
          </div>

          {/* Warnings panel unchanged */}
          {preview.warnings.length > 0 && (
            <div className="text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <div>
                <div className="font-medium">Warnings</div>
                <ul className="list-disc ml-4">
                  {preview.warnings.slice(0,8).map((w,i)=><li key={i}>{w}</li>)}
                </ul>
                {preview.warnings.length > 8 && <div>…and {preview.warnings.length - 8} more</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* REMOVED: Ward Census writer card entirely */}

      {/* Sticky bottom status (last upload) */}
      <div className="sticky bottom-0 z-20">
        {lastLog && (
          <div className="mx-0 my-2 px-3 py-2 rounded-md border bg-white/95 backdrop-blur flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs ${lastLog.status === "imported" ? "bg-emerald-100 text-emerald-700" : lastLog.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"}`}>
                {lastLog.status}
              </span>
              <span>Last upload</span>
              <span className="text-slate-700 font-medium">{lastLog.file_name || "—"}</span>
              <span className="text-slate-500">by {new Date(lastLog.uploaded_at || lastLog.created_date).toLocaleString()}</span>
            </div>
            {lastLog.details && <div className="text-slate-500">{lastLog.details}</div>}
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500">
        Combined mode for the ward picker aggregates Unplanned Admissions from Ward 2, Ward 3 and ECU, and displays globally imported Admission Events. Safe Staffing Calculator updates automatically on import.
      </div>
    </div>
  );
}
