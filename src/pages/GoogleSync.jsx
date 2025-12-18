import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { googleSheetsSync } from "@/functions/googleSheetsSync";

export default function GoogleSync() {
  const [spreadsheetId, setSpreadsheetId] = React.useState("");
  const [sheetName, setSheetName] = React.useState("Rota");
  const [departments, setDepartments] = React.useState([]);
  const [departmentId, setDepartmentId] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [log, setLog] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const depts = await base44.entities.Department.list();
        setDepartments(depts || []);
      } catch (e) {
        setDepartments([]);
      }
    })();
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  const run = async (action, replaceMode) => {
    setBusy(true);
    setLog("");
    try {
      const { data } = await googleSheetsSync({
        action,
        spreadsheetId,
        sheetName,
        department_id: departmentId || undefined,
        date_start: start || today,
        date_end: end || today,
        replaceMode
      });
      setLog(JSON.stringify(data, null, 2));
    } catch (e) {
      const respData = e?.response?.data;
      if (respData !== undefined) {
        setLog(typeof respData === 'string' ? respData : JSON.stringify(respData, null, 2));
      } else {
        setLog(String(e?.message || e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Google Sheets Sync</h1>
        <p className="text-slate-600">Import from and export to your Google Sheet (two-way sync). Use one tab per department for best results.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Spreadsheet ID</Label>
          <Input placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" value={spreadsheetId} onChange={(e)=>setSpreadsheetId(e.target.value)} />
          <p className="text-xs text-slate-500 mt-1">From your sheet URL: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit</p>
        </div>
        <div>
          <Label>Sheet (Tab) Name</Label>
          <Input placeholder="Rota" value={sheetName} onChange={(e)=>setSheetName(e.target.value)} />
        </div>
        <div>
          <Label>Department (optional)</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All</SelectItem>
              {departments.map((d)=> (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Start date</Label>
            <Input type="date" value={start} onChange={(e)=>setStart(e.target.value)} />
          </div>
          <div>
            <Label>End date</Label>
            <Input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button disabled={busy || !spreadsheetId} onClick={()=>run('export')}>Export App → Sheet</Button>
        <Button disabled={busy || !spreadsheetId} variant="outline" onClick={()=>run('import','append')}>Import Sheet → App (Append)</Button>
        <Button disabled={busy || !spreadsheetId} className="bg-red-600 hover:bg-red-700" onClick={()=>run('import','replaceAll')}>Import (Replace Range)</Button>
      </div>

      <div>
        <Label>Result</Label>
        <pre className="mt-2 bg-slate-50 border rounded-md p-3 text-xs overflow-auto max-h-80">{log || '—'}</pre>
      </div>

      <div className="text-xs text-slate-500">
        <p><strong>Expected sheet layout:</strong> first row contains dates across columns (e.g., 1-Dec, 2-Dec…), first column contains staff names. Non-empty cells are treated as shift codes.</p>
        <p className="mt-1">If a name contains a job title in brackets, we match on the part before the bracket (e.g., "Robert Hickey (CNO)" → "Robert Hickey").
          To match by employee ID, add it in square brackets after the name (e.g., "Robert Hickey [EMP001]").</p>
      </div>
    </div>
  );
}