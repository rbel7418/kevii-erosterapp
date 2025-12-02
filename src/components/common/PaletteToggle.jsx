import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { PALETTES } from "@/components/utils/colors";

/* Small swatch + label + checkbox */
export default function PaletteToggle({ enforced, onChange, paletteName = "worksite" }) {
  const palette = PALETTES[paletteName] || [];
  return (
    <div className="flex items-center gap-3 ml-auto">
      {/* Swatch preview square */}
      <div
        className="h-6 w-6 rounded-md border border-slate-300 overflow-hidden shadow-sm"
        title="Worksite color scheme"
        aria-label="Color scheme preview"
      >
        <div className="flex h-full w-full">
          {palette.slice(0, 5).map((c, i) => (
            <div key={i} className="h-full" style={{ width: "20%", backgroundColor: c }} />
          ))}
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
        <Checkbox
          id="paletteEnforced"
          checked={!!enforced}
          onCheckedChange={(v) => onChange?.(Boolean(v))}
        />
        <span>Use Worksite Colors</span>
      </label>
    </div>
  );
}