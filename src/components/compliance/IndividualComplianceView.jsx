
import React from "react";
import { IPCTrainingRecord } from "@/entities/IPCTrainingRecord";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import {
  summarizePerson,
  IPC_MODULES,
  computeModuleStatus,
  summarizeCategoriesForPerson,
  findNextDue
} from "./ComplianceUtils";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { base44 } from "@/api/base44Client";

export default function IndividualComplianceView({ fullName, employee, departmentName }) {
  const [record, setRecord] = React.useState(null);
  const [summary, setSummary] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      // If neither employee nor fullName is provided, there's nothing to search for.
      if (!employee && !fullName) {
        setRecord(null);
        setSummary(null);
        return;
      }

      // REPLACED: make data fetch resilient and SDK-driven
      let list = [];
      try {
        if (base44?.entities?.IPCTrainingRecord?.filter) {
          list = await base44.entities.IPCTrainingRecord.filter({});
        } else if (base44?.entities?.IPCTrainingRecord?.list) {
          list = await base44.entities.IPCTrainingRecord.list();
        } else if (typeof IPCTrainingRecord?.filter === "function") {
          list = await IPCTrainingRecord.filter({});
        } else if (typeof IPCTrainingRecord?.list === "function") {
          list = await IPCTrainingRecord.list();
        }
      } catch (e) {
        console.warn("IPCTrainingRecord primary fetch failed, attempting fallback:", e);
        try {
          // Attempting fallback to SDK's list if filter failed or wasn't available
          if (base44?.entities?.IPCTrainingRecord?.list) {
            list = await base44.entities.IPCTrainingRecord.list();
          } else if (typeof IPCTrainingRecord?.list === "function") {
            // Fallback to direct entity's list method if SDK is not available
            list = await IPCTrainingRecord.list();
          } else {
            list = []; // No valid list method found
          }
        } catch (fallbackError) {
          console.error("IPCTrainingRecord fallback fetch also failed:", fallbackError);
          list = [];
        }
      }
      list = Array.isArray(list) ? list : [];

      const norm = (s) => String(s || "").trim().toLowerCase();
      let rec = null;

      if (employee) {
        const email = norm(employee.user_email);
        const empId = String(employee.employee_id || "");
        const empName = norm(employee.full_name);
        const empDept = norm(departmentName || employee.department); // Use departmentName prop first, then employee.department

        if (email) {
          rec = list.find(r => norm(r.user_email) === email) || null;
        }
        if (!rec && empId) {
          rec = list.find(r => String(r.employee_id || "") === empId) || null;
        }
        if (!rec && empName) {
          const matches = list.filter(r => norm(r.full_name) === empName);
          if (matches.length === 1) {
            rec = matches[0];
          } else if (matches.length > 1) {
            // Try to narrow down by department if multiple names match
            rec = matches.find(r => norm(r.department) === empDept) || matches[0] || null;
          }
        }
      } else if (fullName) {
        const name = norm(fullName);
        const matches = list.filter(r => norm(r.full_name) === name);
        if (matches.length === 1) {
          rec = matches[0];
        } else if (matches.length > 1 && departmentName) {
          // If multiple names match and departmentName is provided, use it
          rec = matches.find(r => norm(r.department) === norm(departmentName)) || matches[0] || null;
        } else {
          rec = matches[0] || null; // If no departmentName or still multiple, just take the first match
        }
      }

      setRecord(rec);
      setSummary(rec ? summarizePerson(rec) : null);
    })();
  }, [employee?.user_email, employee?.employee_id, employee?.full_name, fullName, departmentName, employee?.department]);

  if (!employee && !fullName) return <div className="text-sm text-slate-500">No person provided.</div>;
  if (!record) {
    const name = employee?.full_name || fullName;
    return <div className="text-sm text-slate-500">No IPC record found for {name || "the specified person"}.</div>;
  }

  const pct = summary?.pct || 0;
  const statusTone = pct >= 85 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const statusLabel = pct >= 85 ? "Compliant" : "Non-Compliant";

  const categories = summarizeCategoriesForPerson(record);
  const nextDue = findNextDue(record);

  // Gauge data (donut)
  const gaugeData = [
    { name: "Complete", value: pct, color: statusTone },
    { name: "Remaining", value: Math.max(0, 100 - pct), color: "#e5e7eb" }
  ];

  return (
    <div className="space-y-4">
      {/* Header with name (and optional photo if later available) */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-slate-900">{record.full_name}</div>
          <div className="text-xs text-slate-600">{record.job_title} • {record.department} • {record.is_clinical ? "Clinical" : "Non-clinical"}</div>
        </div>
      </div>

      {/* Top Section: Big gauge + status */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-1 h-48 relative"> {/* Added relative for absolute positioning of text */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={90}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {gaugeData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: statusTone }}>{pct}%</div>
                <div className="text-xs text-slate-600">{statusLabel}</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-slate-700">
              This is the personal compliance score across all mandatory IPC modules. A score of 85% or above is considered compliant.
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white border rounded-lg p-2">
                <div className="text-slate-500">Compliant</div>
                <div className="font-semibold text-emerald-700">{summary?.compliant || 0}</div>
              </div>
              <div className="bg-white border rounded-lg p-2">
                <div className="text-slate-500">Due soon</div>
                <div className="font-semibold text-amber-700">{summary?.dueSoon || 0}</div>
              </div>
              <div className="bg-white border rounded-lg p-2">
                <div className="text-slate-500">Overdue</div>
                <div className="font-semibold text-rose-700">{summary?.overdue || 0}</div>
              </div>
              <div className="bg-white border rounded-lg p-2">
                <div className="text-slate-500">Missing</div>
                <div className="font-semibold text-slate-800">{summary?.missing || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Middle: Module table */}
      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Mandatory Trainings</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="p-2 text-left">Training Name</th>
                <th className="p-2">Completion Date</th>
                <th className="p-2">Renewal Due Date</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {IPC_MODULES.map(m => {
                const s = computeModuleStatus(record[m.key], m.validityMonths);
                const comp = record[m.key] ? format(new Date(record[m.key]), "d MMM yyyy") : "—";
                const due = s.dueDate ? format(s.dueDate, "d MMM yyyy") : "—";
                const tone = s.status === "compliant" ? "text-emerald-700" : s.status === "due_soon" ? "text-amber-700" : s.status === "overdue" ? "text-rose-700" : "text-slate-600";
                const badgeBg = s.status === "compliant" ? "bg-emerald-100" : s.status === "due_soon" ? "bg-amber-100" : s.status === "overdue" ? "bg-rose-100" : "bg-slate-100";
                return (
                  <tr key={m.key} className="border-t">
                    <td className="p-2 text-slate-800">{m.label}</td>
                    <td className="p-2 text-center">{comp}</td>
                    <td className="p-2 text-center">{due}</td>
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${badgeBg} ${tone}`}>
                        {s.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bottom: category bar + next due KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="text-sm font-semibold mb-2">Compliance by Category</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis domain={[0, 100]} type="number" />
                <YAxis dataKey="category" type="category" width={110} />
                <Tooltip />
                <Bar dataKey="pct" name="Compliance %" fill="#0ea5e9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">Next Training Due</div>
          {nextDue ? (
            <div className="text-slate-800">
              <div className="text-xs text-slate-500">Module</div>
              <div className="font-semibold">{nextDue.module.label}</div>
              <div className="mt-2 text-xs text-slate-500">Due date</div>
              <div className={`text-lg font-bold ${nextDue.status === "overdue" ? "text-rose-700" : "text-amber-700"}`}>
                {nextDue.dueDate ? format(nextDue.dueDate, "d MMM yyyy") : "—"}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">No upcoming due items.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
