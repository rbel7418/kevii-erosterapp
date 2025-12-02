
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from "recharts";

export default function KpiChartsFinancial({ all = [], admissions = [], discharges = [], startDate, endDate }) {
  const getFunding = (r) => r?.funding_source || r?.purchaser || "Unknown";

  // Case volume by purchaser
  const volumeByPurchaser = React.useMemo(() => {
    const map = new Map();
    (admissions || []).forEach(r => {
      const k = getFunding(r);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([purchaser, count]) => ({ purchaser, count }))
      .sort((a,b)=> b.count - a.count).slice(0,10);
  }, [admissions]);

  // LOS by purchaser (avg)
  const losByPurchaser = React.useMemo(() => {
    const map = {};
    (discharges || []).forEach(r => {
      const k = getFunding(r);
      const los = Number(r.days_length ?? r.length_of_stay_days ?? 0);
      if (!map[k]) map[k] = { purchaser: k, sum:0, count:0 };
      map[k].sum += los;
      map[k].count += 1;
    });
    return Object.values(map).map(x => ({ purchaser: x.purchaser, alos: x.count ? x.sum/x.count : 0 }))
      .sort((a,b)=> b.alos - a.alos).slice(0,10);
  }, [discharges]);

  // Procedure mix by purchaser (stacked)
  const mixByPurchaser = React.useMemo(() => {
    const base = {};
    (admissions || []).forEach(r => {
      const pu = getFunding(r);
      const pr = r.primary_procedure || "Unknown";
      if (!base[pu]) base[pu] = {};
      base[pu][pr] = (base[pu][pr] || 0) + 1;
    });
    const topPurchasers = Object.entries(base).map(([k,v]) => [k, Object.values(v).reduce((a,b)=>a+b,0)])
      .sort((a,b)=> b[1]-a[1]).slice(0,6).map(x=>x[0]);
    const procTotals = {};
    topPurchasers.forEach(pu => {
      Object.entries(base[pu] || {}).forEach(([pr, cnt]) => {
        procTotals[pr] = (procTotals[pr] || 0) + cnt;
      });
    });
    const topProcs = Object.entries(procTotals).sort((a,b)=> b[1]-a[1]).slice(0,6).map(x=>x[0]);
    const data = topPurchasers.map(pu => {
      const row = { purchaser: pu };
      topProcs.forEach(pr => row[pr] = (base[pu] && base[pu][pr]) ? base[pu][pr] : 0);
      return row;
    });
    return { data, topProcs };
  }, [admissions]);

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 md:col-span-6">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Case volume by purchaser (top 10)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volumeByPurchaser}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="purchaser" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 md:col-span-6">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">ALOS by purchaser (top 10)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={losByPurchaser}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="purchaser" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="alos" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Procedure mix by purchaser (top 6 × top 6)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={mixByPurchaser.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="purchaser" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {mixByPurchaser.topProcs.map((pr, i) => (
                  <Bar key={pr} dataKey={pr} stackId="a" fill={["#60a5fa","#a78bfa","#10b981","#f59e0b","#ef4444","#94a3b8"][i % 6]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
