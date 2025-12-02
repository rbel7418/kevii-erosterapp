import React from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import { AdmissionEvent } from "@/entities/AdmissionEvent";
import { Shift } from "@/entities/Shift";

function lastNDates(n){const out=[];for(let i=n-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);out.push(d);}return out;}
function ymd(d){return d.toISOString().slice(0,10);}
function fmt(d){return d.toLocaleDateString(undefined,{weekday:"short", day:"2-digit"});}

function isDayShift(code) {
  const s = String(code || "").toUpperCase();
  // Count LD, E, L, LD NIC, LD PB as availability
  return ["LD","E","L"].some(tok => s.includes(tok));
}
function isHCA(code) {
  return String(code || "").toUpperCase().includes("HCA");
}

export default function DemandVsAvailability7d() {
  const [series, setSeries] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const days = lastNDates(7);
      const by = {};
      days.forEach(d => by[ymd(d)] = { date: fmt(d), demand: 0, staff: 0, hca: 0 });

      const admissions = await AdmissionEvent.list("-admission_date", 600).catch(() => []);
      (admissions || []).forEach(a => {
        const k = String(a.admission_date || "").slice(0,10);
        if (by[k]) by[k].demand += 1;
      });

      const shifts = await Shift.filter({}, "-date", 1000).catch(() => []);
      (shifts || []).forEach(s => {
        const k = String(s.date || "").slice(0,10);
        if (!by[k]) return;
        if (s.status === "cancelled") return;
        const code = s.shift_code;
        if (isDayShift(code)) by[k].staff += 1;
        if (isHCA(code)) by[k].hca += 1;
      });

      setSeries(days.map(d => by[ymd(d)]));
    })();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[13px] font-semibold text-slate-700">Demand vs Availability</div>
          <div className="text-xs text-slate-500">Admissions vs rostered staff (HCA highlighted) • 7 days</div>
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="2 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="demand" name="Admissions (Demand)" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="staff" name="Rostered Staff" stroke="#0b5ed7" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="hca" name="HCA Count" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}