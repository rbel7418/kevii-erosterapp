
import React from "react";
import { Employee } from "@/entities/Employee";
import EmployeeDialog from "@/components/team/EmployeeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, Plus } from "lucide-react";
import QuickAssignDialog from "@/components/schedule/QuickAssignDialog";

export default function DeptStaffManager({
  activeDepartment,
  dutyManagerOnly = false,
  employees = [],
  departments = [],
  roles = [],
  onChanged
}) {
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState(null);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);

  const title = activeDepartment
    ? `Staff • ${activeDepartment.name}`
    : dutyManagerOnly
    ? "Staff • Duty Manager"
    : "Staff";

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = employees.filter(e => e.is_active !== false);
    if (activeDepartment) {
      list = list.filter(e => (e.department_id || "") === activeDepartment.id);
    }
    // For duty manager, we keep all active staff for manual curation
    if (q) {
      list = list.filter(e =>
        (e.full_name || "").toLowerCase().includes(q) ||
        (e.user_email || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [employees, activeDepartment, search]); // 'dutyManagerOnly' removed as it doesn't affect the filtering logic directly here

  const handleAdd = () => {
    // Prefill department if available
    const prefill = activeDepartment ? { department_id: activeDepartment.id } : {};
    setEditingEmployee(prefill);
    setDialogOpen(true);
  };

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setDialogOpen(true);
  };

  const handleRemoveFromDept = async (emp) => {
    if (!activeDepartment) return;
    if (!confirm(`Remove ${emp.full_name || emp.user_email} from ${activeDepartment.name}?`)) return;
    await Employee.update(emp.id, { department_id: "" });
    onChanged && onChanged();
  };

  const handleSave = async (data) => {
    // Ensure department_id is set if activeDepartment is present and not already set in data
    if (activeDepartment && !data.department_id) {
      data.department_id = activeDepartment.id;
    }

    if (data.id) {
      await Employee.update(data.id, data);
    } else {
      await Employee.create(data);
    }
    setDialogOpen(false);
    setEditingEmployee(null);
    onChanged && onChanged();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          {activeDepartment && (
            <Button variant="outline" onClick={() => setQuickAddOpen(true)}>
              Quick Add Existing
            </Button>
          )}
          <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium text-slate-700">
            {filtered.length} staff {activeDepartment ? `in ${activeDepartment.name}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{emp.full_name || emp.user_email}</div>
                  <div className="text-xs text-slate-600 truncate">{emp.user_email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(emp)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {activeDepartment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFromDept(emp)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-sm text-slate-500">No staff found.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <EmployeeDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingEmployee(null);
          }}
          onSave={handleSave}
          employee={editingEmployee?.id ? editingEmployee : editingEmployee || null}
          departments={departments}
          roles={roles}
        />
      )}

      {activeDepartment && quickAddOpen && (
        <QuickAssignDialog
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          department={activeDepartment}
          employees={employees}
          onAssigned={onChanged}
        />
      )}
    </div>
  );
}
