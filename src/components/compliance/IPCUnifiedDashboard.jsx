import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// Palette
const PAL = {
  b700: "#004A98",
  b600: "#005EB8",
  b500: "#0B73D9",
  b400: "#3E8EE6",
  b300: "#7FB2F0",
  slate700: "#334155",
  slate600: "#475569",
  slate200: "#E2E8F0",
  emerald: "#047857",
  amber: "#B45309",
  red: "#B91C1C",
};

// ---- Dummy data ----
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const monthly = MONTHS.map((m, i) => ({
  month: m,
  total: [2,2,2,2,1,1,2,2,2,2,1,2][i],
  completed: [1,1,2,2,1,1,1,2,0,0,0,0][i],
}));

const STAFF = [
  { id: "E1001", fullName: "Abbas Mohamud", jobTitle: "Theatre Porter", department: "Theatres", clinical: true, compliance: 100 },
  { id: "E1023", fullName: "Abdiaziz Hussein", jobTitle: "Senior Radiographer", department: "Imaging", clinical: true, compliance: 84 },
  { id: "E1088", fullName: "Adina Andronachi", jobTitle: "Hotel Services Team Lead", department: "Hotel Services", clinical: false, compliance: 58 },
  { id: "E1112", fullName: "Adrija Javaska", jobTitle: "FOH Receptionist", department: "FOH", clinical: false, compliance: 25 },
  { id: "E1175", fullName: "Aesha Shah", jobTitle: "Bank Food Service Steward", department: "Hotel Services", clinical: false, compliance: 92 },
  { id: "E1234", fullName: "Agnieszka Nowak", jobTitle: "Staff Nurse", department: "OPD", clinical: true, compliance: 100 },
  { id: "E1266", fullName: "Agnieszka Szybka", jobTitle: "Bank Pharmacy Tech", department: "Pharmacy", clinical: false, compliance: 42 },
];

const KPIS = { trainingNumber: 20, averageRating: 4.2, hours: 590, budget: 335000, dueThisMonth: 9, overdueTrainings: 14, highRiskStaff: 7, durationPct: 54.2, budgetPct: 52.2 };

// Matrix metrics
const MODULE_SCORES = [
  { module: "FFP3 Fit Test (3y)", score: 76 },
  { module: "Hand Hygiene", score: 88 },
  { module: "PPE", score: 81 },
  { module: "Sharps Bins", score: 69 },
  { module: "Isolation & Cleaning", score: 73 },
  { module: "Waste", score: 85 },
  { module: "Linen Disposal", score: 79 },
  { module: "Spill Kits", score: 62 },
  { module: "CC Alerts", score: 71 },
  { module: "Uniform & Dress Code", score: 93 },
  { module: "Cepheid Competency (3y)", score: 58 },
];

// Training catalogue for personal register
const TRAINING_MODULES = [
  { key: "ffp3", title: "FFP 3 FACE FIT TESTING 3YRS", years: 3 },
  { key: "inoculation", title: "INOCULATION INJURIES", years: 2 },
  { key: "handhygiene", title: "Hand Hygiene and BBE", years: 1 },
  { key: "ppe", title: "PPE", years: 1 },
  { key: "waste", title: "WASTE", years: 2 },
  { key: "sharps", title: "SHARPS BINS", years: 2 },
  { key: "linen", title: "LINEN DISPOSAL", years: 2 },
  { key: "spill", title: "SPILL KITS", years: 2 },
  { key: "isolation", title: "ISOLATION + CLEANING, MRSA , CRE + VIRUSES", years: 1 },
  { key: "cepheid_comp", title: "CEPHEID MACHINE competency 3YRS", years: 3 },
  { key: "uniform", title: "UNIFORM & DRESS CODE INDUCTION", years: 5 },
  { key: "ccalerts", title: "CC Alerts INDUCTION", years: 5 },
];

// Dummy per‑employee completions (YYYY-MM-DD or null)
const STAFF_TRAININGS = {
  E1234: { ffp3: "2024-04-29", inoculation: "2024-07-10", handhygiene: "2024-07-10", ppe: "2024-07-10", waste: "2024-07-10", sharps: "2024-07-10", linen: "2024-07-10", spill: null, isolation: "2024-07-10", cepheid_comp: null, uniform: "2024-07-10", ccalerts: "2024-07-10" },
  E1023: { ffp3: "2023-11-01", inoculation: "2023-10-10", handhygiene: "2024-01-12", ppe: "2024-01-12", waste: "2023-12-20", sharps: "2023-12-20", linen: "2023-12-20", spill: "2023-12-20", isolation: "2024-01-12", cepheid_comp: "2023-11-01", uniform: "2022-05-10", ccalerts: "2022-05-10" },
  E1001: { ffp3: "2023-05-15", inoculation: "2023-08-01", handhygiene: "2024-05-15", ppe: "2024-05-15", waste: "2024-05-15", sharps: "2024-05-15", linen: "2024-05-15", spill: "2024-05-15", isolation: "2024-05-15", cepheid_comp: null, uniform: "2021-06-01", ccalerts: "2021-06-01" },
  E1088: { ffp3: null, inoculation: null, handhygiene: "2023-06-10", ppe: null, waste: null, sharps: null, linen: null, spill: null, isolation: null, cepheid_comp: null, uniform: "2021-01-01", ccalerts: "2021-01-01" },
  E1112: { ffp3: null, inoculation: null, handhygiene: null, ppe: null, waste: null, sharps: null, linen: null, spill: null, isolation: null, cepheid_comp: null, uniform: null, ccalerts: null },
  E1175: { ffp3: null, inoculation: "2024-03-01", handhygiene: "2024-02-15", ppe: "2024-02-15", waste: "2024-02-15", sharps: "2024-02-15", linen: "2024-02-15", spill: "2024-02-15", isolation: "2024-02-15", cepheid_comp: null, uniform: "2024-02-15", ccalerts: "2024-02-15" },
  E1266: { ffp3: null, inoculation: null, handhygiene: "2022-09-01", ppe: "2022-09-01", waste: null, sharps: null, linen: null, spill: null, isolation: null, cepheid_comp: null, uniform: null, ccalerts: null },
};

// Helpers
const donut = (pct) => ([{ name: "Done", value: pct }, { name: "Remaining", value: Math.max(0, 100 - pct) }]);
const avg = (arr) => Math.round(arr.reduce((a,b)=>a+b,0) / (arr.length || 1));

// Derived analytics
const monthlyCompliance = monthly.map(d => ({ month: d.month, rate: Math.round((d.completed / (d.total || 1)) * 100) }));

const deptCompliance = (() => {
  const m = new Map();
  for (const s of STAFF) {
    const rec = m.get(s.department) || { dept: s.department, sum: 0, n: 0 };
    rec.sum += s.compliance; rec.n += 1; m.set(s.department, rec);
  }
  return Array.from(m.values()).map(v => ({ dept: v.dept, compliance: Math.round(v.sum / v.n) }));
})();

const roleCompliance = (() => {
  const m = new Map();
  for (const s of STAFF) {
    const rec = m.get(s.jobTitle) || { role: s.jobTitle, sum: 0, n: 0 };
    rec.sum += s.compliance; rec.n += 1; m.set(s.jobTitle, rec);
  }
  return Array.from(m.values()).map(v => ({ role: v.role, compliance: Math.round(v.sum / v.n) }));
})();

const clinicalSplit = [
  { cohort: "Clinical", compliance: avg(STAFF.filter(s=>s.clinical).map(s=>s.compliance)) },
  { cohort: "Non-Clinical", compliance: avg(STAFF.filter(s=>!s.clinical).map(s=>s.compliance)) },
];

const deptRisk = (() => {
  const m = new Map();
  for (const s of STAFF) {
    const rec = m.get(s.department) || { dept: s.department, total: 0, high: 0 };
    rec.total += 1; if (s.compliance < 70) rec.high += 1; m.set(s.department, rec);
  }
  return Array.from(m.values()).map(v => ({ dept: v.dept, riskPct: Math.round((v.high / v.total) * 100), high: v.high, total: v.total }));
})();

// ---------------- Injuries panel ----------------
const INJURY_TYPES = ["Sharps", "Inoculation", "Exposure", "Other"];
const ESCALATE_TO = ["Duty Manager", "Ward Manager", "Patient Safety Manager", "Theatre Manager"];

function fmtDT(iso) { return iso ? new Date(iso).toLocaleString('en-GB', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'; }
function hoursSince(iso) { return Math.floor((Date.now() - new Date(iso).getTime())/3600000); }

const INJURY_SAMPLE = [
  { id: "INC-0001", staffId: "E1023", name: "Abdiaziz Hussein", dept: "Imaging", type: "Sharps", device: "Cannula", location: "XR Room 2", riddor: false, incident_at: "2025-10-10T09:15:00Z", last_update: "2025-10-10T10:00:00Z", status: "In Progress", owner: "IPC", notes: "First aid given" },
  { id: "INC-0002", staffId: "E1001", name: "Abbas Mohamud", dept: "Theatres", type: "Inoculation", device: "Suture needle", location: "Theatre 1", riddor: false, incident_at: "2025-10-12T14:30:00Z", last_update: "2025-10-12T15:00:00Z", status: "In Progress", owner: "IPC", notes: "Hep B status checked" },
  { id: "INC-0003", staffId: "E1088", name: "Adina Andronachi", dept: "Hotel Services", type: "Exposure", device: "Body fluid", location: "Ward 2", riddor: true, incident_at: "2025-10-08T07:20:00Z", last_update: "2025-10-08T07:25:00Z", status: "Pending", owner: "IPC", notes: "Risk assessed" },
  { id: "INC-0004", staffId: "E1234", name: "Agnieszka Nowak", dept: "OPD", type: "Sharps", device: "Lancet", location: "Clinic B", riddor: false, incident_at: "2025-10-05T11:00:00Z", last_update: "2025-10-06T12:00:00Z", status: "Closed", owner: "IPC", notes: "Completed" },
];

function InjuriesPanel(){
  const [rows, setRows] = React.useState(INJURY_SAMPLE);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openUpdate, setOpenUpdate] = React.useState(null);
  const [q, setQ] = React.useState("");
  const [dept, setDept] = React.useState("All");
  const [type, setType] = React.useState("All");

  function nextId(){
    const n = rows.length + 1;
    return `INC-${String(n).padStart(4,'0')}`;
  }

  const defaultForm = {
    staffId: "",
    name: "",
    dept: "",
    type: INJURY_TYPES[0],
    device: "",
    location: "",
    riddor: false,
    incident_at: new Date().toISOString(),
    notes: "",
  };
  const [form, setForm] = React.useState(defaultForm);

  function isBreached(row){
    if(row.status === 'Closed') return false;
    const hrs = hoursSince(row.last_update);
    return hrs >= 24; // 24-hour update SLA
  }

  const filtered = rows.filter(r => {
    if(dept !== 'All' && r.dept !== dept) return false;
    if(type !== 'All' && r.type !== type) return false;
    const s = `${r.id} ${r.staffId} ${r.name} ${r.dept} ${r.type}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  function createIncident(e){
    e && e.preventDefault();
    const now = new Date().toISOString();
    const staff = STAFF.find(s=>s.id===form.staffId || s.fullName.toLowerCase()===form.name.toLowerCase());
    const row = {
      id: nextId(),
      staffId: form.staffId || staff?.id || 'UNKNOWN',
      name: form.name || staff?.fullName || 'Unknown',
      dept: form.dept || staff?.department || 'Unknown',
      type: form.type,
      device: form.device,
      location: form.location,
      riddor: !!form.riddor,
      incident_at: form.incident_at,
      last_update: now,
      status: 'In Progress',
      owner: 'IPC',
      notes: form.notes || 'New report logged',
    };
    setRows(prev => [row, ...prev]);
    setForm(defaultForm);
    setOpenCreate(false);
  }

  function saveUpdate(){
    if(!openUpdate) return;
    const { id, status, notes } = openUpdate;
    setRows(prev => prev.map(r => r.id===id ? { ...r, status, notes: (r.notes? r.notes+" | ":"")+ notes, last_update: new Date().toISOString() } : r));
    setOpenUpdate(null);
  }

  function exportCSV(){
    const headers = ["id","staffId","name","dept","type","device","location","riddor","incident_at","last_update","status","owner","notes","sla_breached","escalate_to"];
    const lines = [headers.join(",")].concat(rows.map(r => {
      const esc = isBreached(r);
      const vals = [r.id,r.staffId,r.name,r.dept,r.type,r.device,r.location,String(r.riddor),r.incident_at,r.last_update,r.status,r.owner,r.notes, String(esc), esc? ESCALATE_TO.join(";") : ""];
      return vals.map(v => typeof v === 'string' && v.includes(',') ? '"'+v.replace(/"/g,'""')+'"' : String(v ?? "")).join(',');
    }));
    const blob = new Blob([lines.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download = `injuries_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  const depts = Array.from(new Set(["All", ...rows.map(r=>r.dept)]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">Report injury</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={()=>setOpenCreate(true)} className="h-9 px-3 rounded-md text-white" style={{ backgroundColor: PAL.b600 }}>Report injury now</button>
            <button onClick={exportCSV} className="h-9 px-3 rounded-md border">Export CSV</button>
            <div className="ml-auto flex gap-2 items-center">
              <label className="text-sm text-slate-600">Department</label>
              <select value={dept} onChange={e=>setDept(e.target.value)} className="h-9 px-2 border rounded-md bg-white text-sm">
                {depts.map(d=> <option key={d} value={d}>{d}</option>)}
              </select>
              <label className="text-sm text-slate-600">Type</label>
              <select value={type} onChange={e=>setType(e.target.value)} className="h-9 px-2 border rounded-md bg-white text-sm">
                {["All",...INJURY_TYPES].map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="Search name or #" value={q} onChange={e=>setQ(e.target.value)} className="h-9 px-3 border rounded-md bg-white text-sm w-56" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">Injuries tracker</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="text-left py-2 pr-3">ID</th>
                  <th className="text-left py-2 pr-3">Staff</th>
                  <th className="text-left py-2 pr-3">Dept</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-left py-2 pr-3">Device / Location</th>
                  <th className="text-left py-2 pr-3">Incident</th>
                  <th className="text-left py-2 pr-3">Last Update</th>
                  <th className="text-left py-2 pr-3">SLA</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-right py-2 pr-0">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const breached = isBreached(r);
                  const badge = r.status === 'Closed'
                    ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">closed</span>
                    : breached
                      ? <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">escalate</span>
                      : <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">update due</span>;
                  return (
                    <tr key={r.id} className="border-t hover:bg-slate-50">
                      <td className="py-2 pr-3 font-medium">{r.id}</td>
                      <td className="py-2 pr-3"><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.staffId}</div></td>
                      <td className="py-2 pr-3">{r.dept}</td>
                      <td className="py-2 pr-3">{r.type}{r.riddor && <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">RIDDOR</span>}</td>
                      <td className="py-2 pr-3"><div>{r.device || '—'}</div><div className="text-xs text-slate-500">{r.location || '—'}</div></td>
                      <td className="py-2 pr-3">{fmtDT(r.incident_at)}</td>
                      <td className="py-2 pr-3">{fmtDT(r.last_update)} <span className="text-xs text-slate-500">({hoursSince(r.last_update)}h)</span></td>
                      <td className="py-2 pr-3">{badge}</td>
                      <td className="py-2 pr-3">{r.status}</td>
                      <td className="py-2 pr-0 text-right"><button onClick={()=>setOpenUpdate({ id:r.id, status:r.status, notes:"" })} className="h-8 px-3 rounded-md text-white" style={{ backgroundColor: PAL.b600 }}>Update</button></td>
                    </tr>
                  );
                })}
                {filtered.length===0 && (<tr><td className="py-3 text-slate-500" colSpan={10}>No incidents found.</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-slate-600 mt-2">Rule: if not updated within 24h and not closed, the row shows <span className="text-red-700">escalate</span> and should notify {ESCALATE_TO.join(", ")} (mock).</div>
        </CardContent>
      </Card>

      {/* Create overlay */}
      {openCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-4 space-y-3 shadow-lg">
            <div className="text-base font-semibold">New injury report</div>
            <form onSubmit={createIncident} className="grid grid-cols-2 gap-2 text-sm">
              <input className="h-9 px-2 border rounded" placeholder="Staff ID (e.g., E1023)" value={form.staffId} onChange={e=>setForm({ ...form, staffId: e.target.value })} />
              <input className="h-9 px-2 border rounded" placeholder="Full name" value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} />
              <input className="h-9 px-2 border rounded" placeholder="Department" value={form.dept} onChange={e=>setForm({ ...form, dept: e.target.value })} />
              <select className="h-9 px-2 border rounded bg-white" value={form.type} onChange={e=>setForm({ ...form, type: e.target.value })}>{INJURY_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}</select>
              <input className="h-9 px-2 border rounded" placeholder="Device" value={form.device} onChange={e=>setForm({ ...form, device: e.target.value })} />
              <input className="h-9 px-2 border rounded" placeholder="Location" value={form.location} onChange={e=>setForm({ ...form, location: e.target.value })} />
              <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={form.riddor} onChange={e=>setForm({ ...form, riddor: e.target.checked })} /><span>RIDDOR reportable</span></label>
              <label className="col-span-1 text-slate-600">Incident date/time</label>
              <input type="datetime-local" className="h-9 px-2 border rounded" value={form.incident_at.slice(0,16)} onChange={e=>setForm({ ...form, incident_at: new Date(e.target.value).toISOString() })} />
              <textarea className="col-span-2 h-20 px-2 py-1 border rounded" placeholder="Notes / immediate actions" value={form.notes} onChange={e=>setForm({ ...form, notes: e.target.value })} />
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={()=>setOpenCreate(false)} className="h-9 px-3 rounded-md border">Cancel</button>
                <button type="submit" className="h-9 px-3 rounded-md text-white" style={{ backgroundColor: PAL.b600 }}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update overlay */}
      {openUpdate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-4 space-y-3 shadow-lg">
            <div className="text-base font-semibold">Update case {openUpdate.id}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="text-slate-600">Status</label>
              <select className="h-9 px-2 border rounded bg-white" value={openUpdate.status} onChange={e=>setOpenUpdate({ ...openUpdate, status: e.target.value })}>
                {['Pending','In Progress','Closed'].map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="text-slate-600">Add note</label>
              <input className="h-9 px-2 border rounded" placeholder="e.g., HBV booster arranged" value={openUpdate.notes} onChange={e=>setOpenUpdate({ ...openUpdate, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setOpenUpdate(null)} className="h-9 px-3 rounded-md border">Cancel</button>
              <button onClick={saveUpdate} className="h-9 px-3 rounded-md text-white" style={{ backgroundColor: PAL.b600 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IPCUnifiedDashboard() {
  const [selection, setSelection] = React.useState({ dept: null, role: null, cohort: null });

  // Quick‑find wiring (overview)
  React.useEffect(() => {
    const $dept = document.getElementById('qf-dept');
    const $q = document.getElementById('qf-search');
    const $body = document.getElementById('qf-body');
    function render(){
      if(!$body) return;
      const dept = ($dept && $dept.value) || 'All';
      const q = ($q && $q.value || '').toLowerCase();
      let list = STAFF.filter(s => dept==='All' ? true : s.department===dept);
      if(q){ list = list.filter(s => s.id.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q)); }
      list.sort((a,b)=> a.compliance - b.compliance);
      const rows = list.slice(0,5).map(s => {
        const label = s.compliance>=90? '(Current)': s.compliance>=70? '(Due soon)': '(Overdue)';
        const cls = s.compliance>=90? 'text-emerald-700': s.compliance>=70? 'text-amber-700': 'text-red-700';
        return `<tr class="border-t">
          <td class="py-2 pr-3"><div class="font-medium">${s.fullName}</div><div class="text-xs text-slate-500">${s.id}</div></td>
          <td class="py-2 pr-3">${s.department}</td>
          <td class="py-2 pr-3">${s.jobTitle}</td>
          <td class="py-2 pr-0 text-right"><span class="font-semibold">${s.compliance}%</span> <span class="text-xs ${cls}">${label}</span></td>
        </tr>`;
      }).join('');
      $body.innerHTML = rows || `<tr><td class="py-3 text-slate-500" colspan="4">No matches</td></tr>`;
    }
    const handler = () => render();
    $dept && $dept.addEventListener('change', handler);
    $q && $q.addEventListener('input', handler);
    render();
    return () => { $dept && $dept.removeEventListener('change', handler); $q && $q.removeEventListener('input', handler); };
  }, []);

  const drill = STAFF.filter(s => {
    if(selection.dept && s.department !== selection.dept) return false;
    if(selection.role && s.jobTitle !== selection.role) return false;
    if(selection.cohort === 'Clinical' && !s.clinical) return false;
    if(selection.cohort === 'Non-Clinical' && s.clinical) return false;
    return true;
  }).sort((a,b)=>a.compliance-b.compliance).slice(0,5);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-2">
          {["Overview","Register","Matrix","Injuries","Operational & Departmental Insights"].map((t) => (
            <TabsTrigger key={t} value={t.toLowerCase()==='operational & departmental insights'?"ops":t.toLowerCase()}>{t}</TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-12 gap-4">
            {/* KPI side column */}
            <div className="col-span-12 md:col-span-3 space-y-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-slate-600">Training Number</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{KPIS.trainingNumber}</div></CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-slate-600">Average Rating</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{KPIS.averageRating.toFixed(1)}</div></CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-slate-600">Hours</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{KPIS.hours}</div></CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-slate-600">Budget (GBP)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">£{KPIS.budget.toLocaleString()}</div></CardContent></Card>
            </div>
            {/* Monthly numbers */}
            <div className="col-span-12 md:col-span-9">
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-sm">Monthly Training Numbers</CardTitle></CardHeader>
                <CardContent className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" name="Total" fill={PAL.b300} />
                      <Bar dataKey="completed" name="Completed" fill={PAL.b700} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Find */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12">
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-sm">Quick Find — Staff Compliance</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-3">
                    <div className="flex gap-2 items-center">
                      <label className="text-sm text-slate-600">Department</label>
                      <select id="qf-dept" className="h-9 px-2 border rounded-md bg-white text-sm">
                        {['All',...Array.from(new Set(STAFF.map(s=>s.department)))].map(d=> <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center w-full md:w-80">
                      <input id="qf-search" className="h-9 px-3 border rounded-md bg-white text-sm w-full" placeholder="Search name or employee #" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-slate-600"><th className="text-left py-2 pr-3">Employee</th><th className="text-left py-2 pr-3">Department</th><th className="text-left py-2 pr-3">Role</th><th className="text-right py-2 pr-0">Compliance</th></tr>
                      </thead>
                      <tbody id="qf-body"></tbody>
                    </table>
                  </div>
                  <div className="text-xs text-slate-600 mt-2">Shows up to 5 results. Clear search to see lowest compliance first.</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Status + Types */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Training Status</CardTitle></CardHeader><CardContent className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:'Cancelled',value:2},{name:'Completed',value:11},{name:'In-Progress',value:2},{name:'Not Started',value:5}]} layout="vertical" margin={{ left: 24 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} /><Tooltip /><Bar dataKey="value" fill={PAL.b700} /></BarChart></ResponsiveContainer></CardContent></Card>
            </div>
            <div className="col-span-12 md:col-span-6">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Training Types</CardTitle></CardHeader><CardContent className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:'Online',value:8},{name:'In-House',value:10},{name:'External',value:2}]} margin={{ left: 24 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={PAL.b500} /></BarChart></ResponsiveContainer></CardContent></Card>
            </div>
          </div>

          {/* Donuts + Trainees */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Duration</CardTitle></CardHeader><CardContent className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donut(KPIS.durationPct)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80}><Cell fill={PAL.b600} /><Cell fill={PAL.slate200} /></Pie><Tooltip /></PieChart></ResponsiveContainer><div className="text-center -mt-24 text-xl font-bold">{KPIS.durationPct}%</div><div className="text-center text-xs text-slate-600 mt-20">Completed vs Remaining</div></CardContent></Card></div>
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Budget</CardTitle></CardHeader><CardContent className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donut(KPIS.budgetPct)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80}><Cell fill={PAL.b700} /><Cell fill={PAL.slate200} /></Pie><Tooltip /></PieChart></ResponsiveContainer><div className="text-center -mt-24 text-xl font-bold">{KPIS.budgetPct}%</div><div className="text-center text-xs text-slate-600 mt-20">Spent vs Remaining</div></CardContent></Card></div>
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Trainee Numbers</CardTitle></CardHeader><CardContent className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{label:'Participated',value:186},{label:'Expected',value:10}]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={PAL.b500} /></BarChart></ResponsiveContainer></CardContent></Card></div>
          </div>

          {/* Watchlist */}
          <div className="grid grid-cols-1 gap-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">IPC Watchlist</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"><div className="rounded-lg border p-3"><div className="text-slate-600">Overdue Trainings</div><div className="text-2xl font-bold text-red-600">{KPIS.overdueTrainings}</div></div><div className="rounded-lg border p-3"><div className="text-slate-600">Due This Month</div><div className="text-2xl font-bold text-amber-600">{KPIS.dueThisMonth}</div></div><div className="rounded-lg border p-3"><div className="text-slate-600">High‑Risk Staff</div><div className="text-2xl font-bold text-blue-700">{KPIS.highRiskStaff}</div></div></div></CardContent></Card></div>
        </TabsContent>

        {/* REGISTER */}
        <TabsContent value="register" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Find an employee</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
                <div className="flex gap-2 items-center">
                  <label className="text-sm text-slate-600">Department</label>
                  <select id="reg-dept" className="h-9 px-2 border rounded-md bg-white text-sm">
                    {['All',...Array.from(new Set(STAFF.map(s=>s.department)))].map(d=> <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 items-center w-full md:w-96">
                  <label className="text-sm text-slate-600">Employee</label>
                  <select id="reg-employee" className="h-9 px-2 border rounded-md bg-white text-sm w-full">
                    {STAFF.sort((a,b)=>a.fullName.localeCompare(b.fullName)).map(s=> (
                      <option key={s.id} value={s.id}>{s.fullName} · {s.id}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 items-center w-full md:w-80">
                  <input list="staff-ids" id="reg-id" className="h-9 px-3 border rounded-md bg-white text-sm w-full" placeholder="Type employee # or name" />
                  <datalist id="staff-ids">
                    {STAFF.map(s=> <option key={s.id} value={s.id}>{s.fullName}</option>)}
                    {STAFF.map(s=> <option key={s.id+"-n"} value={s.fullName}>{s.id}</option>)}
                  </datalist>
                  <button id="reg-search" className="h-9 px-3 rounded-md text-white" style={{ backgroundColor: PAL.b600 }}>Search</button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Employee compliance</CardTitle></CardHeader>
            <CardContent>
              <div id="reg-personal">
                <div className="text-slate-500 text-sm">Use the dropdown or start typing an employee number. A personal compliance panel will render here.</div>
              </div>
            </CardContent>
          </Card>

          {/* Inline script to render personal panel */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
            (function(){
              const pal={emerald:'#047857',amber:'#B45309',red:'#B91C1C'};
              const STAFF=${JSON.stringify(STAFF)};
              const MODULES=${JSON.stringify(TRAINING_MODULES)};
              const MAP=${JSON.stringify(STAFF_TRAININGS)};
              function addYears(d,y){const dt=new Date(d);dt.setFullYear(dt.getFullYear()+y);return dt.toISOString().slice(0,10)}
              function fmtUK(x){return x?new Date(x).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}
              function daysUntil(iso){return Math.ceil((new Date(iso).getTime()-Date.now())/86400000)}
              function deriveStatus(c,y){if(!c)return{status:'missing',due:null};const due=addYears(c,y);const d=daysUntil(due);if(d<0)return{status:'overdue',due};if(d<=60)return{status:'due',due};return{status:'compliant',due}}
              function summaryFor(emp){const map=MAP[emp.id]||{};const rows=MODULES.map(m=>{const c=map[m.key]||null;const st=deriveStatus(c,m.years);return{title:m.title,completed:c,due:st.due,status:st.status}});const counts={};rows.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);const pct=Math.round((rows.filter(r=>r.status==='compliant').length/rows.length)*100);return{rows,counts,pct}}
              function badge(s){if(s==='compliant')return'<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">compliant</span>';if(s==='due')return'<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">due soon</span>';if(s==='overdue')return'<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">overdue</span>';return'<span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs">missing</span>'}
              function render(emp){const tgt=document.getElementById('reg-personal');if(!tgt)return;const s=summaryFor(emp);
                const donut='<div class="flex items-center gap-4"><div class="relative w-28 h-28"><svg viewBox="0 0 36 36" class="w-28 h-28"><path d="M18 2.0845a 15.9155 15.9155 0 1 1 0 31.831 a 15.9155 15.9155 0 1 1 0 -31.831" fill="none" stroke="#E5E7EB" stroke-width="3"></path><path stroke="'+pal.red+'" stroke-dasharray="'+Math.min(100,100-s.pct)+', '+Math.max(0,s.pct)+'" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3" stroke-linecap="round"></path></svg><div class="absolute inset-0 flex items-center justify-center"><div class="text-center"><div class="text-2xl font-bold">'+s.pct+'%</div><div class="text-xs text-slate-600">'+(s.pct>=85?'Compliant':'Non‑Compliant')+'</div></div></div></div><div class="text-sm text-slate-600 max-w-prose">This is the personal compliance score across mandatory IPC modules. A score of 85% or above is considered compliant.</div></div>';
                const chips='<div class="flex gap-3 mt-3"><div class="px-3 py-1 rounded-lg border"><div class="text-slate-600 text-xs">Compliant</div><div class="font-semibold">'+(s.counts.compliant||0)+'</div></div><div class="px-3 py-1 rounded-lg border"><div class="text-slate-600 text-xs">Due soon</div><div class="font-semibold">'+(s.counts.due||0)+'</div></div><div class="px-3 py-1 rounded-lg border"><div class="text-slate-600 text-xs">Overdue</div><div class="font-semibold">'+(s.counts.overdue||0)+'</div></div><div class="px-3 py-1 rounded-lg border"><div class="text-slate-600 text-xs">Missing</div><div class="font-semibold">'+(s.counts.missing||0)+'</div></div></div>';
                const rows=s.rows.map(function(r){return '<tr class="border-t"><td class="py-2 pr-3">'+r.title+'</td><td class="py-2 pr-3">'+fmtUK(r.completed)+'</td><td class="py-2 pr-3">'+fmtUK(r.due)+'</td><td class="py-2 pr-0 text-right">'+badge(r.status)+'</td></tr>'}).join('');
                tgt.innerHTML = '<div class="space-y-4"><div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">'+donut+chips+'</div><div class="text-sm font-semibold">Mandatory Trainings</div><div class="overflow-x-auto"><table class="min-w-full text-sm"><thead><tr class="text-slate-600"><th class="text-left py-2 pr-3">Training Name</th><th class="text-left py-2 pr-3">Completion Date</th><th class="text-left py-2 pr-3">Renewal Due Date</th><th class="text-right py-2 pr-0">Status</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
              }
              const $dept=document.getElementById('reg-dept');
              const $emp=document.getElementById('reg-employee');
              const $id=document.getElementById('reg-id');
              const $btn=document.getElementById('reg-search');
              function syncEmployees(){const dep=$dept.value;const opts=STAFF.filter(s=>dep==='All'||s.department===dep).sort((a,b)=>a.fullName.localeCompare(b.fullName));$emp.innerHTML=opts.map(function(s){return '<option value="'+s.id+'">'+s.fullName+' · '+s.id+'</option>';}).join('')}
              function currentEmp(){const id=($id.value||$emp.value||'').trim();let e=STAFF.find(s=>s.id===id||s.fullName.toLowerCase()===id.toLowerCase());if(!e){e=STAFF.find(s=>s.id===$emp.value)}return e}
              $dept.addEventListener('change',()=>{syncEmployees()});
              $btn.addEventListener('click',()=>{const e=currentEmp(); if(e) render(e)});
              $emp.addEventListener('change',()=>{const e=currentEmp(); if(e) render(e)});
              $id.addEventListener('keydown',(ev)=>{if(ev.key==='Enter'){ev.preventDefault();const e=currentEmp(); if(e) render(e)}});
              syncEmployees(); render(STAFF[0]);
            })();
          `,
            }}
          />
        </TabsContent>

        {/* MATRIX */}
        <TabsContent value="matrix" className="space-y-4 mt-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">High‑Risk Staff</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{STAFF.filter(s=>s.compliance<70).length}</div><div className="text-xs text-slate-600">Compliance below 70% or missing critical modules.</div></CardContent></Card></div>
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Due This Month</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-amber-600">{KPIS.dueThisMonth}</div><div className="text-xs text-slate-600">Planned renewals within month.</div></CardContent></Card></div>
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Overdue Trainings</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-700">{KPIS.overdueTrainings}</div><div className="text-xs text-slate-600">Past the renewal date.</div></CardContent></Card></div>
          </div>
          <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Compliance by Training Type</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={MODULE_SCORES} margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="module" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} /><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} /><Tooltip formatter={(v)=>`${v}%`} /><Bar dataKey="score" name="Compliance %" radius={[6,6,0,0]}>{MODULE_SCORES.map((m,i)=>(<Cell key={i} fill={m.score>=90?PAL.emerald:m.score>=70?PAL.amber:PAL.red} />))}</Bar></BarChart></ResponsiveContainer></CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Department Risk Level</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={deptRisk}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dept" /><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} /><Tooltip formatter={(v)=>`${v}%`} /><Bar dataKey="riskPct" name="High‑risk %" radius={[6,6,0,0]}>{deptRisk.map((d,i)=>(<Cell key={i} fill={d.riskPct>=30?PAL.red:d.riskPct>=15?PAL.amber:PAL.emerald} />))}</Bar></BarChart></ResponsiveContainer><div className="text-xs text-slate-600 mt-2">Colour scale: Low / Medium / High based on % of staff below 70% compliance.</div></CardContent></Card>
        </TabsContent>

        {/* INJURIES */}
        <TabsContent value="injuries" className="mt-4 space-y-4">
          <InjuriesPanel />
        </TabsContent>

        {/* OPERATIONAL & DEPARTMENTAL INSIGHTS */}
        <TabsContent value="ops" className="space-y-4 mt-4">
          {(selection.dept || selection.role || selection.cohort) && (
            <div className="text-sm flex items-center gap-2"><span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700">Drill: {selection.dept?`Dept=${selection.dept} `:""}{selection.role?`Role=${selection.role} `:""}{selection.cohort?`Cohort=${selection.cohort}`:""}</span><button className="text-blue-700 underline" onClick={()=>setSelection({ dept:null, role:null, cohort:null })}>Clear</button></div>
          )}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-6"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Department Compliance Rate</CardTitle></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={deptCompliance} margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dept" /><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} /><Tooltip formatter={(v)=>`${v}%`} /><Bar dataKey="compliance" name="Compliance %" radius={[6,6,0,0]} onClick={(d,i)=> setSelection({ ...selection, dept: deptCompliance[i].dept })}>{deptCompliance.map((d,i)=>(<Cell key={i} fill={d.compliance>=90?PAL.emerald:d.compliance>=70?PAL.amber:PAL.red} cursor="pointer" />))}</Bar></BarChart></ResponsiveContainer><div className="text-xs text-slate-600 mt-2">Click a bar to drill into lowest‑compliant staff in that department.</div></CardContent></Card></div>
            <div className="col-span-12 lg:col-span-6"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Clinical vs Non-Clinical Compliance</CardTitle></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={clinicalSplit} margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="cohort" /><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} /><Tooltip formatter={(v)=>`${v}%`} /><Bar dataKey="compliance" name="Compliance %" radius={[6,6,0,0]} onClick={(d,i)=> setSelection({ ...selection, cohort: clinicalSplit[i].cohort })}>{clinicalSplit.map((d,i)=>(<Cell key={i} fill={i===0?PAL.b700:PAL.b500} cursor="pointer" />))}</Bar></BarChart></ResponsiveContainer><div className="text-xs text-slate-600 mt-2">Click a bar to drill by cohort.</div></CardContent></Card></div>
            <div className="col-span-12"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Job Title Performance</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={roleCompliance} margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="role" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} /><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} /><Tooltip formatter={(v)=>`${v}%`} /><Bar dataKey="compliance" name="Compliance %" radius={[6,6,0,0]} onClick={(d,i)=> setSelection({ ...selection, role: roleCompliance[i].role })}>{roleCompliance.map((d,i)=>(<Cell key={i} fill={d.compliance>=90?PAL.emerald:d.compliance>=70?PAL.amber:PAL.red} cursor="pointer" />))}</Bar></BarChart></ResponsiveContainer><div className="text-xs text-slate-600 mt-2">Click a bar to drill by job title.</div></CardContent></Card></div>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Training Due This Month</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-amber-600">{KPIS.dueThisMonth}</div><div className="text-xs text-slate-600">Upcoming renewals. Click to focus cohort.</div><button className="mt-2 text-blue-700 underline text-sm" onClick={()=> setSelection({ ...selection, cohort: 'Due-This-Month' })}>Drill cohort</button></CardContent></Card></div>
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Training Backlog</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{KPIS.overdueTrainings}</div><div className="text-xs text-slate-600">Total overdue across organisation.</div><button className="mt-2 text-blue-700 underline text-sm" onClick={()=> setSelection({ ...selection, cohort: 'Overdue' })}>Drill cohort</button></CardContent></Card></div>
            <div className="col-span-12 md:col-span-4"><Card><CardHeader className="pb-1"><CardTitle className="text-sm">Compliance Trend</CardTitle></CardHeader><CardContent className="h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyCompliance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`} /><Tooltip formatter={(v)=>`${v}%`} /><Line type="monotone" dataKey="rate" name="Compliance %" stroke={PAL.b700} dot={true} /></LineChart></ResponsiveContainer></CardContent></Card></div>
          </div>
          <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Drill‑down Preview</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-slate-600"><th className="text-left py-2 pr-3">Employee</th><th className="text-left py-2 pr-3">Department</th><th className="text-left py-2 pr-3">Role</th><th className="text-right py-2 pr-0">Compliance</th></tr></thead><tbody>{drill.map(s => (<tr key={s.id} className="border-t"><td className="py-2 pr-3"><div className="font-medium">{s.fullName}</div><div className="text-xs text-slate-500">{s.id}</div></td><td className="py-2 pr-3">{s.department}</td><td className="py-2 pr-3">{s.jobTitle}</td><td className="py-2 pr-0 text-right"><span className="font-semibold">{s.compliance}%</span></td></tr>))}{drill.length===0 && (<tr><td className="py-3 text-slate-500" colSpan={4}>No matches. Click charts above to drill.</td></tr>)}</tbody></table></div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}