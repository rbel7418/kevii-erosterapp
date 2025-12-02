
import React from "react";

export default function Availability() {
  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      {/* CHANGED: full width */}
      <div className="w-full space-y-4">
        {/* Page action bar (very top under blue bar) */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-slate-900">Availability</h1>
          <div className="text-sm text-slate-500">Coming soon</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 text-slate-600">
          Collect and manage staff availability here.
        </div>
      </div>
    </div>
  );
}
