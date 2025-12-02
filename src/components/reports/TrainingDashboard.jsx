import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { IPCTrainingRecord } from "@/entities/IPCTrainingRecord";
import {
  IPC_MODULES,
  getModuleCategory,
  summarizePerson,
  computeModuleStatus
} from "@/components/compliance/ComplianceUtils";

// Palette aligned to your template
const PAL = {
  bg: "#f7fafc",
  ink: "#0f172a",
  sub: "#64748b",
  mint: "#b2f5ea",
  teal: "#38b2ac",
  rose: "#fb7185",
  gold: "#f6ad55",
  sky: "#60a5fa",
  lime: "#84cc16",
  card: "#ffffff",
  border: "#e5e7eb",
};

const COLORS = [PAL.teal, "#e2e8f0"]; // primary + light grey

function Tag({ icon = "⬆", label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{background: PAL.card, borderColor: PAL.border}}>
      <span className="text-lg">{icon}</span>
      <div className="text-xs" style={{color: PAL.sub}}>{label}</div>
      <div className="ml-auto text-sm font-semibold" style={{color: PAL.ink}}>{value}</div>
    </div>
  );
}

function Donut({ data, center, labelLeft }) {
  return (
    <div className="flex items-center">
      <div style={{ width: 150, height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={70} startAngle={90} endAngle={-270} stroke="none">
              {data.map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{fontSize:16, fill: PAL.ink}}>{center}</text>
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="ml-4 text-sm" style={{color: PAL.sub}}>{labelLeft}</div>
    </div>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function TrainingDashboard() {
  const [rows, setRows] = React.useState([]);
  const [trendData, setTrendData] = React.useState([]);
  const [deptSeries, setDeptSeries] = React.useState([]);
  const [gapSeries, setGapSeries] = React.useState([]);
  const [overallAvg, setOverallAvg] = React.useState(0);
  const [clinicalPct, setClinicalPct] = React.useState(0);
  const [nonClinicalPct, setNonClinicalPct] = React.useState(0);
  const [outstandingPct, setOutstandingPct] = React.useState(0);
  const [tiles, setTiles] = React.useState([
    { k: "Projected Org Compliance", v: "—" },
    { k: "Projected Personal Avg", v: "—" },
    { k: "Projected Risk Outstanding", v: "—" },
    { k: "Projected Trainings", v: "—" },
  ]);

  React.useEffect(() => {
    (async () => {
      const data = await IPCTrainingRecord.filter({}).catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setRows(list);

      const staffSet = new Set(list.map(r => r.full_name || "—"));
      const deptSet = new Set(list.map(r => r.department || "Unassigned"));
      const totalStaff = staffSet.size || 1;
      const totalDepts = deptSet.size || 1;

      // Trend: % staff (and % departments) with at least one training recorded in each month
      const monthStaff = MONTHS.map(() => new Set());
      const monthDept = MONTHS.map(() => new Set());
      let totalCompletions = 0;

      list.forEach((r) => {
        IPC_MODULES.forEach((m) => {
          const v = r[m.key];
          if (!v) return;
          const d = new Date(v);
          if (isNaN(d.getTime())) return;
          const idx = d.getMonth();
          monthStaff[idx].add(r.full_name || "—");
          monthDept[idx].add(r.department || "Unassigned");
          totalCompletions += 1;
        });
      });

      const tData = MONTHS.map((m, i) => ({
        m,
        personal: Math.round((monthStaff[i].size / totalStaff) * 100),
        department: Math.round((monthDept[i].size / totalDepts) * 100),
      }));
      setTrendData(tData);

      // Department series: avg personal compliance by department (top 5)
      const byDept = new Map();
      list.forEach((r) => {
        const d = r.department || "Unassigned";
        const s = summarizePerson(r).pct;
        const prev = byDept.get(d) || { sum: 0, n: 0 };
        byDept.set(d, { sum: prev.sum + s, n: prev.n + 1 });
      });
      const deptArr = Array.from(byDept.entries()).map(([name, v]) => {
        const avg = Math.round(v.sum / (v.n || 1));
        return { name, personal: avg, dept: avg };
      }).sort((a, b) => b.dept - a.dept).slice(0, 5);
      setDeptSeries(deptArr);

      // Gap breakdown: overdue count by category
      const catOverdue = new Map();
      let overdueCount = 0;
      const totalSlots = (list.length || 0) * IPC_MODULES.length || 1;
      list.forEach((r) => {
        IPC_MODULES.forEach((m) => {
          const st = computeModuleStatus(r[m.key], m.validityMonths).status;
          if (st === "overdue") {
            overdueCount += 1;
            const cat = getModuleCategory(m.key);
            catOverdue.set(cat, (catOverdue.get(cat) || 0) + 1);
          }
        });
      });
      const gSeries = Array.from(catOverdue.entries())
        .map(([k, v]) => ({ k, v }))
        .sort((a, b) => b.v - a.v);
      setGapSeries(gSeries);

      const outPct = Math.round((overdueCount / totalSlots) * 100);
      setOutstandingPct(outPct);

      // Overall and split by clinical
      const overall = list.length
        ? Math.round(list.reduce((a, r) => a + summarizePerson(r).pct, 0) / list.length)
        : 0;
      setOverallAvg(overall);

      const cl = list.filter(r => !!r.is_clinical);
      const ncl = list.filter(r => !r.is_clinical);
      const clPct = cl.length ? Math.round(cl.reduce((a, r) => a + summarizePerson(r).pct, 0) / cl.length) : 0;
      const nclPct = ncl.length ? Math.round(ncl.reduce((a, r) => a + summarizePerson(r).pct, 0) / ncl.length) : 0;
      setClinicalPct(clPct);
      setNonClinicalPct(nclPct);

      // Median personal pct (as "personal avg" proxy)
      const scores = list.map(r => summarizePerson(r).pct).sort((a, b) => a - b);
      const mid = scores.length ? (scores.length % 2 ? scores[(scores.length - 1) / 2] : Math.round((scores[scores.length/2 - 1] + scores[scores.length/2]) / 2)) : 0;

      // Tiles (rename as projections but sourced from live)
      setTiles([
        { k: "Projected Org Compliance", v: `${overall}%` },
        { k: "Projected Personal Avg", v: `${mid}%` },
        { k: "Projected Risk Outstanding", v: `${outPct}%` },
        { k: "Projected Trainings", v: String(totalCompletions) },
      ]);
    })();
  }, []);

  // Donut datasets derived from state
  const donutPersonal = [
    { name: "Compliant", value: overallAvg },
    { name: "Remaining", value: Math.max(0, 100 - overallAvg) },
  ];
  const donutClinical = [
    { name: "Clinical", value: clinicalPct },
    { name: "Remaining", value: Math.max(0, 100 - clinicalPct) },
  ];
  const donutNonClinical = [
    { name: "Non‑clinical", value: nonClinicalPct },
    { name: "Remaining", value: Math.max(0, 100 - nonClinicalPct) },
  ];
  const donutOutstanding = [
    { name: "Resolved", value: Math.max(0, 100 - outstandingPct) },
    { name: "Outstanding", value: outstandingPct },
  ];

  return (
    <div className="w-full min-h-screen" style={{ background: PAL.bg }}>
      <div className="mx-auto max-w-[960px] bg-white" style={{boxShadow: "0 10px 40px rgba(0,0,0,0.06)"}}>
        {/* Hero */}
        <div className="px-6 pt-8 pb-4">
          <div className="text-[44px] leading-[1.05] font-extrabold" style={{color: PAL.ink}}>2025 COMPLIANCE<br/>DASHBOARD<br/>REPORT</div>
          <div className="mt-2 text-xs" style={{color: PAL.sub}}>Infographic view of live KEVII IPC KPIs across personal, departmental, operational, and strategic views.</div>
        </div>

        {/* KPI Tag row (4-wide) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 px-6 pb-6">
          <Tag icon="✅" label="Org Compliance (avg)" value={`${overallAvg}%`} />
          <Tag icon="🏥" label="Clinical Compliance" value={`${clinicalPct}%`} />
          <Tag icon="🧑‍⚕️" label="Non‑clinical Compliance" value={`${nonClinicalPct}%`} />
          <Tag icon="⚠️" label="Outstanding Risk" value={`${outstandingPct}%`} />
        </div>

        {/* Trend line: Average Monthly Engagement (live) */}
        <div className="px-6 pb-6">
          <div className="rounded-xl border" style={{background: PAL.card, borderColor: PAL.border}}>
            <div className="px-4 py-3 text-sm font-semibold" style={{color: PAL.ink}}>Average Monthly Engagement</div>
            <div className="px-4 pb-4" style={{height: 220}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{left: 8, right: 16, top: 8, bottom: 8}}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="m" tick={{fontSize: 12}} />
                  <YAxis domain={[0, 100]} tick={{fontSize: 12}}/>
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="personal" name="Staff with training (%)" stroke={PAL.sky} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="department" name="Departments active (%)" stroke={PAL.teal} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Progress donuts row: Personal, Clinical, Non‑clinical */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4" style={{background: PAL.card, borderColor: PAL.border}}>
              <div className="text-sm font-semibold" style={{color: PAL.ink}}>Individual Level</div>
              <div className="text-xs mb-2" style={{color: PAL.sub}}>Personal compliance percentage</div>
              <Donut data={donutPersonal} center={`${overallAvg}%`} labelLeft="Completed" />
              <div className="mt-3 text-xs" style={{color: PAL.sub}}>Live from IPCTrainingRecord.</div>
            </div>
            <div className="rounded-xl border p-4" style={{background: PAL.card, borderColor: PAL.border}}>
              <div className="text-sm font-semibold" style={{color: PAL.ink}}>Department Level</div>
              <div className="text-xs mb-2" style={{color: PAL.sub}}>Clinical vs Non‑clinical completion</div>
              <Donut data={donutClinical} center={`${clinicalPct}%`} labelLeft="Clinical" />
              <div className="mt-2"><Donut data={donutNonClinical} center={`${nonClinicalPct}%`} labelLeft="Non‑clinical" /></div>
            </div>
            <div className="rounded-xl border p-4" style={{background: PAL.card, borderColor: PAL.border}}>
              <div className="text-sm font-semibold" style={{color: PAL.ink}}>Operational Management</div>
              <div className="text-xs mb-2" style={{color: PAL.sub}}>Overdue or missing high‑risk modules</div>
              <Donut data={donutOutstanding} center={`${outstandingPct}%`} labelLeft="Outstanding gaps" />
              <div className="mt-3 text-xs" style={{color: PAL.sub}}>Derived using module validity rules.</div>
            </div>
          </div>
        </div>

        {/* Gap breakdown + mini KPIs */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4" style={{background: PAL.card, borderColor: PAL.border}}>
              <div className="text-sm font-semibold" style={{color: PAL.ink}}>Gap Breakdown (count)</div>
              <div className="text-xs mb-2" style={{color: PAL.sub}}>Overdue by category</div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gapSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="k" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="v" fill={PAL.rose} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{background: PAL.card, borderColor: PAL.border}}>
              <div className="text-sm font-semibold" style={{color: PAL.ink}}>Active Renewals (month)</div>
              <div className="text-xs mb-3" style={{color: PAL.sub}}>Unique staff with training this month</div>
              <div className="text-2xl font-bold" style={{color: PAL.ink}}>
                {(() => {
                  const m = new Date().getMonth();
                  // trendData is %; derive absolute count approx
                  const staffCount = new Set(rows.map(r => r.full_name || "—")).size || 0;
                  const pct = trendData[m]?.personal || 0;
                  return Math.round((pct / 100) * staffCount);
                })()}
              </div>
              <div className="text-xs" style={{color: PAL.sub}}>live snapshot</div>
            </div>

            <div className="rounded-xl border p-4" style={{background: PAL.card, borderColor: PAL.border}}>
              <div className="text-sm font-semibold" style={{color: PAL.ink}}>Compliance MoM (approx)</div>
              <div className="text-xs mb-3" style={{color: PAL.sub}}>Delta of engagement vs prior month</div>
              <div className="text-2xl font-bold" style={{color: PAL.ink}}>
                {(() => {
                  const m = new Date().getMonth();
                  const now = trendData[m]?.personal || 0;
                  const prev = trendData[(m + 11) % 12]?.personal || 0;
                  const delta = now - prev;
                  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
                })()}
              </div>
              <div className="text-xs" style={{color: PAL.sub}}>derived from monthly engagement</div>
            </div>
          </div>
        </div>

        {/* Department Target vs Current */}
        <div className="px-6 pb-6">
          <div className="rounded-xl border" style={{background: PAL.card, borderColor: PAL.border}}>
            <div className="px-4 py-3 text-sm font-semibold" style={{color: PAL.ink}}>Department Target vs Current</div>
            <div className="px-4 pb-4" style={{height: 240}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis domain={[0,100]} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="dept" name="Dept Avg %" fill={PAL.sky} radius={[4,4,0,0]} />
                  <Bar dataKey="personal" name="Personal Avg %" fill={PAL.teal} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Balance section -> two small multiples (spark-like) */}
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4" style={{background: PAL.card, borderColor: PAL.border}}>
            <div className="text-sm font-semibold mb-2" style={{color: PAL.ink}}>Balance – Staff vs Departments active</div>
            <div style={{height: 180}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="m" tick={{fontSize: 12}} />
                  <YAxis domain={[0,100]} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="personal" stroke={PAL.sky} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="department" stroke={PAL.teal} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border p-4" style={{background: PAL.card, borderColor: PAL.border}}>
            <div className="text-sm font-semibold mb-2" style={{color: PAL.ink}}>Risk Mix – Categories</div>
            <div style={{height: 180}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="k" tick={{fontSize: 12}} />
                  <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="v" fill={PAL.gold} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Projections / KPI tiles row (sourced from live) */}
        <div className="px-6 pb-8">
          <div className="text-base font-semibold mb-3" style={{color: PAL.ink}}>2026 Projections</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {tiles.map((p, i)=> (
              <div key={i} className="rounded-xl border p-3" style={{background: PAL.card, borderColor: PAL.border}}>
                <div className="text-xs" style={{color: PAL.sub}}>{p.k}</div>
                <div className="text-xl font-bold" style={{color: PAL.ink}}>{p.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-8 text-xs" style={{color: PAL.sub}}>
          Live metrics computed from IPCTrainingRecord using validity rules and grouped insights.
        </div>
      </div>
    </div>
  );
}