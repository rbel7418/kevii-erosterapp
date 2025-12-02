
import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, XAxis, YAxis,
  BarChart, Bar,
} from "recharts";
import { base44 } from "@/api/base44Client";
import { User } from "@/entities/User";

// NHS palette
const NHS = {
  blue: "#005EB8",
  blue2: "#0072CE",
  teal: "#00A3A3",
  areaA: "#0B4A6F",
  areaB: "#3E7CB1",
  areaC: "#7FB3D5",
  areaD: "#B8D7EA",
  pieB: "#C5D3E0",
};

// Helpers
const slug = (s) => String(s || "").toLowerCase().trim().split(" ").join("-");
const daysUntil = (iso) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
const tMinus = (iso) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null);

// Sample data (replace later with entity-backed data if needed)
const SAMPLE_ROWS = [
  { id: 1, patient: "TCI-001", category: "Infection",        severity: "High",   businessImpact: 12000, costToFix: 1500, status: "Pending",      owner: "Wards",          due: "2025-12-20", surgeryDate: "2025-12-28", response: "Isolation on admission, pre-op optimisation", triggered_by_name: "System", triggered_at: "2024-01-01T10:00:00Z" },
  { id: 2, patient: "TCI-002", category: "Allergies",        severity: "Medium", businessImpact:  4000, costToFix:  300, status: "In Progress",  owner: "Pre-Assessment", due: "2025-12-15", surgeryDate: "2026-01-05", response: "Clarify anaphylaxis history, wristband + EHR alert", triggered_by_name: "System", triggered_at: "2024-01-02T11:00:00Z" },
  { id: 3, patient: "TCI-003", category: "Pending Lab Test", severity: "High",   businessImpact:  8000, costToFix:    0, status: "Pending",      owner: "Outpatients",    due: "2025-12-12", surgeryDate: "2025-12-22", response: "Chase MRSA and Group & Save results", triggered_by_name: "System", triggered_at: "2024-01-03T09:00:00Z" },
  { id: 4, patient: "TCI-004", category: "Funding Source",   severity: "Low",    businessImpact:  1500, costToFix:  200, status: "Mitigated",    owner: "Theatres",       due: "2025-12-05", surgeryDate: null,          response: "Confirm insurer authorisation before list", triggered_by_name: "System", triggered_at: "2024-01-04T13:00:00Z" },
  { id: 5, patient: "TCI-005", category: "Infection",        severity: "High",   businessImpact: 25000, costToFix: 6000, status: "Accepted",     owner: "Wards",          due: "2025-12-10", surgeryDate: "2025-12-19", response: "Ring-fence side room, PPE brief", triggered_by_name: "System", triggered_at: "2024-01-05T14:00:00Z" },
  { id: 6, patient: "TCI-006", category: "Pending Lab Test", severity: "Medium", businessImpact:  3000, costToFix:  500, status: "In Progress",  owner: "Pre-Assessment", due: "2025-12-18", surgeryDate: null,          response: "ECG repeat due to artefact", triggered_by_name: "System", triggered_at: "2024-01-06T10:30:00Z" },
];

export default function RiskRegister() {
  const [rows, setRows] = useState(SAMPLE_ROWS);
  const [query, setQuery] = useState("");
  const [severityFilt, setSeverityFilt] = useState("all");
  const [statusFilt, setStatusFilt] = useState("all");
  const [tab, setTab] = useState("overview");
  const [reportOpen, setReportOpen] = useState(false);

  // FIRST_EDIT: user + loading + form state
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const CategoryVL = ["Allergies","Infection","Pending Lab Test","Funding Source","Other"];
  const SeverityVL = ["High","Medium","Low"];
  const StatusVL   = ["Accepted","Pending","In Progress","Mitigated","Closed"];
  const OwnerVL    = ["Wards","Pre-Assessment","Outpatients","Theatres","Other"];

  const defaultForm = {
    patient: "",
    category: "Infection",
    severity: "Medium",
    status: "Pending",
    owner: "Wards",
    businessImpact: "",
    costToFix: "",
    due: "",
    surgeryDate: "",
    response: ""
  };
  const [form, setForm] = useState(defaultForm);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const me = await User.me().catch(() => null);
      setCurrentUser(me);
      const existing = await base44.entities.RiskEntry.list().catch(() => []);
      if (Array.isArray(existing) && existing.length > 0) {
        // If entity has data, use it; otherwise keep sample rows
        setRows(existing);
      }
      setLoading(false);
    })();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        businessImpact: Number(form.businessImpact || 0),
        costToFix: Number(form.costToFix || 0),
        triggered_by_name: currentUser?.full_name || currentUser?.email || "Unknown",
        triggered_by_email: currentUser?.email || "",
        triggered_at: new Date().toISOString()
      };
      const rec = await base44.entities.RiskEntry.create(payload);
      setRows(prev => [rec, ...prev]);
      setForm(defaultForm);
      setTab("table"); // focus the register after adding
    } catch (error) {
      console.error("Failed to create risk entry:", error);
      alert("Failed to create risk entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filters
  const filtered = useMemo(() => {
    const q = slug(query);
    return rows.filter(r => {
      if (severityFilt !== "all" && r.severity !== severityFilt) return false;
      if (statusFilt !== "all" && r.status !== statusFilt) return false;
      if (!q) return true;
      const hay = slug(`${r.patient} ${r.category} ${r.status} ${r.owner} ${r.response}`);
      return hay.includes(q);
    });
  }, [rows, query, severityFilt, statusFilt]);

  // KPIs
  const openCount = useMemo(() => filtered.filter(r => ["Pending","In Progress"].includes(r.status)).length, [filtered]);
  const highRisk  = useMemo(() => filtered.filter(r => r.severity === "High").length, [filtered]);
  const avgImpact = useMemo(() => filtered.length ? Math.round(filtered.reduce((s,r)=>s+ (Number(r.businessImpact) || 0),0)/filtered.length) : 0, [filtered]);
  const totalFix  = useMemo(() => filtered.reduce((s,r)=>s+ (Number(r.costToFix) || 0),0), [filtered]);

  // Aggregations
  const bySeverity = useMemo(() => {
    return ["High","Medium","Low"].map(s => ({ name: s, value: filtered.filter(r=>r.severity===s).length }));
  }, [filtered]);

  const byStatus = useMemo(() => {
    return StatusVL.map(s => ({ name: s, value: filtered.filter(r=>r.status===s).length }));
  }, [filtered]);

  const byCategory = useMemo(() => {
    return CategoryVL.map(c => ({ category: c, count: filtered.filter(r=>r.category===c).length }));
  }, [filtered]);

  const impactCost = useMemo(() => {
    return filtered.map(r => ({ id: r.patient, impact: Number(r.businessImpact) || 0, cost: Number(r.costToFix) || 0 }));
  }, [filtered]);

  const dueDist = useMemo(() => {
    const buckets = [
      { label: "Overdue", test: (d)=>d<0 },
      { label: "0-3d",   test: (d)=>d>=0 && d<=3 },
      { label: "4-7d",   test: (d)=>d>=4 && d<=7 },
      { label: "8-14d",  test: (d)=>d>=8 && d<=14 },
      { label: ">14d",   test: (d)=>d>14 },
    ];
    return buckets.map(b=>({ bucket: b.label, value: filtered.filter(r=> b.test(daysUntil(r.due))).length }));
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["id","patient","category","severity","businessImpact","costToFix","status","owner","due","surgeryDate","response", "triggered_by_name", "triggered_at"];
    const lines = [headers.join(",")].concat(
      rows.map(r => headers.map(h => {
        let value = r[h];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`; // Handle commas and double quotes in strings
        }
        return JSON.stringify(value ?? "");
      }).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk_register_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Risk Register</h1>
            <p className="text-sm text-slate-600">Patients TCI risk register with severity, status, and impact insights.</p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search by patient, category, owner..."
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              className="w-64"
            />
            <select
              value={severityFilt}
              onChange={(e)=>setSeverityFilt(e.target.value)}
              className="h-9 px-3 border rounded-md"
            >
              <option value="all">All severities</option>
              {SeverityVL.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={statusFilt}
              onChange={(e)=>setStatusFilt(e.target.value)}
              className="h-9 px-3 border rounded-md"
            >
              <option value="all">All status</option>
              {StatusVL.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <Button variant="outline" onClick={()=>setReportOpen(true)}>Generate report</Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="shadow-sm"><CardContent className="p-4">
            <div className="text-xs text-slate-500">Open risks</div>
            <div className="text-2xl font-bold text-slate-900">{openCount}</div>
          </CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-4">
            <div className="text-xs text-slate-500">High severity</div>
            <div className="text-2xl font-bold text-red-600">{highRisk}</div>
          </CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-4">
            <div className="text-xs text-slate-500">Avg business impact</div>
            <div className="text-2xl font-bold text-slate-900">£{avgImpact.toLocaleString()}</div>
          </CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-4">
            <div className="text-xs text-slate-500">Total cost to fix</div>
            <div className="text-2xl font-bold text-slate-900">£{totalFix.toLocaleString()}</div>
          </CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Due & Timeline</TabsTrigger>
            <TabsTrigger value="table">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Card className="shadow-sm">
                <CardHeader className="py-3"><CardTitle className="text-sm">By Severity</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={bySeverity} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {bySeverity.map((_,i)=> <Cell key={i} fill={[NHS.blue,NHS.teal,NHS.pieB][i%3]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="py-3"><CardTitle className="text-sm">By Status</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={70} paddingAngle={2}>
                        {byStatus.map((_,i)=> <Cell key={i} fill={[NHS.blue2,NHS.areaC,NHS.areaD,NHS.teal, NHS.blue][i%5]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="py-3"><CardTitle className="text-sm">Categories</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCategory}>
                      <CartesianGrid strokeDasharray="2 3" vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={NHS.blue} radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
              <Card className="shadow-sm">
                <CardHeader className="py-3"><CardTitle className="text-sm">Impact vs Cost</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={impactCost}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={NHS.areaB} stopOpacity={0.7} />
                          <stop offset="100%" stopColor={NHS.areaB} stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={NHS.teal} stopOpacity={0.7} />
                          <stop offset="100%" stopColor={NHS.teal} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 3" />
                      <XAxis dataKey="id" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="impact" stroke={NHS.areaB} fill="url(#g1)" />
                      <Area type="monotone" dataKey="cost" stroke={NHS.teal} fill="url(#g2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="py-3"><CardTitle className="text-sm">Due Date Distribution</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dueDist}>
                      <CartesianGrid strokeDasharray="2 3" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill={NHS.blue2} radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-3">
            <Card className="shadow-sm">
              <CardHeader className="py-3"><CardTitle className="text-sm">Upcoming surgery & deadlines</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2 pr-4">Patient</th>
                        <th className="py-2 pr-4">Severity</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Due (T-)</th>
                        <th className="py-2 pr-4">Surgery (T-)</th>
                        <th className="py-2 pr-4">Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(r => (
                        <tr key={r.id || r.patient} className="border-t">
                          <td className="py-2 pr-4 font-medium">{r.patient}</td>
                          <td className="py-2 pr-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${r.severity === "High" ? "bg-red-100 text-red-700" : r.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {r.severity}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{r.status}</td>
                          <td className={`py-2 pr-4 ${daysUntil(r.due) < 0 ? "text-red-600 font-semibold" : ""}`}>
                            {tMinus(r.due)}
                          </td>
                          <td className="py-2 pr-4">{r.surgeryDate ? tMinus(r.surgeryDate) : "-"}</td>
                          <td className="py-2 pr-4">{r.owner}</td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td className="py-4 text-slate-500" colSpan={6}>No risks match the current filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table" className="mt-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <Card className="shadow-sm">
                  <CardHeader className="py-3"><CardTitle className="text-sm">Register</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-2 pr-4">Patient</th>
                            <th className="py-2 pr-4">Category</th>
                            <th className="py-2 pr-4">Severity</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Owner</th>
                            <th className="py-2 pr-4">Impact (£)</th>
                            <th className="py-2 pr-4">Fix (£)</th>
                            <th className="py-2 pr-4">Due</th>
                            <th className="py-2 pr-4">Surgery</th>
                            <th className="py-2 pr-4">Response</th>
                            <th className="py-2 pr-4">Triggered by</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.id || r.patient} className="border-t hover:bg-slate-50">
                              <td className="py-2 pr-4 font-medium">{r.patient}</td>
                              <td className="py-2 pr-4">{r.category}</td>
                              <td className="py-2 pr-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${r.severity === "High" ? "bg-red-100 text-red-700" : r.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                  {r.severity}
                                </span>
                              </td>
                              <td className="py-2 pr-4">{r.status}</td>
                              <td className="py-2 pr-4">{r.owner}</td>
                              <td className="py-2 pr-4">£{Number(r.businessImpact || 0).toLocaleString()}</td>
                              <td className="py-2 pr-4">£{Number(r.costToFix || 0).toLocaleString()}</td>
                              <td className={`py-2 pr-4 ${r.due && daysUntil(r.due) < 0 ? "text-red-600 font-semibold" : ""}`}>{r.due || "-"}</td>
                              <td className="py-2 pr-4">{r.surgeryDate || "-"}</td>
                              <td className="py-2 pr-4">{r.response || "-"}</td>
                              <td className="py-2 pr-4">
                                <div className="text-xs">
                                  <div className="font-medium">{r.triggered_by_name || "-"}</div>
                                  <div className="text-slate-500">{r.triggered_at ? new Date(r.triggered_at).toLocaleString() : "-"}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr><td className="py-4 text-slate-500" colSpan={11}>No risks found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Add new risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreate} className="space-y-3">
                      <Input
                        placeholder="Patient (e.g., TCI-001)"
                        value={form.patient}
                        onChange={(e) => setForm({ ...form, patient: e.target.value })}
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="h-9 px-3 border rounded-md text-sm bg-background"
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          required
                        >
                          {CategoryVL.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                          className="h-9 px-3 border rounded-md text-sm bg-background"
                          value={form.severity}
                          onChange={(e) => setForm({ ...form, severity: e.target.value })}
                          required
                        >
                          {SeverityVL.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="h-9 px-3 border rounded-md text-sm bg-background"
                          value={form.status}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                          required
                        >
                          {StatusVL.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                          className="h-9 px-3 border rounded-md text-sm bg-background"
                          value={form.owner}
                          onChange={(e) => setForm({ ...form, owner: e.target.value })}
                          required
                        >
                          {OwnerVL.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Impact (£)"
                          value={form.businessImpact}
                          onChange={(e) => setForm({ ...form, businessImpact: e.target.value })}
                          required
                        />
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Fix (£)"
                          value={form.costToFix}
                          onChange={(e) => setForm({ ...form, costToFix: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={form.due}
                          onChange={(e) => setForm({ ...form, due: e.target.value })}
                          required
                        />
                        <Input
                          type="date"
                          value={form.surgeryDate}
                          onChange={(e) => setForm({ ...form, surgeryDate: e.target.value })}
                        />
                      </div>
                      <Input
                        placeholder="Response / mitigation"
                        value={form.response}
                        onChange={(e) => setForm({ ...form, response: e.target.value })}
                      />

                      <div className="text-xs text-slate-500">
                        Risk triggered by: <span className="font-medium">{currentUser?.full_name || currentUser?.email || "—"}</span>
                        <br />
                        Will be timestamped on submit.
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" className="bg-sky-600 hover:bg-sky-700" disabled={loading || !currentUser}>
                          Submit
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Report modal */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate report</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-slate-600">
            <p>This will export the filtered register to CSV.</p>
            <ul className="list-disc ml-5">
              <li>Includes severity, status, costs, and response</li>
              <li>Ideal for emailing or external review</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setReportOpen(false)}>Cancel</Button>
            <Button onClick={exportCSV} className="bg-sky-600 hover:bg-sky-700">Export CSV</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
