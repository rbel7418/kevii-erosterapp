import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Link as LinkIcon, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Shift } from "@/entities/Shift";
import { Employee } from "@/entities/Employee";
import { Department } from "@/entities/Department";
import { Role } from "@/entities/Role";
import { ShiftCode } from "@/entities/ShiftCode";
import { withRetry, sleep } from "@/components/utils/withRetry";
import { emailPrefix } from "@/components/utils/strings";

export default function QueryImportPanel() {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);

  const isCSV = (f) => {
    if (!f) return false;
    const nameOk = /\.csv$/i.test(f.name || "");
    const typeOk = String(f.type || "").toLowerCase().includes("csv");
    return nameOk || typeOk;
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!isCSV(selected)) {
      setFile(null);
      setResults(null);
      setError("Only CSV files are supported. Please export your Excel/Power BI query to CSV.");
      return;
    }
    setFile(selected);
    setError("");
    setResults(null);
  };

  // CSV parser with quotes support
  const parseCSV = (text) => {
    const rows = [];
    let current = [];
    let value = "";
    let inQuotes = false;

    const pushValue = () => { current.push(value); value = ""; };
    const pushRow = () => { rows.push(current); current = []; };

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { value += '"'; i++; }
          else { inQuotes = false; }
        } else {
          value += c;
        }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") pushValue();
        else if (c === "\n") { pushValue(); pushRow(); }
        else if (c === "\r") { /* ignore */ }
        else value += c;
      }
    }
    if (value.length > 0 || current.length > 0) {
      pushValue();
      pushRow();
    }
    return rows.filter(r => r.length && r.some(cell => String(cell).trim().length));
  };

  // Date/time helpers
  const excelSerialToDate = (n) => {
    const base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + Number(n) * 86400000);
  };

  const normalizeDateValue = (input) => {
    const s = String(input || "").trim();
    if (!s) return null;

    if (/^\d{4,6}$/.test(s)) {
      const num = Number(s);
      if (num > 1 && num < 100000) {
        const d = excelSerialToDate(num);
        if (!isNaN(d.getTime())) {
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth() + 1).padStart(2, "0");
          const da = String(d.getUTCDate()).padStart(2, "0");
          return `${y}-${m}-${da}`;
        }
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // dd/MM/yyyy
    const parts1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts1) {
      const dd = parseInt(parts1[1], 10);
      const mm = parseInt(parts1[2], 10);
      const yyyy = parseInt(parts1[3], 10);
      const d = new Date(yyyy, mm - 1, dd);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }

    // MM/dd/yyyy
    const parts2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts2) {
      const mm = parseInt(parts2[1], 10);
      const dd = parseInt(parts2[2], 10);
      const yyyy = parseInt(parts2[3], 10);
      const d = new Date(yyyy, mm - 1, dd);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return null;
  };

  const normalizeTime = (input, fallback) => {
    const s = String(input || "").trim();
    if (!s) return fallback;
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      const [h, m] = s.split(":").map(Number);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    if (/^\d{3,4}$/.test(s)) {
      const p = s.padStart(4, "0");
      return `${p.slice(0, 2)}:${p.slice(2)}`;
    }
    if (/^\d{1,2}$/.test(s)) {
      const h = parseInt(s, 10);
      if (!isNaN(h) && h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
    }
    return fallback;
  };

  const headerToKey = (h) => {
    const n = String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (n === "staffname" || n === "name" || n === "employeename") return "staff_name";
    if (n === "department" || n === "dept" || n === "ward") return "department";
    if (n === "role") return "role";
    if (n === "date") return "date";
    if (n === "shiftcode") return "shift_code";
    if (n === "shiftperiod" || n === "period") return "shift_period";
    if (n === "starttime") return "start_time";
    if (n === "endtime") return "end_time";
    if (n === "empid" || n === "employeeid" || n === "staffid") return "emp_id";
    if (n === "workstatus" || n === "status") return "work_status";
    return null;
  };

  const norm = (v) => (v == null ? "" : String(v)).trim().toLowerCase();
  const resolveDept = (val, departments) => {
    const needle = norm(val);
    if (!needle) return null;
    return (departments || []).find(
      (d) => norm(d.name) === needle || norm(d.code) === needle || norm(d.id) === needle
    ) || null;
  };

  const findByName = (staffName, candidates) => {
    if (!staffName || !Array.isArray(candidates) || candidates.length === 0) return null;
    const searchName = String(staffName).toLowerCase().trim();

    let match = candidates.find(e => String(e.full_name || "").toLowerCase().trim() === searchName);
    if (match) return match;

    match = candidates.find(e => (emailPrefix(e.user_email) || "").toLowerCase().trim() === searchName);
    if (match) return match;

    match = candidates.find(e => String(e.full_name || "").toLowerCase().includes(searchName));
    if (match) return match;

    const parts = searchName.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      match = candidates.find(e => {
        const empParts = String(e.full_name || "").toLowerCase().split(" ").filter(Boolean);
        return empParts.length >= 2 &&
               empParts[0]?.[0] === parts[0]?.[0] &&
               empParts[empParts.length - 1] === parts[parts.length - 1];
      });
      if (match) return match;
    }
    return null;
  };

  const importFromRows = async (rows) => {
    if (!rows || rows.length < 2) {
      setError("The CSV appears to be empty.");
      return;
    }
    setIsImporting(true);
    setError("");
    setResults(null);

    try {
      const [employees, departments, roles, shiftCodes] = await Promise.all([
        withRetry(() => Employee.list()),
        withRetry(() => Department.list()),
        withRetry(() => Role.list()),
        withRetry(() => ShiftCode.list())
      ]);

      const codeMap = {};
      (shiftCodes || []).forEach(sc => {
        const code = String(sc.code || "").toUpperCase();
        if (code) codeMap[code] = sc;
      });

      const headerRow = rows[0];
      const mappedHeaders = headerRow.map(headerToKey);

      const requiredHeaders = ["staff_name", "date", "shift_code"];
      const hasRequired = requiredHeaders.every((k) => mappedHeaders.includes(k));
      if (!hasRequired) {
        setError("Missing required columns. Required: StaffName, Date, ShiftCode");
        setIsImporting(false);
        return;
      }

      const results = {
        total: rows.length - 1,
        matched: 0,
        unmatched: 0,
        unmatchedNames: [],
        created: 0,
        failed: 0
      };

      const shiftsToCreate = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every(cell => !String(cell).trim())) continue;

        const rec = {};
        for (let c = 0; c < headerRow.length; c++) {
          const key = mappedHeaders[c];
          if (!key) continue;
          rec[key] = row[c] != null ? String(row[c]).trim() : "";
        }

        if (!rec.staff_name || !rec.date || !rec.shift_code) {
          results.failed++;
          continue;
        }

        let dept = null;
        if (rec.department) {
          const maybe = resolveDept(rec.department, departments);
          if (maybe) dept = maybe;
        }

        let candidates = (employees || []).filter(e => e.is_active !== false);
        if (dept?.id) {
          candidates = candidates.filter(e => String(e.department_id || "") === String(dept.id));
        }

        const employee = findByName(rec.staff_name, candidates);
        if (employee) results.matched++;
        else {
          results.unmatched++;
          results.unmatchedNames.push(rec.department ? `${rec.staff_name} • ${rec.department}` : `${rec.staff_name}`);
        }

        const formattedDate = normalizeDateValue(rec.date);
        if (!formattedDate) {
          results.failed++;
          continue;
        }

        const sc = codeMap[String(rec.shift_code || "").toUpperCase()];
        const startFallback = sc?.default_start_time || "09:00";
        const endFallback = sc?.default_end_time || "17:00";
        const breakMinutes = typeof sc?.default_break_minutes === "number" ? sc.default_break_minutes : 30;

        const startTime = normalizeTime(rec.start_time, startFallback);
        const endTime = normalizeTime(rec.end_time, endFallback);

        const csvRole = roles.find(r =>
          String(r.name || "").toLowerCase().trim() === String(rec.role || "").toLowerCase().trim()
        );
        const inferredRoleId =
          csvRole?.id ||
          (employee?.role_ids && employee.role_ids.length > 0 ? employee.role_ids[0] : (roles[0]?.id || ""));

        const departmentId = dept?.id || employee?.department_id || "";

        shiftsToCreate.push({
          employee_id: employee?.id || "",
          role_id: inferredRoleId,
          department_id: departmentId,
          date: formattedDate,
          shift_code: rec.shift_code || "",
          shift_period: rec.shift_period || "",
          work_status: rec.work_status || "Pending",
          start_time: startTime,
          end_time: endTime,
          break_minutes: breakMinutes,
          notes: employee ? "" : `Unassigned: ${rec.staff_name}${rec.department ? ` • Dept: ${rec.department}` : ""}`,
          status: String(rec.work_status || "").toLowerCase() === "confirmed" ? "confirmed" : "scheduled",
          is_open: !employee
        });
      }

      if (shiftsToCreate.length > 0) {
        // Batch create to avoid payload limits
        const batchSize = 200;
        for (let i = 0; i < shiftsToCreate.length; i += batchSize) {
          const batch = shiftsToCreate.slice(i, i + batchSize);
          await withRetry(() => Shift.bulkCreate(batch));
          if (i % (batchSize * 2) === 0) await sleep(80);
        }
        results.created = shiftsToCreate.length;
      }

      setResults(results);
    } catch (e) {
      setError(`Import failed: ${e?.message || "Unknown error"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleProcessFile = async () => {
    if (!file) {
      setError("Please select a CSV file to upload.");
      return;
    }
    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      const rows = parseCSV(String(text || ""));
      await importFromRows(rows);
    } catch (e) {
      setError(`Unable to read the file: ${e?.message || "Unknown error"}`);
    }
  };

  const handleImportFromURL = async () => {
    if (!url) {
      setError("Enter a CSV URL to import.");
      return;
    }
    setError("");
    try {
      const res = await fetch(url);
      const text = await res.text();
      const rows = parseCSV(String(text || ""));
      await importFromRows(rows);
    } catch (e) {
      setError(`Failed to fetch the URL: ${e?.message || "Network/CORS error"}`);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-teal-600" />
          Rota Import (Excel/Power BI → CSV)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800 text-sm">
            Export your Excel/Power BI query results to CSV and import them here. You can also paste a direct CSV URL (e.g., a published link). Required columns: StaffName, Date, ShiftCode. Optional: Department, StartTime, EndTime, Role, ShiftPeriod, WorkStatus.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 rounded-lg bg-slate-50 border">
            <Label className="text-sm">Upload CSV</Label>
            <Input type="file" accept=".csv" onChange={handleFileChange} />
            <Button onClick={handleProcessFile} disabled={isImporting || !file} className="gap-2">
              <Upload className="w-4 h-4" />
              {isImporting ? "Importing…" : "Process & Import"}
            </Button>
            {file && (
              <p className="text-xs text-slate-600">Selected: {file.name}</p>
            )}
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-slate-50 border">
            <Label className="text-sm">Import from CSV URL (Power BI/SharePoint/OneDrive)</Label>
            <Input
              placeholder="https://.../export.csv"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={handleImportFromURL} disabled={isImporting || !url} className="gap-2">
              <LinkIcon className="w-4 h-4" />
              {isImporting ? "Importing…" : "Fetch & Import"}
            </Button>
            <p className="text-xs text-slate-600">
              URL must be publicly accessible and CSV-formatted. Some links may be blocked by CORS.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <Alert className={results.unmatched === 0 && results.failed === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm">
              <div className="space-y-1">
                <div><strong>Import complete</strong></div>
                <div>Shifts created: {results.created}</div>
                <div>Employees matched: {results.matched}</div>
                {results.unmatched > 0 && <div>Unmatched employees: {results.unmatched}</div>}
                {results.failed > 0 && <div>Rows skipped (invalid/missing): {results.failed}</div>}
                {results.unmatchedNames?.length > 0 && (
                  <div className="mt-2 p-2 bg-white rounded border text-xs max-h-40 overflow-auto">
                    <div className="font-semibold mb-1">Unmatched names:</div>
                    <ul className="space-y-0.5">
                      {results.unmatchedNames.map((n, i) => <li key={i}>• {n}</li>)}
                    </ul>
                    <div className="text-slate-600 mt-1">
                      These were created as open shifts. You can assign them later in Schedule.
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="p-4 rounded-lg bg-slate-50 border">
          <div className="text-sm font-semibold mb-1">Database connectors</div>
          <p className="text-sm text-slate-700">
            Direct database connectors (SQL Server, Oracle, MySQL, etc.) aren’t supported in this app.
            Workaround: schedule your query to export a CSV (e.g., via Power BI/SharePoint/OneDrive) and import using the URL above.
            If you need native connectors, enable backend functions and request a custom connector via the Feedback button.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}