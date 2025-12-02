import React from "react";
import { Bell, Sun, Moon, LayoutDashboard, Calendar, FileText, MessageSquare } from "lucide-react";

export default function NhsBlueGlassy({ compact = true }) {
  const [dark, setDark] = React.useState(false);
  const nav = [
    { label: "Dashboard", Icon: LayoutDashboard },
    { label: "Rotas", Icon: Calendar },
    { label: "Requests", Icon: MessageSquare },
    { label: "Reports", Icon: FileText }
  ];
  return (
    <div className={`${dark ? "theme-dark" : ""}`}>
      <div className={`mx-auto ${compact ? "max-w-6xl" : "max-w-7xl"} px-3 sm:px-4`}>
        <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#005EB8] text-white flex items-center justify-center text-xs font-bold">
                NHS
              </div>
              <div className="text-sm font-semibold text-slate-900">eRosterApp</div>
            </div>

            {/* Center: Nav pills */}
            <div className="hidden md:flex items-center gap-1 mx-auto">
              {nav.map(({ label, Icon }) => (
                <button
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200/80 bg-white/70 hover:bg-white/90 shadow-sm transition">
                  <Icon className="w-3.5 h-3.5 text-sky-600" />
                  {label}
                </button>
              ))}
            </div>

            {/* Right: Utilities */}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                className="h-8 w-8 rounded-full border border-slate-200/70 bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center transition"
                onClick={() => setDark(v => !v)}
                title="Toggle theme"
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button className="relative h-8 w-8 rounded-full border border-slate-200/70 bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center transition">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 inline-block h-2.5 w-2.5 bg-red-500 rounded-full" />
              </button>
              <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}