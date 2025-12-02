import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { colorForCode, textColorForBg, darkenHex, getActivePaletteName, getActivePaletteVariant, getCustomPalette, PALETTES } from "@/components/utils/colors";
import { Input } from "@/components/ui/input";
import { ShiftCode, Shift } from "@/entities/all";
import { ArrowRightCircle, Handshake } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { withRetry } from "@/components/utils/withRetry";
import { enqueueShiftDelete } from "@/components/utils/deleteQueue";
// Pencil icon is no longer used in the redesigned menu items
import ShiftCommentsDialog from "./ShiftCommentsDialog";
import { User } from "@/entities/User";

// Decide text size for shift code display (forced to 9px as requested)
function sizeFor() {
  return "text-[9px]";
}

// Simple module-level cache to avoid repeated API calls
let SHIFT_CODES_CACHE = null;
// Share a single in-flight promise across all instances to prevent bursts
let SHIFT_CODES_INFLIGHT = null;
let CACHE_TIMESTAMP = 0;
const CACHE_TTL = 60_000; // 60 seconds cache

// New: allow forcing a refresh when Settings updates a color
export function invalidateShiftCodesCache() {
  SHIFT_CODES_CACHE = null;
  CACHE_TIMESTAMP = 0;
}

// --- Event Optimization System ---
// prevents 1000s of event listeners when grid is large
const GLOBAL_LISTENERS = {
  color: new Set(),
  theme: new Set(),
  palette: new Set(),
  codeUpdate: new Set()
};
let globalListenersAttached = false;

function attachGlobalListeners() {
  if (globalListenersAttached || typeof window === 'undefined') return;
  
  window.addEventListener("shiftchip-color-changed", () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--shiftchip-color") || "";
    const val = v.trim();
    GLOBAL_LISTENERS.color.forEach(cb => cb(val));
  });

  window.addEventListener("theme-updated", () => {
    const val = document.documentElement.getAttribute("data-native-theme") === "1";
    GLOBAL_LISTENERS.theme.forEach(cb => cb(val));
  });

  window.addEventListener("shiftchip-palette-changed", () => {
    GLOBAL_LISTENERS.palette.forEach(cb => cb());
  });
  
  window.addEventListener("shiftcode-updated", () => {
    GLOBAL_LISTENERS.codeUpdate.forEach(cb => cb());
  });

  globalListenersAttached = true;
}

function useGlobalColor() {
  const [val, setVal] = React.useState("");
  React.useEffect(() => {
    // Initial read
    const v = getComputedStyle(document.documentElement).getPropertyValue("--shiftchip-color") || "";
    setVal(v.trim());
    
    attachGlobalListeners();
    GLOBAL_LISTENERS.color.add(setVal);
    return () => GLOBAL_LISTENERS.color.delete(setVal);
  }, []);
  return val;
}

function useNativeTheme() {
  const [val, setVal] = React.useState(false);
  React.useEffect(() => {
    // Initial read
    setVal(document.documentElement.getAttribute("data-native-theme") === "1");

    attachGlobalListeners();
    GLOBAL_LISTENERS.theme.add(setVal);
    return () => GLOBAL_LISTENERS.theme.delete(setVal);
  }, []);
  return val;
}

function usePaletteTick() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    attachGlobalListeners();
    const cb = () => setTick(t => t + 1);
    GLOBAL_LISTENERS.palette.add(cb);
    return () => GLOBAL_LISTENERS.palette.delete(cb);
  }, []);
  return tick;
}

function useShiftCodeUpdate(callback) {
  const savedCallback = React.useRef(callback);
  React.useEffect(() => { savedCallback.current = callback; }, [callback]);
  
  React.useEffect(() => {
    attachGlobalListeners();
    const cb = () => savedCallback.current?.();
    GLOBAL_LISTENERS.codeUpdate.add(cb);
    return () => GLOBAL_LISTENERS.codeUpdate.delete(cb);
  }, []);
}
// ---------------------------------

async function getShiftCodesCached(force = false) {
  const now = Date.now();
  const cacheValid = CACHE_TIMESTAMP && (now - CACHE_TIMESTAMP < CACHE_TTL);
  
  if (!force && cacheValid && SHIFT_CODES_CACHE) {
    return SHIFT_CODES_CACHE;
  }
  
  if (!force && SHIFT_CODES_INFLIGHT) {
    return SHIFT_CODES_INFLIGHT;
  }

  SHIFT_CODES_INFLIGHT = withRetry(() => ShiftCode.list(), {
    retries: 4,
    baseDelay: 1500
  });
  
  try {
    const list = await SHIFT_CODES_INFLIGHT;
    SHIFT_CODES_CACHE = list || [];
    CACHE_TIMESTAMP = Date.now();
  } catch (err) {
    console.error("Failed to load shift codes:", err);
    SHIFT_CODES_CACHE = []; // On error, set cache to empty to avoid repeated errors
  } finally {
    SHIFT_CODES_INFLIGHT = null; // Clear the in-flight promise regardless of success or failure
  }
  
  return SHIFT_CODES_CACHE;
}

// Add color overrides for specific codes
function overriddenColors(code) {
  const c = String(code || "").toUpperCase().trim();

  // Helpers to detect whole-word presence
  const has = (needle) => new RegExp(`(^|\\b)${needle}(\\b|$)`).test(c);

  // Keep DM combos distinct
  if (has("LN") && has("DM")) return { bg: "#7c3aed", text: "#ffffff" }; // LN DM -> purple
  if (has("LD") && has("DM")) return { bg: "#db2777", text: "#ffffff" }; // LD DM -> pink

  // Day/Late day (LD): use palette via colorForCode (no explicit override)

  // Night (non-DM): use palette via colorForCode (no explicit override)

  // OFF / AL
  if (has("OFF")) return { bg: "#e5e7eb", text: "#374151" }; // OFF -> light gray + dark text
  if (has("AL")) return { bg: "#facc15", text: "#111827" }; // AL -> yellow + black

  return null; // fallback randomized
}

export default function ShiftChip({ shift, canManage, locked, onChanged, codes: codesProp, compact, currentUser, redeployStatus, onRedeploy, onRedeployInfo }) {
  // Sanitize code - block garbage display immediately
  let code = String(shift.shift_code || "").toUpperCase().trim();
  // Filter out replacement characters and known garbage
  if (!code || /[\uFFFD]/.test(code) || ["?", "◇", "NULL", "UNDEFINED", "NAN", "DIV"].includes(code)) return null;

  const [query, setQuery] = React.useState("");
  const [codesLocal, setCodesLocal] = React.useState([]);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const [menuView, setMenuView] = React.useState("root");

  // Optimised global listeners - reused across all instances
  const cssOverride = useGlobalColor();
  const nativeActive = useNativeTheme();
  const paletteTick = usePaletteTick();
  
  // Handle shift code updates efficiently
  useShiftCodeUpdate(async () => {
    if (codesProp && codesProp.length) {
      // Trigger palette refresh via tick (handled by usePaletteTick indirectly, but we force a tick locally? 
      // No, usePaletteTick listens to 'shiftchip-palette-changed'. 
      // 'shiftcode-updated' is distinct. We rely on the hook to trigger re-renders.
      // Wait, the original code triggered setPaletteTick here.
      // We'll just refetch local if needed.
      return;
    }
    invalidateShiftCodesCache();
    const list = await getShiftCodesCached(true);
    setCodesLocal(list);
  });

  // Load codes once:
  // - If parent provided codes (RotaGrid passes them), use those and do NOT fetch at all.
  // - Otherwise, fetch with cache + single-flight dedupe.
  React.useEffect(() => {
    let ignore = false;
    if (codesProp && codesProp.length) {
      setCodesLocal(codesProp);
      return;
    }
    (async () => {
      const list = await getShiftCodesCached(false);
      if (!ignore) setCodesLocal(list);
    })();
    return () => {ignore = true;};
  }, [codesProp]);

  // When menu opens, fetch only if parent didn't provide codes
  React.useEffect(() => {
    if (!menuOpen) return;
    setMenuView("root");
    if (codesProp && codesProp.length) return;
    let ignore = false;
    (async () => {
      const list = await getShiftCodesCached(false);
      if (!ignore) {
        setCodesLocal(list);
      }
    })();
    return () => {ignore = true;};
  }, [menuOpen, codesProp]);

  // Prefer codes from parent; otherwise fallback to locally loaded ones
  const effectiveCodes = codesProp && codesProp.length ? codesProp : codesLocal;

  // Read current palette name and variant so React can re-run the memo when they change
  const paletteNameCur = typeof getActivePaletteName === "function" ? getActivePaletteName() : "classic";
  const paletteVariant = typeof getActivePaletteVariant === "function" ? getActivePaletteVariant() : 0;

  // Distribute shift codes across the active palette so each code gets a distinct color.
  // Falls back to colorForCode (hash) if mapping is unavailable.
  const codeColorMap = React.useMemo(() => {
    // ensure paletteTick is a used dependency to trigger recompute on palette change
    void paletteTick;
    const map = {};
    const custom = getCustomPalette && getCustomPalette();
    const palette = Array.isArray(custom) && custom.length >= 2 ?
    custom :
    PALETTES && PALETTES[paletteNameCur] && PALETTES[paletteNameCur].length ?
    PALETTES[paletteNameCur] :
    PALETTES?.classic || ["#16a34a", "#0ea5e9", "#8b5cf6", "#22c55e", "#f59e0b"];
    const n = palette.length || 1;
    const off = (paletteVariant % n + n) % n;
    const rotatedPalette = [...palette.slice(off), ...palette.slice(0, off)];

    const uniqueCodes = Array.from(
      new Set(
        (effectiveCodes || []).
        map((c) => String(c.code || "").toUpperCase().trim()).
        filter(Boolean)
      )
    ).sort();

    // Assign in round-robin across the palette
    uniqueCodes.forEach((c, idx) => {
      map[c] = rotatedPalette[idx % rotatedPalette.length];
    });
    return map;
  }, [effectiveCodes, paletteNameCur, paletteVariant, paletteTick]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (effectiveCodes || []).map((c) => ({
      code: String(c.code || "").toUpperCase(),
      descriptor: c.descriptor || "",
      weighted_hours: typeof c.weighted_hours === "number" ? c.weighted_hours : null,
      defaults: {
        start: c.default_start_time,
        end: c.default_end_time,
        brk: typeof c.default_break_minutes === "number" ? c.default_break_minutes : undefined
      },
      color: c.color || null // Include color from code if available
    }));
    return list.
    filter((c) => !q || c.code.toLowerCase().includes(q) || c.descriptor.toLowerCase().includes(q)).
    sort((a, b) => a.code.localeCompare(b.code)).
    slice(0, 80);
  }, [effectiveCodes, query]);

  const changeCode = async (newCode, defaults) => {
    const patch = { shift_code: String(newCode).toUpperCase() };
    // Keep existing times; if missing, apply defaults
    if (!shift.start_time && defaults.start) patch.start_time = defaults.start;
    if (!shift.end_time && defaults.end) patch.end_time = defaults.end;
    if ((shift.break_minutes == null || shift.break_minutes === 0) && defaults.brk != null) patch.break_minutes = defaults.brk;
    await Shift.update(shift.id, patch);
    onChanged?.();
    setMenuOpen(false);
    setMenuView("root");
    setQuery("");
  };

  const removeShift = async () => {
    if (!confirm("Remove this shift?")) return;
    await enqueueShiftDelete(shift.id);
    onChanged?.();
    setMenuOpen(false);
  };

  // Use overrides first; otherwise use per-code explicit color; then global css var; then per-code palette mapping/hash
  const ov = overriddenColors(code);
  const codeMetaBy = React.useMemo(() => {
    const map = {};
    (effectiveCodes || []).forEach((c) => {
      const k = String(c.code || "").toUpperCase();
      if (k) map[k] = c;
    });
    return map;
  }, [effectiveCodes]);
  const codeMeta = codeMetaBy[code];

  // If native theme is active, ignore explicit per-code color and the global css override
  const perCodeColor = nativeActive ? null : codeMeta?.color || null;

  // Distribute color using theme palette/hash
  const baseColor = perCodeColor || codeColorMap[code] || colorForCode(code);

  // When native theme active, never use the css override; otherwise allow it
  const picked = nativeActive ? baseColor : cssOverride || baseColor;

  // Night-vs-day tone adjustment: darker for night codes, keep OFF/AL overrides intact
  const isNightCode = React.useMemo(() => {
    const tokens = code.split(/\s+/);
    const hasNightToken = tokens.includes("LN") || tokens.includes("N") || tokens.includes("NIGHT");
    const mentionsNightWord = /NIGHT/.test(code);
    // Treat as night if explicit night tokens/word are present
    return hasNightToken || mentionsNightWord;
  }, [code]);

  let solid = ov?.bg || picked;
  if (isNightCode && !/OFF/.test(code) && !/AL/.test(code)) {
    solid = darkenHex(solid, 0.22); // make night tones visibly darker than day
  }
  const textCol = ov?.text || textColorForBg(solid);
  // The border color was previously darkened, but with `border-0`, it's not strictly necessary for the style object.
  // However, keeping the variable `borderCol` doesn't hurt, it just won't be used in the `style` prop for the chip.
  const borderCol = darkenHex(solid, 0.25);

  // ABSOLUTE ZERO SPACING - Fill entire parent container
  const Chip = (
    <div
      className="absolute inset-0 flex items-center justify-center font-bold text-[12px] leading-none select-none rounded-none"
      style={{
        backgroundColor: solid,
        color: textCol,
        fontFamily: "'Aptos Display', ui-sans-serif, system-ui"
      }}
      title={`${code}${shift?.start_time && shift?.end_time ? ` • ${shift.start_time}-${shift.end_time}` : ""}${shift?.has_comments ? " • Has manager comments" : ""}`}
    >
      {redeployStatus === 'in' && <Handshake className="w-3 h-3 mr-1 text-blue-600" />}
      {redeployStatus === 'in' && shift.start_time && shift.end_time 
        ? `${shift.start_time}-${shift.end_time}` 
        : code
      }
      </div>
      );

  // Check for 48h lock on redeployed shifts
  const isRedeployLocked = React.useMemo(() => {
    if (!shift.is_redeployed || !shift.redeploy_meta?.initiated_at) return false;
    const initiated = new Date(shift.redeploy_meta.initiated_at);
    const now = new Date();
    const hoursDiff = (now - initiated) / (1000 * 60 * 60);
    return hoursDiff > 48;
  }, [shift]);

  // CHANGED: Comments should be accessible regardless of locked status
  // Only Edit and Delete are blocked when locked
  // Also blocked if redeployed > 48h ago
  const canEditShift = canManage && !locked && !isRedeployLocked;

  if (redeployStatus === 'out') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="absolute inset-0 flex items-center justify-center bg-blue-50 hover:bg-blue-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); onRedeployInfo && onRedeployInfo(shift); }}
            >
              <ArrowRightCircle className="w-5 h-5 text-blue-600" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redeployed to {shift.redeploy_meta?.to_dept_name || 'another ward'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button className={`absolute inset-0 ${redeployStatus === 'in' ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}`}>
            {Chip}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 p-0 shadow-lg">
          {!canManage ? (
            // Staff view - only comments
            <div className="py-1">
              <DropdownMenuItem onSelect={() => {setMenuOpen(false);setShowComments(true);}}>
                Comments…
              </DropdownMenuItem>
            </div>
          ) : (
            // Manager view
            <>
              {menuView === "root" ? (
                <div className="py-1">
                  {canEditShift && (
                    <>
                      <DropdownMenuItem
                        onSelect={(e) => {e.preventDefault();setMenuView("edit");setQuery("");}}>
                        Edit
                      </DropdownMenuItem>
                      {!shift.is_redeployed && (
                        <DropdownMenuItem
                          className="text-blue-600"
                          onSelect={() => onRedeploy && onRedeploy(shift)}>
                          Redeploy Staff...
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600" onSelect={() => removeShift()}>
                        Delete shift
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onSelect={() => {setMenuOpen(false);setShowComments(true);}}>
                    Comments…
                  </DropdownMenuItem>
                  {locked && (
                    <div className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border-t">
                      Roster is published. Comments are available, but editing is locked.
                    </div>
                  )}
                </div>
              ) : (
                // menuView === "edit"
                <>
                  <div className="p-2 border-b flex items-center gap-2">
                    <button
                      className="text-xs text-slate-600 hover:text-slate-800"
                      onClick={() => setMenuView("root")}>
                      ← Back
                    </button>
                    <div className="ml-auto text-[11px] text-slate-500">Change shift code</div>
                  </div>
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search code…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-auto py-1">
                    {filtered.map((c) => (
                      <DropdownMenuItem
                        key={c.code}
                        className="flex items-center justify-between gap-2 text-sm"
                        onSelect={() => changeCode(c.code, c.defaults)}>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800">{c.code}</div>
                          {c.descriptor ?
                            <div className="text-[11px] text-slate-500 truncate">{c.descriptor}</div> :
                            null}
                        </div>
                        {c.weighted_hours !== null &&
                          <div className="text-[11px] text-slate-600 shrink-0">{c.weighted_hours}h</div>
                        }
                      </DropdownMenuItem>
                    ))}
                    {filtered.length === 0 &&
                      <div className="px-3 py-4 text-xs text-slate-500">No codes found</div>
                    }
                  </div>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {showComments &&
      <ShiftCommentsDialog
        open={showComments}
        onClose={() => setShowComments(false)}
        shift={shift}
        // CHANGED: Allow managers to add comments regardless of lock status
        // Only staff (canManage=false) are blocked from adding comments
        canManage={canManage}
        onChanged={onChanged} />
      }
    </>
  );
}