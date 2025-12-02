
import React from "react";
import { base44 } from "@/api/base44Client";
import { withRetry } from "@/components/utils/withRetry";
import { Department } from "@/entities/Department";

export default function NhsBlueGlassMessaging() {
  const [open, setOpen] = React.useState(false);
  const [backendOk, setBackendOk] = React.useState(false);
  const [checkingBackend, setCheckingBackend] = React.useState(true);

  const [dept, setDept] = React.useState("");
  const [name, setName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [channel, setChannel] = React.useState("sms"); // "sms" | "email" (email not wired)
  const [logOnly, setLogOnly] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [depts, setDepts] = React.useState([]);

  const winRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const [pos, setPos] = React.useState({ x: 40, y: 60 });

  React.useEffect(() => {
    // Backend health + departments
    (async () => {
      try {
        const res = await withRetry(() => base44.functions.invoke("smsHealth", {}));
        setBackendOk(!!res?.data?.ok);
      } catch (e) {
        setBackendOk(false);
      } finally {
        setCheckingBackend(false);
      }
      try {
        const list = await Department.list();
        setDepts(Array.isArray(list) ? list : []);
      } catch {
        setDepts([]);
      }
    })();
    // Restore window position
    try {
      const m = JSON.parse(localStorage.getItem("msg_pos") || "{}");
      if (m && Number.isFinite(m.x) && Number.isFinite(m.y)) {
        setPos({ x: m.x, y: m.y });
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    // Enforce log-only if backend is not ready
    if (!backendOk) setLogOnly(true);
  }, [backendOk]);

  const isLive = channel === "sms" && backendOk && !logOnly;

  const segments = React.useMemo(() => {
    const t = body || "";
    if (!t) return 0;
    const gsm7 = /^[\x00-\x7F]+$/.test(t);
    const S = gsm7 ? 160 : 70;
    const C = gsm7 ? 153 : 67;
    const L = Array.from(t).length;
    return L <= S ? 1 : Math.ceil(L / C);
  }, [body]);

  // Drag + remember
  React.useEffect(() => {
    const W = winRef.current;
    const H = dragRef.current;
    if (!W || !H) return;

    let sx = 0, sy = 0, ox = pos.x, oy = pos.y, drag = false;

    const onDown = (e) => {
      drag = true;
      H.setPointerCapture?.(e.pointerId);
      sx = e.clientX; sy = e.clientY;
      ox = Number.isFinite(parseFloat(W.style.left)) ? parseFloat(W.style.left) : pos.x;
      oy = Number.isFinite(parseFloat(W.style.top)) ? parseFloat(W.style.top) : pos.y;
      H.style.cursor = "grabbing";
    };
    const onMove = (e) => {
      if (!drag) return;
      let nx = ox + (e.clientX - sx);
      let ny = oy + (e.clientY - sy);
      const maxX = window.innerWidth - W.offsetWidth - 10;
      const maxY = window.innerHeight - W.offsetHeight - 10;
      nx = Math.max(10, Math.min(nx, maxX));
      ny = Math.max(10, Math.min(ny, maxY));
      W.style.left = nx + "px";
      W.style.top = ny + "px";
    };
    const onUp = (e) => {
      if (!drag) return;
      drag = false;
      H.releasePointerCapture?.(e.pointerId);
      H.style.cursor = "grab";
      const nx = Number.parseFloat(W.style.left) || pos.x;
      const ny = Number.parseFloat(W.style.top) || pos.y;
      setPos({ x: nx, y: ny });
      try {
        localStorage.setItem("msg_pos", JSON.stringify({ x: nx, y: ny }));
      } catch {}
    };

    H.addEventListener("pointerdown", onDown);
    H.addEventListener("pointermove", onMove);
    H.addEventListener("pointerup", onUp);
    return () => {
      H.removeEventListener("pointerdown", onDown);
      H.removeEventListener("pointermove", onMove);
      H.removeEventListener("pointerup", onUp);
    };
  }, [pos]);

  const addRow = (r) => setRows((prev) => [{ ...r }, ...prev]);

  const onSend = async () => {
    const to = mobile.trim();
    const at = new Date().toISOString();
    const base = { at, to, body, pid: null, status: isLive ? "queued" : "logged" };
    addRow(base);

    if (!isLive) {
      setBody("");
      return;
    }

    // Validate E.164
    if (!/^\+\d{8,15}$/.test(to)) {
      addRow({ ...base, status: "failed", pid: "INVALID_NUMBER" });
      alert("Enter a valid E.164 number, e.g., +447700900123");
      return;
    }

    try {
      const res = await withRetry(() => base44.functions.invoke("sendSms", {
        to,
        body,
        staff_id: "me",
        tags: dept ? [dept] : []
      }));
      const data = res?.data;
      addRow({
        at,
        to,
        body,
        pid: data?.provider_message_id || null,
        status: data?.status || "queued"
      });
    } catch (e) {
      console.error(e);
      addRow({ ...base, status: "failed", pid: "ERROR" });
    } finally {
      setBody("");
    }
  };

  return (
    <div>
      <style>{`
  :root{
    --bg:#f4f7fb;--panel:rgba(255,255,255,.92);--text:#0f172a;--sub:#475569;
    --border:rgba(15,23,42,.12);--shadow:0 18px 40px rgba(2,6,23,.12);
    --accent:#005EB8;--rounded:22px;
  }
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,Arial;overflow:hidden}
  .btn-open{position:fixed;right:24px;bottom:24px;background:var(--accent);color:#fff;border:0;border-radius:999px;padding:14px 18px;font-weight:700;box-shadow:0 14px 30px rgba(0,0,0,.25);cursor:pointer;transition:transform .15s,filter .2s; z-index:10001}
  .btn-open:hover{transform:translateY(-2px);filter:brightness(1.05)}
  .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.2);backdrop-filter:blur(1px);display:none;z-index:10000}
  .backdrop.show{display:block;animation:fade .18s ease}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  .win{position:fixed;left:40px;top:60px;width:min(940px,96vw);background:var(--panel);border:1px solid var(--border);border-radius:var(--rounded);box-shadow:var(--shadow);display:none; z-index:10002}
  .win.show{display:block;animation:pop .22s cubic-bezier(.18,.89,.32,1.28)}
  @keyframes pop{from{transform:translate(40px,30px) scale(.98);opacity:0}to{transform:0,0) scale(1);opacity:1}}
  .title{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;color:#fff;border-top-left-radius:var(--rounded);border-top-right-radius:var(--rounded);
         background:linear-gradient(to right,var(--accent),calc(100% - 220px),transparent);cursor:grab;user-select:none}
  .badge{font-size:11px;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.22)}
  .x{background:rgba(255,255,255,.15);border:0;color:#fff;width:32px;height:32px;border-radius:999px;cursor:pointer}
  .x:hover{background:rgba(255,255,255,.28)}
  .grid{display:grid;grid-template-columns:1fr 2fr;gap:14px;padding:14px}
  .card{border:1px solid var(--border);background:#fff;border-radius:14px;padding:10px}
  .muted{color:var(--sub);font-size:12px}
  .row{display:flex;gap:8px;margin-bottom:8px}
  .input,.select,.ta{width:100%;border:1px solid var(--border);border-radius:10px;padding:10px}
  .ta{min-height:110px;resize:vertical}
  .pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);padding:6px 10px;border-radius:999px;font-size:13px}
  .btn{background:var(--accent);color:#fff;border:0;padding:10px 14px;border-radius:12px;font-weight:700;cursor:pointer}
  .btn:disabled{opacity:.6;cursor:not-allowed}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{padding:6px 8px;border-bottom:1px dashed var(--border)}
  .status-queued{color:#b45309}.status-failed{color:#b91c1c}.status-delivered{color:#065f46}
      `}</style>

      <button className="btn-open" onClick={() => setOpen(true)}>Open Messaging</button>
      <div className={`backdrop ${open ? "show" : ""}`} onClick={() => setOpen(false)} />

      <div
        ref={winRef}
        className={`win ${open ? "show" : ""}`}
        style={{ left: pos.x, top: pos.y }}
      >
        <div className="title" ref={dragRef}>
          <div><strong>Staff Messaging</strong></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge">
              {checkingBackend
                ? "SMS: checking…"
                : isLive
                  ? "SMS backend: active"
                  : backendOk
                    ? "SMS: log-only"
                    : "SMS backend: not installed"}
            </span>
            <button className="x" onClick={() => setOpen(false)}>✕</button>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Recipients</div>
            <div className="row">
              <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="">All depts</option>
                {depts.length > 0 ? (
                  depts.map(d => <option key={d.id} value={d.name || d.id}>{d.name || d.id}</option>)
                ) : (
                  <>
                    <option>Ward 2</option>
                    <option>Ward 3</option>
                    <option>ECU</option>
                  </>
                )}
              </select>
            </div>
            <div className="row"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" /></div>
            <div className="row"><input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+447700900123 (E.164)" /></div>
            <div className="muted">Use +44… format. Keep content PHI-free.</div>
          </div>

          <div className="card">
            <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
              <div className="pill">
                <label><input type="radio" name="ch" value="sms" checked={channel === "sms"} onChange={() => setChannel("sms")} /> SMS</label>
                <label style={{ opacity: .6 }}><input type="radio" name="ch" value="email" checked={channel === "email"} onChange={() => setChannel("email")} /> Email</label>
              </div>

              <label className="pill" style={{ opacity: backendOk ? 1 : .6 }}>
                <input type="checkbox" id="logOnly" checked={logOnly || !backendOk} disabled={!backendOk} onChange={(e) => setLogOnly(e.target.checked)} /> Log only (no SMS)
              </label>

              <div className="muted">Segments: <b>{segments}</b></div>
            </div>

            <textarea className="ta" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Short operational message. Include a link to the portal for details." />
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 6 }}>
              <button className="btn" onClick={onSend} disabled={!body.trim() || (channel === "sms" && !backendOk && !logOnly)}>
                {isLive ? "Send SMS" : "Save / Log"}
              </button>
            </div>

            <div className="card" style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Recent</div>
              <div style={{ maxHeight: 180, overflow: "auto" }}>
                <table>
                  <thead><tr><th>When</th><th>To</th><th>Status</th><th>Provider ID</th><th>Preview</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>{new Date(r.at).toLocaleString()}</td>
                        <td>{r.to}</td>
                        <td className={`status-${r.status || "unknown"}`}>{r.status}</td>
                        <td>{r.pid || "-"}</td>
                        <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.body}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={5} style={{ color: "#64748b" }}>No messages yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", fontSize: 12, color: "#475569" }}>
          <div>Drag anywhere • Position remembered</div><div>No PHI in SMS</div>
        </div>
      </div>
    </div>
  );
}
