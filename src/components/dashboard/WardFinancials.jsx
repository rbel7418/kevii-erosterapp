
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

function cssVar(name, fallback) {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  } catch {
    return fallback;
  }
}

export default function WardFinancials({ wardMetrics, wardChartData, now }) {
  const COLORS = {
    billable: cssVar("--acc-2", "#16a34a"),
    toilHO: cssVar("--acc-3", "#0ea5e9"),
    toilPB: cssVar("--acc-4", "#f59e0b"),
  };

  const cards = (wardMetrics || []).map(w => {
    const total = Math.round((w.mtd.billable + w.mtd.toilHO + w.mtd.toilPB) * 10) / 10;
    return (
      <Card key={w.name} className="shadow-xl hover:shadow-2xl transition-shadow border-slate-200 rounded-xl" data-visual>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wide text-slate-800">{w.name}</CardTitle>
            <span className="text-xs text-slate-500">MTD as of {now ? new Date(now).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ""}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Donut */}
          <div className="flex items-center gap-4">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Billable", value: w.mtd.billable, color: COLORS.billable },
                      { name: "TOIL (HO)", value: w.mtd.toilHO, color: COLORS.toilHO },
                      { name: "TOIL Paid-back (PB)", value: w.mtd.toilPB, color: COLORS.toilPB }
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={78}
                    strokeWidth={2}
                    paddingAngle={2}
                  >
                    {[COLORS.billable, COLORS.toilHO, COLORS.toilPB].map((c, idx) => (
                      <Cell key={`cell-${idx}`} fill={c} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-[150px]">
              <div className="text-2xl font-bold text-slate-900">{total}h</div>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  { key: "billable", name: "Billable", value: w.mtd.billable, color: COLORS.billable },
                  { key: "toilHO", name: "TOIL (HO)", value: w.mtd.toilHO, color: COLORS.toilHO },
                  { key: "toilPB", name: "TOIL Paid-back (PB)", value: w.mtd.toilPB, color: COLORS.toilPB }
                ].map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600">{s.name}</span>
                    </div>
                    <span className="font-medium text-slate-900">{s.value}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* YTD metrics */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-[11px] text-slate-500">TOIL (HO)</div>
              <div className="text-sm font-semibold text-slate-900">{w.ytd.toilHO}h</div>
              <div className="text-[11px] text-slate-500">YTD</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-[11px] text-slate-500">Billable</div>
              <div className="text-sm font-semibold text-slate-900">{w.ytd.billable}h</div>
              <div className="text-[11px] text-slate-500">YTD</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-[11px] text-slate-500">TOIL Paid-back (PB)</div>
              <div className="text-sm font-semibold text-slate-900">{w.ytd.toilPB}h</div>
              <div className="text-[11px] text-slate-500">YTD</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  });

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">{cards}</div>

      <Card className="shadow-xl hover:shadow-2xl transition-shadow border-slate-200 rounded-xl" data-visual>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold">Ward Comparison (MTD)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="Ward" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Billable" stackId="a" fill={cssVar("--acc-2", "#16a34a")} />
                <Bar dataKey="TOIL (HO)" stackId="a" fill={cssVar("--acc-3", "#0ea5e9")} />
                <Bar dataKey="TOIL Paid-back (PB)" stackId="a" fill={cssVar("--acc-4", "#f59e0b")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
