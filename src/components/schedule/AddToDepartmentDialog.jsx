
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox"; // Note: we keep Checkbox import if present; it will be unused after this edit.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Employee } from "@/entities/Employee";

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

export default function AddToDepartmentDialog({
  open,
  onClose,
  department,
  employees = [],
  preselectedIds = [],
  onAssign,             // (ids: string[]) => Promise<void> | void
  isMassUpdating = false
}) {
  const [query, setQuery] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState(() => new Set(preselectedIds));
  const [managerKey, setManagerKey] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [quickInput, setQuickInput] = React.useState(""); // NEW

  // Reset when opened or department changes
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIds(new Set(preselectedIds));
    setManagerKey("");
    setError("");
    setQuickInput(""); // Reset quickInput
  }, [open, preselectedIds, department?.id]);

  // Candidates: active, and not already in the target department
  const candidates = React.useMemo(() => {
    const deptId = String(department?.id || "");
    return (employees || []).filter((e) => e && e.is_active !== false && String(e.department_id || "") !== deptId);
  }, [employees, department?.id]);

  // Manager groups from candidates (group by reports_to)
  const managerGroups = React.useMemo(() => {
    const map = new Map();
    for (const e of candidates) {
      const key = norm(e.reports_to);
      if (!key) continue;
      if (!map.has(key)) {
        // Try to display a nicer name from existing employees
        const mgr =
          employees.find(x => norm(x.user_email) === key) ||
          employees.find(x => norm(x.employee_id) === key) ||
          employees.find(x => norm(x.full_name) === key);
        map.set(key, {
          key,
          label: mgr?.full_name || e.reports_to,
          ids: new Set()
        });
      }
      map.get(key).ids.add(e.id);
    }
    return Array.from(map.values()).sort((a, b) => (a.label || a.key).localeCompare(b.label || b.key));
  }, [candidates, employees]);

  // Filter by search
  const filtered = React.useMemo(() => {
    const q = norm(query);
    if (!q) return candidates;
    return candidates.filter(e =>
      norm(e.full_name).includes(q) ||
      norm(e.user_email).includes(q) ||
      norm(e.employee_id).includes(q) ||
      norm(e.reports_to).includes(q)
    );
  }, [candidates, query]);

  const setChecked = React.useCallback((id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  // Removed: toggleRow is no longer directly used in JSX

  // Removed: handleSelectAll is no longer directly used in JSX
  // Removed: handleClear is no longer directly used in JSX

  const handlePreselectReports = () => {
    if (!managerKey) return;
    const group = managerGroups.find(g => g.key === managerKey);
    if (!group) return;
    setSelectedIds(new Set(group.ids));
  };

  // NEW: directly add the selected manager's team (no extra click needed)
  const handleAddManagerTeam = async () => {
    setError("");
    if (!managerKey || submitting || isMassUpdating) return;
    const group = managerGroups.find((g) => g.key === managerKey);
    if (!group || !group.ids || group.ids.size === 0) {
      setError("No staff found under the selected Line Manager.");
      return;
    }
    try {
      setSubmitting(true);
      if (onAssign) {
        await onAssign(Array.from(group.ids));
      } else {
        // Fallback: assign directly here
        const deptId = String(department?.id || "");
        for (const id of group.ids) {
          await Employee.update(id, { department_id: deptId });
        }
      }
      setSubmitting(false);
      onClose?.();
    } catch (e) {
      setSubmitting(false);
      setError("Failed to add the manager's team. Please try again.");
      console.error("AddToDepartmentDialog AddTeam error:", e);
    }
  };

  // Quick add by email or employee ID
  const handleQuickAdd = async () => {
    setError("");
    const val = String(quickInput || "").trim().toLowerCase();
    if (!val) return;
    const match = employees.find(e =>
      String(e.user_email || "").toLowerCase() === val ||
      String(e.employee_id || "").toLowerCase() === val
    );
    if (!match) {
      setError("No staff found with that email or employee ID.");
      return;
    }
    try {
      setSubmitting(true);
      const deptId = String(department?.id || "");
      // prefer parent callback; fallback to direct
      if (onAssign) {
        await onAssign([match.id]);
      } else {
        await Employee.update(match.id, { department_id: deptId });
      }
      setSubmitting(false);
      setQuickInput("");
      setError("");
      onClose?.();
    } catch (e) {
      console.error("QuickAdd error:", e);
      setSubmitting(false);
      setError("Failed to add staff. Please try again.");
    }
  };

  const handleAdd = async () => {
    setError("");
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setSubmitting(true);
      if (onAssign) {
        await onAssign(ids);
      } else {
        // Fallback: assign directly here
        const deptId = String(department?.id || "");
        for (const id of ids) {
          await Employee.update(id, { department_id: deptId });
        }
      }
      setSubmitting(false);
      onClose?.();
    } catch (e) {
      setSubmitting(false);
      setError("Failed to add staff to the department. Please try again.");
      console.error("AddToDepartmentDialog error:", e);
    }
  };

  const canSubmit = selectedIds.size > 0 && !submitting && !isMassUpdating;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add staff to {department?.name || "Department"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Manager selector row */}
          <div className="flex items-center gap-2">
            <Select value={managerKey} onValueChange={setManagerKey}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Line Manager to load their team" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {managerGroups.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-slate-500">No manager mappings found</div>
                ) : managerGroups.map((g) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.label || g.key} • {g.ids.size} staff
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handlePreselectReports} disabled={!managerKey}>
              Preselect Reports
            </Button>
            {/* CHANGE: Add Team now performs the assignment immediately */}
            <Button onClick={handleAddManagerTeam} disabled={!managerKey || submitting || isMassUpdating}>
              {submitting ? "Adding…" : "Add Team"}
            </Button>
          </div>

          {/* Search + Quick Add row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search by name, email, or employee ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-[220px]"
            />
            <Button variant="outline" onClick={() => setQuery("")}>Clear</Button>
            <Button variant="outline" onClick={() => setSelectedIds(new Set(filtered.map(e => e.id)))}>
              Select All
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Quick add by email or employee ID (e.g. jane@.. or 101234)"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              className="flex-1 min-w-[260px]"
            />
            <Button onClick={handleQuickAdd} disabled={!quickInput || submitting || isMassUpdating}>
              {submitting ? "Adding…" : "Quick Add"}
            </Button>
          </div>

          {/* List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No staff found</div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((e) => (
                    <li key={e.id} className="p-3 hover:bg-slate-50">
                      <div className="flex items-start gap-3">
                        {/* REPLACED: native checkbox to guarantee clickability */}
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-0.5 border-slate-300 rounded"
                          checked={selectedIds.has(e.id)}
                          onChange={(ev) => setChecked(e.id, ev.target.checked)}
                        />
                        <div
                          role="button"
                          tabIndex={0}
                          className="text-left flex-1 cursor-pointer"
                          onClick={() => setChecked(e.id, !selectedIds.has(e.id))}
                          onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && setChecked(e.id, !selectedIds.has(e.id))}
                        >
                          <div className="font-medium text-slate-900">{e.full_name || e.user_email}</div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            ID: {e.employee_id || "-"} • {e.user_email || "-"}
                            {e.reports_to ? ` • LM: ${e.reports_to}` : ""}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="text-sm text-slate-600">
              Selected: <span className="font-semibold">{selectedIds.size}</span>
              <Button variant="link" className="ml-2 px-1 h-auto" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!canSubmit} className="bg-teal-600 hover:bg-teal-700">
            {submitting || isMassUpdating ? "Adding..." : `Add to ${department?.name || "Department"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
