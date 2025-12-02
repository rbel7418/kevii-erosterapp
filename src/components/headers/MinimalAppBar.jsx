import React from "react";
import { Search, ChevronRight } from "lucide-react";

export default function MinimalAppBar({ compact = true }) {
  return (
    <div className={`${compact ? "max-w-6xl" : "max-w-7xl"} mx-auto px-3 sm:px-4`}>
      <div className="mt-3 border-b border-slate-200">
        <div className="flex items-center gap-3 py-2">
          <div className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">N</div>
          <div className="text-xs text-slate-500 flex items-center">
            Home <ChevronRight className="w-3 h-3 mx-1 text-slate-400" /> Rota
          </div>
          <div className="ml-auto relative w-64 hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Search or type /" />
          </div>
        </div>
      </div>
    </div>
  );
}