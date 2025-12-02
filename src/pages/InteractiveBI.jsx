
import React from "react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { Shift } from "@/entities/Shift";
import { Department } from "@/entities/Department";
import { Role } from "@/entities/Role";
import { Employee } from "@/entities/Employee";
import { ShiftCode } from "@/entities/ShiftCode";
import ReorderableArea from "@/components/common/ReorderableArea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";
import { Filter, X, ChevronLeft, ChevronRight, PieChart as PieIcon, BarChart3 } from "lucide-react";

export default function InteractiveBIDashboard() {
  // Data
  const [shifts, setShifts] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [shiftCodes, setShiftCodes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Slicers
  const now = React.useMemo(() => new Date(), []);
  const [dateStart, setDateStart] = React.useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateEnd, setDateEnd] = React.useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [deptSel, setDeptSel] = React.useState(new Set());
  const [roleSel, setRoleSel] = React.useState(new Set());
  const [employeeSel, setEmployeeSel] = React.useState(new Set());

  // Cross-filter interactions
  const [crossHighlights, setCrossHighlights] = React.useState({
    department_id: null,
    role_id: null,
  });

  // Drill state for time series
  const [drill, setDrill] = React.useState({ level: "year", year: null, month: null }); // month: 1..12

  // NEW: local edit + selection + api for layout
  const [edit, setEdit] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const apiRef = React.useRef(null);
  const registerApi = React.useCallback((api) => { apiRef.current = api; }, []);
  const resetLayout = React.useCallback(() => {
    try { localStorage.removeItem("interactive_bi_layout"); } catch {}
    // simple refresh to re-mount layout cleanly
    window.location.reload();
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const [sh, ds, rs, es, sc] = await Promise.all([
        Shift.list(),
        Department.list(),
        Role.list(),
        Employee.list(),
        ShiftCode.list()
      ]);
      setShifts(sh || []);
      setDepartments(ds || []);
      setRoles(rs || []);
      setEmployees(es || []);
      setShiftCodes(sc || []);
      setLoading(false);
    })();
  }, []);

  // Maps
  const deptMap = React.useMemo(() => {
    const m = {};
    departments.forEach(d => m[d.id] = d);
    return m;
  }, [departments]);
  const roleMap = React.useMemo(() => {
    const m = {};
    roles.forEach(r => m[r.id] = r);
    return m;
  }, [roles]);
  const empMap = React.useMemo(() => {
    const m = {};
    employees.forEach(e => m[e.id] = e);
    return m;
  }, [employees]);
  const shiftCodeMeta = React.useMemo(() => {
    const m = {};
    shiftCodes.forEach(sc => { if (sc?.code) m[String(sc.code).toUpperCase()] = sc; });
    return m;
  }, [shiftCodes]);

  // Helpers
  const safeDate = (v) => {
    try {
      if (!v) return null;
      const d = typeof v === "string" ? parseISO(v) : v;
      return isNaN(d?.getTime?.()) ? null : d;
    } catch { return null; }
  };
  const calcHours = (s) => {
    const code = String(s.shift_code || "").toUpperCase();
    const weighted = shiftCodeMeta[code]?.weighted_hours;
    if (typeof weighted === "number" && !Number.isNaN(weighted)) return weighted;
    // fallback by time
    const st = s?.start_time, et = s?.end_time;
    if (!st || !et) return 12;
    const [sh, sm] = String(st).split(":").map(Number);
    const [eh, em] = String(et).split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    mins -= Number(s?.break_minutes || 0);
    return Math.max(0, mins / 60);
  };

  // Apply slicers + cross filters
  const filtered = React.useMemo(() => {
    const start = safeDate(dateStart);
    const end = safeDate(dateEnd);
    const deptActive = deptSel.size > 0;
    const roleActive = roleSel.size > 0;
    const empActive = employeeSel.size > 0;

    return (shifts || []).filter(s => {
      if (s.status === "cancelled") return false;
      const d = safeDate(s.date);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      if (deptActive && s.department_id && !deptSel.has(s.department_id)) return false;
      if (roleActive && s.role_id && !roleSel.has(s.role_id)) return false;
      if (empActive && s.employee_id && !employeeSel.has(s.employee_id)) return false;

      // cross highlight if present (restrict dataset)
      if (crossHighlights.department_id && s.department_id !== crossHighlights.department_id) return false;
      if (crossHighlights.role_id && s.role_id !== crossHighlights.role_id) return false;

      return true;
    });
  }, [shifts, dateStart, dateEnd, deptSel, roleSel, employeeSel, crossHighlights]);

  // KPI
  const kpis = React.useMemo(() => {
    let count = 0, hours = 0, open = 0;
    filtered.forEach(s => {
      count += 1;
      hours += calcHours(s);
      if (s.is_open) open += 1;
    });
    const assigned = filtered.filter(s => !!s.employee_id).length;
    const fillRate = count ? Math.round((assigned / count) * 1000) / 10 : 0;
    return {
      count,
      hours: Math.round(hours * 10) / 10,
      open,
      fillRate
    };
  }, [filtered]);

  // Groupings
  const timeData = React.useMemo(() => {
    // Drill: year -> month -> day within selection
    const byKey = {};
    filtered.forEach(s => {
      const d = safeDate(s.date);
      if (!d) return;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      let key = "";
      if (drill.level === "year") {
        key = String(y);
      } else if (drill.level === "month") {
        if (drill.year && y !== drill.year) return;
        key = `${y}-${String(m).padStart(2,"0")}`;
      } else {
        if (drill.year && y !== drill.year) return;
        if (drill.month && m !== drill.month) return;
        key = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      }
      byKey[key] = (byKey[key] || 0) + 1;
    });
    const arr = Object.entries(byKey).sort((a,b) => a[0].localeCompare(b[0])).map(([k,v]) => ({ key: k, Shifts: v }));
    return arr;
  }, [filtered, drill]);

  const deptData = React.useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const id = s.department_id || "_none";
      map[id] = (map[id] || 0) + 1;
    });
    return Object.entries(map).map(([id, v]) => ({
      id,
      name: id === "_none" ? "Unassigned" : (deptMap[id]?.name || "Dept"),
      Shifts: v
    })).sort((a,b)=>b.Shifts - a.Shifts);
  }, [filtered, deptMap]);

  const roleData = React.useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const id = s.role_id || "_none";
      map[id] = (map[id] || 0) + calcHours(s);
    });
    return Object.entries(map).map(([id, v]) => ({
      id,
      name: id === "_none" ? "Unassigned" : (roleMap[id]?.name || "Role"),
      Hours: Math.round(v * 10) / 10
    })).sort((a,b)=>b.Hours - a.Hours);
  }, [filtered, roleMap]);

  const topStaff = React.useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const id = s.employee_id || "_none";
      map[id] = (map[id] || 0) + calcHours(s);
    });
    return Object.entries(map).map(([id, v]) => ({
      id,
      name: id === "_none" ? "Unassigned" : (empMap[id]?.full_name || "Staff"),
      Hours: Math.round(v * 10) / 10
    })).sort((a,b)=>b.Hours - a.Hours).slice(0, 20);
  }, [filtered, empMap]);

  // UI helpers
  const toggleSet = (set, id) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const clearAll = () => {
    setDeptSel(new Set());
    setRoleSel(new Set());
    setEmployeeSel(new Set());
    setCrossHighlights({ department_id: null, role_id: null });
    setDrill({ level: "year", year: null, month: null });
  };

  // Colors
  const cssVar = (name, fallback) => {
    try {
      const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return val || fallback;
    } catch { return fallback; }
  };

  // Layout items with ReorderableArea (draggable + resizable)
  const items = [
    {
      id: "kpis",
      title: "KPIs",
      defaultHeightPx: 150,
      content: () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card data-visual>
            <CardHeader className="py-3"><CardTitle className="text-xs text-slate-500">Shifts</CardTitle></CardHeader>
            <CardContent className="pt-0 text-2xl font-bold">{kpis.count}</CardContent>
          </Card>
          <Card data-visual>
            <CardHeader className="py-3"><CardTitle className="text-xs text-slate-500">Hours</CardTitle></CardHeader>
            <CardContent className="pt-0 text-2xl font-bold">{kpis.hours}h</CardContent>
          </Card>
          <Card data-visual>
            <CardHeader className="py-3"><CardTitle className="text-xs text-slate-500">Open shifts</CardTitle></CardHeader>
            <CardContent className="pt-0 text-2xl font-bold">{kpis.open}</CardContent>
          </Card>
          <Card data-visual>
            <CardHeader className="py-3"><CardTitle className="text-xs text-slate-500">Fill rate</CardTitle></CardHeader>
            <CardContent className="pt-0 text-2xl font-bold">{kpis.fillRate}%</CardContent>
          </Card>
        </div>
      )
    },
    {
      id: "time",
      title: `Shifts over time (${drill.level})`,
      defaultHeightPx: 300,
      content: (st) => (
        <div className="h-[220px]" style={{ height: st?.heightPx ? `${st.heightPx - 60}px` : undefined }}>
          <div className="flex items-center gap-2 mb-2">
            <Button size="sm" variant="outline" onClick={()=>{
              if (drill.level === "day") setDrill({ level:"month", year: drill.year, month: null });
              else if (drill.level === "month") setDrill({ level:"year", year: null, month: null });
            }} disabled={drill.level==="year"} className="h-8">
              <ChevronLeft className="w-4 h-4 mr-1" /> Up
            </Button>
            <div className="text-xs text-slate-600">
              {drill.level==="year" ? "All years" :
                drill.level==="month" ? `Year ${drill.year}` :
                `Year ${drill.year} • Month ${String(drill.month).padStart(2,"0")}`}
            </div>
          </div >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Shifts" fill={cssVar("--acc-1","#0b5ed7")} onClick={(d)=>{
                const key = d?.activePayload?.[0]?.payload?.key;
                if (!key) return;
                if (drill.level==="year") {
                  const y = Number(key);
                  setDrill({ level:"month", year: y, month: null });
                } else if (drill.level==="month") {
                  const [y, m] = key.split("-").map(Number);
                  setDrill({ level:"day", year: y, month: m });
                }
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    },
    {
      id: "dept",
      title: "Shifts by department",
      defaultHeightPx: 300,
      content: (st) => (
        <div className="h-[220px]" style={{ height: st?.heightPx ? `${st.heightPx - 60}px` : undefined }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="Shifts"
                fill={cssVar("--acc-2","#0ea5e9")}
                onClick={(d) => {
                  const id = d?.activePayload?.[0]?.payload?.id;
                  if (!id) return;
                  setCrossHighlights(prev => ({
                    ...prev,
                    department_id: prev.department_id === id ? null : id
                  }));
                }}
              />
            </BarChart>
          </ResponsiveContainer>
          {crossHighlights.department_id && (
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <Badge variant="outline">Filtered: {deptMap[crossHighlights.department_id]?.name || "Dept"}</Badge>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={()=>setCrossHighlights(p=>({...p, department_id:null}))}><X className="w-4 h-4" /> Clear</Button>
            </div>
          )}
        </div>
      )
    },
    {
      id: "role",
      title: "Hours by role",
      defaultHeightPx: 300,
      content: (st) => (
        <div className="h-[220px]" style={{ height: st?.heightPx ? `${st.heightPx - 60}px` : undefined }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={roleData} dataKey="Hours" nameKey="name" innerRadius={45} outerRadius={70} onClick={(p)=>{
                const id = p?.payload?.id;
                if (!id) return;
                setCrossHighlights(prev => ({
                  ...prev,
                  role_id: prev.role_id === id ? null : id
                }));
              }}>
                {roleData.map((e,i)=>(
                  <Cell key={i} fill={cssVar(`--acc-${(i%5)+1}`, "#0b5ed7")} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {crossHighlights.role_id && (
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <Badge variant="outline">Filtered: {roleMap[crossHighlights.role_id]?.name || "Role"}</Badge>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={()=>setCrossHighlights(p=>({...p, role_id:null}))}><X className="w-4 h-4" /> Clear</Button>
            </div>
          )}
        </div>
      )
    },
    {
      id: "trend",
      title: "Worked hours trend",
      defaultHeightPx: 280,
      content: (st) => {
        const daily = {};
        filtered.forEach(s => {
          const k = s.date;
          daily[k] = (daily[k] || 0) + calcHours(s);
        });
        const series = Object.entries(daily).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>({ date:k, Hours: Math.round(v*10)/10 }));
        return (
          <div className="h-[200px]" style={{ height: st?.heightPx ? `${st.heightPx - 60}px` : undefined }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Hours" stroke={cssVar("--acc-3","#8b5cf6")} fill={cssVar("--acc-3","#8b5cf6")} fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      }
    },
    {
      id: "table",
      title: "Top staff by hours",
      defaultHeightPx: 360,
      content: (st) => (
        <div className="overflow-auto" style={{ maxHeight: st?.heightPx ? `${st.heightPx - 60}px` : "260px" }}>
          <table className="min-w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-2 px-2">Staff</th>
                <th className="text-right py-2 px-2">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topStaff.map(row => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={()=>{
                    if (row.id === "_none") return;
                    setEmployeeSel(prev => {
                      const next = new Set(prev);
                      if (next.has(row.id)) next.delete(row.id);
                      else { next.clear(); next.add(row.id); }
                      return next;
                    });
                  }}
                >
                  <td className="py-2 px-2">{row.name}</td>
                  <td className="py-2 px-2 text-right">{row.Hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {employeeSel.size > 0 && (
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <Badge variant="outline">Staff filtered</Badge>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={()=>setEmployeeSel(new Set())}><X className="w-4 h-4" /> Clear</Button>
            </div>
          )}
        </div>
      )
    }
  ];

  const deptSelectedLabels = Array.from(deptSel).map(id => deptMap[id]?.name).filter(Boolean);
  const roleSelectedLabels = Array.from(roleSel).map(id => roleMap[id]?.name).filter(Boolean);

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <h1 className="text-lg font-semibold">Interactive BI</h1>
            {loading && <span className="text-xs text-slate-500">Loading…</span>}
          </div>
          {/* NEW: edit controls */}
          <div className="flex items-center gap-2">
            <Button variant={edit ? "default" : "outline"} className="h-8" onClick={() => setEdit(v => !v)}>
              {edit ? "Done" : "Edit layout"}
            </Button>
            <Button variant="outline" className="h-8" onClick={resetLayout}>Reset layout</Button>
            <Button variant="outline" size="sm" className="h-8" onClick={clearAll}>
              <X className="w-4 h-4 mr-1" />Clear all
            </Button>
          </div>
        </div>

        {/* Slicers */}
        <Card className="shadow-sm" data-visual>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-sky-600" /> Slicers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Date range */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-600 w-16">From</div>
                <Input type="date" value={dateStart} onChange={(e)=>setDateStart(e.target.value)} className="h-8" />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-600 w-16">To</div>
                <Input type="date" value={dateEnd} onChange={(e)=>setDateEnd(e.target.value)} className="h-8" />
              </div>

              {/* Department multi-select */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-8">
                      Departments {deptSel.size>0 && <Badge variant="secondary" className="ml-2">{deptSel.size}</Badge>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-2 w-64">
                    <div className="max-h-60 overflow-auto space-y-1">
                      {departments.map(d => (
                        <label key={d.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                          <Checkbox checked={deptSel.has(d.id)} onCheckedChange={()=>setDeptSel(s=>toggleSet(s, d.id))} />
                          <span className="text-sm">{d.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Button size="sm" variant="ghost" className="h-7" onClick={()=>setDeptSel(new Set())}>Clear</Button>
                      <Button size="sm" variant="outline" className="h-7" onClick={()=>setDeptSel(new Set(departments.map(d=>d.id)))}>Select all</Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="hidden md:flex flex-wrap gap-1">
                  {deptSelectedLabels.slice(0,3).map((n,i)=><Badge key={i} variant="outline">{n}</Badge>)}
                  {deptSelectedLabels.length>3 && <Badge variant="secondary">+{deptSelectedLabels.length-3}</Badge>}
                </div>
              </div>

              {/* Role multi-select */}
              <div className="flex items-center gap-2 md:col-span-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-8">
                      Roles {roleSel.size>0 && <Badge variant="secondary" className="ml-2">{roleSel.size}</Badge>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-2 w-64">
                    <div className="max-h-60 overflow-auto space-y-1">
                      {roles.map(r => (
                        <label key={r.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                          <Checkbox checked={roleSel.has(r.id)} onCheckedChange={()=>setRoleSel(s=>toggleSet(s, r.id))} />
                          <span className="text-sm">{r.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Button size="sm" variant="ghost" className="h-7" onClick={()=>setRoleSel(new Set())}>Clear</Button>
                      <Button size="sm" variant="outline" className="h-7" onClick={()=>setRoleSel(new Set(roles.map(r=>r.id)))}>Select all</Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movable/resizable visual area */}
        <ReorderableArea
          storageKey="interactive_bi_layout"
          editMode={edit}
          layoutMode="grid"
          items={items}
          registerApi={registerApi}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
    </div>
  );
}
