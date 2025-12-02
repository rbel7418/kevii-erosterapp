
import React from "react";
import { Employee, Department, Role } from "@/entities/all";
import { withRetry, sleep } from "@/components/utils/withRetry";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw, Search } from "lucide-react";

export default function EmployeeMasterList() {
  const [employees, setEmployees] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [statusTab, setStatusTab] = React.useState("all"); // all | active | inactive
  const [savingId, setSavingId] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const emps = await withRetry(() => Employee.list());
      const depts = await withRetry(() => Department.list());
      const rs = await withRetry(() => Role.list());
      setEmployees(emps || []);
      setDepartments(depts || []);
      setRoles(rs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const deptName = React.useMemo(() => {
    const m = {};
    (departments || []).forEach(d => { m[d.id] = d.name; });
    return m;
  }, [departments]);

  const roleNames = React.useMemo(() => {
    const m = {};
    (roles || []).forEach(r => { m[r.id] = r.name; });
    return m;
  }, [roles]);

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (employees || []).filter(e => {
      const matchText =
        !q ||
        String(e.full_name || "").toLowerCase().includes(q) ||
        String(e.user_email || "").toLowerCase().includes(q) ||
        String(e.employee_id || "").toLowerCase().includes(q);
      const active = e.is_active !== false;
      const matchStatus =
        statusTab === "all" ? true :
        statusTab === "active" ? active :
        !active;
      return matchText && matchStatus;
    });
  }, [employees, filter, statusTab]);

  const toggleActive = async (emp) => {
    const next = !(emp.is_active !== false); // flip boolean; default true
    setSavingId(emp.id);
    try {
      await withRetry(() => Employee.update(emp.id, { is_active: next }));
      // refresh local list quickly
      setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, is_active: next } : e));
      // broadcast so roster/other views can refresh
      try { window.dispatchEvent(new CustomEvent("employee-activity-updated", { detail: { id: emp.id, is_active: next } })); } catch {}
    } finally {
      setSavingId(null);
    }
  };

  const activeCount = employees.filter(e => e.is_active !== false).length;
  const inactiveCount = (employees.length - activeCount);

  return (
    <Card className="shadow-sm border-slate-200 rounded-md">
      <CardHeader className="border-b py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-teal-600" />
            Employees
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search name, email or ID" className="pl-7 h-8 w-64" />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8">
              <RefreshCw className={loading ? "w-4 h-4 mr-1 animate-spin" : "w-4 h-4 mr-1"} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" variant={statusTab === "all" ? "default" : "outline"} onClick={() => setStatusTab("all")} className={statusTab === "all" ? "bg-slate-900 h-8" : "h-8"}>
            All <Badge variant="secondary" className="ml-2">{employees.length}</Badge>
          </Button>
          <Button size="sm" variant={statusTab === "active" ? "default" : "outline"} onClick={() => setStatusTab("active")} className={statusTab === "active" ? "bg-green-600 hover:bg-green-700 text-white h-8" : "h-8"}>
            Active <Badge variant="secondary" className="ml-2">{activeCount}</Badge>
          </Button>
          <Button size="sm" variant={statusTab === "inactive" ? "default" : "outline"} onClick={() => setStatusTab("inactive")} className={statusTab === "inactive" ? "bg-black hover:bg-black/90 text-white h-8" : "h-8"}>
            Inactive <Badge variant="secondary" className="ml-2">{inactiveCount}</Badge>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-12 text-xs font-semibold text-slate-500 px-3 py-2">
          <div className="col-span-4">Employee</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-2">Roles</div>
          <div className="col-span-1 text-right">Active</div>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No employees found.</div>
          ) : (
            filtered.map((e) => {
              const isActive = e.is_active !== false;
              const dep = deptName[e.department_id] || "—";
              const roleList = Array.isArray(e.role_ids) ? e.role_ids.slice(0,2).map(id => roleNames[id]).filter(Boolean).join(", ") : "—";
              return (
                <div key={e.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-slate-50">
                  <div className="col-span-4 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{e.full_name || e.user_email}</div>
                    <div className="text-xs text-slate-500 truncate">ID: {e.employee_id || "—"}</div>
                  </div>
                  <div className="col-span-3 truncate">{e.user_email || "—"}</div>
                  <div className="col-span-2 truncate">{dep}</div>
                  <div className="col-span-2 truncate">{roleList}</div>
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      onClick={() => toggleActive(e)}
                      disabled={savingId === e.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none border ${
                        isActive ? "bg-green-600 border-green-700" : "bg-black border-black"
                      } ${savingId === e.id ? "opacity-70" : ""}`}
                      title={isActive ? "Set Inactive" : "Set Active"}
                      aria-label={isActive ? "Set Inactive" : "Set Active"}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-3 py-2 text-xs text-slate-600">
          Tip: This Active toggle is the master control for grid visibility — inactive staff are hidden from all department grids and cannot be manually added; set back to Active to re‑show even without assigned shifts.
        </div>
      </CardContent>
    </Card>
  );
}
