
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ComposedChart, Brush } from "recharts";
import { Button } from "@/components/ui/button";

export default function KpiChartsOverall({ all = [], admissions = [], discharges = [], startDate, endDate }) {
  // Safe getters (new schema with fallbacks)
  const getDischargeDate = React.useCallback((r) => r?.date_discharge || r?.discharge_date || null, []);
  const getAge = React.useCallback((r) => {
    const a = Number(r?.age); if (Number.isFinite(a)) return a;
    const b = Number(r?.age_at_admission); if (Number.isFinite(b)) return b;
    try {
      if (r?.dob && r?.admission_date) {
        const dob = new Date(r.dob);
        const adm = new Date(r.admission_date);
        return Math.max(0, Math.floor((adm - dob) / (365.25*24*3600*1000)));
      }
    } catch {}
    return null;
  }, []);
  const getSpec = (r) => r?.speciality || r?.clinician_specialty_lead || "Unknown";

  // Helper: classify IP vs DC (same-day discharge = DC)
  const classifyType = React.useCallback((r) => {
    const ad = String(r?.admission_date || "").slice(0,10);
    const dd = String(r?.date_discharge || r?.discharge_date || "").slice(0,10);
    if (!ad) return "IP";
    if (dd && ad === dd) return "DC";
    return "IP";
  }, []);

  // Month helpers
  const monthKeysInRange = React.useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const arr = [];
    const d = new Date(s.getFullYear(), s.getMonth(), 1);
    while (d <= e) {
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`);
      d.setMonth(d.getMonth() + 1);
    }
    return arr;
  }, [startDate, endDate]);

  const fmtMonthLabel = (mk) => {
    const y = Number(mk.slice(0,4));
    const m = Number(mk.slice(5,7)) - 1;
    const d = new Date(y, m, 1);
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  };

  // Daily series
  const dailySeries = React.useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const iso = (d) => d.toISOString().slice(0,10);
    const arr = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const day = iso(d);
      const dayAdm = (all || []).filter(r => String(r.admission_date || "").slice(0,10) === day).length;
      const dayDis = (all || []).filter(r => String(getDischargeDate(r) || "").slice(0,10) === day).length;
      const census = (all || []).filter(r => {
        const a = String(r.admission_date || "").slice(0,10) <= day;
        const notDis = !getDischargeDate(r) || String(getDischargeDate(r)).slice(0,10) > day;
        return a && notDis;
      }).length;
      arr.push({ date: day, admissions: dayAdm, discharges: dayDis, census });
    }
    return arr;
  }, [all, startDate, endDate, getDischargeDate]);

  // REPLACE: old monthlyAgg with dynamic monthly IP/DC/Total
  const monthlyTypeAgg = React.useMemo(() => {
    const map = new Map(monthKeysInRange.map(m => [m, { month: m, label: fmtMonthLabel(m), IP: 0, DC: 0, Total: 0 }]));
    (all || []).forEach(r => {
      const mk = String(r.admission_date || "").slice(0,7);
      if (!mk || !map.has(mk)) return;
      const t = classifyType(r);
      const row = map.get(mk);
      row[t] += 1;
      row.Total += 1;
    });
    return Array.from(map.values());
  }, [all, monthKeysInRange, classifyType]);

  // Toggles for series
  const [showIP, setShowIP] = React.useState(true);
  const [showDC, setShowDC] = React.useState(true);
  const [showTotal, setShowTotal] = React.useState(true);

  // 2024 vs 2025 comparison (toggle IP/DC)
  const [compareType, setCompareType] = React.useState("IP"); // "IP" | "DC"
  const comp2425 = React.useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
    const arr = months.map((m, i) => ({
      month: m,
      label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
      y2024: 0,
      y2025: 0
    }));
    (all || []).forEach(r => {
      const admDate = String(r.admission_date || "");
      if (!admDate) return;
      const y = admDate.slice(0,4);
      if (y !== "2024" && y !== "2025") return;
      const m = admDate.slice(5,7);
      if (classifyType(r) !== compareType) return;
      const idx = Math.max(0, Math.min(11, Number(m) - 1));
      if (y === "2024") arr[idx].y2024 += 1;
      if (y === "2025") arr[idx].y2025 += 1;
    });
    return arr;
  }, [all, compareType, classifyType]);

  // 2024 consultant admissions (IP vs DC), top 10
  const consultant2024 = React.useMemo(() => {
    const by = new Map();
    (all || []).forEach(r => {
      const admDate = String(r.admission_date || "");
      if (!admDate) return;
      const y = admDate.slice(0,4);
      if (y !== "2024") return;
      const name = (r.consultant || r.clinician_lead || "Unknown").trim() || "Unknown";
      const t = classifyType(r);
      if (!by.has(name)) by.set(name, { consultant: name, IP: 0, DC: 0, Total: 0 });
      const row = by.get(name);
      row[t] += 1;
      row.Total += 1;
    });
    const arr = Array.from(by.values()).sort((a,b) => b.Total - a.Total).slice(0, 10);
    // sort for nicer horizontal chart (ascending so bars climb)
    return arr.sort((a,b) => a.Total - b.Total);
  }, [all, classifyType]);

  // Age distribution
  const ageBands = React.useMemo(() => {
    const buckets = { "0–17":0, "18–64":0, "65+":0 };
    (admissions || []).forEach(r => {
      const age = getAge(r);
      if (Number.isFinite(age)) {
        if (age <= 17) buckets["0–17"] += 1;
        else if (age <= 64) buckets["18–64"] += 1;
        else buckets["65+"] += 1;
      }
    });
    return Object.entries(buckets).map(([band, count]) => ({ band, count }));
  }, [admissions, getAge]);

  // Gender split by specialty
  const genderBySpec = React.useMemo(() => {
    const map = new Map();
    (admissions || []).forEach(r => {
      const spec = getSpec(r);
      const g = (r.gender || "Unknown").toString();
      if (!map.has(spec)) map.set(spec, { specialty: spec, Male:0, Female:0, Other:0, Unknown:0 });
      const row = map.get(spec);
      if (g.toLowerCase().startsWith("m")) row.Male += 1;
      else if (g.toLowerCase().startsWith("f")) row.Female += 1;
      else if (g) row.Other += 1;
      else row.Unknown += 1;
    });
    return Array.from(map.values()).sort((a,b) => (b.Male+b.Female+b.Other+b.Unknown) - (a.Male+a.Female+a.Other+a.Unknown)).slice(0,6);
  }, [admissions]);

  return (
    <div className="grid grid-cols-12 gap-3">
      {/* Visual 1: Daily trends (large) */}
      <div className="col-span-12 xl:col-span-6">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Daily admissions, discharges, and EOD census</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="admissions" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="discharges" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="census" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* REPLACED Visual 2: Dynamic Monthly IP/DC/Total (ComposedChart with toggles + brush) */}
      <div className="col-span-12 xl:col-span-6">
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Monthly admissions by type (IP / DC) and total</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Button size="sm" variant={showIP ? "default" : "outline"} onClick={() => setShowIP(v => !v)}>
                {showIP ? "Hide IP" : "Show IP"}
              </Button>
              <Button size="sm" variant={showDC ? "default" : "outline"} onClick={() => setShowDC(v => !v)}>
                {showDC ? "Hide DC" : "Show DC"}
              </Button>
              <Button size="sm" variant={showTotal ? "default" : "outline"} onClick={() => setShowTotal(v => !v)}>
                {showTotal ? "Hide Total" : "Show Total"}
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={monthlyTypeAgg}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {showIP && <Bar dataKey="IP" name="IP" fill="#0ea5e9" />}
                {showDC && <Bar dataKey="DC" name="DC" fill="#10b981" />}
                {showTotal && <Line type="monotone" dataKey="Total" name="Total" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />}
                <Brush dataKey="label" height={18} travellerWidth={8} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* NEW Visual: 2024 vs 2025 comparison for IP/DC */}
      <div className="col-span-12 lg:col-span-6">
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">2024 vs 2025 admissions — compare by type</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant={compareType === "IP" ? "default" : "outline"} onClick={() => setCompareType("IP")}>IP</Button>
                <Button size="sm" variant={compareType === "DC" ? "default" : "outline"} onClick={() => setCompareType("DC")}>DC</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comp2425}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="y2024" name="2024" fill="#0ea5e9" />
                <Bar dataKey="y2025" name="2025" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* NEW Visual: 2024 Consultant admissions (stacked IP vs DC, top 10) */}
      <div className="col-span-12 lg:col-span-6">
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Top consultants (2024) — IP vs DC</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consultant2024} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="consultant" width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="IP" stackId="a" fill="#0ea5e9" name="IP" />
                <Bar dataKey="DC" stackId="a" fill="#10b981" name="DC" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Visual 3: Age distribution */}
      <div className="col-span-12 md:col-span-4">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Age distribution of admitted patients</CardTitle></CardHeader>
          <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageBands}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="band" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Visual 4: Gender split by specialty */}
      <div className="col-span-12 md:col-span-8">
        <Card className="shadow-sm">
          <CardHeader className="py-3"><CardTitle className="text-sm">Gender split by specialty (top 6)</CardTitle></CardHeader>
        <CardContent className="p-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={genderBySpec}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="specialty" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Male" stackId="a" fill="#60a5fa" />
                <Bar dataKey="Female" stackId="a" fill="#f472b6" />
                <Bar dataKey="Other" stackId="a" fill="#a78bfa" />
                <Bar dataKey="Unknown" stackId="a" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
