
import { addMonths, isBefore, differenceInDays, parseISO } from "date-fns";

// Palette for all Compliance visuals (from provided scheme)
export const B_PAL = ["#03254c", "#1167b1", "#187bcd", "#2a9df4", "#d0efff"];

// Canonical list of modules in IPCTrainingRecord and their properties
export const IPC_MODULES = [
  { key: "ffp3_face_fit_testing_3yrs", label: "FFP 3 FACE FIT TESTING 3YRS", validityMonths: 36, risk: "high" },
  { key: "inoculation_injuries", label: "INOCULATION INJURIES", validityMonths: 24, risk: "medium" },
  { key: "hand_hygiene_bbe", label: "Hand Hygiene and BBE", validityMonths: 12, risk: "high" },
  { key: "ppe", label: "PPE", validityMonths: 12, risk: "high" },
  { key: "waste", label: "WASTE", validityMonths: 24, risk: "medium" },
  { key: "sharps_bins", label: "SHARPS BINS", validityMonths: 24, risk: "medium" },
  { key: "linen_disposal", label: "LINEN DISPOSAL", validityMonths: 24, risk: "low" },
  { key: "spill_kits", label: "SPILL KITS", validityMonths: 24, risk: "medium" },
  { key: "isolation_cleaning_mrsa_cre_viruses", label: "ISOLATION + CLEANING, MRSA , CRE + VIRUSES", validityMonths: 12, risk: "high" },
  { key: "cepheid_machine_competency_3yrs", label: "CEPHEID MACHINE competency 3YRS", validityMonths: 36, risk: "medium" },
  { key: "uniform_dress_code_induction", label: "UNIFORM & DRESS CODE INDUCTION", validityMonths: 60, risk: "low" },
  { key: "cc_alerts_induction", label: "CC Alerts INDUCTION", validityMonths: 60, risk: "low" },
];

// Color tokens for risk levels
export const RISK_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

// Category map for visual rollups
const CATEGORY_MAP = {
  ppe: "PPE",
  hand_hygiene_bbe: "Hand Hygiene",
  isolation_cleaning_mrsa_cre_viruses: "Infection Control",
  waste: "Waste Mgmt",
  sharps_bins: "Waste Mgmt",
  linen_disposal: "Waste Mgmt",
  spill_kits: "Spill Response",
  ffp3_face_fit_testing_3yrs: "Respiratory Fit",
  cepheid_machine_competency_3yrs: "Clinical Equipment",
  uniform_dress_code_induction: "Induction",
  cc_alerts_induction: "Induction",
  inoculation_injuries: "Sharps/Inoculation",
};

export function getModuleCategory(key) {
  return CATEGORY_MAP[key] || "Other";
}

// Compute status for a module date
export function computeModuleStatus(dateStr, validityMonths = 12, dueSoonDays = 60) {
  if (!dateStr) return { status: "missing", dueDate: null, overdueDays: null };
  let date;
  try { date = parseISO(String(dateStr)); } catch { date = null; }
  if (!date || isNaN(date.getTime())) return { status: "missing", dueDate: null, overdueDays: null };
  const dueDate = addMonths(date, validityMonths);
  const now = new Date();
  if (isBefore(dueDate, now)) {
    const overdueDays = Math.abs(differenceInDays(dueDate, now));
    return { status: "overdue", dueDate, overdueDays };
  }
  const daysLeft = differenceInDays(dueDate, now);
  if (daysLeft <= 60) return { status: "due_soon", dueDate, overdueDays: -daysLeft };
  return { status: "compliant", dueDate, overdueDays: null };
}

// Summarize a person's record across modules
export function summarizePerson(record) {
  const results = IPC_MODULES.map(m => {
    const v = record?.[m.key];
    const s = computeModuleStatus(v, m.validityMonths);
    return { module: m, value: v || "", ...s };
  });
  const total = results.length;
  const compliant = results.filter(r => r.status === "compliant").length;
  const overdue = results.filter(r => r.status === "overdue").length;
  const dueSoon = results.filter(r => r.status === "due_soon").length;
  const missing = results.filter(r => r.status === "missing").length;
  const pct = total ? Math.round((compliant / total) * 100) : 0;
  return { results, total, compliant, overdue, dueSoon, missing, pct };
}

// Next due (soonest due date among non-compliant or due soon; if none, null)
export function findNextDue(record) {
  const items = IPC_MODULES.map(m => {
    const s = computeModuleStatus(record?.[m.key], m.validityMonths);
    return { module: m, ...s };
  }).filter(x => x.status === "due_soon" || x.status === "overdue");
  if (!items.length) return null;
  items.sort((a, b) => {
    const ad = a.dueDate ? a.dueDate.getTime() : 0;
    const bd = b.dueDate ? b.dueDate.getTime() : 0;
    return ad - bd;
  });
  return items[0];
}

// Category compliance for a person
export function summarizeCategoriesForPerson(record) {
  const buckets = {};
  IPC_MODULES.forEach(m => {
    const cat = getModuleCategory(m.key);
    if (!buckets[cat]) buckets[cat] = { total: 0, compliant: 0 };
    buckets[cat].total += 1;
    const st = computeModuleStatus(record?.[m.key], m.validityMonths).status;
    if (st === "compliant") buckets[cat].compliant += 1;
  });
  return Object.entries(buckets).map(([category, v]) => ({
    category,
    pct: v.total ? Math.round((v.compliant / v.total) * 100) : 0
  }));
}

// Aggregate department-level compliance by risk category
export function aggregateByDepartment(records, department) {
  const list = (department && department !== "all")
    ? records.filter(r => (r.department || "").toLowerCase() === String(department).toLowerCase())
    : records.slice();

  const perRisk = { high: { total: 0, compliant: 0 }, medium: { total: 0, compliant: 0 }, low: { total: 0, compliant: 0 } };
  list.forEach(rec => {
    IPC_MODULES.forEach(m => {
      perRisk[m.risk].total += 1;
      const st = computeModuleStatus(rec[m.key], m.validityMonths).status;
      if (st === "compliant") perRisk[m.risk].compliant += 1;
    });
  });

  const byType = ["high", "medium", "low"].map(risk => {
    const t = perRisk[risk].total || 0;
    const c = perRisk[risk].compliant || 0;
    return { risk, completion: t ? Math.round((c / t) * 100) : 0 };
  });

  return { list, perRisk, byType };
}

// Build a gap list for overdue/missing, optionally filtered by risk
export function buildGapList(records, riskFilter = "all") {
  const items = [];
  records.forEach(rec => {
    IPC_MODULES.forEach(m => {
      if (riskFilter !== "all" && m.risk !== riskFilter) return;
      const s = computeModuleStatus(rec[m.key], m.validityMonths);
      if (s.status === "overdue" || s.status === "due_soon" || s.status === "missing") {
        items.push({
          full_name: rec.full_name,
          job_title: rec.job_title,
          department: rec.department,
          risk: m.risk,
          module_key: m.key,
          module_label: m.label,
          status: s.status,
          dueDate: s.dueDate
        });
      }
    });
  });
  return items;
}

// Clinical vs non-clinical compliance (avg %)
export function computeDepartmentTypeCompliance(records) {
  const clinical = records.filter(r => !!r.is_clinical);
  const nonClinical = records.filter(r => !r.is_clinical);
  const avg = (list) => {
    if (!list.length) return 0;
    const sum = list.reduce((a, r) => a + summarizePerson(r).pct, 0);
    return Math.round(sum / list.length);
  };
  return { clinicalPct: avg(clinical), nonClinicalPct: avg(nonClinical) };
}

// Stacked category compliance by staff type for a department
export function categoryComplianceByType(records) {
  const cats = {};
  ["clinical", "nonclinical"].forEach(t => cats[t] = {});
  IPC_MODULES.forEach(m => {
    const cat = getModuleCategory(m.key);
    if (!cats.clinical[cat]) cats.clinical[cat] = { total: 0, compliant: 0 };
    if (!cats.nonclinical[cat]) cats.nonclinical[cat] = { total: 0, compliant: 0 };
  });

  records.forEach(rec => {
    IPC_MODULES.forEach(m => {
      const cat = getModuleCategory(m.key);
      const st = computeModuleStatus(rec[m.key], m.validityMonths).status;
      const bucket = rec.is_clinical ? cats.clinical : cats.nonclinical;
      bucket[cat].total += 1;
      if (st === "compliant") bucket[cat].compliant += 1;
    });
  });

  const categories = Object.keys(cats.clinical);
  return categories.map(cat => ({
    category: cat,
    clinical: cats.clinical[cat].total ? Math.round((cats.clinical[cat].compliant / cats.clinical[cat].total) * 100) : 0,
    nonclinical: cats.nonclinical[cat].total ? Math.round((cats.nonclinical[cat].compliant / cats.nonclinical[cat].total) * 100) : 0
  }));
}

// Heatmap by job title and category (% compliant)
export function heatmapByJobTitle(records) {
  const jobs = Array.from(new Set(records.map(r => r.job_title || "—")));
  const cats = Array.from(new Set(IPC_MODULES.map(m => getModuleCategory(m.key))));
  const grid = jobs.map(job => {
    const rows = records.filter(r => (r.job_title || "—") === job);
    const entry = { job };
    cats.forEach(cat => {
      let total = 0, comp = 0;
      rows.forEach(r => {
        IPC_MODULES.forEach(m => {
          if (getModuleCategory(m.key) !== cat) return;
          total += 1;
          const st = computeModuleStatus(r[m.key], m.validityMonths).status;
          if (st === "compliant") comp += 1;
        });
      });
      entry[cat] = total ? Math.round((comp / total) * 100) : 0;
    });
    return entry;
  });
  return { jobs, categories: cats, grid };
}

// Overdue count by job title for bar charts
export function overdueCountByJobTitle(records) {
  const map = {};
  records.forEach(r => {
    const jt = r.job_title || "—";
    IPC_MODULES.forEach(m => {
      const st = computeModuleStatus(r[m.key], m.validityMonths).status;
      if (st === "overdue") {
        map[jt] = (map[jt] || 0) + 1;
      }
    });
  });
  return Object.entries(map).map(([job, count]) => ({ job, count }));
}
