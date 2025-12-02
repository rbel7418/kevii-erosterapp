
import React from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Shift } from "@/entities/Shift";
import { WardCensus } from "@/entities/WardCensus";
import { WorkforceConfig } from "@/entities/WorkforceConfig";

function ymd(d) { return new Date(d).toISOString().slice(0,10); }
function lastNDates(n){const out=[];for(let i=n-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);out.push(d);}return out;}
function fmt(d){return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});}

function classifyShift(shift) {
  const code = String(shift.shift_code || "").toUpperCase();
  const isNight = code.includes("N") && !code.includes("DN"); // treat N/LN as night
  return { isNight };
}

export default function StaffingSnapshot({ days = 7 }) {
  const [loading, setLoading] = React.useState(true);
  const [today, setToday] = React.useState({ day: 0, night: 0, reqDay: 0, reqNight: 0 });
  const [series, setSeries] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const cfgs = await WorkforceConfig.filter({ is_active: true }).catch(() => []);
      const ratio = Number((cfgs[0]?.patient_to_nurse_ratio) || 4);

      const wc = await WardCensus.filter({}, "-date", 200).catch(() => []);
      const todayKey = ymd(new Date());
      const todays = (wc || []).filter(x => String(x.date || "").slice(0, 10) === todayKey);
      const patientsDay = todays.reduce((a, b) => a + Number(b.patients_day || 0), 0);
      const patientsNight = todays.reduce((a, b) => a + Number(b.patients_night || 0), 0);
      const reqDay = Math.max(0, Math.ceil(patientsDay / ratio));
      const reqNight = Math.max(0, Math.ceil(patientsNight / ratio));

      const shifts = await Shift.filter({}, "-date", 800).catch(() => []);
      // today split
      const todayShifts = (shifts || []).filter(s => String(s.date || "").slice(0,10) === todayKey && s.status !== "cancelled");
      let dayCount = 0, nightCount = 0;
      todayShifts.forEach(s => { classifyShift(s).isNight ? nightCount++ : dayCount++; });

      // last N days series (total shifts scheduled)
      const daysArr = lastNDates(days);
      const totalsByDay = {};
      daysArr.forEach(d => totalsByDay[ymd(d)] = 0);
      (shifts || []).forEach(s => {
        const k = String(s.date || "").slice(0,10);
        if (k in totalsByDay && s.status !== "cancelled") totalsByDay[k] += 1;
      });
      const data = daysArr.map(d => ({ date: fmt(d), shifts: totalsByDay[ymd(d)] }));

      setToday({ day: dayCount, night: nightCount, reqDay, reqNight });
      setSeries(data);
      setLoading(false);
    })();
  }, [days]);

  const dayCoverage = today.reqDay ? Math.min(100, Math.round((today.day / today.reqDay) * 100)) : 0;
  const nightCoverage = today.reqNight ? Math.min(100, Math.round((today.night / today.reqNight) * 100)) : 0;

  // RENAME: Avoid shadowing Recharts <Bar/> by using CoverageBar for UI progress
  const CoverageBar = ({ value, color }) => (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[13px] font-semibold text-slate-700">Staffing Snapshot</div>
          <div className="text-xs text-slate-500">Today’s coverage and weekly trend</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Day coverage</div>
            <div className="text-lg font-bold text-slate-900">{dayCoverage}%</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500">Night coverage</div>
            <div className="text-lg font-bold text-slate-900">{nightCoverage}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600">Day nurses</span>
            <span className="text-slate-500">{today.day}/{today.reqDay}</span>
          </div>
          <CoverageBar value={dayCoverage} color="#0b5ed7" />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600">Night nurses</span>
            <span className="text-slate-500">{today.night}/{today.reqNight}</span>
          </div>
          <CoverageBar value={nightCoverage} color="#22c55e" />
        </div>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="2 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            {/* This is the Recharts Bar – now unaffected by local name collision */}
            <Bar dataKey="shifts" fill="#8b5cf6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
