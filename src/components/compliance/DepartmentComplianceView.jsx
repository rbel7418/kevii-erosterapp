
import React from "react";
import { IPCTrainingRecord } from "@/entities/IPCTrainingRecord";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  summarizePerson,
  computeDepartmentTypeCompliance,
  categoryComplianceByType,
  B_PAL // Import B_PAL from ComplianceUtils
} from "./ComplianceUtils";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

// Update donut to use blue palette and increase size ~30%
function Donut({ pct, label }) {
  const data = [
    { name: "Done", value: Math.max(0, Math.min(100, pct)), color: B_PAL[2] }, // primary blue
    { name: "Rem", value: Math.max(0, 100 - pct), color: B_PAL[4] }            // light blue remainder
  ];
  return (
    <div className="flex items-center gap-3">
      <div className="h-48 w-48">{/* was h-36 w-36 ~ +30% */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={64}  // was 48
              outerRadius={92}  // was 66
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
        <div className="text-2xl font-bold" style={{ color: B_PAL[2] }}>{pct}%</div>
        <div className="text-xs text-slate-600">{label}</div>
      </div>
    </div>
  );
}

export default function DepartmentComplianceView() {
  const [rows, setRows] = React.useState([]);
  const [dept, setDept] = React.useState("All Departments");
  const [sortKey, setSortKey] = React.useState("compliance");
  const [sortDir, setSortDir] = React.useState("desc");
  const [nameFilter, setNameFilter] = React.useState("All");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const all = await IPCTrainingRecord.filter({}).catch(() => []);
      setRows(all || []);
    })();
  }, []);

  const departments = React.useMemo(() => {
    const set = new Set((rows || []).map(r => r.department || "Unassigned"));
    return ["All Departments", ...Array.from(set)];
  }, [rows]);

  const scoped = React.useMemo(() => {
    if (dept === "All Departments") return rows;
    return (rows || []).filter(r => (r.department || "Unassigned") === dept);
  }, [rows, dept]);

  const employeeNames = React.useMemo(() => {
    const set = new Set((scoped || []).map(r => r.full_name).filter(Boolean));
    return ["All", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
  }, [scoped]);

  const { clinicalPct, nonClinicalPct } = React.useMemo(() => computeDepartmentTypeCompliance(scoped), [scoped]);

  const byCategory = React.useMemo(() => categoryComplianceByType(scoped), [scoped]);

  const staff = React.useMemo(() => {
    const list = (scoped || []).map(r => {
      const s = summarizePerson(r);
      const overdue = s.results.filter(x => x.status === "overdue").length;
      return {
        name: r.full_name,
        empId: r.employee_id || r.emp_id || "",
        job: r.job_title || "—",
        compliance: s.pct,
        overdue
      };
    });
    // filters
    const q = (query || "").toLowerCase();
    const filtered = list.filter(item => {
      const passName = nameFilter === "All" || item.name === nameFilter;
      const passQuery = !q || (String(item.name || "").toLowerCase().includes(q) || String(item.empId || "").toLowerCase().includes(q));
      return passName && passQuery;
    });
    // sort
    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "job") return a.job.localeCompare(b.job) * dir;
      if (sortKey === "overdue") return (a.overdue - b.overdue) * dir;
      return (a.compliance - b.compliance) * dir;
    });
    // limit to first 20
    return filtered.slice(0, 20);
  }, [scoped, sortKey, sortDir, nameFilter, query]);

  const suggestions = React.useMemo(() => {
    const q = (query || "").toLowerCase();
    if (!q) return [];
    const names = employeeNames.slice(1); // skip "All"
    const base = names
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 8);
    // include any matching by "EMP ID" if present in rows
    const empIds = Array.from(new Set((scoped || []).map(r => r.employee_id || r.emp_id).filter(Boolean)));
    const idHits = empIds.filter(id => String(id).toLowerCase().includes(q)).slice(0, 4);
    return [...base, ...idHits];
  }, [employeeNames, scoped, query]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-base font-semibold text-slate-900">Department Compliance Dashboard</div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={nameFilter} onValueChange={setNameFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filter by employee" /></SelectTrigger>
            <SelectContent>
              {employeeNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick search with suggestive results */}
      <div className="relative">
        <Input
          placeholder="Type a name or EMP ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow">
            {suggestions.map((s, i) => (
              <button
                key={String(s) + i}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  // If suggestion is a known name, set name filter; else set query directly
                  const isName = employeeNames.includes(String(s));
                  if (isName) setNameFilter(String(s));
                  setQuery(String(s));
                }}
              >
                {String(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Top row donuts (unchanged layout; updated sizes/colors in Donut) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4"><Donut pct={clinicalPct} label="Clinical staff compliance" /></Card>
        <Card className="p-4"><Donut pct={nonClinicalPct} label="Non-clinical staff compliance" /></Card>
      </div>

      {/* Split visuals row: left = stacked bar (50%), right = new Radar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Completion by Category (stacked bar) */}
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">Completion by Category (Clinical vs Non-clinical)</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" />
                <YAxis domain={[0,100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="clinical" stackId="a" name="Clinical" fill={B_PAL[1]} />
                <Bar dataKey="nonclinical" stackId="a" name="Non-clinical" fill={B_PAL[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* RIGHT: New compelling visual — Category Compliance Radar */}
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">Category Compliance Radar</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={byCategory}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Clinical"
                  dataKey="clinical"
                  stroke={B_PAL[1]}
                  fill={B_PAL[1]}
                  fillOpacity={0.3}
                />
                <Radar
                  name="Non-clinical"
                  dataKey="nonclinical"
                  stroke={B_PAL[3]}
                  fill={B_PAL[3]}
                  fillOpacity={0.25}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Polar view highlights relative strengths and gaps across categories for each staff type.
          </div>
        </Card>
      </div>

      {/* Staff table (limited to 20) */}
      <Card className="p-0 overflow-auto">
        <div className="p-3 border-b text-sm font-semibold">Staff Compliance (first 20, sortable)</div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              {[
                { key: "name", label: "Name" },
                { key: "job", label: "Job Title" },
                { key: "compliance", label: "Compliance %" },
                { key: "overdue", label: "Overdue" },
              ].map(col => (
                <th key={col.key} className="p-2 cursor-pointer" onClick={() => {
                  if (sortKey === col.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                  setSortKey(col.key);
                }}>
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {sortKey === col.key && <span className="text-xs text-slate-400">{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((s, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{s.name}{s.empId ? <span className="ml-2 text-xs text-slate-500">({s.empId})</span> : null}</td>
                <td className="p-2">{s.job}</td>
                <td className="p-2 text-right">{s.compliance}</td>
                <td className="p-2 text-right text-rose-700">{s.overdue}</td>
              </tr>
            ))}
            {!staff.length && <tr><td colSpan={4} className="p-4 text-center text-slate-500">No staff found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
