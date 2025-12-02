
import React from "react";
import { IPCTrainingRecord } from "@/entities/IPCTrainingRecord";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { heatmapByJobTitle, overdueCountByJobTitle, buildGapList, IPC_MODULES, getModuleCategory, B_PAL } from "./ComplianceUtils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format } from "date-fns";

export default function TrainingGapAnalysis() {
  const [rows, setRows] = React.useState([]);
  const [dept, setDept] = React.useState("All");
  const [job, setJob] = React.useState("All");
  const [risk, setRisk] = React.useState("all");

  React.useEffect(() => {
    (async () => {
      const all = await IPCTrainingRecord.filter({}).catch(() => []);
      setRows(all || []);
    })();
  }, []);

  const departments = React.useMemo(() => ["All", ...Array.from(new Set(rows.map(r => r.department || "Unassigned")))], [rows]);
  const jobs = React.useMemo(() => ["All", ...Array.from(new Set(rows.map(r => r.job_title || "—")))], [rows]);

  const scoped = React.useMemo(() => {
    return rows.filter(r => (dept === "All" || (r.department || "Unassigned") === dept) && (job === "All" || (r.job_title || "—") === job));
  }, [rows, dept, job]);

  // Heatmap
  const { jobs: hmJobs, categories, grid } = React.useMemo(() => heatmapByJobTitle(scoped), [scoped]);

  // Priority list of gaps (sorted)
  const priorityList = React.useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 };
    const items = buildGapList(scoped, risk)
      .filter(x => x.status === "overdue" || x.status === "due_soon")
      .sort((a, b) => {
        const ro = order[a.risk] - order[b.risk];
        if (ro !== 0) return ro;
        const ad = a.dueDate ? a.dueDate.getTime() : 0;
        const bd = b.dueDate ? b.dueDate.getTime() : 0;
        return ad - bd;
      });
    return items.slice(0, 40);
  }, [scoped, risk]);

  // Overdue by job title bar
  const overdueByJob = React.useMemo(() => overdueCountByJobTitle(scoped), [scoped]);

  return (
    <div className="space-y-4">
      {/* Header & filters */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="text-base font-semibold text-slate-900">Training Gap Analysis</div>
        <div className="flex gap-2">
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={job} onValueChange={setJob}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Job title" /></SelectTrigger>
            <SelectContent>{jobs.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Risk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risks</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Heatmap */}
      <Card className="p-4 overflow-auto">
        <div className="text-sm font-semibold mb-2">Compliance Heatmap (Job Title × Category)</div>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="p-2 text-left">Job Title</th>
              {categories.map(c => <th key={c} className="p-2 text-center">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.map(row => (
              <tr key={row.job} className="border-t">
                <td className="p-2 text-left">{row.job}</td>
                {categories.map(c => {
                  const v = row[c] ?? 0;
                  // Blue scale: light for low, darker for high
                  let bg = "#d0efff", text = B_PAL[0];
                  if (v >= 85) { bg = B_PAL[3] + "22"; text = B_PAL[0]; }
                  else if (v >= 60) { bg = B_PAL[2] + "22"; text = B_PAL[0]; }
                  else { bg = B_PAL[4]; text = B_PAL[1]; }
                  return <td key={c} className="p-2 text-center font-semibold" style={{ background: bg, color: text }}>{v}</td>;
                })}
              </tr>
            ))}
            {!grid.length && <tr><td colSpan={1+categories.length} className="p-4 text-center text-slate-500">No data.</td></tr>}
          </tbody>
        </table>
      </Card>

      {/* Priority list */}
      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Priority Overdue / Due Soon</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {priorityList.map((p, idx) => {
            const tone = p.risk === "high" ? "text-rose-700" : p.risk === "medium" ? "text-amber-700" : "text-emerald-700";
            const bg = p.risk === "high" ? "bg-rose-50" : p.risk === "medium" ? "bg-amber-50" : "bg-emerald-50";
            return (
              <div key={idx} className={`border rounded-lg p-2 ${bg}`}>
                <div className="flex justify-between text-sm">
                  <div className="font-semibold">{p.full_name}</div>
                  <div className={tone}>{p.risk.toUpperCase()}</div>
                </div>
                <div className="text-xs text-slate-600">{p.department} • {p.job_title}</div>
                <div className="mt-1 text-xs"><span className="font-medium">{p.module_label}</span> — {p.status.replace("_"," ")}</div>
                <div className="text-xs text-slate-600">Due: {p.dueDate ? format(p.dueDate, "d MMM yyyy") : "—"}</div>
              </div>
            );
          })}
          {!priorityList.length && <div className="text-sm text-slate-500">No items.</div>}
        </div>
      </Card>

      {/* Overdue by job title */}
      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Overdue Count by Job Title</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overdueByJob}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="job" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Overdue" fill={B_PAL[1]} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
