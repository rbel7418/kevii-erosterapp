import React from "react";
import { AlertTriangle, CalendarDays, Bell } from "lucide-react";

export default function SplitHero({ compact = true }) {
  return (
    <div className={`${compact ? "max-w-6xl" : "max-w-7xl"} mx-auto px-3 sm:px-4`}>
      {/* Status rail */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 flex items-center gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5" /> 2 Staffing alerts
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-sky-50 text-sky-800 border border-sky-200">
          <CalendarDays className="w-3.5 h-3.5" /> 4 Open shifts
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 ml-auto">
          <Bell className="w-3.5 h-3.5" /> 3 unread
        </div>
      </div>
      {/* Nav bar */}
      <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">N</div>
          <div className="text-sm font-semibold text-slate-900">eRosterApp</div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <a className="px-3 py-1.5 rounded hover:bg-slate-50" href="#">Dashboard</a>
          <a className="px-3 py-1.5 rounded hover:bg-slate-50" href="#">Rotas</a>
          <a className="px-3 py-1.5 rounded hover:bg-slate-50" href="#">Requests</a>
          <a className="px-3 py-1.5 rounded hover:bg-slate-50" href="#">Reports</a>
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300" />
      </div>
    </div>
  );
}