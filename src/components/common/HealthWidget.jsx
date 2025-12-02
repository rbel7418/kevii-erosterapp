import React from "react";
import { PTListAdmission } from "@/entities/PTListAdmission";

// Default probe: small sample from PTListAdmission
async function defaultProbe() {
  const rows = await PTListAdmission.list("-admission_date", 50);
  return rows || [];
}

// Assess a quick health state from a tiny sample
function assess(rows, elapsedMs) {
  const slice = Array.isArray(rows) ? rows : [];
  const latest = slice
    .filter((r) => r && r.admission_date)
    .map((r) => String(r.admission_date).slice(0, 10))
    .sort()
    .pop() || null;

  let status = "ok";
  if (slice.length === 0 || elapsedMs > 4000) status = "degraded";

  return {
    ok: status === "ok",
    status,
    latest,
    probeMs: Math.round(elapsedMs),
    sampleSize: slice.length,
    lastChecked: new Date().toISOString(),
    message: status === "ok" ? undefined : "Slow or empty probe",
  };
}

export function useDatasetHealth(probe) {
  const [state, setState] = React.useState({ ok: true, status: "ok" });

  const run = React.useCallback(async () => {
    const fn = probe || defaultProbe;
    const t0 = performance.now();
    try {
      const rows = await fn();
      const s = assess(rows, performance.now() - t0);
      setState(s);
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      setState({
        ok: false,
        status: "down",
        message: msg,
        lastChecked: new Date().toISOString(),
      });
    }
  }, [probe]);

  React.useEffect(() => {
    run();
  }, [run]);

  return { ...state, refresh: run };
}

// Simple banner showing health status
export function HealthBanner({ health, probe }) {
  const internal = useDatasetHealth(probe);
  const h = health || internal;

  const base = "text-xs md:text-sm rounded border px-3 py-2 flex items-center gap-2";
  let cls = base + " bg-emerald-50 text-emerald-800 border-emerald-200";
  let label = "Data healthy";
  if (h.status === "degraded") {
    cls = base + " bg-amber-50 text-amber-800 border-amber-200";
    label = "Data degraded";
  }
  if (h.status === "down") {
    cls = base + " bg-red-50 text-red-800 border-red-200";
    label = "Data service down";
  }

  return (
    <div className="mb-2">
      <div className={cls}>
        <span className="font-semibold">{label}</span>
        {typeof h.probeMs === "number" && <span>• {h.probeMs} ms</span>}
        {typeof h.sampleSize === "number" && <span>• sample {h.sampleSize}</span>}
        {h.latest && <span>• latest {h.latest}</span>}
        {h.message && <span>• {h.message}</span>}
        <button
          onClick={internal.refresh}
          className="ml-auto text-[11px] font-semibold underline decoration-dotted"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}