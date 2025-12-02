
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PaintBucket, RefreshCw, CheckCircle2 } from "lucide-react";

// Ten creative, ready-made themes (per-user, non-destructive)
const THEMES = [
  // 1
  {
    key: "cold_forest",
    name: "Cold Forest",
    colors: {
      topbar_bg: "#0B3A46",
      topbar_text: "#FFFFFF",
      acc1: "#0ea5e9",
      acc2: "#14b8a6",
      acc3: "#64748b",
      acc4: "#f59e0b",
      acc5: "#1E88E5"
    },
    nav: { rename: { Rotas: "Schedule" } }
  },
  // 2
  {
    key: "mango_dreams",
    name: "Mango Dreams",
    colors: {
      topbar_bg: "#FF8C00",
      topbar_text: "#1F2937",
      acc1: "#FDBA74",
      acc2: "#F59E0B",
      acc3: "#EA580C",
      acc4: "#F43F5E",
      acc5: "#FDE68A"
    },
    nav: { order: ["Dashboard","Activity KPIs","Rotas","Reports","Company","Design"] }
  },
  // 3
  {
    key: "retro_summer",
    name: "Retro Summer",
    colors: {
      topbar_bg: "#0EA5A5",
      topbar_text: "#0B1324",
      acc1: "#34D399",
      acc2: "#FBBF24",
      acc3: "#FB7185",
      acc4: "#A78BFA",
      acc5: "#60A5FA"
    },
    nav: { visible: ["Dashboard","Rotas","Activity KPIs","Reports","Company","Design"] }
  },
  // 4
  {
    key: "purple_clouds",
    name: "Purple Clouds",
    colors: {
      topbar_bg: "#5B7CFA",
      topbar_text: "#FFFFFF",
      acc1: "#8B5CF6",
      acc2: "#A78BFA",
      acc3: "#C4B5FD",
      acc4: "#EC4899",
      acc5: "#F472B6"
    },
    nav: { rename: { Reports: "Insights" } }
  },
  // 5
  {
    key: "earth_brown",
    name: "Earth Brown",
    colors: {
      topbar_bg: "#8D6E63",
      topbar_text: "#FFFFFF",
      acc1: "#B08968",
      acc2: "#D4A373",
      acc3: "#6B9080",
      acc4: "#3A6D8C",
      acc5: "#264653"
    },
    nav: { order: ["Dashboard","Rotas","Reports","Company","Activity KPIs","Design"] }
  },
  // 6
  {
    key: "grayscale",
    name: "Grayscale",
    colors: {
      topbar_bg: "#374151",
      topbar_text: "#FFFFFF",
      acc1: "#D1D5DB",
      acc2: "#9CA3AF",
      acc3: "#6B7280",
      acc4: "#4B5563",
      acc5: "#111827"
    },
    nav: {}
  },
  // 7
  {
    key: "retro_toy",
    name: "Retro Toy",
    colors: {
      topbar_bg: "#F97316",
      topbar_text: "#0B1324",
      acc1: "#F59E0B",
      acc2: "#EF4444",
      acc3: "#22C55E",
      acc4: "#3B82F6",
      acc5: "#A855F7"
    },
    nav: { rename: { Reports: "Playbook" } }
  },
  // 8
  {
    key: "purple_mint",
    name: "Purple Mint",
    colors: {
      topbar_bg: "#6D28D9",
      topbar_text: "#FFFFFF",
      acc1: "#8B5CF6",
      acc2: "#D946EF",
      acc3: "#34D399",
      acc4: "#A7F3D0",
      acc5: "#10B981"
    },
    nav: {}
  },
  // 9
  {
    key: "gold_rush",
    name: "Gold Rush",
    colors: {
      topbar_bg: "#B45309",
      topbar_text: "#111827",
      acc1: "#F59E0B",
      acc2: "#FCD34D",
      acc3: "#92400E",
      acc4: "#0EA5E9",
      acc5: "#1E3A8A"
    },
    nav: { order: ["Dashboard","Rotas","Company","Reports","Activity KPIs","Design"] }
  },
  // 10
  {
    key: "steel_night",
    name: "Steel Night",
    colors: {
      topbar_bg: "#0F172A",
      topbar_text: "#E2E8F0",
      acc1: "#334155",
      acc2: "#64748B",
      acc3: "#94A3B8",
      acc4: "#22D3EE",
      acc5: "#2563EB"
    },
    nav: {}
  }
];

function PreviewBar({ colors }) {
  const keys = ["acc1","acc2","acc3","acc4","acc5"];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded">
      {keys.map((k) => (
        <div key={k} style={{ backgroundColor: colors[k], width: "20%" }} />
      ))}
    </div>
  );
}

export default function NativeThemePicker() {
  const [selected, setSelected] = React.useState(() => {
    try {
      const cur = JSON.parse(localStorage.getItem("native_theme_override") || "null");
      return cur?.key || null;
    } catch { return null; }
  });
  const [applying, setApplying] = React.useState(false);

  // Updated: accept optional boolean to force state based on checkbox value
  const choose = (key, forceChecked) => {
    setSelected(prev => {
      if (typeof forceChecked === "boolean") {
        return forceChecked ? key : (prev === key ? null : prev);
      }
      return prev === key ? null : key;
    });
  };

  const apply = () => {
    if (!selected) return;
    const base = THEMES.find(t => t.key === selected);
    if (!base) return;
    const theme = { ...base, is_native: true };
    setApplying(true);
    try {
      localStorage.setItem("native_theme_override", JSON.stringify(theme));
      // Clear any global chip color so palette takes over
      document.documentElement.style.removeProperty("--shiftchip-color");
      try { window.dispatchEvent(new CustomEvent("shiftchip-color-changed", { detail: "" })); } catch {}
      // Live-apply without touching org settings
      window.dispatchEvent(new CustomEvent("theme-updated", { detail: { theme } }));
    } finally {
      setApplying(false);
    }
  };

  const reset = () => {
    setApplying(true);
    try {
      localStorage.removeItem("native_theme_override");
      // Ask layout to re-apply org theme (passing null)
      window.dispatchEvent(new CustomEvent("theme-updated", { detail: { theme: null } }));
      setSelected(null);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <PaintBucket className="w-4 h-4 text-sky-600" />
          Curated Native Themes
        </CardTitle>
        {selected && (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Selected
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stacked list for fun/engaging selection */}
        <div className="grid grid-cols-1 gap-3">
          {THEMES.map(t => {
            const checked = selected === t.key;
            const checkboxId = `theme-${t.key}`;
            return (
              <div
                key={t.key}
                className={`border rounded-lg p-3 transition hover:shadow-sm cursor-pointer ${checked ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-200"}`}
                role="button"
                tabIndex={0}
                onClick={() => choose(t.key)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(t.key); } }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.name}</div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={checkboxId} className="text-xs text-slate-600 cursor-pointer">Select</label>
                    <Checkbox
                      id={checkboxId}
                      checked={checked}
                      onCheckedChange={(v) => choose(t.key, v === true)}
                      disabled={applying}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <PreviewBar colors={t.colors} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={apply} disabled={!selected || applying} className="bg-sky-600 hover:bg-sky-700">
            {applying ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <PaintBucket className="w-4 h-4 mr-2" />}
            Apply theme
          </Button>
          <Button variant="outline" onClick={reset} disabled={applying} className="border-red-200 text-red-600 hover:bg-red-50">
            Reset
          </Button>
          <div className="text-xs text-slate-500">
            Applied per user; doesn’t change shift rules or org settings.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
