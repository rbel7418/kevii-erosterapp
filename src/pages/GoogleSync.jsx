import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { googleSheetsSync } from "@/functions/googleSheetsSync";
import { Maximize2, Minimize2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import SheetInspector from "@/components/sheets/SheetInspector";

export default function GoogleSync() {
  const [spreadsheetId, setSpreadsheetId] = React.useState(() => {
    try { return localStorage.getItem('gs_spreadsheet_id') || ""; } catch { return ""; }
  });
  const [sheetName, setSheetName] = React.useState("Rota");
  const [departments, setDepartments] = React.useState([]);
  const [departmentId, setDepartmentId] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [log, setLog] = React.useState("");

  // Embed published Google Sheet
  const [embedInput, setEmbedInput] = React.useState(() => {
    try { return localStorage.getItem('gs_embed_url') || ""; } catch { return ""; }
  });
  const [embedUrl, setEmbedUrl] = React.useState(() => {
    try { return localStorage.getItem('gs_embed_url') || ""; } catch { return ""; }
  });
  const [embedFull, setEmbedFull] = React.useState(false);

  // Locks
  const [lockId, setLockId] = React.useState(() => {
    try { return localStorage.getItem('gs_id_locked') === '1'; } catch { return false; }
  });
  const [lockEmbed, setLockEmbed] = React.useState(() => {
    try { return localStorage.getItem('gs_embed_locked') === '1'; } catch { return false; }
  });

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

  // Persist locks and values
  React.useEffect(() => {
    try {
      localStorage.setItem('gs_id_locked', lockId ? '1' : '0');
      if (lockId) localStorage.setItem('gs_spreadsheet_id', spreadsheetId);
      else localStorage.removeItem('gs_spreadsheet_id');
    } catch {}
  }, [lockId, spreadsheetId]);

  React.useEffect(() => {
    try {
      localStorage.setItem('gs_embed_locked', lockEmbed ? '1' : '0');
      if (lockEmbed) localStorage.setItem('gs_embed_url', embedUrl || "");
    } catch {}
  }, [lockEmbed, embedUrl]);

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

      // Normalize pasted URL or iframe into an embeddable URL
      const normalizeEmbed = (raw) => {
      if (!raw) return "";
      const str = String(raw).trim();
      // If it's an iframe snippet, extract src
      const m = str.match(/src=["']([^"']+)["']/i);
      const url = m ? m[1] : str;
      try {
      const u = new URL(url);
      // If it's a docs URL, try to coerce to pubhtml viewer
      if (u.hostname.includes('docs.google.com')) {
        const parts = u.pathname.split('/');
        const idIdx = parts.indexOf('d');
        const id = idIdx !== -1 ? parts[idIdx + 1] : null;
        if (id) {
          return `https://docs.google.com/spreadsheets/d/${id}/pubhtml?widget=true&headers=false`;
        }
      }
      return url;
      } catch {
      return url; // fallback
      }
      };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Google Sheets Sync</h1>
        <p className="text-slate-600">Import from and export to your Google Sheet (two-way sync). Use one tab per department for best results.</p>
        <div className="mt-2 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={lockId} onCheckedChange={setLockId} />
            <span className="text-sm">{lockId ? 'ID locked' : 'Lock Sheet ID'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={lockEmbed} onCheckedChange={setLockEmbed} />
            <span className="text-sm">{lockEmbed ? 'Link locked' : 'Lock Embed Link'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Spreadsheet ID</Label>
          <Input placeholder="1kl4QY3qpfr1aBb_RGHmEh4G1VBlP--RglUpB_Erb-sA" value={spreadsheetId} onChange={(e)=>setSpreadsheetId(e.target.value)} disabled={lockId} />
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

      {/* Embed Published Google Sheet */}
      <div className="mt-6 space-y-2">
        <Label>Embed published Google Sheet</Label>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Paste published URL or <iframe ...> code"
            value={embedInput}
            onChange={(e) => setEmbedInput(e.target.value)}
            className="flex-1 min-w-[260px]"
            disabled={lockEmbed}
          />
          <Button
             onClick={() => {
               const u = normalizeEmbed(embedInput);
               setEmbedUrl(u);
               try { if (lockEmbed) localStorage.setItem('gs_embed_url', u); } catch {}
             }}
             disabled={lockEmbed}
           >
            Show
          </Button>
          <Button
             variant="outline"
             onClick={() => { setEmbedInput(""); setEmbedUrl(""); try { if (!lockEmbed) localStorage.removeItem('gs_embed_url'); } catch {} }}
             disabled={lockEmbed}
           >
            Clear
          </Button>
        </div>

        {embedUrl && (
          <div className="relative border rounded-lg overflow-hidden bg-white">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEmbedFull(!embedFull)} title={embedFull ? 'Minimize' : 'Maximize'}>
                {embedFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
            <iframe
              src={embedUrl}
              className="w-full"
              style={{ height: '60vh' }}
              frameBorder="0"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {embedFull && embedUrl && (
        <div className="fixed inset-0 z-[100] bg-black/70">
          <div className="absolute top-3 right-3">
            <Button size="icon" className="h-10 w-10 bg-white" onClick={() => setEmbedFull(false)} title="Exit fullscreen">
              <Minimize2 className="w-5 h-5 text-slate-700" />
            </Button>
          </div>
          <iframe src={embedUrl} className="absolute inset-0 w-full h-full" frameBorder="0" allowFullScreen />
        </div>
      )}

      <div className="mt-8">
        <SheetInspector spreadsheetId={spreadsheetId} sheetName={sheetName} />
      </div>

      <div className="text-xs text-slate-500">
        <p><strong>Expected sheet layout:</strong> first row contains dates across columns (e.g., 1-Dec, 2-Dec…), first column contains staff names. Non-empty cells are treated as shift codes.</p>
        <p className="mt-1">If a name contains a job title in brackets, we match on the part before the bracket (e.g., "Robert Hickey (CNO)" → "Robert Hickey").
          To match by employee ID, add it in square brackets after the name (e.g., "Robert Hickey [EMP001]").</p>
      </div>
    </div>
  );
}