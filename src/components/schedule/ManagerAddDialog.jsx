import React from "react";
import { Employee } from "@/entities/Employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const norm = (v) => String(v || "").trim().toLowerCase();

export default function ManagerAddDialog({
  open,
  onClose,
  department,         // target department object
  employees = [],
  onAssigned,         // callback after assignment completes (e.g., reload data)
}) {
  const [managerKey, setManagerKey] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setManagerKey("");
    setQuery("");
    setSelected(new Set());
    setSubmitting(false);
    setError("");
  }, [open]);

  // Build manager list from employees' reports_to
  const managers = React.useMemo(() => {
    const map = new Map();
    for (const e of employees) {
      const key = norm(e?.reports_to);
      if (!key) continue;
      if (!map.has(key)) {
        // Try to find a nice display name
        const m =
          employees.find(x => norm(x.user_email) === key) ||
          employees.find(x => norm(x.employee_id) === key) ||
          employees.find(x => norm(x.full_name) === key);
        map.set(key, {
          key,
          label: m?.full_name || e.reports_to,
          email: m?.user_email,
          id: m?.employee_id
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.label || a.key).localeCompare(b.label || b.key));
  }, [employees]);

  // Team under selected manager, not yet in this department
  const team = React.useMemo(() => {
    if (!managerKey) return [];
    const deptId = String(department?.id || "");
    const list = (employees || []).filter(e =>
      e && e.is_active !== false &&
      String(e.department_id || "") !== deptId &&
      norm(e.reports_to) === managerKey
    );
    const q = norm(query);
    if (!q) return list;
    return list.filter(e =>
      norm(e.full_name).includes(q) ||
      norm(e.user_email).includes(q) ||
      norm(e.employee_id).includes(q)
    );
  }, [employees, department?.id, managerKey, query]);

  const setChecked = (id, checked) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(team.map(e => e.id)));
  const clearAll = () => setSelected(new Set());

  const assignIds = async (ids) => {
    if (!ids?.length || !department?.id) return;
    setError("");
    setSubmitting(true);
    try {
      for (const id of ids) {
        await Employee.update(id, { department_id: String(department.id) });
      }
      setSubmitting(false);
      onAssigned && onAssigned(ids.length);
      onClose && onClose();
    } catch (e) {
      console.error("ManagerAddDialog assign error:", e);
      setSubmitting(false);
      setError("Failed to add staff. Please try again.");
    }
  };

  const addSelected = () => assignIds(Array.from(selected));
  const addAll = () => assignIds(team.map(e => e.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add by Manager • {department?.name || "Department"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={managerKey}
              onChange={(e) => {
                setManagerKey(e.target.value);
                setSelected(new Set());
              }}
            >
              <option value="">Select a Line Manager</option>
              {managers.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label || m.key}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={selectAll} disabled={!managerKey || team.length === 0}>Select All</Button>
            <Button variant="outline" onClick={clearAll} disabled={selected.size === 0}>Clear</Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search this manager's team by name, email, or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="border rounded-lg max-h-[420px] overflow-y-auto">
            {(!managerKey) ? (
              <div className="p-4 text-sm text-slate-500">Choose a Line Manager to view their team.</div>
            ) : team.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No team members available to add.</div>
            ) : (
              <ul className="divide-y">
                {team.map(e => (
                  <li key={e.id} className="p-3 hover:bg-slate-50">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5"
                        checked={selected.has(e.id)}
                        onChange={(ev) => setChecked(e.id, ev.target.checked)}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{e.full_name || e.user_email}</div>
                        <div className="text-xs text-slate-600 truncate">
                          ID: {e.employee_id || "-"} • {e.user_email || "-"}
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={addAll} disabled={!managerKey || team.length === 0 || submitting}>
            {submitting ? "Adding…" : "Add All"}
          </Button>
          <Button onClick={addSelected} disabled={selected.size === 0 || submitting}>
            {submitting ? "Adding…" : `Add Selected (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}