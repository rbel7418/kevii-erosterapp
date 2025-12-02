import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { Employee } from "@/entities/Employee";
import { withRetry } from "@/components/utils/withRetry";
import { downloadCsvTemplate } from "@/components/utils/csv";

export default function EmployeeUploadDialog({
  open,
  onClose,
  onUpload,
  departments,
  roles
}) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const readFileAsText = (f) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsText(f);
    });

  const detectDelimiter = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 5);
    let best = ",", bestCount = -1;
    [",",";","\t"].forEach(d => {
      const count = lines.reduce((sum, l) => sum + (l.split(d).length - 1), 0);
      if (count > bestCount) { best = d; bestCount = count; }
    });
    return best;
  };

  const parseCSV = (text) => {
    if (text && text.length && text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    const delim = detectDelimiter(text || "");
    const rows = [];
    let i = 0, field = "", row = [], inQuotes = false;

    const pushField = () => { row.push(field); field = ""; };
    const pushRow = () => {
        if (row.length > 0 && row.some(cell => String(cell || "").trim() !== "")) {
            rows.push(row);
        } else if (row.length === 0 && field.length > 0) {
            if (field.trim().length > 0) {
                row.push(field);
                rows.push(row);
            }
        }
        row = [];
    };

    while (i < text.length) {
      const c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      } else {
        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === delim) { pushField(); i++; continue; }
        if (c === "\n") { pushField(); pushRow(); i++; continue; }
        if (c === "\r") {
          if (text[i + 1] === "\n") i++;
          pushField(); pushRow(); i++; continue;
        }
        field += c; i++; continue;
      }
    }
    if (field.length > 0 || row.length > 0) {
        pushField();
        pushRow();
    }
    return rows;
  };

  const isCSVFile = (f) => {
    const name = f?.name?.toLowerCase() || "";
    const type = f?.type?.toLowerCase() || "";
    return name.endsWith(".csv") || type.includes("csv");
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsvTemplate("employee_template.csv", [
      "Employee_id",
      "Full Name",
      "Date of Join",
      "Job Title",
      "Job Cost Centre",
      "Reports To",
      "role_ids",
      "department_Code",
      "department_id",
      "Contract Type",
      "contracted_hours_weekly",
      "phone"
    ]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      if (!isCSVFile(file)) {
        setError("Only CSV files are supported. Please export your Excel to CSV (UTF-8) and re-upload.");
        setIsUploading(false);
        return;
      }

      const text = await readFileAsText(file);
      const rowsArray = parseCSV(text);
      if (!rowsArray || rowsArray.length < 2) {
        setError("No data rows found. Ensure the first row has headers and at least one data row.");
        setIsUploading(false);
        return;
      }

      const headers = rowsArray[0].map(h => String(h || "").trim());
      const dataRows = rowsArray.slice(1).filter(r => r && r.some(v => String(v || "").trim() !== ""));

      const norm = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const idxOf = (name, ...alts) => {
        const names = [name, ...alts].map(norm);
        for (let i = 0; i < headers.length; i++) {
          if (names.includes(norm(headers[i]))) return i;
        }
        return -1;
      };

      const required = [
        "Employee_id",
        "Full Name"
      ];
      const missing = required.filter(h => idxOf(h) === -1);
      if (missing.length > 0) {
        setError(`Missing required headers: ${missing.join(", ")}. Please use the template.`);
        setIsUploading(false);
        return;
      }

      const iEmpId = idxOf("Employee_id", "employeeid", "empid");
      const iFullName = idxOf("Full Name", "fullname", "name");
      const iJoin = idxOf("Date of Join", "dateofjoin", "startdate");
      const iJob = idxOf("Job Title", "jobtitle", "title");
      const iCost = idxOf("Job Cost Centre", "costcentre", "costcenter", "jobcostcentre");
      const iReports = idxOf("Reports To", "reportsto", "linemanager", "manager");
      const iRoles = idxOf("role_ids", "roleids", "roles");
      const iDeptCode = idxOf("department_Code", "departmentcode", "deptcode");
      const iDeptId = idxOf("department_id", "departmentid", "deptid");
      const iContract = idxOf("Contract Type", "contracttype", "contract");
      const iHours = idxOf("contracted_hours_weekly", "contractedhoursweekly", "hours", "weeklyhours");
      const iPhone = idxOf("phone", "telephone", "mobile");

      const toISODate = (val) => {
        const s = String(val || "").trim();
        if (!s) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m1) {
          const [_, d, mo, y] = m1;
          return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
        const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m2) {
            const [_, mo, d, y] = m2;
            return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, "0");
          const da = String(d.getDate()).padStart(2, "0");
          return `${y}-${mo}-${da}`;
        }
        return "";
      };

      const slug = (name) =>
        String(name || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");

      const resolveDeptId = (deptId, deptCode) => {
        if (deptId) {
          const v0 = String(deptId).trim();
          const byId = departments.find(d => String(d.id) === v0);
          if (byId) return byId.id;
        }

        if (deptCode) {
          const v = String(deptCode).trim().toLowerCase();
          const byCode = departments.find(d => 
            String(d.code || "").toLowerCase() === v ||
            String(d.name || "").toLowerCase().includes(v)
          );
          if (byCode) return byCode.id;
        }

        return null;
      };

      const existingEmps = await withRetry(() => Employee.list(), { retries: 3, baseDelay: 600 });
      const empById = {};
      const empByEmail = {};
      const empByName = {};
      (existingEmps || []).forEach(e => {
        if (!e) return;
        if (e.employee_id) empById[String(e.employee_id).toLowerCase()] = e;
        if (e.user_email) empByEmail[String(e.user_email).toLowerCase()] = e;
        if (e.full_name) empByName[String(e.full_name).toLowerCase()] = e;
      });

      const csvProspective = {};
      dataRows.forEach(r => {
        const fn = String(r[iFullName] || "").trim();
        const id = String(r[iEmpId] || "").trim();
        if (fn) {
          const email = `${slug(fn)}@placeholder.local`;
          csvProspective[fn.toLowerCase()] = email;
        }
        if (id) {
          const fn2 = String(r[iFullName] || "").trim();
          if (fn2) {
            const email2 = `${slug(fn2)}@placeholder.local`;
            csvProspective[id.toLowerCase()] = email2;
          }
        }
      });

      const normalizeContract = (val) => {
        const s = String(val || "").trim().toLowerCase();
        if (!s) return "Permanent";
        if (s.includes("fixed")) return "Fixed Term";
        if (s.includes("temp")) return "Temporary";
        if (s.includes("casual")) return "Casual";
        if (s.includes("zero")) return "Zero Hours";
        if (s.includes("perman")) return "Permanent";
        return "Permanent";
      };

      const resolveManagerEmail = (val) => {
        const raw = String(val || "").trim();
        if (!raw) return "";
        const low = raw.toLowerCase();

        if (low.includes("@")) return raw;
        if (empById[low]?.user_email) return empById[low].user_email;
        if (empByName[low]?.user_email) return empByName[low].user_email;
        if (csvProspective[low]) return csvProspective[low];

        if (raw.includes(",")) {
          const [last, first] = raw.split(",").map(s => s.trim());
          const alt = `${first} ${last}`.toLowerCase();
          if (empByName[alt]?.user_email) return empByName[alt].user_email;
          if (csvProspective[alt]) return csvProspective[alt];
        }

        return raw;
      };

      const employeesToCreate = [];
      for (const row of dataRows) {
        const fullName = row[iFullName];
        const empId = row[iEmpId];

        if (!String(fullName || "").trim() || !String(empId || "").trim()) {
          continue;
        }

        const dateOfJoin = toISODate(iJoin >= 0 ? row[iJoin] : "");
        const jobTitle = iJob >= 0 ? row[iJob] || "" : "";
        const costCentre = iCost >= 0 ? row[iCost] || "" : "";
        const reportsToRaw = iReports >= 0 ? row[iReports] || "" : "";
        const reportsToEmail = resolveManagerEmail(reportsToRaw);
        const roleIdsRaw = iRoles >= 0 ? row[iRoles] || "" : "";
        const roleIds = roleIdsRaw ? roleIdsRaw.split(';').map(r => r.trim()).filter(r => r) : [];
        const deptCode = iDeptCode >= 0 ? row[iDeptCode] || "" : "";
        const deptId = iDeptId >= 0 ? row[iDeptId] || "" : "";
        const resolvedDeptId = resolveDeptId(deptId, deptCode);
        const contractType = normalizeContract(iContract >= 0 ? row[iContract] : "");
        const hours = iHours >= 0 ? parseFloat(row[iHours]) || 40 : 40;
        const phone = iPhone >= 0 ? row[iPhone] || "" : "";

        employeesToCreate.push({
          full_name: String(fullName).trim(),
          employee_id: String(empId).trim(),
          user_email: `${slug(fullName)}@placeholder.local`,
          date_of_join: dateOfJoin || undefined,
          job_title: jobTitle,
          cost_centre: costCentre,
          department_id: resolvedDeptId || undefined,
          reports_to: reportsToEmail,
          contract_type: contractType,
          contracted_hours_weekly: hours,
          role_ids: roleIds,
          phone: phone,
          is_active: true
        });
      }

      if (employeesToCreate.length === 0) {
        setError("No valid rows found. Ensure at least Employee_id and Full Name are provided.");
        setIsUploading(false);
        return;
      }

      await withRetry(() => Employee.bulkCreate(employeesToCreate), { retries: 4, baseDelay: 800 });
      onUpload();
      onClose();
    } catch (error) {
      console.error("Error uploading employees:", error);
      const msg = error?.message || "An unexpected error occurred.";
      setError(`Failed to upload employees. ${msg}. Ensure the CSV (UTF‑8) uses the exact headers from the template.`);
    }

    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Employee List</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="employee-upload"
            />
            <label htmlFor="employee-upload" className="cursor-pointer">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-700 mb-2">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-slate-500">
                CSV file with employee data
              </p>
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-blue-900">Required Columns (exact headers)</h4>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Employee_id</li>
              <li>Full Name</li>
              <li>Date of Join</li>
              <li>Job Title</li>
              <li>Job Cost Centre</li>
              <li>Reports To</li>
              <li>role_ids (separated by semicolons, e.g., ROLE1;ROLE2)</li>
              <li>department_Code (short code like W2, EMG)</li>
              <li>department_id (unique ID, takes priority over code)</li>
              <li>Contract Type</li>
              <li>contracted_hours_weekly</li>
              <li>phone</li>
            </ol>
            <p className="text-xs text-blue-800 mt-2">
              department_id or department_Code will link staff to departments. Reports To can be manager's email, employee ID, or full name.
            </p>
          </div>

          <div className="mt-3">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Employee Template
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-gradient-to-r from-teal-500 to-teal-600"
          >
            {isUploading ? (
              <>Processing...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Employees
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}