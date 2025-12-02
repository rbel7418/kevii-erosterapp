import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const SWATCHES = [
  // neutrals
  ["#000000","#1f2937","#374151","#4b5563","#6b7280","#9ca3af","#d1d5db","#e5e7eb","#f3f4f6","#ffffff"],
  // vivid row
  ["#ef4444","#f97316","#f59e0b","#eab308","#22c55e","#10b981","#06b6d4","#0ea5e9","#3b82f6","#8b5cf6","#a855f7","#ec4899"],
  // pastel row
  ["#fecaca","#fed7aa","#fde68a","#fef3c7","#d1fae5","#ccfbf1","#cffafe","#dbeafe","#ddd6fe","#f5d0fe","#fbcfe8","#e2e8f0"],
  // deep row
  ["#991b1b","#9a3412","#92400e","#854d0e","#14532d","#065f46","#155e75","#1e3a8a","#3730a3","#4c1d95","#831843","#111827"],
];

export default function ColorPickerPopover({ children, onSelect, onReset }) {
  const [open, setOpen] = React.useState(false);
  const handlePick = (hex) => {
    onSelect?.(hex);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-slate-700 text-sm">Pick color</div>
          <Button variant="ghost" size="sm" onClick={() => { onReset?.(); setOpen(false); }}>
            Reset
          </Button>
        </div>
        <div className="space-y-2">
          {SWATCHES.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-1">
              {row.map((hex, j) => (
                <button
                  key={j}
                  aria-label={`color ${hex}`}
                  className="h-5 rounded border border-slate-200 hover:scale-[1.08] transition"
                  style={{ backgroundColor: hex }}
                  onClick={() => handlePick(hex)}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-500 block mb-1">Custom</label>
          <div className="flex gap-2">
            <input
              type="color"
              onChange={(e) => handlePick(e.target.value)}
              className="h-8 w-12 p-0 border rounded"
              aria-label="custom color"
            />
            <input
              type="text"
              placeholder="#RRGGBB"
              className="flex-1 h-8 px-2 border rounded text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = e.currentTarget.value.trim();
                  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) handlePick(v);
                }
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}