
import React from "react";
import { Employee, Role, Department } from "@/entities/all";
import { User } from "@/entities/User";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import withRetry from "@/components/utils/withRetry";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function QuickAddEmployeeDialog({ open, onClose, departmentId, onAdded }) {
  const [roles, setRoles] = React.useState([]);
  const [allEmployees, setAllEmployees] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [saving, setSaving] = React.useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState("");
  const [selectedRoleIds, setSelectedRoleIds] = React.useState([]);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const rs = await withRetry(() => Role.list());
      const emps = await withRetry(() => Employee.list());
      const depts = await withRetry(() => Department.list());
      setRoles(rs || []);
      setAllEmployees(emps || []);
      setDepartments(depts || []);
    })();
  }, [open]);

  // Reset query when closing or after add
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedEmployeeId("");
      setSelectedRoleIds([]);
    }
  }, [open]);

  const deptName = React.useMemo(() => {
    return departments.find(d => d.id === departmentId)?.name || "Department";
  }, [departments, departmentId]);

  // Filter to employees not already in this department
  const availableEmployees = React.useMemo(() => {
    return (allEmployees || [])
      .filter(e => e.is_active !== false && e.department_id !== departmentId)
      .sort((a, b) => {
        const nameA = a.full_name || a.user_email || "";
        const nameB = b.full_name || b.user_email || "";
        return nameA.localeCompare(nameB);
      });
  }, [allEmployees, departmentId]);

  const selectedEmployee = React.useMemo(() => {
    return allEmployees.find(e => e.id === selectedEmployeeId);
  }, [allEmployees, selectedEmployeeId]);

  // Suggested list based on query (name/email/role/employee_id)
  const suggestions = React.useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return availableEmployees.slice(0, 50);
    return availableEmployees
      .filter(e => {
        const name = String(e.full_name || "").toLowerCase();
        const email = String(e.user_email || "").toLowerCase();
        const title = String(e.job_title || "").toLowerCase();
        const code = String(e.employee_id || "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          title.includes(q) ||
          code.includes(q)
        );
      })
      .slice(0, 50);
  }, [availableEmployees, query]);

  // Auto-select when exact employee_id typed
  React.useEffect(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return;
    const match = availableEmployees.find(e => String(e.employee_id || "").toLowerCase() === q);
    if (match) {
      setSelectedEmployeeId(match.id);
    }
  }, [query, availableEmployees]);

  const pickSuggestion = (emp) => {
    setSelectedEmployeeId(emp.id);
    setQuery(emp.full_name || emp.user_email || emp.employee_id || "");
  };

  const onQueryKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedEmployeeId) return; // already selected by exact match
      if (suggestions.length > 0) {
        pickSuggestion(suggestions[0]);
      }
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoleIds(prev => prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]);
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      alert("Please select an employee.");
      return;
    }
    setSaving(true);
    try {
      // Update the employee to add them to this department
      const currentRoles = selectedEmployee?.role_ids || [];
      const mergedRoles = [...new Set([...currentRoles, ...selectedRoleIds])];
      
      await Employee.update(selectedEmployeeId, {
        department_id: departmentId,
        role_ids: mergedRoles
      });
      
      onAdded?.();
      onClose?.();
      // reset
      setSelectedEmployeeId("");
      setSelectedRoleIds([]);
      setQuery("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add staff to {deptName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          <div className="relative">
            <Label>Search or type employee (name, email, role, or EMP_ID)</Label>
            <Input
              autoFocus
              placeholder="Start typing a name or paste EMP_ID…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // Clear selected employee if user starts typing a new search
                // unless the query already matches the selected employee's known identifiers.
                if (selectedEmployeeId && selectedEmployee) {
                  const currentQueryLower = e.target.value.toLowerCase();
                  const selectedNameLower = (selectedEmployee.full_name || "").toLowerCase();
                  const selectedEmailLower = (selectedEmployee.user_email || "").toLowerCase();
                  const selectedIdLower = (selectedEmployee.employee_id || "").toLowerCase();

                  if (currentQueryLower !== selectedNameLower &&
                      currentQueryLower !== selectedEmailLower &&
                      currentQueryLower !== selectedIdLower) {
                    setSelectedEmployeeId("");
                  }
                }
              }}
              onKeyDown={onQueryKeyDown}
              className="mt-1"
            />
            {/* Suggestions dropdown */}
            {query && !selectedEmployeeId && ( // Show suggestions only if query has value and no employee is explicitly selected
              <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                {suggestions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">No matching staff found</div>
                ) : (
                  <ScrollArea className="max-h-60">
                    <ul className="py-1">
                      {suggestions.map(emp => {
                        const isSelected = emp.id === selectedEmployeeId;
                        return (
                          <li
                            key={emp.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${isSelected ? "bg-sky-50" : ""}`}
                            onClick={() => pickSuggestion(emp)}
                            title={`EMP_ID: ${emp.employee_id || "N/A"}`}
                          >
                            <div className="font-medium text-slate-800">
                              {emp.full_name || emp.user_email}
                            </div>
                            <div className="text-xs text-slate-500 flex gap-2">
                              {emp.job_title ? <span>{emp.job_title}</span> : null}
                              {emp.employee_id ? <span className="text-slate-400">• ID: {emp.employee_id}</span> : null}
                              {emp.user_email ? <span className="text-slate-400">• {emp.user_email}</span> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            )}
            {availableEmployees.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">
                No available employees to add (all are already in this department or inactive)
              </p>
            )}
          </div>

          {selectedEmployee && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input value={selectedEmployee.user_email || ""} disabled className="bg-slate-50" />
                </div>
                <div>
                  <Label>Job title</Label>
                  <Input value={selectedEmployee.job_title || ""} disabled className="bg-slate-50" />
                </div>
              </div>

              <div>
                <Label>Add roles (optional)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedRoleIds.length > 0
                        ? `${selectedRoleIds.length} role(s) to add`
                        : "Select additional roles"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72">
                    {roles.map(r => {
                      const checked = selectedRoleIds.includes(r.id);
                      return (
                        <DropdownMenuCheckboxItem
                          key={r.id}
                          checked={checked}
                          onCheckedChange={() => toggleRole(r.id)}
                        >
                          {r.name}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                    {roles.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No roles defined</div>}
                  </DropdownMenuContent>
                </DropdownMenu>
                {selectedRoleIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRoleIds.map(id => {
                      const r = roles.find(rr => rr.id === id);
                      return (
                        <span key={id} className="text-xs px-2 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200">
                          {r?.name || id}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setQuery(""); setSelectedEmployeeId(""); setSelectedRoleIds([]); onClose(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !selectedEmployeeId} className="bg-sky-600 hover:bg-sky-700">
            {saving ? "Adding…" : "Add to department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
