import React from "react";
import { LayoutDashboard, Calendar, MessageSquare, FileText } from "lucide-react";

export default function CardDock({ compact = true }) {
  const nav = [
    { label: "Dashboard", Icon: LayoutDashboard },
    { label: "Rotas", Icon: Calendar },
    { label: "Requests", Icon: MessageSquare },
    { label: "Reports", Icon: FileText }
  ];
  return (
    <div className={`${compact ? "max-w-6xl" : "max-w-7xl"} mx-auto px-3 sm:px-4`}>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">N</div>
          <div className="text-sm font-semibold text-slate-900">eRosterApp</div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          {nav.map(({ label, Icon }) => (
            <div key={label} className="px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition flex items-center gap-2">
              <Icon className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-medium text-slate-800">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300" />
        </div>
      </div>
    </div>
  );
}