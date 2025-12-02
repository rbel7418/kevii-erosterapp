
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RosterVersion } from "@/entities/RosterVersion";
import { Shift } from "@/entities/Shift";
import { format } from "date-fns";
import { enqueueShiftDelete } from "@/components/utils/deleteQueue";

function toCSV(shifts) {
  const headers = [
    "employee_id","department_id","role_id","date","shift_code","shift_period",
    "work_status","start_time","end_time","break_minutes","notes","is_open","status","claimed_by","has_comments",
    "id","created_by","created_date","updated_date"
  ];
  const lines = [headers.join(",")];
  shifts.forEach(s => {
    const row = headers.map(h => {
      const v = s[h] ?? "";
      const val = typeof v === "string" ? v.replace(/"/g, '""') : v;
      return `"${val}"`;
    }).join(",");
    lines.push(row);
  });
  return lines.join("\n");
}

function sanitizeShiftForCreate(s) {
  // Keep only fields defined in Shift entity for create
  return {
    employee_id: s.employee_id || null, // Changed from "" to null
    department_id: s.department_id || "",
    role_id: s.role_id || null, // Changed from "" to null
    date: s.date,
    shift_code: s.shift_code || "",
    shift_period: s.shift_period || "",
    work_status: s.work_status || "",
    start_time: s.start_time || "",
    end_time: s.end_time || "",
    break_minutes: typeof s.break_minutes === "number" ? s.break_minutes : 0,
    notes: s.notes || "",
    is_open: !!s.is_open,
    status: s.status || "scheduled",
    claimed_by: s.claimed_by || "",
    has_comments: !!s.has_comments
  };
}

export default function SnapshotDialog({
  open,
  onClose,
  shifts = [],
  departments = [],
  selectedDept = "all",
  rangeStart,
  rangeEnd,
  currentUser,
  onAfterRestore
}) {
  const deptId = selectedDept === "all" ? "" : selectedDept;
  const deptName = React.useMemo(() => {
    return deptId ? (departments.find(d => d.id === deptId)?.name || "Department") : "All";
  }, [deptId, departments]);

  const scopeShifts = React.useMemo(() => {
    const s = String(rangeStart || "");
    const e = String(rangeEnd || "");
    return (shifts || []).filter(x => {
      const d = String(x.date || "");
      if (s && d < s) return false;
      if (e && d > e) return false;
      if (deptId && x.department_id !== deptId) return false;
      return true;
    });
  }, [shifts, rangeStart, rangeEnd, deptId]);

  const [name, setName] = React.useState(`Rota ${deptName} ${format(new Date(), "yyyy-MM-dd HH:mm")}`);
  const [note, setNote] = React.useState("");

  const [snapshots, setSnapshots] = React.useState([]);
  const [restoreId, setRestoreId] = React.useState("");

  // New: restoring state and progress
  const [restoring, setRestoring] = React.useState(false);
  const [restoreProgress, setRestoreProgress] = React.useState({ deleted: 0, totalToDelete: 0, created: 0, totalToCreate: 0 });

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const list = await RosterVersion.list("-created_date", 50);
      const filtered = (() => {
        // deptId is "" when "All" is selected (from parent)
        if (!deptId) {
          // Show ALL snapshots when "All" is selected (both Global and any department)
          return list || [];
        }
        // When a department is selected, show both that department and global snapshots
        return (list || []).filter(r => {
          const rid = (r.department_id || "");
          return rid === "" || rid === deptId;
        });
      })();
      setSnapshots(filtered);
      if (filtered[0]?.id) setRestoreId(filtered[0].id);
    })();
  }, [open, deptId]);

  const doCreateSnapshot = async () => {
    await RosterVersion.create({
      name,
      note,
      scope: "range",
      department_id: deptId,
      date_start: rangeStart,
      date_end: rangeEnd,
      shift_count: scopeShifts.length,
      data_json: JSON.stringify(scopeShifts),
      created_by_email: currentUser?.email || ""
    });
    onClose?.();
  };

  const doRestore = async () => {
    if (!restoreId || restoring) return; // Prevent multiple restores or restoring without ID
    setRestoring(true);
    setRestoreProgress({ deleted: 0, totalToDelete: 0, created: 0, totalToCreate: 0 });

    const snap = snapshots.find(s => s.id === restoreId);
    if (!snap) { setRestoring(false); return; }
    const data = JSON.parse(snap.data_json || "[]");

    // Fetch latest shifts to avoid deleting already-removed ones (prevents 404 spam)
    const latest = await Shift.list("-date", 5000);

    // Delete existing shifts in range for dept (using latest list to avoid stale IDs)
    const toDelete = (latest || []).filter(x => {
      const d = String(x.date || "");
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d > rangeEnd) return false;
      if (deptId && x.department_id !== deptId) return false;
      return true;
    });
    setRestoreProgress(p => ({ ...p, totalToDelete: toDelete.length }));

    for (let i = 0; i < toDelete.length; i++) {
      const s = toDelete[i];
      await enqueueShiftDelete(s.id);
      // Update progress every 5 deletions or on the last item
      if (i % 5 === 0 || i === toDelete.length - 1) {
        setRestoreProgress(p => ({ ...p, deleted: i + 1 }));
      }
    }

    // Recreate from snapshot (chunk to avoid limits)
    const recreated = data.map(sanitizeShiftForCreate);
    setRestoreProgress(p => ({ ...p, totalToCreate: recreated.length }));
    if (recreated.length > 0) {
      const chunk = 200;
      let created = 0;
      for (let i = 0; i < recreated.length; i += chunk) {
        const slice = recreated.slice(i, i + chunk);
        await Shift.bulkCreate(slice);
        created += slice.length;
        setRestoreProgress(p => ({ ...p, created }));
      }
    }

    setRestoring(false);
    onClose?.();
    onAfterRestore?.();
  };

  const doArchive = () => {
    // Download CSV
    const csv = toCSV(scopeShifts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roster_${deptName.replace(/\s+/g, "_")}_${rangeStart}_to_${rangeEnd}.csv`;
    a.click();

    // Download JSON log (metadata useful for audit)
    const audit = scopeShifts.map(s => ({
      id: s.id, date: s.date, department_id: s.department_id, employee_id: s.employee_id, role_id: s.role_id,
      shift_code: s.shift_code, status: s.status, created_by: s.created_by, created_date: s.created_date, updated_date: s.updated_date
    }));
    const jblob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" });
    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(jblob);
    a2.download = `roster_audit_${deptName.replace(/\s+/g, "_")}_${rangeStart}_to_${rangeEnd}.json`;
    a2.click();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !restoring) onClose?.(); }}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Version Snapshot</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create snapshot */}
          <div className="p-4 rounded-lg border bg-slate-50">
            <div className="font-semibold text-slate-800 mb-2">1) Create a snapshot</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Note (optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this snapshot?" />
              </div>
            </div>
            <div className="text-xs text-slate-600 mt-2">Scope: {deptName} • {rangeStart} → {rangeEnd} • Shifts: {scopeShifts.length}</div>
            <div className="mt-3">
              <Button onClick={doCreateSnapshot} className="bg-teal-600 hover:bg-teal-700">Create snapshot</Button>
            </div>
          </div>

          {/* Restore */}
          <div className="p-4 rounded-lg border bg-slate-50">
            <div className="font-semibold text-slate-800 mb-2">2) Restore from snapshot</div>
            <div className="grid sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <Label>Select snapshot</Label>
                <Select value={restoreId} onValueChange={setRestoreId} disabled={restoring}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a snapshot" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map(s => {
                      const rid = s.department_id || "";
                      const labelDept = rid
                        ? (departments.find(d => d.id === rid)?.name || "Dept")
                        : "Global";
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} • {s.shift_count || 0} shifts • {labelDept}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={doRestore} disabled={!restoreId || restoring}>
                {restoring ? "Restoring…" : "Restore selected"}
              </Button>
            </div>

            {/* Progress */}
            {restoring && (
              <div className="mt-3 text-xs text-slate-600 space-y-1">
                <div>Deleting existing: {restoreProgress.deleted}/{restoreProgress.totalToDelete}</div>
                <div>Recreating shifts: {restoreProgress.created}/{restoreProgress.totalToCreate}</div>
              </div>
            )}

            <div className="text-xs text-slate-600 mt-2">
              This replaces the current range with the snapshot data.
            </div>
          </div>

          {/* Archive */}
          <div className="p-4 rounded-lg border bg-slate-50">
            <div className="font-semibold text-slate-800 mb-2">3) Archive a copy</div>
            <p className="text-sm text-slate-700 mb-2">Downloads a CSV of the roster and a JSON audit file for the current range.</p>
            <Button variant="outline" onClick={doArchive}>Download archive files</Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => !restoring && onClose?.()} disabled={restoring}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
