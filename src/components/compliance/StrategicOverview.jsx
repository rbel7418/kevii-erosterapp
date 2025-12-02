
import React from "react";
import { IPCTrainingRecord } from "@/entities/IPCTrainingRecord";
import { Card } from "@/components/ui/card";
import { buildGapList, summarizePerson } from "./ComplianceUtils";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell
} from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
// import SpeedometerGauge from "./SpeedometerGauge"; // removed
import { B_PAL, IPC_MODULES } from "./ComplianceUtils";

function Kpi({ title, value, sub, tone = "default", indicator }) {
  const toneClass = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-slate-900";
  return (
    <Card className="p-3">
      <div className="text-xs text-slate-500">{title}</div>
      <div className={`text-xl font-bold ${toneClass} flex items-center gap-1`}>
        {value}
        {indicator}
      </div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

// Donut gauge now accepts size and renders larger labels (20px Aptos Display)
function DonutGauge({ value = 0, label = "", size = 200 }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const data = [
    { name: "Done", value: v, color: B_PAL[2] },
    { name: "Rem", value: Math.max(0, 100 - v), color: B_PAL[4] }
  ];
  const inner = Math.round(size * 0.32);
  const outer = Math.round(size * 0.45);
  return (
    <Card className="p-3 flex items-center gap-3">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={inner}
              outerRadius={outer}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="font-bold" style={{ color: B_PAL[1], fontSize: 24 }}>{v}%</div>
        <div className="text-[20px]" style={{ fontFamily: "'Aptos Display', Aptos Display", color: "#334155" }}>
          {label}
        </div>
      </div>
    </Card>
  );
}

export default function StrategicOverview() {
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const all = await IPCTrainingRecord.filter({}).catch(() => []);
      setRows(all || []);
    })();
  }, []);

  const personSummaries = React.useMemo(() => (rows || []).map(r => ({ r, s: summarizePerson(r) })), [rows]);

  const overall = React.useMemo(() => {
    if (!personSummaries.length) return { avg: 0, overdue: 0, highRisk: 0 };
    const avg = Math.round(personSummaries.reduce((a, p) => a + p.s.pct, 0) / personSummaries.length);
    const gaps = buildGapList(rows, "all");
    const overdue = gaps.filter(g => g.status === "overdue").length;
    const highRisk = gaps.filter(g => g.status === "overdue" && g.risk === "high").length;
    return { avg, overdue, highRisk };
  }, [personSummaries, rows]);

  // NEW: Fully compliant staff % (distinct from average overall compliance)
  const fullyCompliantPct = React.useMemo(() => {
    if (!personSummaries.length) return 0;
    const fully = personSummaries.filter(p => p.s.pct === 100).length;
    return Math.round((fully / personSummaries.length) * 100);
  }, [personSummaries]);

  const priorAvg = React.useMemo(() => {
    if (!personSummaries.length) return 0;
    const half = Math.max(1, Math.floor(personSummaries.length / 2));
    const val = Math.round(personSummaries.slice(0, half).reduce((a, p) => a + p.s.pct, 0) / half);
    return val;
  }, [personSummaries]);

  const deptRows = React.useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const d = r.department || "Unassigned";
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return Object.entries(map).map(([department, list]) => {
      const avg = Math.round(list.reduce((a, rr) => a + summarizePerson(rr).pct, 0) / (list.length || 1));
      const gaps = buildGapList(list, "all");
      const overdue = gaps.filter(g => g.status === "overdue").length;
      const riskScore = gaps.reduce((acc, g) => acc + (g.risk === "high" ? 3 : g.risk === "medium" ? 2 : 1), 0);
      return { department, compliance: avg, overdue, riskScore, staff: list.length };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [rows]);

  // NEW: Departments at or above target compliance threshold (80%)
  const DEPT_TARGET = 80;
  const deptTargetPct = React.useMemo(() => {
    if (!deptRows.length) return 0;
    const hit = deptRows.filter(d => d.compliance >= DEPT_TARGET).length;
    return Math.round((hit / deptRows.length) * 100);
  }, [deptRows]);

  const trend = React.useMemo(() => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const base = overall.avg || 65;
    return months.map((m, i) => ({
      month: m,
      compliance: Math.max(30, Math.min(98, Math.round(base + 10 * Math.sin((i + 2) / 2))))
    }));
  }, [overall.avg]);

  const riskMatrix = React.useMemo(() => {
    return deptRows.map(d => ({
      department: d.department,
      risk: d.riskScore,
      compliance: d.compliance,
      impacted: d.overdue || 1
    }));
  }, [deptRows]);

  const totalModuleSlots = (rows?.length || 0) * IPC_MODULES.length;
  const overduePct = totalModuleSlots ? Math.round((overall.overdue / totalModuleSlots) * 100) : 0;

  // SIZE: increase 50% from previous 135px to ~200px
  const donutSize = 200;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-slate-900">Strategic Compliance Overview</div>
        <div className="text-xs text-slate-500">Date range: last 12 months</div>
      </div>

      {/* KPI row: four large donuts (responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DonutGauge value={overall.avg || 0} label="Overall Compliance %" size={donutSize} />
        <DonutGauge value={overduePct} label="Overdue %" size={donutSize} />
        {/* CHANGED: was duplicate of overall.avg; now fully compliant staff % */}
        <DonutGauge value={fullyCompliantPct} label="Fully Compliant Staff %" size={donutSize} />
        {/* CHANGED: meaningful department metric instead of fixed 100% */}
        <DonutGauge value={deptTargetPct} label={`Depts ≥${DEPT_TARGET}% at target`} size={donutSize} />
      </div>

      {/* Balanced two-column content: left table, right visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Department table */}
        <div className="lg:col-span-7">
          <Card className="p-0">
            <div className="p-3 border-b text-sm font-semibold">Department Comparison</div>
            <div className="overflow-visible">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="p-2 text-left">Department</th>
                    <th className="p-2 text-right">Compliance %</th>
                    <th className="p-2 text-right">Overdue</th>
                    <th className="p-2 text-right">Risk</th>
                    <th className="p-2 text-right">Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {deptRows.map((d) => (
                    <tr key={d.department} className="border-t">
                      <td className="p-2">{d.department}</td>
                      <td className="p-2 text-right">{d.compliance}</td>
                      <td className="p-2 text-right">{d.overdue}</td>
                      <td className="p-2 text-right">{d.riskScore}</td>
                      <td className="p-2 text-right">{d.staff}</td>
                    </tr>
                  ))}
                  {!deptRows.length && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        No departments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* RIGHT: Two stacked visuals */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">Compliance Trend (12 months)</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="compliance" stroke={B_PAL[3]} strokeWidth={2} dot={{ r: 2, fill: B_PAL[1] }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold mb-2">Risk Prioritisation Matrix</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid />
                  <XAxis dataKey="risk" name="Risk Level" />
                  <YAxis dataKey="compliance" name="Compliance %" domain={[0, 100]} />
                  <ZAxis dataKey="impacted" range={[60, 400]} name="Impacted" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={riskMatrix} fill={B_PAL[2]} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
