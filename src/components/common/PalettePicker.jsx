import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { PALETTES, getActivePaletteVariant } from "@/components/utils/colors";

function PaletteChoice({ name, colors, checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="h-6 w-6 rounded-md border border-slate-300 overflow-hidden shadow-sm"
        onClick={() => onChange(name, !checked)}
        aria-label={`${name} palette`}
        title={`${name} palette`}
      >
        <div className="flex h-full w-full">
          {colors.slice(0, 5).map((c, i) => (
            <div key={i} className="h-full" style={{ width: "20%", backgroundColor: c }} />
          ))}
        </div>
      </button>
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(name, Boolean(v))}
        aria-label={`select ${name}`}
      />
    </div>
  );
}

export default function PalettePicker({ selectedName, onSelect }) {
  const choices = [
    { name: "ocean", colors: PALETTES.ocean },
    { name: "pastel", colors: PALETTES.pastel },
    { name: "vibrant", colors: PALETTES.vibrant },
  ];

  const handleChange = (name, willCheck) => {
    if (willCheck) {
      if (selectedName === name) {
        onSelect?.({ name, cycle: true });
      } else {
        onSelect?.({ name, cycle: false });
      }
    } else if (selectedName === name) {
      onSelect?.(null);
    }
  };

  // Rotate preview to reflect current variant when selected
  const variant = typeof getActivePaletteVariant === "function" ? getActivePaletteVariant() : 0;
  const previewColors = (name, colors) => {
    if (selectedName !== name || !colors?.length) return colors;
    const n = colors.length;
    const off = ((variant % n) + n) % n;
    return [...colors.slice(off), ...colors.slice(0, off)];
    };

  return (
    <div className="flex items-center gap-4">
      {choices.map(({ name, colors }) => (
        <PaletteChoice
          key={name}
          name={name}
          colors={previewColors(name, colors)}
          checked={selectedName === name}
          onChange={handleChange}
        />
      ))}
    </div>
  );
}