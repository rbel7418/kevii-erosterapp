import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
  return Array.from(m.values()).map(v => ({ dept: v.dept, highRisk: v.high, total: v.total }));
})();

function Kpi({ label, val, sub, tone = "default" }) {
  const bg = tone === "green" ? "bg-emerald-50" : tone === "amber" ? "bg-amber-50" : tone === "red" ? "bg-red-50" : "bg-slate-50";
  const textColor = tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "red" ? "text-red-700" : "text-slate-700";
  return (
    <div className={`rounded-lg p-3 ${bg}`}>
      <div className="text-xs text-slate-600">{label}</div>
      <div className={`text-xl font-bold ${textColor}`}>{val}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Donut({ pct, label }) {
  const data = donut(pct);
  return (
    <div className="flex items-center gap-3">
      <div className="h-32 w-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={60} startAngle={90} endAngle={-270} stroke="none">
              <Cell fill={PAL.b500} />
              <Cell fill={PAL.slate200} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: PAL.b600 }}>{pct}%</div>
        <div className="text-xs text-slate-600">{label}</div>
      </div>
    </div>
  );
}

export default function IPCTrainingDashboard() {
  const [searchStaff, setSearchStaff] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("All");
  const [roleFilter, setRoleFilter] = React.useState("All");
  const [clinicalFilter, setClinicalFilter] = React.useState("All");
  
  const [selectedPerson, setSelectedPerson] = React.useState(null);

  const filteredStaff = React.useMemo(() => {
    return STAFF.filter(s => {
      const matchName = !searchStaff || s.fullName.toLowerCase().includes(searchStaff.toLowerCase()) || s.id.toLowerCase().includes(searchStaff.toLowerCase());
      const matchDept = deptFilter === "All" || s.department === deptFilter;
      const matchRole = roleFilter === "All" || s.jobTitle === roleFilter;
      const matchClinical = clinicalFilter === "All" || (clinicalFilter === "Clinical" && s.clinical) || (clinicalFilter === "Non-Clinical" && !s.clinical);
      return matchName && matchDept && matchRole && matchClinical;
    });
  }, [searchStaff, deptFilter, roleFilter, clinicalFilter]);

  const allDepts = React.useMemo(() => ["All", ...Array.from(new Set(STAFF.map(s => s.department)))], []);
  const allRoles = React.useMemo(() => ["All", ...Array.from(new Set(STAFF.map(s => s.jobTitle)))], []);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="executive">
        <TabsList>
          <TabsTrigger value="executive">Executive Overview</TabsTrigger>
          <TabsTrigger value="department">Department Analytics</TabsTrigger>
          <TabsTrigger value="module">Module Performance</TabsTrigger>
          <TabsTrigger value="staff">Staff Register</TabsTrigger>
          <TabsTrigger value="personal">Personal Register</TabsTrigger>
        </TabsList>

        {/* Executive Overview */}
        <TabsContent value="executive">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Kpi label="Training Programmes" val={KPIS.trainingNumber} />
            <Kpi label="Average Rating" val={`${KPIS.averageRating}/5`} tone="green" />
            <Kpi label="Total Hours" val={KPIS.hours} />
            <Kpi label="Budget" val={`£${(KPIS.budget / 1000).toFixed(0)}k`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Kpi label="Due This Month" val={KPIS.dueThisMonth} tone="amber" />
            <Kpi label="Overdue Trainings" val={KPIS.overdueTrainings} tone="red" />
            <Kpi label="High-Risk Staff" val={KPIS.highRiskStaff} tone="red" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Duration vs. Plan</CardTitle></CardHeader>
              <CardContent><Donut pct={KPIS.durationPct} label="On schedule" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Budget vs. Plan</CardTitle></CardHeader>
              <CardContent><Donut pct={KPIS.budgetPct} label="Of budget used" /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Completion Rate</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyCompliance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" stroke={PAL.b500} strokeWidth={2} dot={{ r: 3 }} name="Completion %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Analytics */}
        <TabsContent value="department">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Department Comparison</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptCompliance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dept" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="compliance" fill={PAL.b500} radius={[4,4,0,0]} name="Compliance %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Role Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roleCompliance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="role" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="compliance" fill={PAL.b400} name="Compliance %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Clinical vs Non-Clinical</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clinicalSplit}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cohort" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="compliance" fill={PAL.b600} radius={[4,4,0,0]} name="Compliance %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Department Risk Profile</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deptRisk.map(r => (
                    <div key={r.dept} className="flex items-center justify-between p-2 border-b">
                      <div className="text-sm">{r.dept}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">{r.highRisk}/{r.total} high risk</span>
                        <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: `${(r.highRisk / r.total) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Module Performance */}
        <TabsContent value="module">
          <Card>
            <CardHeader><CardTitle className="text-base">Training Module Completion Matrix</CardTitle></CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MODULE_SCORES} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="module" type="category" width={180} />
                    <Tooltip />
                    <Bar dataKey="score" fill={PAL.b500} name="Compliance %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Register */}
        <TabsContent value="staff">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input placeholder="Search by name or ID..." value={searchStaff} onChange={e => setSearchStaff(e.target.value)} />
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>{allDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>{allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={clinicalFilter} onValueChange={setClinicalFilter}>
                  <SelectTrigger><SelectValue placeholder="Clinical" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Clinical">Clinical</SelectItem>
                    <SelectItem value="Non-Clinical">Non-Clinical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Job Title</th>
                      <th className="p-2 text-left">Department</th>
                      <th className="p-2 text-center">Clinical</th>
                      <th className="p-2 text-right">Compliance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map(s => {
                      const tone = s.compliance >= 85 ? "text-emerald-700" : s.compliance >= 60 ? "text-amber-700" : "text-red-700";
                      return (
                        <tr key={s.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedPerson(s.id)}>
                          <td className="p-2">{s.id}</td>
                          <td className="p-2 font-medium">{s.fullName}</td>
                          <td className="p-2">{s.jobTitle}</td>
                          <td className="p-2">{s.department}</td>
                          <td className="p-2 text-center">{s.clinical ? "Yes" : "No"}</td>
                          <td className={`p-2 text-right font-semibold ${tone}`}>{s.compliance}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Register */}
        <TabsContent value="personal">
          <Card className="mb-4">
            <CardContent className="p-4">
              <Select value={selectedPerson || ""} onValueChange={setSelectedPerson}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {STAFF.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.id})</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedPerson && (() => {
            const person = STAFF.find(s => s.id === selectedPerson);
            const trainings = STAFF_TRAININGS[selectedPerson] || {};
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{person?.fullName} - {person?.jobTitle}</CardTitle>
                  <div className="text-xs text-slate-600">{person?.department} • {person?.clinical ? "Clinical" : "Non-Clinical"}</div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600">
                          <th className="p-2 text-left">Training Module</th>
                          <th className="p-2 text-center">Validity (Years)</th>
                          <th className="p-2 text-center">Completion Date</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TRAINING_MODULES.map(m => {
                          const completionDate = trainings[m.key];
                          const status = completionDate ? "Completed" : "Missing";
                          const statusColor = completionDate ? "text-emerald-700" : "text-red-700";
                          return (
                            <tr key={m.key} className="border-t">
                              <td className="p-2">{m.title}</td>
                              <td className="p-2 text-center">{m.years}</td>
                              <td className="p-2 text-center">{completionDate || "—"}</td>
                              <td className={`p-2 text-center font-semibold ${statusColor}`}>{status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}