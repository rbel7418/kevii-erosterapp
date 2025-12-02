import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import DemandVsAvailability7d from "@/components/home/DemandVsAvailability7d";
import SafeStaffing7d from "@/components/home/SafeStaffing7d";
import { AdmissionEvent } from "@/entities/AdmissionEvent";
import { Shift } from "@/entities/Shift";
import { WardCensus } from "@/entities/WardCensus";
import { Employee } from "@/entities/Employee";
import { Upload as UploadIcon } from "lucide-react";

export default function UserLanding() {
  const [me, setMe] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef(null);
  const [metrics, setMetrics] = React.useState({
    admissions: 0, onDuty: 0, censusDay: 0, censusNight: 0
  });
  const [employeeRow, setEmployeeRow] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      const u = await User.me().catch(() => null);
      setMe(u);
      // Load employee profile connected to current user
      try {
        const list = await Employee.list();
        const emp = (list || []).find(e => e.user_email === u?.email) || null;
        setEmployeeRow(emp);
      } catch (error) {
        console.error("Error loading employee data:", error);
      }
      const today = new Date().toISOString().slice(0, 10);
      const [adms, shifts, census] = await Promise.all([
        AdmissionEvent.filter({ admission_date: today }).catch(() => []),
        Shift.filter({ date: today }, "-date", 800).catch(() => []),
        WardCensus.filter({ date: today }).catch(() => [])
      ]);
      const onDuty = (shifts || []).filter((s) => s.status !== "cancelled").length;
      const censusDay = (census || []).reduce((a, b) => a + Number(b.patients_day || 0), 0);
      const censusNight = (census || []).reduce((a, b) => a + Number(b.patients_night || 0), 0);
      setMetrics({ admissions: (adms || []).length, onDuty, censusDay, censusNight });
    })();
  }, []);

  const pickFile = () => fileRef.current?.click();
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      await User.updateMyUserData({ photo_url: file_url });
      const u = await User.me().catch(() => null);
      setMe(u || { ...(me || {}), photo_url: file_url });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const fullName = employeeRow?.full_name || me?.full_name || "Welcome";

  return (
    <div className="landing-scope themed min-h-screen">
      <style>{`
:root{--nhs-blue:#005EB8; --teal:#00A3A3; --ink:#0f172a; --muted:#64748b; --bg:#f6f8fb;}
.landing-scope{background:linear-gradient(180deg,#fbfdff 0%,#f2f6fb 100%);}

.theme-dark .landing-scope{
  background:linear-gradient(180deg, var(--dm-bg-base) 0%, var(--dm-bg-subtle) 100%);
}

/* WIDTH: ~90% of viewport, capped for ultrawide */
.landing-scope .captive-container{
  max-width:min(90vw,1800px);
  margin:2vh auto;
  padding:0 1.2rem;
}

/* Card shell */
.landing-scope .captive-card{
  background:#fff;
  border:1px solid rgba(2,24,64,.06);
  border-radius:18px;
  box-shadow:0 12px 30px rgba(2,24,64,.08);
  overflow:hidden;
  min-height:85vh; /* Balanced hero height */
  display:flex;
  flex-direction:column;
}

.theme-dark .landing-scope .captive-card{
  background: var(--dm-bg-elevated);
  border-color: var(--dm-border);
  box-shadow: 0 12px 30px rgba(0,0,0,.5);
}

/* Top strip */
.landing-scope .captive-topbar{
  display:flex;align-items:center;gap:12px;padding:14px 18px;
  background:linear-gradient(90deg,var(--nhs-blue),#1076d4);color:#fff;
}
.landing-scope .captive-topbar h1{
  font-family: 'Aptos Display', ui-sans-serif, system-ui, Segoe UI, Inter;
  font-size:22px; font-weight:800; letter-spacing:.2px; margin:0;
}
.landing-scope .captive-topbar img{height:34px;filter:drop-shadow(0 6px 16px rgba(0,0,0,.25))}

/* Body spacing */
.landing-scope .captive-body{
  padding:20px;
  flex:1; display:flex; flex-direction:column; gap:16px;
}
.landing-scope .captive-sub{color:var(--muted);margin:6px 0 16px}

.theme-dark .landing-scope .captive-sub{color: var(--dm-text-tertiary);}

/* Buttons */
.landing-scope .btn{
  height:36px; display:inline-flex; align-items:center; justify-content:center;
  padding:0 12px;border-radius:12px;border:none;cursor:pointer;
  background:linear-gradient(180deg,var(--nhs-blue),#0b66b2);color:#fff;font-weight:700;
  box-shadow:0 8px 22px rgba(0,94,184,.25);
}
.landing-scope .iconbtn{
  height:36px; width:36px; display:inline-flex; align-items:center; justify-content:center;
  padding:0; border-radius:10px; cursor:pointer; background:#fff; color:#0f172a;
  border:1px solid #e2e8f0; box-shadow:0 1px 2px rgba(2,24,64,0.06);
}

.theme-dark .landing-scope .iconbtn{
  background: var(--dm-bg-subtle);
  color: var(--dm-text-primary);
  border-color: var(--dm-border);
}

/* Tiles */
.landing-scope .tabbox{
  background:#fff;border:1px solid rgba(2,24,64,.10);border-radius:14px;
  padding:12px 14px;box-shadow:0 2px 4px rgba(2,24,64,.04),0 10px 22px rgba(2,24,64,.06);
  transition:transform .15s ease, box-shadow .18s ease;min-height:88px;
}

.theme-dark .landing-scope .tabbox{
  background: var(--dm-bg-elevated);
  border-color: var(--dm-border);
  box-shadow: 0 2px 4px rgba(0,0,0,.3), 0 10px 22px rgba(0,0,0,.4);
}

.landing-scope .tabbox:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(2,24,64,.06),0 18px 34px rgba(2,24,64,.08)}

.theme-dark .landing-scope .tabbox:hover{
  box-shadow: 0 4px 10px rgba(0,0,0,.4), 0 18px 34px rgba(0,0,0,.5);
}

.landing-scope .tabbox .tab-title{font-size:12px; font-weight:600; letter-spacing:.2px; color:#0f172a}

.theme-dark .landing-scope .tabbox .tab-title{color: var(--dm-text-primary);}

/* KPIs */
.landing-scope .kpi{
  display:flex;align-items:center;gap:10px;background:#ffffff;border:1px solid #e8eef7;border-radius:14px;padding:10px 12px;box-shadow:inset 0 1px 0 rgba(0,0,0,.02)
}

.theme-dark .landing-scope .kpi{
  background: var(--dm-bg-subtle);
  border-color: var(--dm-border);
}

.landing-scope .kpi .v{font-size:24px;font-weight:800;color:#0f172a;line-height:1}
.theme-dark .landing-scope .kpi .v{color: var(--dm-text-primary);}

.landing-scope .kpi .t{font-size:12px;color:#64748b}
.theme-dark .landing-scope .kpi .t{color: var(--dm-text-tertiary);}

/* Avatar */
.landing-scope .avatar{
  height:128px;width:128px;border-radius:16px;background:#e6eef8;overflow:hidden;display:flex;align-items:center;justify-content:center;
  box-shadow:inset 1px 1px 0 rgba(255,255,255,.8);
}

.theme-dark .landing-scope .avatar{
  background: var(--dm-bg-subtle);
}

@media (min-width: 768px) {
  .landing-scope .avatar{ height:192px; width:192px; border-radius:20px; }
}

/* nice gap helper */
.landing-scope .grid-wide{gap:16px}
      `}</style>

      <div className="captive-container">
        <div className="captive-card" data-visual data-visual-id="landing-shell">
          <div className="captive-topbar">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dac758b8e651d3b392b8fc/1a7f2d03d_image.png"
              alt="Hospital mark" />
            <h1 className="text-white font-bold">eRosterApp</h1>
            <div className="ml-auto text-[18px] font-semibold opacity-90">
              {new Date().toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })} · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          <div className="captive-body">
            {/* Intro + Profile (two cols on md+, single on small) */}
            <div className="grid grid-cols-1 md:grid-cols-2 grid-wide">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-blue-700 text-xl font-extrabold">Welcome to the Operations Portal</div>
                <div className="captive-sub">Clarity and connection for safe staffing and smooth patient flow.</div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="kpi">
                    <div className="v">{Number.isFinite(metrics?.admissions) ? metrics.admissions.toLocaleString("en-GB") : "—"}</div>
                    <div className="t">Patients admitted today</div>
                  </div>
                  <div className="kpi">
                    <div className="v">{Number.isFinite(metrics?.onDuty) ? metrics.onDuty.toLocaleString("en-GB") : "—"}</div>
                    <div className="t">Staff on duty</div>
                  </div>
                  <div className="kpi">
                    <div className="v">
                      {(() => {
                        const total = (metrics?.censusDay ?? 0) + (metrics?.censusNight ?? 0);
                        return Number.isFinite(total) ? total.toLocaleString("en-GB") : "—";
                      })()}
                    </div>
                    <div className="t">Today’s census</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-700 mb-2">Your profile</div>
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    {me?.photo_url ? (
                      <img src={me.photo_url} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-500"><circle cx="12" cy="8" r="4" fill="currentColor" /><path d="M4 20c1.5-4 14.5-4 16 0" fill="currentColor" /></svg>
                    )}
                  </div>
                  <div className="flex-1">
                    {/* 1) Full name (Aptos Display, keep size) */}
                    <div className="text-blue-700 text-xl font-semibold">{fullName}</div>
                    {/* 2) Job Title */}
                    {employeeRow?.job_title && (
                      <div className="text-[14px] text-slate-700 mt-0.5">{employeeRow.job_title}</div>
                    )}
                    {/* 3) Email */}
                    <div className="text-[14px] text-slate-600 mt-1">{me?.email}</div>
                    {/* 4) Reports to */}
                    {employeeRow?.reports_to && (
                      <div className="text-[14px] text-slate-600 mt-1">Reports to: {employeeRow.reports_to}</div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button className="iconbtn" onClick={pickFile} title={uploading ? "Uploading…" : "Upload photo"}>
                        <UploadIcon className="w-4 h-4" />
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation tiles */}
            <div className="grid grid-cols-1 md:grid-cols-4 grid-wide mt-4">
              <Link to={createPageUrl("RepGen")} className="tabbox">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center">RG</div>
                  <div>
                    <div className="tab-title">Report Generator</div>
                    <div className="text-[11px] text-slate-500">Export staffing & activity</div>
                  </div>
                </div>
              </Link>
              <Link to={createPageUrl("Utilities")} className="tabbox">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-emerald-600 text-white flex items-center justify-center">SS</div>
                  <div>
                    <div className="tab-title">Safe Staffing</div>
                    <div className="text-[11px] text-slate-500">Calculators & dashboards</div>
                  </div>
                </div>
              </Link>
              <Link to={createPageUrl("Team")} className="tabbox">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-indigo-600 text-white flex items-center justify-center">TC</div>
                  <div>
                    <div className="tab-title">Training Compliance</div>
                    <div className="text-[11px] text-slate-500">Keep staff up to date</div>
                  </div>
                </div>
              </Link>
              <Link to={createPageUrl("RotaGrid")} className="tabbox">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-slate-900 text-white flex items-center justify-center">RT</div>
                  <div>
                    <div className="tab-title">Rotas</div>
                    <div className="text-[11px] text-slate-500">Plan and review shifts</div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Visuals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 grid-wide mt-4">
              <DemandVsAvailability7d />
              <SafeStaffing7d />
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-500 mt-5">
              <div className="font-semibold">King Edward VII’s Hospital</div>
              <div>Created by Raymund Belleza — DM v1 • 2025</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}