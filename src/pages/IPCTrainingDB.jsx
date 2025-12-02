
import React from "react";
import { IPCTrainingRecord } from "@/entities/IPCTrainingRecord";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsvTemplate } from "@/components/utils/csv";
import { Upload, RefreshCcw, FileSpreadsheet, Search } from "lucide-react";

const BASE_HEADERS = [
  "FULL NAME","JOB TITLE","DEPARTMENT","STAFF TYPE","CLINICAL"
];

const MODULES = [
  { h: "FFP 3 FACE FIT TESTING 3YRS", k: "ffp3_face_fit_testing_3yrs" },
  { h: "INOCULATION INJURIES", k: "inoculation_injuries" },
  { h: "Hand Hygiene and BBE", k: "hand_hygiene_bbe" },
  { h: "PPE", k: "ppe" },
  { h: "WASTE", k: "waste" },
  { h: "SHARPS BINS", k: "sharps_bins" },
  { h: "LINEN DISPOSAL", k: "linen_disposal" },
  { h: "SPILL KITS", k: "spill_kits" },
  { h: "ISOLATION + CLEANING, MRSA , CRE + VIRUSES", k: "isolation_cleaning_mrsa_cre_viruses" },
  { h: "CEPHEID MACHINE competency 3YRS", k: "cepheid_machine_competency_3yrs" },
  { h: "UNIFORM & DRESS CODE INDUCTION", k: "uniform_dress_code_induction" },
  { h: "CC Alerts INDUCTION", k: "cc_alerts_induction" }
];

const TEMPLATE_HEADERS = [
  ...BASE_HEADERS,
  ...MODULES.map(m => m.h),
  "COMMENTS"
];

// Helpers
function toISODate(val) {
  const s = String(val || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const y = m[3];
    return `${y}-${mo}-${d}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  return "";
}

function parseCSV(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { if (row.length) rows.push(row); row = []; };
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
      if (c === ",") { pushField(); i++; continue; }
      if (c === "\n") { pushField(); pushRow(); i++; continue; }
      if (c === "\r") { if (text[i + 1] === "\n") i++; pushField(); pushRow(); i++; continue; }
      field += c; i++; continue;
    }
  }
  if (field !== "" || row.length) { pushField(); pushRow(); }
  return rows.filter(r => r.some(v => String(v || "").trim() !== ""));
}

// Normalizes header strings: trim, uppercase, collapse spaces, remove commas and question marks
function normalizeHeader(str) {
  return String(str || "")
    .replace(/\u00A0/g, " ")          // NBSP -> space
    .toUpperCase()
    .replace(/[,\u200B]/g, "")        // remove commas and zero-width
    .replace(/\s+/g, " ")
    .replace(/\?/g, "")               // drop question marks (e.g., "CLINICAL?")
    .trim();
}

// Finds header index allowing synonyms and normalization
function indexOfHeader(headers, name, synonyms = []) {
  const want = normalizeHeader(name);
  const alt = (synonyms || []).map(normalizeHeader);
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (h === want || alt.includes(h)) return i;
  }
  return -1;
}

// Define required headers with accepted variants (notably Clinical?)
const REQUIRED_HEADERS = [
  { name: "FULL NAME" },
  { name: "JOB TITLE" },
  { name: "DEPARTMENT" },
  { name: "STAFF TYPE", synonyms: ["STAFFTYPE"] },
  { name: "CLINICAL", synonyms: ["CLINICAL?", "CLINICAL ?"] }
];

function normalizeBool(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return undefined;
  if (["y","yes","true","1","clinical"].includes(s)) return true;
  if (["n","no","false","0","non-clinical","non clinical"].includes(s)) return false;
  return undefined;
}

export default function IPCTrainingDB() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [qDept, setQDept] = React.useState("");
  const [qModule, setQModule] = React.useState("");
  const [qOverall, setQOverall] = React.useState("");
  const fileRef = React.useRef(null);

  const [moduleFocus, setModuleFocus] = React.useState(MODULES[0].k);

  const load = async () => {
    setLoading(true);
    try {
      const list = await IPCTrainingRecord.list("-updated_date", 4000);
      setRows(list || []);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const onDownloadTemplate = () => {
    downloadCsvTemplate("ipc_training_register_template.csv", TEMPLATE_HEADERS);
  };

  const onPick = () => fileRef.current?.click();

  const onUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const text = await f.text();
      const data = parseCSV(text);
      if (!data.length) { alert("No data found."); return; }
      const headers = data[0].map(h => String(h ?? "").trim());

      // Validate presence of required headers with tolerant matcher
      const missing = REQUIRED_HEADERS
        .filter(h => indexOfHeader(headers, h.name, h.synonyms) === -1)
        .map(h => h.name);
      if (missing.length) {
        alert("Missing required headers: " + missing.join(", "));
        return;
      }

      const get = (row, name, synonyms = []) => {
        const idx = indexOfHeader(headers, name, synonyms);
        return idx >= 0 ? row[idx] : "";
      };

      const items = data.slice(1).map(r => {
        const rec = {
          full_name: String(get(r, "FULL NAME") || "").trim(),
          job_title: String(get(r, "JOB TITLE") || "").trim(),
          department: String(get(r, "DEPARTMENT") || "").trim(),
          staff_type: String(get(r, "STAFF TYPE", ["STAFFTYPE"]) || "").trim(),
          is_clinical: normalizeBool(get(r, "CLINICAL", ["CLINICAL?", "CLINICAL ?"])),
          comments: String(get(r, "COMMENTS") || "").trim() || undefined
        };
        MODULES.forEach(m => {
          const raw = get(r, m.h);
          const iso = toISODate(raw);
          if (iso) rec[m.k] = iso;
        });
        return rec;
      }).filter(x => x && x.full_name);

      if (!items.length) {
        alert("No valid rows after parsing.");
        return;
      }

      // Bulk create or upsert (simple: create new rows; dedupe by full_name+department client-side if needed)
      const step = 200;
      for (let i = 0; i < items.length; i += step) {
        const chunk = items.slice(i, i + step);
        if (IPCTrainingRecord.bulkCreate) {
          await IPCTrainingRecord.bulkCreate(chunk);
        } else {
          for (const it of chunk) await IPCTrainingRecord.create(it);
        }
      }
      await load();
      alert(`Imported ${items.length} rows successfully.`);
    } catch (err) {
      console.error(err);
      alert("Failed to import CSV. Please check headers and date formats.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const moduleOptions = MODULES.map(m => ({ value: m.k, label: m.h }));

  const filteredDept = React.useMemo(() => {
    const q = qDept.trim().toLowerCase();
    if (!q) return rows;
    return (rows || []).filter(r =>
      [r.full_name, r.job_title, r.department, r.staff_type].some(v => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, qDept]);

  const filteredModule = React.useMemo(() => {
    const q = qModule.trim().toLowerCase();
    if (!q) return rows;
    return (rows || []).filter(r =>
      [r.full_name, r.job_title, r.department, r.staff_type].some(v => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, qModule]);

  const filteredOverall = React.useMemo(() => {
    const q = qOverall.trim().toLowerCase();
    if (!q) return rows;
    return (rows || []).filter(r =>
      [r.full_name, r.job_title, r.department, r.staff_type, r.comments].some(v => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, qOverall]);

  const compliancePct = (r) => {
    const total = MODULES.length;
    let done = 0;
    MODULES.forEach(m => { if (r[m.k]) done += 1; });
    return Math.round((done / Math.max(1, total)) * 100);
  };

  return (
    <Card className="shadow-sm border-slate-200 rounded-md">
      <CardHeader className="border-b py-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>IPC Training Database</span>
          <Badge variant="outline">{rows.length} staff</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" onClick={onDownloadTemplate} className="gap-2 h-8">
            <FileSpreadsheet className="w-4 h-4" />
            Download Template
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onUpload} />
          <Button size="sm" variant="outline" onClick={onPick} disabled={busy} className="gap-2 h-8">
            <Upload className="w-4 h-4" />
            {busy ? "Importing…" : "Upload CSV"}
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-2 h-8">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="dept" className="w-full">
          <TabsList>
            <TabsTrigger value="dept">Compliance by dept.</TabsTrigger>
            <TabsTrigger value="module">Compliance by module</TabsTrigger>
            <TabsTrigger value="overall">Overall staff clinical and non clinical attainment</TabsTrigger>
          </TabsList>

          {/* Tab 1: Compliance by dept. */}
          <TabsContent value="dept">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input placeholder="Search name, job, dept…" value={qDept} onChange={(e) => setQDept(e.target.value)} className="h-8 w-64" />
            </div>

            <div className="overflow-auto border rounded-md bg-white">
              <table className="min-w-[1200px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 border-b">FULL NAME</th>
                    <th className="text-left p-2 border-b">JOB TITLE</th>
                    <th className="text-left p-2 border-b">DEPARTMENT</th>
                    <th className="text-left p-2 border-b">STAFF TYPE</th>
                    <th className="text-left p-2 border-b">CLINICAL</th>
                    {MODULES.map(m => (
                      <th key={m.k} className="text-left p-2 border-b">{m.h}</th>
                    ))}
                    <th className="text-left p-2 border-b">Compliance %</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="p-3 text-slate-500" colSpan={6 + MODULES.length}>Loading…</td></tr>
                  ) : (filteredDept.length === 0 ? (
                    <tr><td className="p-3 text-slate-500" colSpan={6 + MODULES.length}>No rows found.</td></tr>
                  ) : (
                    filteredDept.map((r) => (
                      <tr key={r.id} className="odd:bg-white even:bg-slate-50/50">
                        <td className="p-2 border-b">{r.full_name || "—"}</td>
                        <td className="p-2 border-b">{r.job_title || "—"}</td>
                        <td className="p-2 border-b">{r.department || "—"}</td>
                        <td className="p-2 border-b">{r.staff_type || "—"}</td>
                        <td className="p-2 border-b">{r.is_clinical === true ? "Clinical" : r.is_clinical === false ? "Non-Clinical" : "—"}</td>
                        {MODULES.map(m => (
                          <td key={m.k} className="p-2 border-b">{r[m.k] || "—"}</td>
                        ))}
                        <td className="p-2 border-b font-medium">{compliancePct(r)}%</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Tab 2: Compliance by module */}
          <TabsContent value="module">
            <div className="flex flex-wrap items-end gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Module</span>
                <Select value={moduleFocus} onValueChange={setModuleFocus}>
                  <SelectTrigger className="w-[320px] h-8">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {moduleOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <Input placeholder="Search…" value={qModule} onChange={(e) => setQModule(e.target.value)} className="h-8 w-56" />
              </div>
            </div>

            <div className="overflow-auto border rounded-md bg-white">
              <table className="min-w-[900px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 border-b">FULL NAME</th>
                    <th className="text-left p-2 border-b">JOB TITLE</th>
                    <th className="text-left p-2 border-b">DEPARTMENT</th>
                    <th className="text-left p-2 border-b">STAFF TYPE</th>
                    <th className="text-left p-2 border-b">CLINICAL</th>
                    <th className="text-left p-2 border-b">
                      {MODULES.find(m => m.k === moduleFocus)?.h || "Module"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="p-3 text-slate-500" colSpan={6}>Loading…</td></tr>
                  ) : (filteredModule.length === 0 ? (
                    <tr><td className="p-3 text-slate-500" colSpan={6}>No rows found.</td></tr>
                  ) : (
                    filteredModule.map((r) => (
                      <tr key={r.id} className="odd:bg-white even:bg-slate-50/50">
                        <td className="p-2 border-b">{r.full_name || "—"}</td>
                        <td className="p-2 border-b">{r.job_title || "—"}</td>
                        <td className="p-2 border-b">{r.department || "—"}</td>
                        <td className="p-2 border-b">{r.staff_type || "—"}</td>
                        <td className="p-2 border-b">{r.is_clinical === true ? "Clinical" : r.is_clinical === false ? "Non-Clinical" : "—"}</td>
                        <td className="p-2 border-b">{r[moduleFocus] || "—"}</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Tab 3: Overall attainment */}
          <TabsContent value="overall">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input placeholder="Search…" value={qOverall} onChange={(e) => setQOverall(e.target.value)} className="h-8 w-64" />
            </div>

            <div className="overflow-auto border rounded-md bg-white">
              <table className="min-w-[1200px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 border-b">FULL NAME</th>
                    <th className="text-left p-2 border-b">JOB TITLE</th>
                    <th className="text-left p-2 border-b">DEPARTMENT</th>
                    <th className="text-left p-2 border-b">STAFF TYPE</th>
                    <th className="text-left p-2 border-b">CLINICAL</th>
                    {MODULES.map(m => (
                      <th key={m.k} className="text-left p-2 border-b">{m.h}</th>
                    ))}
                    <th className="text-left p-2 border-b">COMMENTS</th>
                    <th className="text-left p-2 border-b">Compliance %</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="p-3 text-slate-500" colSpan={7 + MODULES.length}>Loading…</td></tr>
                  ) : (filteredOverall.length === 0 ? (
                    <tr><td className="p-3 text-slate-500" colSpan={7 + MODULES.length}>No rows found.</td></tr>
                  ) : (
                    filteredOverall.map((r) => (
                      <tr key={r.id} className="odd:bg-white even:bg-slate-50/50">
                        <td className="p-2 border-b">{r.full_name || "—"}</td>
                        <td className="p-2 border-b">{r.job_title || "—"}</td>
                        <td className="p-2 border-b">{r.department || "—"}</td>
                        <td className="p-2 border-b">{r.staff_type || "—"}</td>
                        <td className="p-2 border-b">{r.is_clinical === true ? "Clinical" : r.is_clinical === false ? "Non-Clinical" : "—"}</td>
                        {MODULES.map(m => (
                          <td key={m.k} className="p-2 border-b">{r[m.k] || "—"}</td>
                        ))}
                        <td className="p-2 border-b">{r.comments || "—"}</td>
                        <td className="p-2 border-b font-medium">{compliancePct(r)}%</td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              Template columns: {TEMPLATE_HEADERS.join(" • ")}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
