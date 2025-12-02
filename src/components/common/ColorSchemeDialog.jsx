import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SWATCH_ROWS = [
  // neutrals
  ["#000000","#1f2937","#374151","#4b5563","#6b7280","#9ca3af","#d1d5db","#e5e7eb","#f3f4f6","#ffffff"],
  // vivid
  ["#ef4444","#f97316","#f59e0b","#eab308","#22c55e","#10b981","#06b6d4","#0ea5e9","#3b82f6","#8b5cf6","#a855f7","#ec4899"],
  // pastel
  ["#fecaca","#fed7aa","#fde68a","#fef3c7","#d1fae5","#ccfbf1","#cffafe","#dbeafe","#ddd6fe","#f5d0fe","#fbcfe8","#e2e8f0"],
  // deep
  ["#991b1b","#9a3412","#92400e","#854d0e","#14532d","#065f46","#155e75","#1e3a8a","#3730a3","#4c1d95","#831843","#111827"],
];

export default function ColorSchemeDialog({ open, onClose, onApply, initialColors = [] }) {
  const [selected, setSelected] = React.useState(new Set((initialColors || []).map(c => String(c).toLowerCase())));
  const [customHex, setCustomHex] = React.useState("");

  React.useEffect(() => {
    setSelected(new Set((initialColors || []).map(c => String(c).toLowerCase())));
  }, [initialColors, open]);

  const toggle = (hex) => {
    const key = String(hex).toLowerCase();
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const addCustom = () => {
    const v = customHex.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
      const next = new Set(selected);
      next.add(v.toLowerCase());
      setSelected(next);
      setCustomHex("");
    }
  };

  const clearAll = () => setSelected(new Set());

  const list = Array.from(selected);
  const canApply = list.length >= 2;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Color scheme</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Pick at least 2 colors. Shift codes in the grid will use these colors.
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
          </div>

          <div className="space-y-3">
            {SWATCH_ROWS.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-1">
                {row.map((hex, j) => {
                  const isOn = selected.has(hex.toLowerCase());
                  return (
                    <button
                      key={`${i}-${j}`}
                      type="button"
                      title={hex}
                      className={`h-6 rounded border transition ${isOn ? "ring-2 ring-sky-500 border-transparent" : "border-slate-200 hover:scale-[1.04]"}`}
                      style={{ backgroundColor: hex }}
                      onClick={() => toggle(hex)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <div className="text-xs text-slate-500 mb-1">Custom</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="custom color"
                className="h-9 w-12 p-0 border rounded"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) {
                    const next = new Set(selected);
                    next.add(v.toLowerCase());
                    setSelected(next);
                  }
                }}
              />
              <Input
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#RRGGBB"
                className="h-9"
                onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
              />
              <Button variant="outline" onClick={addCustom} className="h-9">Add</Button>
            </div>

            {list.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {list.map((hex) => (
                  <span
                    key={hex}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                    style={{ backgroundColor: hex, color: "#ffffff", borderColor: "rgba(0,0,0,0.1)" }}
                    title={hex}
                  >
                    {hex.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply?.(list)} disabled={!canApply} className="bg-sky-600 hover:bg-sky-700">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}