
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RosterVersion } from "@/entities/RosterVersion";
import { Shift } from "@/entities/Shift";
import { withRetry, sleep } from "@/components/utils/withRetry";
import { clearCache } from "@/components/utils/cache";
import { Download, RotateCcw, Save, Upload, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function RosterVersionManager({ open, onClose, visibleRange, onRestored }) {
  const [versions, setVersions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [file, setFile] = React.useState(null);

  const loadVersions = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await withRetry(() => RosterVersion.list("-created_date", 100));
      setVersions(list || []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      setName(`Snapshot ${format(new Date(), "yyyy-MM-dd HH:mm")}`);
      setNote("");
      setFile(null);
      loadVersions();
    }
  }, [open, loadVersions]);

  // Rate-limited batch delete helper (tighter)
  const deleteIdsRateLimited = React.useCallback(async (ids, {
    concurrency = 2,                 // lowered
    perRequestDelayMs = 180,         // increased
    extraBackoffOn429Ms = 1500       // increased
  } = {}) => {
    const queue = [...ids];
    let idx = 0; // Shared index for workers to pick items

    const jitter = (n) => n + Math.floor(Math.random() * 120);

    async function worker() {
      // Loop as long as there are items in the queue that haven't been picked yet
      while (idx < queue.length) {
        const i = idx++; // Atomically get the next item index and increment global counter
        const id = queue[i];

        // Skip if ID is null, undefined, or empty string, which might happen from filter(Boolean) if some IDs were not strings
        if (!id) {
          continue;
        }

        try {
          await withRetry(() => Shift.delete(id), { retries: 5, baseDelay: 500 });
        } catch (e) {
          const status = e?.response?.status || e?.status;
          if (status === 429) {
            // If 429 (Too Many Requests), re-add the item to the end of the queue
            // and introduce an extra delay for this specific worker before it processes the next item
            await sleep(jitter(extraBackoffOn429Ms));
            queue.push(id);
            console.warn(`Encountered 429 for ID ${id}, re-queueing and backing off.`);
          } else if (status !== 404) {
            // Ignore 404s (item already gone) but warn for other errors
            console.warn("Shift delete failed (ignored)", id, status || e?.message || e);
          }
        }
        // General delay between requests from this worker to respect rate limits
        await sleep(jitter(perRequestDelayMs));
      }
    }

    // Determine how many workers to start, ensuring it's not more than the queue size or max concurrency
    const activeConcurrency = Math.min(concurrency, queue.length);
    if (activeConcurrency === 0) {
      return; // No items to process
    }

    // Start all workers concurrently
    const workers = Array.from({ length: activeConcurrency }).map(worker);
    await Promise.all(workers);
  }, []);

  const getRange = () => {
    if (visibleRange?.start && visibleRange?.end) {
      return {
        start: format(visibleRange.start, "yyyy-MM-dd"),
        end: format(visibleRange.end, "yyyy-MM-dd")
      };
    }
    // default to all-time if not provided
    return { start: "", end: "" };
  };

  const createSnapshot = async () => {
    setWorking(true);
    try {
      // Load a lot of shifts and filter client-side by date range if provided
      const all = await withRetry(() => Shift.list("-date", 5000));
      const { start, end } = getRange();
      const inRange = (!start || !end)
        ? all
        : all.filter(s => {
            const d = String(s.date || "");
            return d >= start && d <= end;
          });
      const data = inRange.map(s => ({ ...s })); // shallow copy
      const payload = {
        name: name?.trim() || `Snapshot ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
        note: note || "",
        scope: start && end ? "range" : "all",
        date_start: start || "",
        date_end: end || "",
        shift_count: data.length,
        data_json: JSON.stringify(data),
        created_by_email: "" // filled by backend automatically as created_by; but we keep this for convenience
      };
      await withRetry(() => RosterVersion.create(payload));
      await loadVersions();
    } finally {
      setWorking(false);
    }
  };

  const exportVersion = (ver) => {
    const content = ver?.data_json || "[]";
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const base = (ver?.name || "RosterSnapshot").replace(/[^a-z0-9-_]+/gi, "_");
    a.download = `${base}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const restoreFromVersion = async (ver) => {
    if (!ver) return;
    if (!confirm("Restore this version? This will replace existing shifts in its date range.")) return;
    setWorking(true);
    try {
      const data = JSON.parse(ver.data_json || "[]");
      const { date_start, date_end } = ver;
      // Load existing shifts and filter by snapshot range (or all if no range)
      const existing = await withRetry(() => Shift.list("-date", 10000));
      const toDelete = (date_start && date_end)
        ? existing.filter(s => String(s.date || "") >= String(date_start) && String(s.date || "") <= String(date_end))
        : existing;

      // Rate-limited deletes
      await deleteIdsRateLimited(toDelete.map(s => s.id).filter(Boolean), { concurrency: 2, perRequestDelayMs: 180, extraBackoffOn429Ms: 1500 });

      // Bulk create in batches
      const batchSize = 200;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map(s => {
          const { id, created_date, updated_date, created_by, ...rest } = s;
          return rest;
        });
        await withRetry(() => Shift.bulkCreate(batch), { retries: 3, baseDelay: 600 });
        await sleep(100);
      }
      clearCache("shifts"); // ensure latest shifts load
      onRestored && onRestored();
      alert("Roster restored.");
      onClose && onClose();
    } finally {
      setWorking(false);
    }
  };

  const handleFilePick = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const restoreFromFile = async () => {
    if (!file) return;
    if (!confirm("Restore from file? This replaces all existing shifts.")) return;
    setWorking(true);
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) {
        alert("Invalid file format. Expected an array of shifts.");
        return;
      }
      // Load all, then rate-limited delete
      const existing = await withRetry(() => Shift.list("-date", 10000));
      await deleteIdsRateLimited(existing.map(s => s.id).filter(Boolean), { concurrency: 2, perRequestDelayMs: 180, extraBackoffOn429Ms: 1500 });

      // create all
      const batchSize = 200;
      for (let i = 0; i < arr.length; i += batchSize) {
        const batch = arr.slice(i, i + batchSize).map(s => {
          const { id, created_date, updated_date, created_by, ...rest } = s;
          return rest;
        });
        await withRetry(() => Shift.bulkCreate(batch), { retries: 3, baseDelay: 600 });
        await sleep(100);
      }
      clearCache("shifts"); // ensure latest shifts load
      onRestored && onRestored();
      alert("Roster restored from file.");
      onClose && onClose();
    } finally {
      setWorking(false);
    }
  };

  const deleteVersion = async (ver) => {
    if (!confirm("Delete this snapshot?")) return;
    setWorking(true);
    try {
      await withRetry(() => RosterVersion.delete(ver.id));
      await loadVersions();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[840px]">
        <DialogHeader>
          <DialogTitle>Roster Version History</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-2">
              <Label>Snapshot Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Pre-October Publish" />
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Input value={`${visibleRange?.start ? format(visibleRange.start, "yyyy-MM-dd") : "ALL"} — ${visibleRange?.end ? format(visibleRange.end, "yyyy-MM-dd") : "ALL"}`} readOnly />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context for this snapshot" />
            </div>
            <div className="md:col-span-3 flex flex-wrap gap-2">
              <Button onClick={createSnapshot} disabled={working} className="gap-2">
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Create Snapshot
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Input type="file" accept=".json,application/json" onChange={handleFilePick} className="max-w-xs" />
                <Button onClick={restoreFromFile} disabled={!file || working} variant="outline" className="gap-2">
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Restore from File
                </Button>
              </div>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead className="text-right">Shifts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-500">Loading…</TableCell></TableRow>
                ) : versions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-slate-500">No snapshots yet.</TableCell></TableRow>
                ) : (
                  versions.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.date_start || "ALL"} — {v.date_end || "ALL"}</TableCell>
                      <TableCell className="text-right">{v.shift_count || JSON.parse(v.data_json || "[]").length}</TableCell>
                      <TableCell>{format(new Date(v.created_date), "yyyy-MM-dd HH:mm")}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => exportVersion(v)} className="gap-1">
                            <Download className="w-3.5 h-3.5" /> Export
                          </Button>
                          <Button size="sm" onClick={() => restoreFromVersion(v)} className="gap-1">
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteVersion(v)} className="gap-1">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
