import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { ShiftCode } from "@/entities/ShiftCode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { withRetry } from "@/components/utils/withRetry";
import { getCached } from "@/components/utils/cache";

export default function ShiftCodeDropdown({ position, onSelect, onClose, currentCode, onCreateCustom, allowCustom = true }) {
  const [allCodes, setAllCodes] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // NEW: menu ref and safe viewport-aware coordinates
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: position?.top || 0, left: position?.left || 0 });

  // Lazy load shift codes with cache (reduces repeated GETs)
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getCached("shiftcodes", 60000, () => withRetry(() => ShiftCode.list()));
        if (mounted) {
          const cleaned = (data || [])
            .filter((c) => c && c.code)
            .sort((a, b) => String(a.code).localeCompare(String(b.code)));
          setAllCodes(cleaned);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // NEW: adapt dropdown to viewport and anchor beside the clicked cell
  useEffect(() => {
    if (!position) return;
    // initial guess: below-left of the cell
    const baseTop = position.top ?? 0;
    const baseLeft = position.left ?? 0;
    setCoords({ top: baseTop, left: baseLeft });
  }, [position]);

  // After render, adjust if overflowing the viewport
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let top = coords.top;
    let left = coords.left;

    const padding = 8;
    // If off right edge, pull to the left within viewport
    if (rect.right > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - rect.width - padding);
    }
    // If off bottom edge, flip above anchor if possible
    if (rect.bottom > window.innerHeight - padding) {
      const desiredTop = (position?.top ?? 0) - rect.height - 8;
      top = Math.max(padding, desiredTop);
    }
    // Clamp to viewport
    if (rect.left < padding) left = padding;
    if (rect.top < padding) top = padding;

    if (left !== coords.left || top !== coords.top) {
      setCoords({ left, top });
    }
  }, [coords.left, coords.top, position, loading, allCodes.length]);

  // Close on outside click and on Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCodes;
    return allCodes.filter((c) =>
      String(c.code || "").toLowerCase().includes(q) ||
      String(c.descriptor || "").toLowerCase().includes(q)
    );
  }, [query, allCodes]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose?.();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] w-72 p-2 rounded-xl shadow-lg border"
      style={{
        top: coords.top,
        left: coords.left,
        background: "rgba(0, 114, 206, 0.06)",            // translucent NHS blue
        borderColor: "rgba(0, 114, 206, 0.2)",
        backdropFilter: "blur(6px)"
      }}
    >
      <div className="mb-2">
        <Input
          autoFocus
          placeholder="Search shift codes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-white/80 focus:bg-white transition-colors"
        />
      </div>

      {allowCustom && (
        <div className="mb-2">
          <Button
            className="w-full bg-[var(--nhs-blue,#005EB8)] hover:bg-[#004a96] text-white"
            onClick={() => onCreateCustom?.()}
          >
            Create custom shift
          </Button>
        </div>
      )}

      <div
        className="max-h-64 overflow-auto rounded-lg border bg-white/90"
        style={{ borderColor: "rgba(0, 114, 206, 0.2)" }}
      >
        {loading ? (
          <div className="p-3 text-sm text-slate-600">Loading codes…</div>
        ) : items.length === 0 ? (
          <div className="p-3 text-sm text-slate-600">No shift codes found</div>
        ) : (
          <ul className="divide-y divide-slate-200/70">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-blue-50/70 focus:bg-blue-50/70 focus:outline-none"
                  onClick={() => onSelect?.(c)}
                >
                  <div className="text-sm font-semibold text-slate-900 tracking-wide">{c.code}</div>
                  {c.descriptor && (
                    <div className="text-xs text-slate-600">{c.descriptor}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full border-slate-300"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
}