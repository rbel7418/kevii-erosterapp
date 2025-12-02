
import React, { useEffect, useMemo, useState } from "react";
import { Shift, Employee, Department, Role } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Add local helpers
const norm = (v) => (v == null ? "" : String(v)).trim().toLowerCase();
const resolveDeptByAny = (departments, val) => {
  if (!val || departments.length === 0) return null;
  const n = norm(val);
  return (
    departments.find(
      (d) => norm(d.id) === n || norm(d.name) === n || norm(d.code) === n
    ) || null
  );
};

export default function TabularRoster() {
  const params = new URLSearchParams(window.location.search);
  const startParam = params.get("start");
  const endParam = params.get("end");
  const deptParam = params.get("department");
  const dmParam = params.get("duty_manager");

  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    const [s, e, d, r] = await Promise.all([
      Shift.list("-date", 1000),
      Employee.list(),
      Department.list(),
      Role.list()
    ]);
    setShifts(s);
    setEmployees(e);
    setDepartments(d);
    setRoles(r);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const start = startParam ? parseISO(startParam) : null;
    const end = endParam ? parseISO(endParam) : null;

    let result = shifts.filter(s => {
      if (!start || !end) return true;
      const d = parseISO(s.date);
      return d >= start && d <= end;
    });

    // Apply department or duty manager filter to match Schedule page
    if (dmParam === "1" || dmParam === "true") {
      const isDM = (code) => String(code || "").toUpperCase().includes("DM");
      result = result.filter((s) => isDM(s.shift_code));
    } else if (deptParam) {
      const dept = resolveDeptByAny(departments, deptParam);
      if (dept) {
        const deptEmpIds = new Set(
          employees.filter(e => (e.department_id || "") === dept.id).map(e => e.id)
        );
        result = result.filter((s) => {
          // Resolve shift's department ID from the full list if it's not directly matching dept.id
          const shiftDepartment = departments.find(d => d.id === s.department_id);
          const shiftDeptId = shiftDepartment?.id;

          return (shiftDeptId && norm(shiftDeptId) === norm(dept.id)) || (s.employee_id && deptEmpIds.has(s.employee_id));
        });
      }
    }

    return result;
  }, [shifts, startParam, endParam, deptParam, dmParam, departments, employees]);

  const save = async (id, patch) => {
    setSavingId(id);
    await Shift.update(id, patch);
    setShifts(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
    setSavingId(null);
  };

  return (
    <div className="p-4 md:p-6 themed min-h-screen" style={{ background: 'var(--dm-bg-base)' }}>
      {/* CHANGED: full width container */}
      <div className="w-full border rounded-lg shadow" style={{ background: 'var(--dm-bg-elevated)', borderColor: 'var(--dm-border)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--dm-border)' }}>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Schedule" + (deptParam ? `?department=${encodeURIComponent(deptParam)}` : (dmParam ? "?duty_manager=1" : "")))}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="app-title-sm" style={{ color: 'var(--dm-text-primary)' }}>Tabular Roster Editor</h1>
          </div>
          <div className="text-sm" style={{ color: 'var(--dm-text-tertiary)' }}>
            {startParam && endParam ? (
              <>Editing range: {startParam} → {endParam}</>
            ) : (
              <>All shifts</>
            )}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Employee</th>
                <th className="text-left p-2">Role</th>
                <th className="text-left p-2">Dept</th>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Start</th>
                <th className="text-left p-2">End</th>
                <th className="text-left p-2">Break</th>
                <th className="text-left p-2">Notes</th>
                <th className="text-left p-2">Save</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(shift => (
                <tr key={shift.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 whitespace-nowrap">{shift.date}</td>
                  <td className="p-2 min-w-[220px]">
                    <Select
                      value={shift.employee_id || ""}
                      onValueChange={(value) => save(shift.id, { employee_id: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Unassigned</SelectItem>
                        {employees.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.full_name || e.user_email?.split?.("@")?.[0] || e.user_email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 min-w-[180px]">
                    <Select
                      value={shift.role_id || ""}
                      onValueChange={(value) => save(shift.id, { role_id: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 min-w-[180px]">
                    <Select
                      value={shift.department_id || ""}
                      onValueChange={(value) => save(shift.id, { department_id: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 min-w-[120px]">
                    <Input
                      value={shift.shift_code || ""}
                      onChange={(e) => save(shift.id, { shift_code: e.target.value.toUpperCase() })}
                    />
                  </td>
                  <td className="p-2 min-w-[100px]">
                    <Input
                      value={shift.start_time || ""}
                      onChange={(e) => save(shift.id, { start_time: e.target.value })}
                      type="time"
                    />
                  </td>
                  <td className="p-2 min-w-[100px]">
                    <Input
                      value={shift.end_time || ""}
                      onChange={(e) => save(shift.id, { end_time: e.target.value })}
                      type="time"
                    />
                  </td>
                  <td className="p-2 min-w-[80px]">
                    <Input
                      value={shift.break_minutes || 0}
                      onChange={(e) => save(shift.id, { break_minutes: Number(e.target.value || 0) })}
                      type="number"
                      min="0"
                    />
                  </td>
                  <td className="p-2 min-w-[240px]">
                    <Input
                      value={shift.notes || ""}
                      onChange={(e) => save(shift.id, { notes: e.target.value })}
                    />
                  </td>
                  <td className="p-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => save(shift.id, {})}
                      disabled={savingId === shift.id}
                      title="Save"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={10}>
                    No shifts in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
