import React from "react";
import { Employee } from "@/entities/Employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const norm = (v) => String(v || "").trim().toLowerCase();

export default function QuickAssignDialog({
  open,
  onClose,
  department,
  employees = [],
  onAssigned // callback to refresh
}) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(new Set());
    setError("");
  }, [open, department?.id]);

  const candidates = React.useMemo(() => {
    const deptId = String(department?.id || "");
    return (employees || []).filter(
      (e) => e && e.is_active !== false && String(e.department_id || "") !== deptId
    );
  }, [employees, department?.id]);

  const filtered = React.useMemo(() => {
    const q = norm(query);
    if (!q) return candidates;
    return candidates.filter((e) =>
      norm(e.full_name).includes(q) ||
      norm(e.user_email).includes(q) ||
      norm(e.employee_id).includes(q)
    );
  }, [candidates, query]);

  const setChecked = (id, val) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (val) next.add(id); else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((e) => e.id)));
  const clearAll = () => setSelected(new Set());

  const handleAdd = async () => {
    setError("");
    if (selected.size === 0 || submitting) return;
    try {
      setSubmitting(true);
      const deptId = String(department?.id || "");
      for (const id of Array.from(selected)) {
        await Employee.update(id, { department_id: deptId });
      }
      setSubmitting(false);
      onAssigned?.();
      onClose?.();
    } catch (e) {
      setSubmitting(false);
      setError("Failed to add selected staff. Please try again.");
      console.error("QuickAssignDialog error:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add existing staff to {department?.name || "Department"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, email or Employee ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="outline" onClick={() => setQuery("")}>Clear</Button>
            <Button variant="outline" onClick={selectAll}>Select All</Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto divide-y">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No staff found</div>
              ) : filtered.map((e) => (
                <div key={e.id} className="p-3 flex items-start gap-3 hover:bg-slate-50">
                  <Checkbox
                    checked={selected.has(e.id)}
                    onCheckedChange={(val) => setChecked(e.id, !!val)}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{e.full_name || e.user_email}</div>
                    <div className="text-xs text-slate-600 truncate">
                      ID: {e.employee_id || "-"} • {e.user_email || "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selected.size > 0 && (
            <div className="text-sm text-slate-600">
              Selected: <span className="font-semibold">{selected.size}</span>
              <Button variant="link" className="px-2 h-auto" onClick={clearAll}>Clear</Button>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0 || submitting}>
            {submitting ? "Adding…" : `Add to ${department?.name || "Department"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}