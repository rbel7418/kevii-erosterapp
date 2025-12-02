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
import { Shift, Employee, ShiftCode } from "@/entities/all";
import { enqueueShiftCreate } from "@/components/utils/shiftQueue";
import { downloadCsvTemplate } from "@/components/utils/csv";

export default function TemplateUploadDialog({ open, onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  // PROPER CSV PARSER that handles quoted fields, commas inside quotes, etc.
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    const result = [];
    
    for (let line of lines) {
      if (!line.trim()) continue;
      
      const row = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      row.push(current.trim());
      
      if (row.length > 0 && row.some(cell => cell !== '')) {
        result.push(row);
      }
    }
    
    return result;
  };

  const readFileAsText = (f) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsText(f);
    });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsvTemplate("shift_upload_template.csv", [
      "Employee_id",
      "date",
      "shift_code",
      "start_time",
      "end_time",
      "break_minutes",
      "notes"
    ]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const text = await readFileAsText(file);
      const rows = parseCSV(text);

      if (!rows || rows.length < 2) {
        setError("CSV must have headers and at least one data row");
        setIsUploading(false);
        return;
      }

      const headers = rows[0].map(h => String(h || "").trim());
      const dataRows = rows.slice(1).filter(r => r && r.some(v => String(v || "").trim() !== ""));

      // Helper to find column index - case insensitive, flexible matching
      const norm = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const idxOf = (name, ...alts) => {
        const names = [name, ...alts].map(norm);
        for (let i = 0; i < headers.length; i++) {
          if (names.includes(norm(headers[i]))) return i;
        }
        return -1;
      };

      // Required field indices
      const iEmpId = idxOf("Employee_id", "employeeid", "empid", "employee code", "employeecode");
      const iDate = idxOf("date");
      const iCode = idxOf("shift_code", "shiftcode", "code");

      // Optional field indices
      const iStart = idxOf("start_time", "starttime", "start");
      const iEnd = idxOf("end_time", "endtime", "end");
      const iBreak = idxOf("break_minutes", "breakminutes", "break");
      const iNotes = idxOf("notes", "note");

      // Validate required headers exist
      const missing = [];
      if (iEmpId === -1) missing.push("Employee_id (or Employee Code)");
      if (iDate === -1) missing.push("date");
      if (iCode === -1) missing.push("shift_code");

      if (missing.length > 0) {
        setError(`Missing required columns: ${missing.join(", ")}. Please use the template or ensure headers match.`);
        setIsUploading(false);
        return;
      }

      // CRITICAL: Load all employees once to build lookup by employee_id (business key)
      const allEmployees = await Employee.list();
      const employeeByBusinessId = {};
      allEmployees.forEach(emp => {
        if (emp.employee_id) {
          const key = String(emp.employee_id).trim().toLowerCase();
          employeeByBusinessId[key] = emp;
        }
      });

      // Load shift codes for defaults
      const allShiftCodes = await ShiftCode.list();
      const shiftCodeMap = {};
      allShiftCodes.forEach(sc => {
        if (sc.code) {
          shiftCodeMap[String(sc.code).toUpperCase().trim()] = sc;
        }
      });

      // Validate all rows have required fields and can be matched
      const validationErrors = [];
      const shiftsToCreate = [];

      dataRows.forEach((row, idx) => {
        const rowNum = idx + 2; // +2 because row 1 is headers
        const empIdRaw = row[iEmpId] || "";
        const dateRaw = row[iDate] || "";
        const codeRaw = row[iCode] || "";

        // Check required fields are filled
        if (!empIdRaw.trim()) {
          validationErrors.push(`Row ${rowNum}: Missing Employee_id`);
          return;
        }
        if (!dateRaw.trim()) {
          validationErrors.push(`Row ${rowNum}: Missing date`);
          return;
        }
        if (!codeRaw.trim()) {
          validationErrors.push(`Row ${rowNum}: Missing shift_code`);
          return;
        }

        // Match employee by business ID
        const empIdKey = String(empIdRaw).trim().toLowerCase();
        const matchedEmployee = employeeByBusinessId[empIdKey];

        if (!matchedEmployee) {
          validationErrors.push(`Row ${rowNum}: Employee_id "${empIdRaw}" not found. Make sure employees are uploaded first.`);
          return;
        }

        // Parse date (support multiple formats)
        let isoDate = "";
        const d = dateRaw.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          isoDate = d;
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
          const [day, month, year] = d.split('/');
          isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
          const parts = d.split('/');
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          isoDate = `${year}-${month}-${day}`;
        } else {
          const parsed = new Date(d);
          if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            isoDate = `${y}-${m}-${day}`;
          } else {
            validationErrors.push(`Row ${rowNum}: Invalid date format "${d}". Use YYYY-MM-DD or DD/MM/YYYY.`);
            return;
          }
        }

        // Get shift code and apply defaults
        const shiftCode = String(codeRaw).toUpperCase().trim();
        const codeDefaults = shiftCodeMap[shiftCode];

        const startTime = iStart >= 0 && row[iStart] ? row[iStart].trim() : (codeDefaults?.default_start_time || "");
        const endTime = iEnd >= 0 && row[iEnd] ? row[iEnd].trim() : (codeDefaults?.default_end_time || "");
        const breakMins = iBreak >= 0 && row[iBreak] ? parseInt(row[iBreak]) || 0 : (codeDefaults?.default_break_minutes || 0);
        const notes = iNotes >= 0 && row[iNotes] ? row[iNotes].trim() : "";

        // BUILD SHIFT: Auto-fill employee_id (system key) and department_id from matched employee
        shiftsToCreate.push({
          employee_id: matchedEmployee.id, // System key (Employee.id)
          department_id: matchedEmployee.department_id || "", // Auto-fill from employee's department
          date: isoDate,
          shift_code: shiftCode,
          start_time: startTime,
          end_time: endTime,
          break_minutes: breakMins,
          notes: notes,
          status: "scheduled"
        });
      });

      // If validation errors, show them and stop
      if (validationErrors.length > 0) {
        setError(
          <div className="text-sm">
            <div className="font-semibold mb-2">Upload validation failed:</div>
            <ul className="list-disc list-inside space-y-1 max-h-64 overflow-auto">
              {validationErrors.slice(0, 20).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {validationErrors.length > 20 && (
                <li className="text-slate-500">... and {validationErrors.length - 20} more errors</li>
              )}
            </ul>
          </div>
        );
        setIsUploading(false);
        return;
      }

      // Create shifts using queue to avoid rate limits
      let successCount = 0;
      let errorCount = 0;

      for (const shiftData of shiftsToCreate) {
        try {
          await enqueueShiftCreate(shiftData);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error("Failed to create shift:", err);
        }
      }

      if (errorCount > 0) {
        setError(`Created ${successCount} shifts, but ${errorCount} failed. Check console for details.`);
      }

      onUpload();
      if (errorCount === 0) {
        onClose();
      }
    } catch (error) {
      console.error("Error uploading shifts:", error);
      setError(`Upload failed: ${error.message}`);
    }

    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Shift Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="shift-upload"
            />
            <label htmlFor="shift-upload" className="cursor-pointer">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-700 mb-2">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-slate-500">CSV file with shift data</p>
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-blue-900">✅ NEW: Auto-Matching Logic</h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Required:</strong> Employee_id, date, shift_code</li>
              <li><strong>Auto-matched:</strong> Employee record is found by Employee_id (business key)</li>
              <li><strong>Auto-filled:</strong> Department is automatically pulled from employee's record</li>
              <li><strong>Optional:</strong> start_time, end_time, break_minutes, notes (defaults applied if missing)</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-green-900">📋 Flexible Headers</h4>
            <p className="text-xs text-green-800">
              The system accepts multiple header variations:
              <br/>• "Employee_id" OR "Employee Code" OR "EmployeeCode"
              <br/>• "shift_code" OR "ShiftCode" OR "code"
              <br/>• "start_time" OR "StartTime" OR "start"
            </p>
          </div>

          <div className="mt-3">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template CSV
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
                Upload Shifts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}