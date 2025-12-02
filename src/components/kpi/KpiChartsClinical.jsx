
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, ScatterChart, Scatter, LineChart, Line } from "recharts";

export default function KpiChartsClinical({ all = [], admissions = [], discharges = [], startDate, endDate }) {
  const getConsultant = (r) => r?.consultant || r?.clinician_lead || "Unknown";
  const getSpec = (r) => r?.speciality || r?.clinician_specialty_lead || "Unknown";
  const getLOS = (r) => {
    const n = Number(r?.days_length);
    if (Number.isFinite(n)) return n;
    const m = Number(r?.length_of_stay_days);
    if (Number.isFinite(m)) return m;
    return 0;
  };
  const getDischargeDate = (r) => r?.date_discharge || r?.discharge_date || null;

  // Admissions by clinician (top 10)
  const byClinician = React.useMemo(() => {
    const map = new Map();
    (admissions || []).forEach(r => {
      const k = getConsultant(r);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([clinician, count]) => ({ clinician, count }))
      .sort((a,b) => b.count - a.count).slice(0,10);
  }, [admissions]);

  // Primary procedure frequency (top 10)
  const procFreq = React.useMemo(() => {
    const map = new Map();
    (admissions || []).forEach(r => {
      const k = r.primary_procedure || "Unknown";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([procedure, count]) => ({ procedure, count }))
      .sort((a,b)=> b.count - a.count).slice(0,10);
  }, [admissions]);

  // Specialty activity breakdown: stacked by procedure (top 5 specialties × top 5 procedures)
  const stackedSpecProc = React.useMemo(() => {
    const specs = {};
    (admissions || []).forEach(r => {
      const s = getSpec(r);
      const p = r.primary_procedure || "Unknown";
      if (!specs[s]) specs[s] = {};
      specs[s][p] = (specs[s][p] || 0) + 1;
    });
    const topSpecs = Object.entries(specs).map(([s,v]) => [s, Object.values(v).reduce((a,b)=>a+b,0)])
      .sort((a,b)=> b[1]-a[1]).slice(0,5).map(x=>x[0]);
    const allProcs = new Map();
    topSpecs.forEach(s => Object.keys(specs[s] || {}).forEach(p => allProcs.set(p, (allProcs.get(p)||0)+specs[s][p])));
    const topProcs = Array.from(allProcs.entries()).sort((a,b)=> b[1]-a[1]).slice(0,5).map(x=>x[0]);
    const data = topSpecs.map(s => {
      const row = { specialty: s };
      topProcs.forEach(p => row[p] = specs[s][p] || 0);
      return row;
    });
    return { data, topProcs };
  }, [admissions]);

  // Readmissions: count by week within range
  const readmitByWeek = React.useMemo(() => {
    const map = new Map(); // weekKey -> count
    const byPat = new Map();
    (all || []).forEach(r => {
      const k = String(r.patient_id || "");
      if (!k) return;
      if (!byPat.has(k)) byPat.set(k, []);
      byPat.get(k).push(r);
    });
    (all || []).forEach(a => {
      const list = (byPat.get(String(a.patient_id)) || []).sort((x,y)=> String(x.admission_date||"").localeCompare(String(y.admission_date||"")));
      const idx = list.findIndex(x => String(x.admission_date||"") === String(a.admission_date||""));
      if (idx >= 0 && getDischargeDate(a)) {
        const next = list.slice(idx+1).find(x => x.admission_date);
        if (next) {
          const gap = (() => {
            try { return Math.max(0, (new Date(next.admission_date) - new Date(getDischargeDate(a))) / (24*3600*1000)); } catch { return 999; }
          })();
          if (gap >= 0 && gap <= 30) {
            const wk = String(next.admission_date).slice(0,7);
            map.set(wk, (map.get(wk) || 0) + 1);
          }
        }
      }
    });
    return Array.from(map.entries()).map(([week, count]) => ({ week, count })).sort((a,b)=> a.week.localeCompare(b.week));
  }, [all]);

  // LOS outliers by specialty (box-plot proxy via avg and max)
  const losBySpec = React.useMemo(() => {
    const map = {};
    (discharges || []).forEach(r => {
      const s = getSpec(r);
      const los = Number(getLOS(r) ?? 0);
      if (!map[s]) map[s] = { specialty: s, sum:0, count:0, max:0 };
      map[s].sum += los;
      map[s].count += 1;
      map[s].max = Math.max(map[s].max, los);
    });
    return Object.values(map).map(x => ({ specialty: x.specialty, avg: x.count ? x.sum/x.count : 0, max: x.max }))
      .sort((a,b) => b.avg - a.avg).slice(0,10);
  }, [discharges]);

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 lg:col-span-6">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Admissions by clinician (top 10)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byClinician}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="clinician" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12 lg:col-span-6">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Primary procedure frequency (top 10)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={procFreq}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="procedure" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Specialty activity breakdown (stacked by procedure)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={stackedSpecProc.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="specialty" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {stackedSpecProc.topProcs.map((p, i) => (
                  <Bar key={p} dataKey={p} stackId="a" fill={["#60a5fa","#f59e0b","#ef4444","#10b981","#a78bfa"][i % 5]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Readmissions ≤30 days (by month)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={readmitByWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-12">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">LOS outliers by specialty (avg & max)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={losBySpec}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="specialty" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg" name="Average LOS" fill="#0ea5e9" />
                <Bar dataKey="max" name="Max LOS" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
