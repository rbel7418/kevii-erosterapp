import React from "react";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Palette } from "lucide-react";

// OKLCH Tailwind v4 Based Color Schemes
// Using proper hex conversions from the OKLCH values you provided
const COLOR_SCHEMES = {
  classic: {
    name: "Classic",
    description: "Balanced professional palette",
    colors: [
      "#16a34a", // green-600
      "#0ea5e9", // sky-500
      "#8b5cf6", // violet-500
      "#22c55e", // green-500
      "#f59e0b", // amber-500
      "#ef4444", // red-500
      "#06b6d4", // cyan-500
      "#64748b", // slate-500
      "#14b8a6", // teal-500
      "#f97316"  // orange-500
    ]
  },
  warm: {
    name: "Warm Tones",
    description: "Reds, oranges, ambers from OKLCH",
    colors: [
      "#dc2626", // red-600
      "#ea580c", // orange-600
      "#f59e0b", // amber-600
      "#facc15", // yellow-400
      "#fb923c", // orange-400
      "#ef4444", // red-500
      "#f97316", // orange-500
      "#fbbf24", // amber-400
      "#fde047", // yellow-300
      "#fb7185"  // rose-400
    ]
  },
  cool: {
    name: "Cool Tones",
    description: "Blues, cyans, teals from OKLCH",
    colors: [
      "#0891b2", // cyan-600
      "#3b82f6", // blue-500
      "#0ea5e9", // sky-500
      "#14b8a6", // teal-600
      "#2dd4bf", // teal-400
      "#22d3ee", // cyan-400
      "#60a5fa", // blue-400
      "#38bdf8", // sky-400
      "#06b6d4", // cyan-500
      "#0284c7"  // sky-600
    ]
  },
  nature: {
    name: "Nature",
    description: "Greens, limes, emeralds from OKLCH",
    colors: [
      "#16a34a", // green-600
      "#22c55e", // green-500
      "#84cc16", // lime-500
      "#10b981", // emerald-500
      "#a3e635", // lime-400
      "#bef264", // lime-300
      "#86efac", // green-300
      "#4ade80", // green-400
      "#6ee7b7", // emerald-300
      "#34d399"  // emerald-400
    ]
  },
  vibrant: {
    name: "Vibrant",
    description: "High saturation spectrum from OKLCH",
    colors: [
      "#0ea5e9", // sky-500
      "#06b6d4", // cyan-500
      "#eab308", // yellow-500
      "#f97316", // orange-500
      "#ec4899", // pink-500
      "#a855f7", // purple-500
      "#e11d48", // rose-600
      "#f43f5e", // rose-500
      "#db2777", // pink-600
      "#c026d3"  // fuchsia-600
    ]
  },
  pastel: {
    name: "Pastel",
    description: "Soft muted tones from OKLCH 100-200 range",
    colors: [
      "#dbeafe", // blue-100
      "#d1fae5", // emerald-100
      "#fee2e2", // red-100
      "#fed7aa", // orange-100
      "#e9d5ff", // purple-100
      "#99f6e4", // teal-100
      "#fce7f3", // pink-100
      "#c7d2fe", // indigo-100
      "#dcfce7", // green-100
      "#fef3c7"  // amber-100
    ]
  },
  purple_spectrum: {
    name: "Purple Spectrum",
    description: "Violets, purples, fuchsias from OKLCH",
    colors: [
      "#8b5cf6", // violet-500
      "#a855f7", // purple-500
      "#9333ea", // purple-600
      "#c084fc", // purple-400
      "#a78bfa", // violet-400
      "#7c3aed", // violet-600
      "#6d28d9", // violet-700
      "#5b21b6", // violet-800
      "#e879f9", // fuchsia-400
      "#d946ef"  // fuchsia-500
    ]
  },
  ocean: {
    name: "Ocean",
    description: "Deep blues and teals from OKLCH 500-700",
    colors: [
      "#0c4a6e", // sky-900
      "#0e7490", // cyan-700
      "#155e75", // cyan-800
      "#164e63", // cyan-900
      "#1e40af", // blue-700
      "#14b8a6", // teal-600
      "#0d9488", // teal-700
      "#0f766e", // teal-800
      "#0891b2", // cyan-600
      "#0369a1"  // sky-700
    ]
  },
  sunset: {
    name: "Sunset",
    description: "Warm gradient from OKLCH red-orange-yellow",
    colors: [
      "#dc2626", // red-600
      "#ea580c", // orange-600
      "#f59e0b", // amber-600
      "#facc15", // yellow-400
      "#fb923c", // orange-400
      "#f97316", // orange-500
      "#ef4444", // red-500
      "#ec4899", // pink-500
      "#db2777", // pink-600
      "#a855f7"  // purple-500
    ]
  },
  forest: {
    name: "Forest",
    description: "Earth tones from OKLCH green-lime-stone",
    colors: [
      "#10b981", // emerald-500
      "#84cc16", // lime-500
      "#86efac", // green-300
      "#a3e635", // lime-400
      "#78716c", // stone-500
      "#57534e", // stone-600
      "#44403c", // stone-700
      "#292524", // stone-800
      "#a8a29e", // stone-400
      "#d6d3d1"  // stone-300
    ]
  },
  monochrome: {
    name: "Monochrome",
    description: "Grays and neutrals from OKLCH slate scale",
    colors: [
      "#0f172a", // slate-900
      "#1e293b", // slate-800
      "#334155", // slate-700
      "#475569", // slate-600
      "#64748b", // slate-500
      "#94a3b8", // slate-400
      "#cbd5e1", // slate-300
      "#e2e8f0", // slate-200
      "#f1f5f9", // slate-100
      "#f8fafc"  // slate-50
    ]
  },
  spectrum: {
    name: "Full Spectrum",
    description: "Rainbow from OKLCH hue rotation",
    colors: [
      "#dc2626", // red-600
      "#f59e0b", // amber-600
      "#facc15", // yellow-400
      "#84cc16", // lime-500
      "#14b8a6", // teal-600
      "#0891b2", // cyan-600
      "#3b82f6", // blue-500
      "#6366f1", // indigo-500
      "#a855f7", // purple-500
      "#db2777"  // pink-600
    ]
  },
  clinical: {
    name: "Clinical",
    description: "Professional healthcare palette from OKLCH",
    colors: [
      "#0ea5e9", // sky-500 - trust
      "#10b981", // emerald-500 - health
      "#f59e0b", // amber-500 - caution
      "#ef4444", // red-500 - urgent
      "#64748b", // slate-500 - neutral
      "#06b6d4", // cyan-500 - clean
      "#8b5cf6", // violet-500 - specialty
      "#ec4899", // pink-500 - care
      "#14b8a6", // teal-500 - calm
      "#6366f1"  // indigo-500 - precision
    ]
  },
  night_shift: {
    name: "Night Shift",
    description: "Darker tones from OKLCH 600-800 range",
    colors: [
      "#1e40af", // blue-700
      "#7c2d12", // orange-900
      "#065f46", // emerald-800
      "#831843", // pink-900
      "#6b21a8", // purple-800
      "#0e7490", // cyan-700
      "#b91c1c", // red-700
      "#0f766e", // teal-800
      "#4c1d95", // violet-900
      "#1e293b"  // slate-800
    ]
  },
  spring: {
    name: "Spring",
    description: "Fresh pastels from OKLCH 200-400",
    colors: [
      "#bfdbfe", // blue-200
      "#bbf7d0", // green-200
      "#fecaca", // red-200
      "#fed7aa", // orange-200
      "#e9d5ff", // purple-200
      "#a5f3fc", // cyan-200
      "#fbcfe8", // pink-200
      "#c7d2fe", // indigo-200
      "#d9f99d", // lime-200
      "#fef08a"  // yellow-200
    ]
  }
};

export default function ShiftCodeColorSchemeSelector() {
  const [user, setUser] = React.useState(null);
  const [selectedScheme, setSelectedScheme] = React.useState("classic");
  const [applying, setApplying] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setUser(u);
        // Read current scheme from user settings
        const currentScheme = u?.settings?.ui?.color_scheme || "classic";
        setSelectedScheme(currentScheme);
      } catch (e) {
        console.error("Failed to load user", e);
      }
    })();
  }, []);

  const applyScheme = async (schemeKey) => {
    setApplying(true);
    try {
      const scheme = COLOR_SCHEMES[schemeKey];
      if (!scheme) return;

      // Import colors utility to set custom palette
      const { setCustomPalette } = await import("@/components/utils/colors");
      setCustomPalette(scheme.colors);

      // Save to user settings
      const next = {
        ...(user?.settings || {}),
        ui: {
          ...(user?.settings?.ui || {}),
          color_scheme: schemeKey,
          shiftchip_palette: scheme.colors,
          shiftchip_color: "" // Clear any single color override
        }
      };

      await User.updateMyUserData({ settings: next });
      setUser({ ...user, settings: next });
      setSelectedScheme(schemeKey);

      // Dispatch event to refresh shift chips
      try {
        window.dispatchEvent(new CustomEvent("shiftchip-palette-changed"));
      } catch (e) {}

      alert(`✅ "${scheme.name}" color scheme applied successfully!`);
    } catch (error) {
      console.error("Failed to apply scheme", error);
      alert("❌ Failed to apply color scheme");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200 rounded-md">
      <CardHeader className="border-b py-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="w-4 h-4 text-purple-600" />
          Personal Color Schemes (Tailwind v4 OKLCH)
          <Badge variant="outline" className="ml-2 text-xs">User Preference</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="mb-3 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded p-2">
          <strong>💡 Tip:</strong> These schemes use Tailwind v4 OKLCH colors for perceptually uniform, accessible palettes. Each user can choose their own.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(COLOR_SCHEMES).map(([key, scheme]) => {
            const isActive = selectedScheme === key;
            return (
              <button
                key={key}
                onClick={() => applyScheme(key)}
                disabled={applying}
                className={`relative p-3 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                  isActive 
                    ? "border-purple-500 bg-purple-50 shadow-md" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-5 h-5 text-purple-600" />
                  </div>
                )}
                
                <div className="mb-2">
                  <div className="font-semibold text-sm text-slate-900">{scheme.name}</div>
                  <div className="text-[11px] text-slate-500">{scheme.description}</div>
                </div>

                <div className="flex gap-1 flex-wrap">
                  {scheme.colors.slice(0, 10).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 rounded border border-slate-300"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                {isActive && (
                  <div className="mt-2">
                    <Badge className="bg-purple-600 text-white text-[10px]">Active</Badge>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-md text-xs text-slate-600">
          <div className="font-semibold mb-1">How it works:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>All colors derived from Tailwind v4 OKLCH palette for consistent perceptual brightness</li>
            <li>Each shift code is assigned a color from your chosen scheme in round-robin</li>
            <li>Your selection is saved to your profile and applies instantly</li>
            <li>Other users' views are not affected by your choice</li>
            <li>Night shifts automatically appear darker regardless of scheme</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}