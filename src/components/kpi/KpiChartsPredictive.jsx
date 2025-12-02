import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from "recharts";

function movingAverage(arr, windowSize) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = arr.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b.admissions, 0) / slice.length;
    out.push({ ...arr[i], ma: avg });
  }
  return out;
}

export default function KpiChartsPredictive({ all = [], startDate, endDate }) {
  const daily = React.useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const iso = (d) => d.toISOString().slice(0,10);
    const arr = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const day = iso(d);
      const adm = (all || []).filter(r => String(r.admission_date || "").slice(0,10) === day).length;
      arr.push({ date: day, admissions: adm });
    }
    return arr;
  }, [all, startDate, endDate]);

  const withMA = React.useMemo(() => movingAverage(daily, 7), [daily]);

  // naive forecast next 7 days = last 7-day average
  const forecast = React.useMemo(() => {
    if (!withMA.length) return [];
    const lastAvg = withMA[withMA.length - 1].ma || 0;
    const lastDate = new Date(withMA[withMA.length - 1].date);
    const out = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      out.push({ date: d.toISOString().slice(0,10), forecast: lastAvg });
    }
    return out;
  }, [withMA]);

  const combined = React.useMemo(() => {
    const m = new Map(withMA.map(x => [x.date, { date: x.date, admissions: x.admissions, ma: x.ma }]));
    forecast.forEach(f => {
      if (m.has(f.date)) m.get(f.date).forecast = f.forecast; else m.set(f.date, f);
    });
    return Array.from(m.values()).sort((a,b)=> a.date.localeCompare(b.date));
  }, [withMA, forecast]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3"><CardTitle className="text-sm">Admissions trend with 7-day average and naive 7-day forecast</CardTitle></CardHeader>
      <CardContent className="p-3">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={combined}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="admissions" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ma" name="7d avg" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}