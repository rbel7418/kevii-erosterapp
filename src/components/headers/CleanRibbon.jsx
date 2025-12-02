import React from "react";
import { LayoutDashboard, Calendar, MessageSquare, FileText } from "lucide-react";

export default function CleanRibbon({ compact = true }) {
  const nav = [
    { label: "Dashboard", Icon: LayoutDashboard },
    { label: "Rotas", Icon: Calendar },
    { label: "Requests", Icon: MessageSquare },
    { label: "Reports", Icon: FileText }
  ];
  return (
    <div className={`${compact ? "max-w-6xl" : "max-w-7xl"} mx-auto px-3 sm:px-4`}>
      <div className="mt-3 flex items-stretch gap-3">
        <div className="flex items-center gap-2 px-3 rounded-lg bg-[#005EB8] text-white shadow-sm">
          <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center text-xs font-bold">NHS</div>
          <div className="text-sm font-semibold">eRosterApp</div>
        </div>
        <div className="flex-1 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-between px-3">
          <div className="hidden md:flex items-center gap-1">
            {nav.map(({ label, Icon }) => (
              <button key={label} className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:underline underline-offset-4 flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-slate-500" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50">Tools</button>
            <button className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50">Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
}