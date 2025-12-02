import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Activity, Clock, Repeat, AlertCircle, Users, CalendarDays, BarChart2 } from "lucide-react";

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
            <div className="text-xl font-bold text-slate-900">{value}</div>
            {sub ? <div className="text-[11px] text-slate-500">{sub}</div> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KpiSummaryCards({ metrics, startDate, endDate }) {
  const fmt = (n) => Number(n || 0).toLocaleString();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3">
        <Stat icon={TrendingUp} label="Admissions (Range)" value={fmt(metrics.totalAdmissions)} sub={`${startDate} → ${endDate}`} />
        <Stat icon={Activity} label="Discharges (Range)" value={fmt(metrics.totalDischarges)} />
        <Stat icon={Clock} label="Avg LOS" value={`${(metrics.alos || 0).toFixed(2)} days`} />
        <Stat icon={Repeat} label="Readmission ≤30d" value={`${Math.round((metrics.readmitRate || 0) * 100)}%`} sub={`${fmt(metrics.readmitCount)} patients`} />
        <Stat icon={CalendarDays} label="This Month — Adm" value={fmt(metrics.monthAdmissions)} />
        <Stat icon={CalendarDays} label="This Month — Dis" value={fmt(metrics.monthDischarges)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3">
        <Stat icon={BarChart2} label="YTD Admissions" value={fmt(metrics.ytdAdmissions)} />
        <Stat icon={BarChart2} label="YTD Discharges" value={fmt(metrics.ytdDischarges)} />
        <Stat icon={Users} label="Same-Day Discharges" value={fmt(metrics.sameDay)} />
        <Stat icon={AlertCircle} label="Cancellations" value={fmt(metrics.cancellationCount)} />
        <Stat icon={Clock} label="Est. Lost Bed Days" value={fmt(metrics.lostBedDays)} sub="from cancellations" />
        <div className="hidden xl:block" />
      </div>
    </div>
  );
}