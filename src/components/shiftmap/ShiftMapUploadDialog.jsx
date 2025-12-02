
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { ShiftCode } from "@/entities/ShiftCode";
import { colorForCode } from "@/components/utils/colors";
import { downloadCsvTemplate } from "@/components/utils/csv";

export default function ShiftMapUploadDialog({ open, onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  // NEW: CSV helpers (local parsing fallback)
  const isCSVFile = (f) => {
    const name = f?.name?.toLowerCase() || "";
    const type = f?.type?.toLowerCase() || "";
    return name.endsWith(".csv") || type.includes("csv");
  };
  const readFileAsText = (f) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsText(f);
    });
  const detectDelimiter = (text) => {
    const lines = String(text || "").split(/\r?\n/).filter(Boolean).slice(0, 5);
    let best = ",", bestCount = -1;
    [",", ";", "\t"].forEach((d) => {
      const count = lines.reduce((sum, l) => sum + (l.split(d).length - 1), 0);
      if (count > bestCount) { best = d; bestCount = count; }
    });
    return best;
  };
  const parseCSV = (text) => {
    // Remove BOM
    if (text && text.length && text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const delim = detectDelimiter(text);
    const rows = [];
    let i = 0, field = "", row = [], inQuotes = false;

    const pushField = () => { row.push(field.trim()); field = ""; }; // Trim fields
    const pushRow = () => {
      if (row.length && row.some((c) => String(c || "").trim() !== "")) rows.push(row);
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
        if (c === "\r") { if (text[i + 1] === "\n") i++; pushField(); pushRow(); i++; continue; }
        field += c; i++; continue;
      }
    }
    // Handle the last field/row if loop ends without a delimiter or newline
    if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
    return rows;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    // Shared normalizers
    const toHHMM = (v) => {
      const s = String(v || "").trim();
      if (!s) return "";
      if (/^\d{1,2}:\d{2}$/.test(s)) {
        const [h, m] = s.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
      }
      const num = parseFloat(s);
      if (!isNaN(num)) {
        const mins = Math.round(num * 60);
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
      return "";
    };
    const normFinance = (v) => {
      const s = String(v || "").toLowerCase();
      if (s.startsWith("unbill")) return "Unbillable";
      return "Billable";
    };
    const computePaid = (row) => {
      const paid = parseFloat(row.paidhours);
      if (!isNaN(paid)) return paid;
      const duration = parseFloat(row.duration);
      const breakMins = parseFloat(row.break_mins);
      if (!isNaN(duration)) {
        const paidCalc = duration - (isNaN(breakMins) ? 0 : breakMins / 60);
        return Math.max(0, Math.round(paidCalc * 10) / 10);
      }
      return undefined;
    };

    try {
      // NEW: Prefer robust local CSV parsing when a CSV is uploaded
      if (isCSVFile(file)) {
        const text = await readFileAsText(file);
        const rows = parseCSV(String(text || ""));
        if (!rows || rows.length < 2) {
          setError("No data rows found in CSV. Please ensure it has headers and at least one data row.");
          setIsUploading(false);
          return;
        }
        const headers = rows[0].map((h) => String(h || "").trim());
        const dataRows = rows.slice(1).filter((r) => r && r.some((v) => String(v || "").trim() !== ""));

        const norm = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const idxOf = (name, ...alts) => {
          const names = [name, ...alts].map(norm);
          for (let i = 0; i < headers.length; i++) {
            if (names.includes(norm(headers[i]))) return i;
          }
          return -1;
        };

        const required = ["code", "descriptor", "starttime", "endtime", "duration", "financeTag", "break_mins", "paidhours"];
        const missing = required.filter((h) => idxOf(h) === -1);
        if (missing.length > 0) {
          setError(`Missing required headers: ${missing.join(", ")}. Ensure they exactly match the template.`);
          setIsUploading(false);
          return;
        }

        const iCode = idxOf("code");
        const iDesc = idxOf("descriptor");
        const iStart = idxOf("starttime");
        const iEnd = idxOf("endtime");
        const iDuration = idxOf("duration");
        const iFinance = idxOf("financeTag", "finance_tag");
        const iBreak = idxOf("break_mins", "breakmins");
        const iPaid = idxOf("paidhours", "paid_hours", "paidhrs");

        const records = dataRows
          .map((row) => ({
            code: row[iCode],
            descriptor: row[iDesc],
            starttime: row[iStart],
            endtime: row[iEnd],
            duration: row[iDuration],
            financeTag: row[iFinance],
            break_mins: row[iBreak],
            paidhours: row[iPaid]
          }))
          .filter((r) => String(r.code || "").trim() !== ""); // Filter out rows with no code

        if (records.length === 0) {
          setError("No valid shift code entries found. Please ensure 'code' column is populated.");
          setIsUploading(false);
          return;
        }

        const payload = records.map((row) => {
          const code = String(row.code || "").toUpperCase();
          const descriptor = row.descriptor || "";
          const default_start_time = toHHMM(row.starttime);
          const default_end_time = toHHMM(row.endtime);
          const default_break_minutes = Number.isFinite(row.break_mins) ? row.break_mins : parseInt(row.break_mins || 0, 10);
          const weighted_hours = computePaid(row);
          const finance_tag = normFinance(row.financeTag);

          return {
            code,
            descriptor,
            finance_tag,
            weighted_hours: typeof weighted_hours === "number" ? weighted_hours : 0,
            color: colorForCode(code),
            default_start_time: default_start_time || undefined,
            default_end_time: default_end_time || undefined,
            default_break_minutes: Number.isFinite(default_break_minutes) ? default_break_minutes : 0,
            is_active: true
          };
        });

        await ShiftCode.bulkCreate(payload);
        onUpload();
        onClose();
        setIsUploading(false);
        return;
      }

      // Otherwise, keep existing Excel/PDF image extraction path for non-CSV files
      const { file_url } = await UploadFile({ file });
      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            shift_codes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  descriptor: { type: "string" },
                  starttime: { type: "string" },
                  endtime: { type: "string" },
                  duration: { type: "number" },
                  financeTag: { type: "string" },
                  break_mins: { type: "number" },
                  paidhours: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status === "success" && result.output?.shift_codes) {
        const shiftsToCreate = result.output.shift_codes
          .filter((r) => r && r.code)
          .map((row) => {
            const code = String(row.code || "").toUpperCase();
            const descriptor = row.descriptor || "";
            const default_start_time = toHHMM(row.starttime);
            const default_end_time = toHHMM(row.endtime);
            const default_break_minutes = Number.isFinite(row.break_mins) ? row.break_mins : parseInt(row.break_mins || 0, 10);
            const weighted_hours = computePaid(row);
            const finance_tag = normFinance(row.financeTag);

            return {
              code,
              descriptor,
              finance_tag,
              weighted_hours: typeof weighted_hours === "number" ? weighted_hours : 0,
              color: colorForCode(code),
              default_start_time: default_start_time || undefined,
              default_end_time: default_end_time || undefined,
              default_break_minutes: Number.isFinite(default_break_minutes) ? default_break_minutes : 0,
              is_active: true
            };
          });

        await ShiftCode.bulkCreate(shiftsToCreate);
        onUpload();
        onClose();
      } else {
        setError("Could not read shift codes from the uploaded file. Ensure the header row exactly matches the template.");
      }
    } catch (err) {
      console.error("Error uploading shift codes:", err);
      setError(`Failed to upload shift codes. ${err?.message || "Please check the file format and try again."}`);
    }

    setIsUploading(false);
  };

  const handleDownloadTemplate = () => {
    downloadCsvTemplate("shift_code_template.csv", [
      "code",
      "descriptor",
      "starttime",
      "endtime",
      "duration",
      "financeTag",
      "break_mins",
      "paidhours"
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Shift Code Library</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="shiftmap-upload"
            />
            <label htmlFor="shiftmap-upload" className="cursor-pointer">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-700 mb-2">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-slate-500">
                CSV (recommended) or Excel file with shift code data
              </p>
            </label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-blue-900">File Format</h4>
            <p className="text-xs text-blue-800">
              Use this exact header order (lowercase matches best):
            </p>
            <p className="text-xs font-mono text-blue-900 mt-1">
              code, descriptor, starttime, endtime, duration, financeTag, break_mins, paidhours
            </p>
            <ul className="text-xs text-blue-800 mt-2 list-disc ml-4 space-y-1">
              <li>starttime/endtime as HH:MM (24h). duration = total hours; paidhours = hours paid.</li>
              <li>break_mins is minutes (e.g., 30). If paidhours is blank we use duration - break.</li>
              <li>financeTag: Billable or Unbillable.</li>
            </ul>
          </div>

          <div className="mt-3">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              Download Shift Code Template
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
                Upload Shift Codes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
