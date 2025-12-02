
import React from "react";
import { ShiftCode } from "@/entities/ShiftCode";
import { withRetry, sleep } from "@/components/utils/withRetry";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Save, Search, PaintBucket } from "lucide-react";
import ShiftCodeQuickDialog from "./ShiftCodeQuickDialog";

function Row({ sc, pending, value, onChange, onSave, onReset, onOpenDialog }) {
  const color = value ?? sc.color ?? "#0ea5a5";
  return (
    <div className="bg-stone-50 px-3 py-2 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
      <div className="min-w-0">
        <button
          className="font-medium text-slate-900 hover:underline text-left"
          onClick={() => onOpenDialog(sc)}
          title="Edit shift code details">
          
          {sc.code}
        </button>
        <div className="text-gray-800 opacity-100 truncate">{sc.descriptor || "—"}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-950 text-sm font-semibold">Color</span>
          <input
            type="color"
            className="h-8 w-10 rounded border"
            value={color}
            onChange={(e) => onChange(sc.id, e.target.value)}
            aria-label={`Pick color for ${sc.code}`}
            title={`Pick color for ${sc.code}`}
            disabled={pending} />
          
          <div className="h-8 w-12 rounded border" style={{ backgroundColor: color }} />
        </div>
        <Button size="sm" onClick={() => onSave(sc)} disabled={pending} className="gap-1 h-8">
          {pending ? "Saving…" : <><Save className="w-4 h-4" /> Save</>}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onReset(sc)} disabled={pending} className="h-8">
          Reset
        </Button>
      </div>
    </div>);

}

export default function ShiftCodeColorManager() {
  const [codes, setCodes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [drafts, setDrafts] = React.useState({}); // {id: "#hex"}
  const [savingId, setSavingId] = React.useState(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogSC, setDialogSC] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await withRetry(() => ShiftCode.list());
      setCodes(list || []);
      // Clear drafts for codes that are no longer in the list or have been reset
      setDrafts((prevDrafts) => {
        const newDrafts = {};
        list.forEach((sc) => {
          if (prevDrafts[sc.id]) {
            newDrafts[sc.id] = prevDrafts[sc.id];
          }
        });
        return newDrafts;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {load();}, [load]);

  const onChangeColor = (id, hex) => {
    setDrafts((m) => ({ ...m, [id]: hex }));
  };

  const saveOne = async (sc, explicitColor = undefined) => {// Added explicitColor param
    const hex = explicitColor !== undefined ? explicitColor : drafts[sc.id] ?? sc.color ?? "";
    setSavingId(sc.id);
    try {
      await withRetry(() => ShiftCode.update(sc.id, { color: hex }));
    } finally {
      setSavingId(null);
    }
    await load();
    try {window.dispatchEvent(new CustomEvent("shiftcode-updated", { detail: { id: sc.id, color: hex } }));} catch (e) {/* ignore */}
  };

  const resetOne = async (sc) => {
    setSavingId(sc.id);
    try {
      await withRetry(() => ShiftCode.update(sc.id, { color: "" }));
    } finally {
      setSavingId(null);
    }
    await load();
    try {window.dispatchEvent(new CustomEvent("shiftcode-updated", { detail: { id: sc.id, color: "" } }));} catch (e) {/* ignore */}
    setDrafts((m) => {
      const n = { ...m };
      delete n[sc.id];
      return n;
    });
  };

  const openDialog = (sc) => {
    setDialogSC(sc);
    setDialogOpen(true);
  };

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter((c) =>
    c.code?.toLowerCase().includes(q) ||
    c.descriptor?.toLowerCase().includes(q)
    );
  }, [codes, filter]);

  const changedIds = React.useMemo(() => {
    return Object.keys(drafts).filter((id) => {
      const sc = codes.find((x) => x.id === id);
      if (!sc) return false;
      const next = drafts[id];
      const cur = sc.color || "";
      return (next || "") !== cur;
    });
  }, [drafts, codes]);

  const saveAll = async () => {
    if (changedIds.length === 0) return;
    setBulkBusy(true);
    try {
      for (const id of changedIds) {
        const sc = codes.find((x) => x.id === id);
        if (!sc) continue;
        const hex = drafts[id] ?? sc.color ?? "";
        await withRetry(() => ShiftCode.update(id, { color: hex }));
        await sleep(150); // gentle pacing to avoid 429s
      }
      await load();
      try {window.dispatchEvent(new CustomEvent("shiftcode-updated", { detail: { batch: changedIds } }));} catch (e) {/* ignore */}
    } finally {
      setBulkBusy(false);
    }
  };

  const autoAssignPalette = async () => {
    // Simple rainbow rotation across visible filtered codes
    setBulkBusy(true);
    try {
      const PALETTE = [
      "#E53935", "#F4511E", "#FB8C00", "#FDD835", "#C0CA33", "#7CB342", "#43A047", "#00897B",
      "#00ACC1", "#1E88E5", "#3949AB", "#5E35B1", "#8E24AA", "#D81B60", "#E91E63", "#EC407A",
      "#FF7043", "#FFA726", "#FFD54F", "#D4E157", "#9CCC65", "#66BB6A", "#26A69A", "#26C6DA",
      "#29B6F6", "#42A5F5", "#5C6BC0", "#7E57C2", "#AB47BC", "#8D6E63", "#FF8A65", "#FBC02D"];


      const list = filtered.slice().sort((a, b) => a.code.localeCompare(b.code));
      for (let i = 0; i < list.length; i++) {
        const sc = list[i];
        const hex = PALETTE[i % PALETTE.length];
        await withRetry(() => ShiftCode.update(sc.id, { color: hex }));
        await sleep(120);
      }
      await load();
      try {window.dispatchEvent(new CustomEvent("shiftcode-updated", { detail: { palette: "spectrum" } }));} catch (e) {/* ignore */}
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200 rounded-md">
      <CardHeader className="border-b py-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Shift Code Colors</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search code or description"
                className="pl-7 h-8 w-64" />
              
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading || bulkBusy} className="gap-1 h-8">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button size="sm" onClick={saveAll} disabled={changedIds.length === 0 || bulkBusy} className="gap-1 h-8">
              <Save className="w-4 h-4" /> Save all ({changedIds.length})
            </Button>
            <Button variant="outline" size="sm" onClick={autoAssignPalette} disabled={bulkBusy || filtered.length === 0} className="gap-1 h-8">
              <PaintBucket className="w-4 h-4" /> Auto-assign
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="mr-64 ml-64 pt-3 pr-32 pb-3 pl-32">
        <div className="mb-2 text-xs text-slate-600">
          Tip: Night shifts will appear darker automatically on the grid; OFF/AL keep their own styles.
        </div>

        {loading ?
        <div className="p-4 text-sm text-slate-500">Loading…</div> :
        filtered.length === 0 ?
        <div className="p-4 text-sm text-slate-500">No shift codes found.</div> :

        <div className="space-y-1">
            {filtered.map((sc) =>
          <Row
            key={sc.id}
            sc={sc}
            pending={savingId === sc.id || bulkBusy}
            value={drafts[sc.id]}
            onChange={onChangeColor}
            onSave={saveOne}
            onReset={resetOne}
            onOpenDialog={openDialog} />

          )}
          </div>
        }

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Changes are saved per code or all at once. Updates apply instantly across the roster.
          </div>
          <Badge variant="outline" className="text-xs">
            {codes.length} codes
          </Badge>
        </div>
      </CardContent>

      {dialogOpen &&
      <ShiftCodeQuickDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setDialogSC(null); // Clear the dialogSC when closing
        }}
        shiftCode={dialogSC}
        onSave={async (hex) => {
          if (!dialogSC) return;
          setDialogOpen(false);
          // Save the color update via saveOne, passing the explicit hex
          await saveOne(dialogSC, hex);
          // Reflect draft immediately for visual continuity if the user chose a color in dialog
          setDrafts((m) => ({ ...m, [dialogSC.id]: hex }));
        }} />

      }
    </Card>);

}