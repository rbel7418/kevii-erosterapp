import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { WardCensus } from "@/entities/WardCensus";
import { WorkforceConfig } from "@/entities/WorkforceConfig";
import { Shift } from "@/entities/Shift";

function lastNDates(n){const out=[];for(let i=n-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);out.push(d);}return out;}
function ymd(d){return d.toISOString().slice(0,10);}
function fmt(d){return d.toLocaleDateString(undefined,{weekday:"short", day:"2-digit"});}

function isNight(code) {
  const s = String(code || "").toUpperCase();
  return s.includes("N") && !s.includes("DN"); // treat N/LN as night, exclude DN
}
function isCancelled(s) { return String(s?.status) === "cancelled"; }

export default function SafeStaffing7d() {
  const [series, setSeries] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const cfgs = await WorkforceConfig.filter({ is_active: true }).catch(() => []);
      const ratio = Number((cfgs[0]?.patient_to_nurse_ratio) || 4);

      const days = lastNDates(7);
      const keyset = new Set(days.map(ymd));
      const base = {};
      days.forEach(d => base[ymd(d)] = { date: fmt(d), req_day:0, req_night:0, act_day:0, act_night:0 });

      const allCensus = await WardCensus.filter({}, "-date", 300).catch(() => []);
      (allCensus || []).forEach(c => {
        const k = String(c.date || "").slice(0,10);
        if (!base[k]) return;
        const pd = Number(c.patients_day || 0);
        const pn = Number(c.patients_night || 0);
        base[k].req_day += Math.max(0, Math.ceil(pd / ratio));
        base[k].req_night += Math.max(0, Math.ceil(pn / ratio));
      });

      const shifts = await Shift.filter({}, "-date", 1200).catch(() => []);
      (shifts || []).forEach(s => {
        const k = String(s.date || "").slice(0,10);
        if (!base[k] || isCancelled(s)) return;
        if (isNight(s.shift_code)) base[k].act_night += 1;
        else base[k].act_day += 1;
      });

      setSeries(days.map(d => base[ymd(d)]));
    })();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[13px] font-semibold text-slate-700">Safe Staffing Coverage</div>
          <div className="text-xs text-slate-500">Required vs actual nurses • last 7 days</div>
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="2 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 13 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="req_day" name="Required Day" fill="#f59e0b" radius={[4,4,0,0]} />
            <Bar dataKey="act_day" name="Actual Day" fill="#0ea5e9" radius={[4,4,0,0]} />
            <Bar dataKey="req_night" name="Required Night" fill="#a78bfa" radius={[4,4,0,0]} />
            <Bar dataKey="act_night" name="Actual Night" fill="#10b981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}