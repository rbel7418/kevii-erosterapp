import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import DateRangePicker from "@/components/common/DateRangePicker";
import { googleSheetsSync } from "@/functions/googleSheetsSync";
import { googleSheetsDb } from "@/functions/googleSheetsDb";
import { Loader2, Play, RefreshCw, Eye, Upload, Download } from "lucide-react";
import { format } from "date-fns";

export default function SheetsConsole() {
  const today = format(new Date(), "yyyy-MM-dd");

  // Left panel state
  const [step, setStep] = React.useState("connect");
  const [spreadsheetId, setSpreadsheetId] = React.useState("");
  const [sheetUrl, setSheetUrl] = React.useState(""); // optional embed URL
  const [sheetName, setSheetName] = React.useState("Rota");
  const [departments, setDepartments] = React.useState([]);
  const [departmentId, setDepartmentId] = React.useState("");
  const [range, setRange] = React.useState({ start: today, end: today });
  const [busy, setBusy] = React.useState(false);

  // Right panel state
  const [log, setLog] = React.useState("");
  const [parsed, setParsed] = React.useState(null);
  const [preview, setPreview] = React.useState({ headers: [], rows: [] });

  const ROW_CONFIG = React.useMemo(() => ({
    'Ward 2': {
      header_row_index: 3,
      name_col_index: 1,
      row_blocks: [ { start: 4, end: 17 }, { start: 20, end: 22 } ],
      grid: 'B4:AC25'
    },
    'Ward 3': {
      header_row_index: 3,
      name_col_index: 1,
      row_blocks: [ { start: 4, end: 21 }, { start: 24, end: 28 } ],
      grid: 'B4:AC31'
    },
    'ECU': {
      header_row_index: 3,
      name_col_index: 1,
      row_blocks: [ { start: 4, end: 8 }, { start: 11, end: 12 } ],
      grid: 'B4:AC14'
    }
  }), []);

  // Load departments once
  React.useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Department.list();
        setDepartments(list || []);
      } catch (e) {
        setDepartments([]);
      }
    })();
  }, []);

  const canPreview = spreadsheetId && sheetName;
  const canRun = spreadsheetId && sheetName && range.start && range.end && (!!departmentId);

  const loadPreview = async () => {
    if (!canPreview) return;
    setBusy(true);
    setLog("");
    try {
      const { data } = await googleSheetsDb({
        action: "read",
        spreadsheetId,
        sheetName,
        range: `${sheetName}!A:Z`
      });
      const raw = Array.isArray(data?.raw) ? data.raw : [];
      const headers = (raw[0] || []).map((h) => String(h || ""));
      const rows = raw.slice(1);
      setPreview({ headers, rows });
      setLog(JSON.stringify({ message: "Preview loaded", rows: rows.length, cols: headers.length }, null, 2));
      setParsed(null);
      setStep("tabs");
    } catch (e) {
      const resp = e?.response?.data;
      setLog(resp ? (typeof resp === "string" ? resp : JSON.stringify(resp, null, 2)) : String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const runExport = async () => {
    if (!canRun) return;
    setBusy(true);
    setLog("");
    try {
      const { data } = await googleSheetsSync({
        action: "export",
        spreadsheetId,
        sheetName,
        department_id: departmentId || undefined,
        date_start: range.start,
        date_end: range.end,
      });
      setLog(JSON.stringify(data, null, 2));
    } catch (e) {
      const resp = e?.response?.data;
      setLog(resp ? (typeof resp === "string" ? resp : JSON.stringify(resp, null, 2)) : String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (mode) => {
    if (!canRun) return;
    setBusy(true);
    setLog("");
    try {
      const dept = departments.find(d => d.id === departmentId);
      const cfg = dept ? ROW_CONFIG[dept.name] : null;
      const hdr = cfg?.header_row_index || Number((() => { try { return localStorage.getItem('gs_header_row_index'); } catch { return null; } })() || 0) || undefined;
      const nci = cfg?.name_col_index || Number((() => { try { return localStorage.getItem('gs_name_col_index'); } catch { return null; } })() || 0) || undefined;
      const payload = {
        action: "import",
        spreadsheetId,
        sheetName,
        department_id: departmentId || undefined,
        date_start: range.start,
        date_end: range.end,
        header_row_index: hdr,
        name_col_index: nci,
        replaceMode: mode
      };
      if (cfg?.row_blocks) payload.row_blocks = cfg.row_blocks;
      const { data } = await googleSheetsSync(payload);
      setLog(JSON.stringify(data, null, 2));
      setParsed(data);
    } catch (e) {
      const resp = e?.response?.data;
      setLog(resp ? (typeof resp === "string" ? resp : JSON.stringify(resp, null, 2)) : String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Left: Steps */}
        <Card className="lg:col-span-4 p-4 md:p-5 bg-white/90">
          <h1 className="text-xl font-bold mb-3">Sheets Console</h1>
          <div className="space-y-6">
            {/* Step tabs as vertical nav */}
            <div className="space-y-3">
              <button
                className={`w-full text-left px-3 py-2 rounded-md border ${step === "connect" ? "bg-sky-50 border-sky-200 text-sky-800" : "hover:bg-slate-50"}`}
                onClick={() => setStep("connect")}
              >
                1. Connect
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-md border ${step === "tabs" ? "bg-sky-50 border-sky-200 text-sky-800" : "hover:bg-slate-50"}`}
                onClick={() => setStep("tabs")}
              >
                2. Tabs
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-md border ${step === "range" ? "bg-sky-50 border-sky-200 text-sky-800" : "hover:bg-slate-50"}`}
                onClick={() => setStep("range")}
              >
                3. Range & Department
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-md border ${step === "actions" ? "bg-sky-50 border-sky-200 text-sky-800" : "hover:bg-slate-50"}`}
                onClick={() => setStep("actions")}
              >
                4. Export / Import
              </button>
            </div>

            {/* Panels */}
            {step === "connect" && (
              <div className="space-y-3">
                <div>
                  <Label>Spreadsheet ID</Label>
                  <Input
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgm..."
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">From docs.google.com/spreadsheets/d/<strong>ID</strong>/edit</p>
                </div>
                <div>
                  <Label>Optional: Share/Embed URL</Label>
                  <Input
                    placeholder="https://docs.google.com/spreadsheets/d/…/edit"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">If provided and publicly shared/accessible, the sheet will render on the right.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={loadPreview} disabled={!spreadsheetId || !sheetName || busy} className="gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
                  </Button>
                </div>
              </div>
            )}

            {step === "tabs" && (
              <div className="space-y-3">
                <div>
                  <Label>Department (sheet tab)</Label>
                  <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); const d = departments.find(d => d.id === v); setSheetName(d ? d.name : ""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick department (tab)" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">Tab name follows the selected department.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={loadPreview} disabled={!canPreview || busy} variant="outline" className="gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh Preview
                  </Button>
                </div>
              </div>
            )}

            {step === "range" && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Date Range</Label>
                  <DateRangePicker
                    start={range.start}
                    end={range.end}
                    onChange={({ start, end }) => setRange({ start: start ? format(start, "yyyy-MM-dd") : "", end: end ? format(end, "yyyy-MM-dd") : "" })}
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); const d = departments.find(d => d.id === v); setSheetName(d ? d.name : ""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === "actions" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={runExport} disabled={!canRun || busy} className="gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export App → Sheet
                  </Button>
                  <Button onClick={() => runImport("append")} disabled={!canRun || busy} variant="outline" className="gap-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import (Append)
                  </Button>
                  <Button onClick={() => runImport("replaceAll")} disabled={!canRun || busy} className="gap-2 bg-red-600 hover:bg-red-700">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import (Replace Range)
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Import uses codes from your sheet to create/update shifts for selected range and (optionally) department.</p>
                {(() => { const dept = departments.find(d => d.id === departmentId); const cfg = dept ? ROW_CONFIG[dept.name] : null; return cfg ? (
                  <p className="text-xs text-slate-600 mt-1">Using rows {cfg.row_blocks.map(b=>`A${b.start}:A${b.end}`).join(' + ')} and grid {cfg.grid} for {dept.name}.</p>
                ) : null; })()}
              </div>
            )}
          </div>
        </Card>

        {/* Right: Preview + Logs */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold">Sheet Preview</div>
              <div className="text-xs text-slate-500 truncate">{spreadsheetId ? `ID: ${spreadsheetId}` : "No spreadsheet selected"}</div>
            </div>
            <div className="h-[420px] overflow-auto">
              {sheetUrl ? (
                <iframe title="Sheet" src={sheetUrl} className="w-full h-[420px] border-0" />
              ) : preview.headers.length ? (
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      {preview.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left border-b text-slate-700 whitespace-nowrap">{h || `Col ${i+1}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 200).map((r, ri) => (
                      <tr key={ri} className="odd:bg-white even:bg-slate-50">
                        {preview.headers.map((_, ci) => (
                          <td key={ci} className="px-3 py-2 border-b align-top whitespace-nowrap">{r?.[ci] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                    {preview.rows.length === 0 && (
                      <tr><td className="px-3 py-6 text-slate-500">No rows</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Provide Spreadsheet ID and Tab, then click Preview.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Logs</div>
              <Button size="sm" variant="outline" onClick={() => setLog("")}>
                Clear
              </Button>
            </div>
            <pre className="bg-slate-50 border rounded-md p-3 text-xs overflow-auto max-h-72 whitespace-pre-wrap">{log || "—"}</pre>
            {parsed?.rows_processed?.length ? (
              <div className="mt-2 text-xs text-slate-600">Processed rows: {parsed.rows_processed.map(b => `${b.from}-${b.to}`).join(', ')}</div>
            ) : null}
            {parsed?.skip_details?.length ? (
              <div className="mt-2 text-xs">
                <div className="font-medium">Skipped details</div>
                <div className="mt-1 flex gap-2 flex-wrap">
                  {Object.entries(parsed.skip_details.reduce((a, it) => { a[it.reason] = (a[it.reason]||0)+1; return a; }, {})).map(([k,v]) => (
                    <span key={k} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 border text-slate-700">{k}: {v}</span>
                  ))}
                </div>
                <div className="mt-2 max-h-40 overflow-auto border rounded">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left">Row</th>
                        <th className="px-2 py-1 text-left">Name cell</th>
                        <th className="px-2 py-1 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.skip_details.slice(0, 100).map((s, i) => (
                        <tr key={i} className="odd:bg-white even:bg-slate-50">
                          <td className="px-2 py-1">{s.row}</td>
                          <td className="px-2 py-1">{s.nameCell}</td>
                          <td className="px-2 py-1">{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsed.header && (
                  <div className="mt-2 text-slate-600">
                    Header row: #{parsed.header.headerRowIndex}; dates found: {parsed.header.dateCols?.length || 0}
                  </div>
                )}
                <div className="mt-1 text-slate-500">Tip: Make sure sheet names match Employee full_name or add [EMPID] in the name cell (e.g., "Jane Doe [EMP001]").</div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}