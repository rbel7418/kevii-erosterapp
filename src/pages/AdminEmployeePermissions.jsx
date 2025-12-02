import * as React from "react";
import { User } from "@/entities/User";
import { Employee } from "@/entities/Employee";
import { Role } from "@/entities/Role";
import { Department } from "@/entities/Department";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert, Trash2, Pencil, Sparkles } from "lucide-react";
import { enqueueEmployeeDelete } from "@/components/utils/deleteQueue";
import EmployeeDialog from "@/components/team/EmployeeDialog";
import { base44 } from "@/api/base44Client";

export default function AdminEmployeePermissions() {
  const [me, setMe] = React.useState(null);
  const [employees, setEmployees] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);

  // global quick search
  const [filter, setFilter] = React.useState("");

  // per-column filters
  const [columnFilters, setColumnFilters] = React.useState({
    employeeId: "",
    name: "",
    department: "",
    role: ""
  });

  const [savingId, setSavingId] = React.useState(null);
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [deleting, setDeleting] = React.useState(false);

  const [showEmpDialog, setShowEmpDialog] = React.useState(false);
  const [empEditing, setEmpEditing] = React.useState(null);
  const [statusMessage, setStatusMessage] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const u = await User.me().catch(() => null);
      setMe(u);

      if (u?.role === "admin") {
        const [emps, us, rs, ds] = await Promise.all([
        Employee.list(),
        User.list(),
        Role.list(),
        Department.list()]
        );

        setEmployees(emps || []);
        setUsers(us || []);
        setRoles(rs || []);
        setDepartments(ds || []);
      }
    })();
  }, []);

  const isAdmin = me?.role === "admin";

  const roleById = React.useMemo(() => {
    const map = {};
    roles.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [roles]);

  const deptById = React.useMemo(() => {
    const map = {};
    departments.forEach((d) => {
      map[d.id] = d;
    });
    return map;
  }, [departments]);

  const userByEmail = React.useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (u.email) map[String(u.email).toLowerCase()] = u;
    });
    return map;
  }, [users]);

  const handleColumnFilter = (key, val) => {
    setColumnFilters((prev) => ({ ...prev, [key]: val }));
  };

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    const f = {
      employeeId: columnFilters.employeeId.trim().toLowerCase(),
      name: columnFilters.name.trim().toLowerCase(),
      department: columnFilters.department.trim().toLowerCase(),
      role: columnFilters.role.trim().toLowerCase()
    };

    return employees.filter((e) => {
      const empId = String(e.employee_id || "").toLowerCase();
      const email = String(e.user_email || "").toLowerCase();
      const name = String(e.full_name || e.user_email || "").toLowerCase();

      const dept = deptById[e.department_id];
      const deptName = dept ? String(dept.name).toLowerCase() : "";

      const primaryRoleName =
      Array.isArray(e.role_ids) &&
      e.role_ids.length > 0 && (
      roleById[e.role_ids[0]]?.name || "") ||
      String(e.job_title || "");
      const role = primaryRoleName.toLowerCase();

      // global quick search
      if (q) {
        const match =
        empId.includes(q) || name.includes(q) || email.includes(q);
        if (!match) return false;
      }

      // column filters
      if (f.employeeId && !empId.includes(f.employeeId)) return false;
      if (f.name && !name.includes(f.name)) return false;
      if (f.department && !deptName.includes(f.department)) return false;
      if (f.role && !role.includes(f.role)) return false;

      return true;
    });
  }, [employees, filter, columnFilters, roleById, deptById]);

  // selection controls
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  };

  const allSelected =
  filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const ids = filtered.map((e) => e.id);
      const all = ids.every((id) => next.has(id));
      if (all) ids.forEach((id) => next.delete(id));else
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    if (!window.confirm(`Delete ${selectedIds.size} selected record(s)?`)) {
      return;
    }

    setDeleting(true);

    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) => enqueueEmployeeDelete(id))
      );

      const ok = ids.filter((_, i) => results[i].status === "fulfilled");

      if (ok.length > 0) {
        setEmployees((prev) => prev.filter((e) => !ok.includes(e.id)));
      }
      setSelectedIds(new Set());
      setStatusMessage(`Deleted ${ok.length} employee record(s).`);
    } finally {
      setDeleting(false);
    }
  };

  const saveRole = async (emp, mode) => {
    setSavingId(emp.id);

    const u = userByEmail[String(emp.user_email || "").toLowerCase()];
    if (u) {
      if (mode === "admin") {
        await User.update(u.id, { role: "admin", access_level: "admin" });
      } else if (mode === "manager") {
        await User.update(u.id, { role: "user", access_level: "manager" });
      } else {
        await User.update(u.id, { role: "user", access_level: "staff" });
      }
    }

    setSavingId(null);
  };

  const toggleActive = async (emp, val) => {
    setSavingId(emp.id);
    await Employee.update(emp.id, { is_active: !!val });
    setEmployees((prev) =>
    prev.map((x) =>
    x.id === emp.id ? { ...x, is_active: !!val } : x
    )
    );
    setSavingId(null);
  };

  const saveHours = async (emp, hours) => {
    setSavingId(emp.id);
    const n = Number(hours);
    await Employee.update(emp.id, {
      contracted_hours_weekly: isNaN(n) ? 0 : n
    });
    setEmployees((prev) =>
    prev.map((x) =>
    x.id === emp.id ?
    { ...x, contracted_hours_weekly: isNaN(n) ? 0 : n } :
    x
    )
    );
    setSavingId(null);
  };

  const openDialog = (emp) => {
    setEmpEditing(emp);
    setShowEmpDialog(true);
  };

  const saveDialog = async (data) => {
    if (!empEditing) return;
    setSavingId(empEditing.id);
    await Employee.update(empEditing.id, data);
    setEmployees((prev) =>
    prev.map((x) =>
    x.id === empEditing.id ? { ...x, ...data } : x
    )
    );
    setSavingId(null);
    setShowEmpDialog(false);
    setEmpEditing(null);
    setStatusMessage("Employee details updated successfully.");
    window.alert("Employee details updated successfully.");
  };

  const handleEditSelected = () => {
    if (selectedIds.size === 0) {
      window.alert("Select one employee to edit.");
      return;
    }
    if (selectedIds.size > 1) {
      window.alert("Please select only one employee to edit at a time.");
      return;
    }
    const id = Array.from(selectedIds)[0];
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    openDialog(emp);
  };

  // auto-clear status banner after a few seconds
  React.useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(""), 4000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>Admins only.</CardContent>
        </Card>
      </div>);

  }

  return (
    <div className="bg-slate-50 mr-16 ml-40 px-6 py-4 md:p-6 min-h-screen">
      {/* top section */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Employee Permissions
          </h1>
          <p className="text-xs text-slate-600">
            Filter by ID, name, department or role. Adjust access, activity and contracted hours.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="h-8 w-64 text-sm"
            placeholder="Quick search..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)} />
          
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1"
            onClick={handleEditSelected}
            disabled={selectedIds.size === 0}
            title="Edit selected employee">
            
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
          <Button
            className="h-8"
            onClick={deleteSelected}
            disabled={selectedIds.size === 0 || deleting}>
            
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {selectedIds.size || ""}
          </Button>

        </div>
      </div>

      {statusMessage &&
      <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {statusMessage}
        </div>
      }

      {/* filters + list */}
      <Card className="shadow-sm">
        <CardHeader className="border-b py-2">
          <CardTitle className="text-sm">Employees</CardTitle>
        </CardHeader>

        <CardContent className="px-4">
          {/* filter strip */}
          <div className="px-3 py-3 border-b bg-slate-50">
            <div className="flex flex-wrap gap-2">
              <div className="w-full md:w-32">
                <Input
                  className="h-8 text-[11px]"
                  placeholder="ID"
                  value={columnFilters.employeeId}
                  onChange={(e) =>
                  handleColumnFilter("employeeId", e.target.value)
                  } />
                
              </div>
              <div className="flex-1 min-w-[160px]">
                <Input
                  className="h-8 text-[11px]"
                  placeholder="Name / email"
                  value={columnFilters.name}
                  onChange={(e) =>
                  handleColumnFilter("name", e.target.value)
                  } />
                
              </div>
              <div className="w-full md:w-48">
                <Input
                  className="h-8 text-[11px]"
                  placeholder="Department"
                  value={columnFilters.department}
                  onChange={(e) =>
                  handleColumnFilter("department", e.target.value)
                  } />
                
              </div>
              <div className="w-full md:w-40">
                <Input
                  className="h-8 text-[11px]"
                  placeholder="Role"
                  value={columnFilters.role}
                  onChange={(e) =>
                  handleColumnFilter("role", e.target.value)
                  } />
                
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 ml-auto">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAllFiltered} />
                
                <span>Select all in view</span>
              </div>
            </div>
          </div>

          {/* rows */}
          <div className="mr-10 ml-4">
            {filtered.map((emp) => {
              const u =
              userByEmail[String(emp.user_email || "").toLowerCase()];
              const accessLevel =
              u?.role === "admin" ? "admin" : u?.access_level || "staff";
              const dept = deptById[emp.department_id];
              const primaryRole =
              Array.isArray(emp.role_ids) &&
              emp.role_ids.length > 0 && (
              roleById[emp.role_ids[0]]?.name || "") ||
              emp.job_title ||
              "—";

              return (
                <div
                  key={emp.id} className="bg-sky-50 pr-1 pb-1 pl-1 border-t first:border-t-0 hover:bg-slate-50">

                  
                  <div className="mx-64 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    {/* left side: identity */}
                    <div className="flex items-start gap-3 md:flex-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(emp.id)}
                        onChange={() => toggleSelectOne(emp.id)}
                        className="mt-1" />
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <button className="text-slate-950 font-medium text-left hover:underline"

                          onClick={() => openDialog(emp)}>
                            
                            {emp.full_name || emp.user_email}
                          </button>
                          <span className="text-[14px] text-slate-500">
                            ID {emp.employee_id || "—"}
                          </span>
                        </div>
                        <div className="text-[14px] text-slate-500 truncate">
                          {emp.user_email}
                        </div>
                        <div className="text-[14px] text-slate-500">
                          {dept ? dept.name : "—"} • {primaryRole}
                        </div>
                      </div>
                    </div>

                    {/* right side: controls */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-sm font-semibold">Access

                        </span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`role-${emp.id}`}
                              checked={accessLevel === "staff"}
                              onChange={() => saveRole(emp, "staff")}
                              disabled={savingId === emp.id} />
                            
                            <span className="text-sm font-semibold">Staff</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`role-${emp.id}`}
                              checked={accessLevel === "manager"}
                              onChange={() => saveRole(emp, "manager")}
                              disabled={savingId === emp.id} />
                            
                            <span className="text-sm font-semibold">Mgr</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`role-${emp.id}`}
                              checked={accessLevel === "admin"}
                              onChange={() => saveRole(emp, "admin")}
                              disabled={savingId === emp.id} />
                            
                            <span className="text-sm font-semibold">Admin</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-sm font-semibold">Active

                          </span>
                          <Switch
                            checked={emp.is_active !== false}
                            onCheckedChange={(v) => toggleActive(emp, v)} />
                          
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-sm font-bold text-center">Hours

                          </span>
                          <Input
                            type="number"
                            className="h-7 w-20 text-[13px] text-right"
                            value={emp.contracted_hours_weekly ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEmployees((prev) =>
                              prev.map((x) =>
                              x.id === emp.id ?
                              {
                                ...x,
                                contracted_hours_weekly: v
                              } :
                              x
                              )
                              );
                            }}
                            onBlur={(e) => saveHours(emp, e.target.value)} />
                          
                        </div>
                      </div>
                    </div>
                  </div>
                </div>);

            })}

            {filtered.length === 0 &&
            <div className="px-3 py-4 text-sm text-slate-500">
                No employees match your filters.
              </div>
            }
          </div>
        </CardContent>
      </Card>

      {showEmpDialog &&
      <EmployeeDialog
        open={showEmpDialog}
        onClose={() => {
          setShowEmpDialog(false);
          setEmpEditing(null);
        }}
        onSave={saveDialog}
        employee={empEditing}
        departments={departments}
        roles={roles} />

      }
    </div>);

}