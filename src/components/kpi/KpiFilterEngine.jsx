/* Robust PTList filter engine + explain helper
   Use it to apply stable, non-antagonistic filtering to PTListAdmission data.
   - applyFilters(rows, params): returns filtered rows
   - explainFilters(rows, params): returns stepwise counts to detect where data drops
*/
export function timeToMins(t) {
  if (!t) return null;
  const parts = String(t).trim().split(":");
  if (parts.length < 2) return null;
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

export const TIME_BANDS = [
  { key: "06-08", start: 6 * 60, end: 8 * 60, label: "06:00–08:00" },
  { key: "08-12", start: 8 * 60, end: 12 * 60, label: "08:00–12:00" },
  { key: "12-16", start: 12 * 60, end: 16 * 60, label: "12:00–16:00" },
  { key: "16-20", start: 16 * 60, end: 20 * 60, label: "16:00–20:00" },
  // overnight band (20:00–06:00 next day)
  { key: "20-06", start: 20 * 60, end: 30 * 60, label: "20:00–06:00" },
];

function withinDate(iso, start, end) {
  if (!iso) return false;
  const d = String(iso).slice(0, 10);
  return (!start || d >= start) && (!end || d <= end);
}

export function applyFilters(rows, params = {}) {
  if (!Array.isArray(rows)) return [];
  const {
    startDate, endDate, // main range
    year, month, day,   // granular date filters (optional)
    patientId, clinician, insurance, specialty, timeBand,
    dayCaseOnly = false, inpatientOnly = false,
    admissionsToday = false, dischargesToday = false,
    activePatientsOnly = false,
  } = params;

  const today = new Date().toISOString().slice(0, 10);
  const allowEitherDayType = dayCaseOnly && inpatientOnly; // union when both toggled
  const unionToday = admissionsToday && dischargesToday;   // union when both toggled

  const band = TIME_BANDS.find(b => b.key === timeBand);

  const out = rows.filter((r) => {
    // main range: include record if any of its dates intersects range
    const inRange =
      withinDate(r.admission_date, startDate, endDate) ||
      withinDate(r.discharge_date, startDate, endDate);
    if (startDate && endDate && !inRange) return false;

    // granular filters (YYYY, MM, DD) applied to admission_date
    const adm = String(r.admission_date || "").slice(0, 10);
    if (year && year !== "all" && (!adm || !adm.startsWith(String(year)))) return false;
    if (month && month !== "all") {
      const m = adm ? adm.slice(5, 7) : "";
      if (m !== String(month).padStart(2, "0")) return false;
    }
    if (day && day !== "all") {
      const d = adm ? adm.slice(8, 10) : "";
      if (d !== String(day).padStart(2, "0")) return false;
    }

    // attributes
    if (patientId && String(r.patient_id || "").toLowerCase() !== String(patientId).toLowerCase()) return false;
    if (clinician && clinician !== "all" && String(r.clinician_lead || "").toLowerCase() !== String(clinician).toLowerCase()) return false;
    if (insurance && insurance !== "all" && String(r.purchaser || "").toLowerCase() !== String(insurance).toLowerCase()) return false;
    if (specialty && specialty !== "all" && String(r.clinician_specialty_lead || "").toLowerCase() !== String(specialty).toLowerCase()) return false;

    // time band (inclusive edges), null-safe; supports overnight band
    if (band) {
      const mins = timeToMins(r.admission_time);
      if (mins == null) return false;
      if (band.key === "20-06") {
        if (!(mins >= band.start || mins < 6 * 60)) return false;
      } else {
        if (!(mins >= band.start && mins <= band.end)) return false;
      }
    }

    // Day case vs inpatient handling
    const isDayCase = String(r.cancellation_reason || "").toUpperCase().includes("DAY CASE") ||
                      String(r.primary_procedure || "").toUpperCase().includes("DAY CASE") ||
                      String(r.booking_status || "").toUpperCase().includes("DAY CASE");
    const hasDischarge = !!r.discharge_date;

    if (!allowEitherDayType) {
      if (dayCaseOnly && !isDayCase) return false;
      if (inpatientOnly && isDayCase) return false;
    }
    // union (allow both) when both toggled: no-op

    // quick toggles “today”
    if (!unionToday) {
      if (admissionsToday && String(r.admission_date || "").slice(0, 10) !== today) return false;
      if (dischargesToday && String(r.discharge_date || "").slice(0, 10) !== today) return false;
    } else {
      const admIsToday = String(r.admission_date || "").slice(0, 10) === today;
      const disIsToday = String(r.discharge_date || "").slice(0, 10) === today;
      if (!admIsToday && !disIsToday) return false;
    }

    // active patients: admitted within range and not yet discharged (or discharge after endDate)
    if (activePatientsOnly) {
      const notYet = !hasDischarge || String(r.discharge_date).slice(0, 10) > (endDate || today);
      const admitted = withinDate(r.admission_date, startDate, endDate || today);
      if (!(admitted && notYet)) return false;
    }

    return true;
  });

  return out;
}

export function explainFilters(rows, params = {}) {
  const steps = [];
  const push = (label, sample) => steps.push({ step: label, count: sample.length });

  let sample = Array.isArray(rows) ? rows.slice() : [];
  push("start (all)", sample);

  const { startDate, endDate, year, month, day, patientId, clinician, insurance, specialty, timeBand,
    dayCaseOnly, inpatientOnly, admissionsToday, dischargesToday, activePatientsOnly } = params;

  if (startDate || endDate) {
    sample = sample.filter(r =>
      withinDate(r.admission_date, startDate, endDate) || withinDate(r.discharge_date, startDate, endDate)
    );
    push("main date range", sample);
  }

  if (year && year !== "all") {
    sample = sample.filter(r => String(r.admission_date || "").startsWith(String(year)));
    push("year filter", sample);
  }
  if (month && month !== "all") {
    const mm = String(month).padStart(2, "0");
    sample = sample.filter(r => String(r.admission_date || "").slice(5, 7) === mm);
    push("month filter", sample);
  }
  if (day && day !== "all") {
    const dd = String(day).padStart(2, "0");
    sample = sample.filter(r => String(r.admission_date || "").slice(8, 10) === dd);
    push("day filter", sample);
  }

  if (patientId) {
    sample = sample.filter(r => String(r.patient_id || "").toLowerCase() === String(patientId).toLowerCase());
    push("patient id", sample);
  }
  if (clinician && clinician !== "all") {
    sample = sample.filter(r => String(r.clinician_lead || "").toLowerCase() === String(clinician).toLowerCase());
    push("clinician", sample);
  }
  if (insurance && insurance !== "all") {
    sample = sample.filter(r => String(r.purchaser || "").toLowerCase() === String(insurance).toLowerCase());
    push("insurance", sample);
  }
  if (specialty && specialty !== "all") {
    sample = sample.filter(r => String(r.clinician_specialty_lead || "").toLowerCase() === String(specialty).toLowerCase());
    push("specialty", sample);
  }

  if (timeBand && timeBand !== "all") {
    const band = TIME_BANDS.find(b => b.key === timeBand);
    sample = sample.filter(r => {
      const mins = timeToMins(r.admission_time);
      if (mins == null || !band) return false;
      if (band.key === "20-06") return mins >= band.start || mins < 6 * 60;
      return mins >= band.start && mins <= band.end;
    });
    push(`time band ${timeBand}`, sample);
  }

  const allowEitherDayType = dayCaseOnly && inpatientOnly;
  if (!allowEitherDayType) {
    if (dayCaseOnly) {
      sample = sample.filter(r => {
        const s = (String(r.booking_status || "") + "|" + String(r.primary_procedure || "") + "|" + String(r.cancellation_reason || "")).toUpperCase();
        return s.includes("DAY CASE");
      });
      push("day cases only", sample);
    }
    if (inpatientOnly) {
      sample = sample.filter(r => {
        const s = (String(r.booking_status || "") + "|" + String(r.primary_procedure || "") + "|" + String(r.cancellation_reason || "")).toUpperCase();
        return !s.includes("DAY CASE");
      });
      push("inpatients only", sample);
    }
  } else {
    push("day cases + inpatients (union)", sample);
  }

  const today = new Date().toISOString().slice(0, 10);
  const unionToday = admissionsToday && dischargesToday;
  if (!unionToday) {
    if (admissionsToday) {
      sample = sample.filter(r => String(r.admission_date || "").slice(0, 10) === today);
      push("admissions today", sample);
    }
    if (dischargesToday) {
      sample = sample.filter(r => String(r.discharge_date || "").slice(0, 10) === today);
      push("discharges today", sample);
    }
  } else {
    sample = sample.filter(r => {
      const admToday = String(r.admission_date || "").slice(0, 10) === today;
      const disToday = String(r.discharge_date || "").slice(0, 10) === today;
      return admToday || disToday;
    });
    push("today union (adm or dis)", sample);
  }

  if (activePatientsOnly) {
    sample = sample.filter(r => {
      const hasDis = !!r.discharge_date;
      const notYet = !hasDis || String(r.discharge_date).slice(0, 10) > (endDate || today);
      const admitted = withinDate(r.admission_date, startDate, endDate || today);
      return admitted && notYet;
    });
    push("active patients", sample);
  }

  // quick anomalies
  const anomalies = {
    missing_admission_date: rows.filter(r => !r.admission_date).length,
    missing_admission_time: rows.filter(r => !r.admission_time).length,
    invalid_time_format: rows.filter(r => r.admission_time && timeToMins(r.admission_time) == null).length,
  };

  return { steps, anomalies };
}