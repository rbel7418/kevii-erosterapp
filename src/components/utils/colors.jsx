/* Runtime palette support with two palettes and a setter/getter */
const WORKSITE_PALETTE = [
  "#00C2A8", // teal
  "#5B7CFA", // blue
  "#B77EE3", // purple
  "#9DB5A3", // sage
  "#35B5D8", // sky
  "#FFA31A", // orange
  "#D6531E", // red-orange
  "#FF6F61", // coral
  "#0E7184", // deep teal
  "#E41355"  // magenta
];

// Classic palette (subtle, balanced)
const CLASSIC_PALETTE = [
  "#16a34a", // green
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#22c55e", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#64748b", // slate
  "#14b8a6", // teal
  "#f97316"  // orange
];

// Append three new palettes based on the provided images
const OCEAN_PALETTE = ["#0B3A46", "#6CA8BE", "#2E6678", "#2D7AA1", "#9CCAD9"];
const PASTEL_PALETTE = ["#CBE5F4", "#D9F2E8", "#FFE0E0", "#F7CFB3", "#DDCBF7"];
const VIBRANT_PALETTE = ["#1E6693", "#15B4DF", "#FFC400", "#F3655E", "#EE4E90"];

// Add a broad spectrum palette inspired by the reference chart (ordered red -> purple)
const SPECTRUM_PALETTE = [
  "#E53935","#F4511E","#FB8C00","#FDD835","#C0CA33","#7CB342","#43A047","#00897B",
  "#00ACC1","#1E88E5","#3949AB","#5E35B1","#8E24AA","#D81B60","#E91E63","#EC407A",
  "#FF7043","#FFA726","#FFD54F","#D4E157","#9CCC65","#66BB6A","#26A69A","#26C6DA",
  "#29B6F6","#42A5F5","#5C6BC0","#7E57C2","#AB47BC","#8D6E63","#FF8A65","#FBC02D",
  "#AED581","#81C784","#4DB6AC","#4FC3F7","#64B5F6","#7986CB","#9575CD","#BA68C8"
];

export const PALETTES = {
  classic: CLASSIC_PALETTE,
  worksite: WORKSITE_PALETTE,
  ocean: OCEAN_PALETTE,
  pastel: PASTEL_PALETTE,
  vibrant: VIBRANT_PALETTE,
  spectrum: SPECTRUM_PALETTE
};

// Change default active palette to 'classic' for a professional look
let activePaletteName = "classic";
let ACTIVE_PALETTE = PALETTES[activePaletteName];
let activePaletteVariant = 0; // rotation offset
let CUSTOM_PALETTE = null; // array of hex strings or null

export function setActivePaletteName(name = "classic") {
  const key = (name in PALETTES) ? name : "classic";
  activePaletteName = key;
  ACTIVE_PALETTE = PALETTES[key];
  try { window.dispatchEvent(new CustomEvent("shiftchip-palette-changed")); } catch {}
}

export function setActivePaletteVariant(variant = 0) {
  // accept any integer; normalize later when used
  activePaletteVariant = Number.isFinite(variant) ? Math.floor(variant) : 0;
  try { window.dispatchEvent(new CustomEvent("shiftchip-palette-changed")); } catch {}
}

export function getActivePaletteVariant() {
  return activePaletteVariant || 0;
}

export function getActivePaletteName() {
  return activePaletteName;
}

export function setCustomPalette(colors) {
  if (Array.isArray(colors) && colors.length >= 2) {
    CUSTOM_PALETTE = colors.map(String);
    activePaletteName = "custom";
    ACTIVE_PALETTE = CUSTOM_PALETTE;
  } else {
    CUSTOM_PALETTE = null;
    if (activePaletteName === "custom") {
      activePaletteName = "classic"; // Revert to classic if custom was active
    }
    ACTIVE_PALETTE = PALETTES[activePaletteName] || PALETTES.classic;
  }
  try { window.dispatchEvent(new CustomEvent("shiftchip-palette-changed")); } catch {}
}

export function getCustomPalette() {
  return Array.isArray(CUSTOM_PALETTE) ? CUSTOM_PALETTE : null;
}

// Simple string hash to make color selection consistent per code
function hashString(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) {
    h = (h << 5) - h + String(str).charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorForCode(code) {
  // Always use a non-empty palette; fall back to 'classic' if anything is wrong
  const palette = (Array.isArray(ACTIVE_PALETTE) && ACTIVE_PALETTE.length)
    ? ACTIVE_PALETTE
    : PALETTES.classic;
  if (!code) return "#0d9488";
  
  const baseHash = hashString(String(code).toUpperCase());
  // Apply the variant as an offset to the hash before modulo,
  // ensuring the result is always non-negative within the palette length.
  const rawIndex = baseHash + activePaletteVariant;
  const idx = ((rawIndex % palette.length) + palette.length) % palette.length;

  return palette[idx];
}

// Lightweight color mix helpers to create bright pastel backgrounds from existing palette
function hexToRgb(hex) {
  const v = hex.replace("#", "");
  const bigint = parseInt(v.length === 3 ? v.split("").map(c => c + c).join("") : v, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// CHANGED: export mixHex so layout can derive surfaces/borders from accents
export function mixHex(a, b = "#ffffff", ratio = 0.85) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  const r = Math.round(ra.r * (1 - ratio) + rb.r * ratio);
  const g = Math.round(ra.g * (1 - ratio) + rb.g * ratio);
  const bl = Math.round(ra.b * (1 - ratio) + rb.b * ratio);
  return rgbToHex({ r, g, b: bl });
}

export function pastelForCode(code) {
  const base = colorForCode(code);
  return mixHex(base, "#ffffff", 0.73);
}

// Choose readable text (white or dark) for a given background color
export function textColorForBg(hex) {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#0b1324" : "#ffffff";
}

// Darken a hex color by a factor (0..1)
export function darkenHex(hex, amount = 0.2) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (n) => Math.max(0, Math.min(255, n));
  return rgbToHex({
    r: clamp(Math.round(r * (1 - amount))),
    g: clamp(Math.round(g * (1 - amount))),
    b: clamp(Math.round(b * (1 - amount))),
  });
}