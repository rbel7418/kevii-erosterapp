import React from "react";
import { format as dfFormat, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Info } from "lucide-react";
import { Employee, Department, Shift, ShiftCode } from "@/entities/all";
import { enqueueShiftCreate } from "@/components/utils/shiftQueue";
import { enqueueShiftDelete } from "@/components/utils/deleteQueue";

/* ---------- Balanced randomiser with 13-shift target ---------- */
export function generateFairSchedule(
  staffList,
  startDate,
  endDate,
  maxWorkPerStaff = 13,
  weekendOffRatio = 0.5,
  minWorkingPerDay = 1
) {
  // build date array [inclusive, inclusive]
  const dates = [];
  for (let d = new Date(startDate); d <= endDate; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  const D = dates.length, N = staffList.length;
  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

  // per-staff state
  const st = Object.fromEntries(
    staffList.map(n => {
      const cap = Math.min(maxWorkPerStaff, D);
      return [n, { work: 0, off: 0, offNeed: Math.max(0, D - cap), last: null, consec: 0 }];
    })
  );

  // daily OFF quotas: weekends first, then spread remainder across weekdays
  const quotas = Array(D).fill(0);
  for (let i = 0; i < D; i++) if (isWeekend(dates[i])) quotas[i] = Math.floor(N * weekendOffRatio);
  const totalOffNeed = staffList.reduce((z, n) => z + st[n].offNeed, 0);
  let wkndSum = quotas.reduce((a, b) => a + b, 0);
  let left = totalOffNeed - wkndSum;

  const capQ = (q) => Math.min(q, N - minWorkingPerDay);
  if (left < 0) {
    for (let i = 0; i < D && left < 0; i++) if (isWeekend(dates[i])) {
      const cut = Math.min(capQ(quotas[i]), -left);
      quotas[i] -= cut; left += cut;
    }
  } else if (left > 0) {
    const weekdays = []; for (let i = 0; i < D; i++) if (!isWeekend(dates[i])) weekdays.push(i);
    const M = weekdays.length || D;
    for (let k = 0; k < left; k++) quotas[weekdays.length ? weekdays[k % M] : (k % D)] += 1;
  }
  for (let i = 0; i < D; i++) quotas[i] = capQ(quotas[i]);

  // constraints
  const canPlaceStrict = (n, shift) => {
    const s = st[n];
    const nextConsec = s.last === shift ? s.consec + 1 : 1;
    if (nextConsec > 3) return false;
    if ((s.last === "LD" && shift === "LN") || (s.last === "LN" && shift === "LD")) return false;
    if (shift !== "OFF" && s.work >= Math.min(maxWorkPerStaff, D)) return false;
    return true;
  };
  // allow flip relaxation only to meet 13 target, still respect run-length and cap
  const canPlaceRelaxFlip = (n, shift) => {
    const s = st[n];
    const nextConsec = s.last === shift ? s.consec + 1 : 1;
    if (nextConsec > 3) return false;
    if (s.work >= Math.min(maxWorkPerStaff, D)) return false;
    return true;
  };
  const place = (n, shift) => {
    const s = st[n];
    if (shift === "OFF") s.off += 1; else s.work += 1;
    if (s.last === shift) s.consec += 1; else { s.last = shift; s.consec = 1; }
  };
  const offDebt = (n, dayIdx) => {
    const s = st[n];
    if (s.offNeed === 0) return -1e9;
    const expected = (s.offNeed * (dayIdx + 1)) / D;
    return expected - s.off;
  };
  const workDebt = (n, dayIdx) => {
    const cap = Math.min(maxWorkPerStaff, D);
    const expected = (cap * (dayIdx + 1)) / D;
    return expected - st[n].work;
  };

  // init schedule to OFF
  const schedule = Object.fromEntries(staffList.map(n => [n, Array(D).fill("OFF")]));

  for (let di = 0; di < D; di++) {
    // 1) choose OFFs for the day using off-debt
    const offQuota = quotas[di];
    const candidates = staffList
      .filter(n => st[n].off < st[n].offNeed && canPlaceStrict(n, "OFF"))
      .map(n => [n, offDebt(n, di)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, offQuota)
      .map(x => x[0]);
    const offSet = new Set(candidates);
    for (const n of offSet) { schedule[n][di] = "OFF"; place(n, "OFF"); }

    // 2) assign LD/LN prioritising those behind work target
    const remaining = staffList
      .filter(n => !offSet.has(n))
      .sort((a, b) => workDebt(b, di) - workDebt(a, di));

    let ldNeed = Math.floor(remaining.length / 2), lnNeed = remaining.length - ldNeed;

    // keep previous shift first to avoid flips
    for (const n of remaining) {
      if (schedule[n][di] !== "OFF") continue;
      if (st[n].last === "LD" && ldNeed > 0 && canPlaceStrict(n, "LD")) {
        schedule[n][di] = "LD"; place(n, "LD"); ldNeed--;
      } else if (st[n].last === "LN" && lnNeed > 0 && canPlaceStrict(n, "LN")) {
        schedule[n][di] = "LN"; place(n, "LN"); lnNeed--;
      }
    }
    // fill remaining balancing LD/LN
    for (const n of remaining) {
      if (schedule[n][di] !== "OFF") continue;
      const canLD = canPlaceStrict(n, "LD"), canLN = canPlaceStrict(n, "LN");
      let pick = null;
      if (canLD && canLN) pick = ldNeed >= lnNeed ? "LD" : "LN";
      else if (canLD) pick = "LD";
      else if (canLN) pick = "LN";

      // last-chance: if still OFF but under 13, relax flip to meet target
      if (!pick && st[n].work < Math.min(maxWorkPerStaff, D)) {
        const alt = st[n].last === "LD" ? "LN" : "LD";
        if (canPlaceRelaxFlip(n, alt)) pick = alt;
      }

      if (pick) {
        schedule[n][di] = pick; place(n, pick);
        if (pick === "LD") ldNeed--; else lnNeed--;
      }
    }

    // 3) guarantee minimum coverage
    const workers = remaining.filter(n => schedule[n][di] !== "OFF").length;
    if (workers < minWorkingPerDay) {
      const pool = remaining.filter(n => schedule[n][di] === "OFF" && canPlaceRelaxFlip(n, "LD"));
      if (pool.length) { const n = pool[0]; schedule[n][di] = "LD"; place(n, "LD"); }
    }
  }

  return { dates, schedule };
}

/* ---------- UI component ---------- */
export default function ShiftRandomiser({ onClose = () => {}, className = "" }) {
  const [departments, setDepartments] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [shifts, setShifts] = React.useState([]);
  const [shiftCodes, setShiftCodes] = React.useState([]);

  const [deptId, setDeptId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [replaceExisting, setReplaceExisting] = React.useState(false);
  const [showRules, setShowRules] = React.useState(false);

  const [preview, setPreview] = React.useState(null);
  const [applying, setApplying] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const [d, e, s, c] = await Promise.all([
        Department.list().catch(() => []),
        Employee.list().catch(() => []),
        Shift.list().catch(() => []),
        ShiftCode.list().catch(() => [])
      ]);
      setDepartments(d || []);
      setEmployees(e || []);
      setShifts(s || []);
      setShiftCodes(c || []);
    })();
  }, []);

  // defaults by code for preview rendering and times
  const codeDefaults = React.useMemo(() => {
    const m = {};
    (shiftCodes || []).forEach(c => {
      const k = String(c.code || "").toUpperCase();
      if (k) m[k] = {
        start: c.default_start_time ?? null,
        end: c.default_end_time ?? null,
        brk: typeof c.default_break_minutes === "number" ? c.default_break_minutes : 0
      };
    });
    m.LD = m.LD || { start: "08:00", end: "20:00", brk: 60 };
    m.LN = m.LN || { start: "20:00", end: "08:00", brk: 30 };
    m.OFF = m.OFF || { start: null, end: null, brk: 0 };
    return m;
  }, [shiftCodes]);

  // code -> meta, including ID for API
  const codeIndex = React.useMemo(() => {
    const idx = {};
    (shiftCodes || []).forEach(sc => {
      const k = String(sc.code || "").trim().toUpperCase();
      if (!k) return;
      idx[k] = {
        id: sc.id ?? null,
        start: sc.default_start_time ?? null,
        end: sc.default_end_time ?? null,
        brk: typeof sc.default_break_minutes === "number" ? sc.default_break_minutes : 0
      };
    });
    if (!idx.OFF) idx.OFF = { id: null, start: null, end: null, brk: 0 };
    return idx;
  }, [shiftCodes]);

  const deptStaff = React.useMemo(() => {
    return (employees || []).filter(e => e.is_active !== false && e.department_id === deptId);
  }, [employees, deptId]);

  const handlePreview = () => {
    if (!deptId || !startDate || !endDate) return;
    const staffNames = deptStaff.map(e => e.full_name || e.user_email || e.id);
    if (staffNames.length === 0) return;
    const { dates, schedule } = generateFairSchedule(
      staffNames,
      parseISO(startDate),
      parseISO(endDate),
      13
    );
    setPreview({ dates, schedule, staff: staffNames });
  };

  const handleApply = async () => {
    if (!preview) return;
    setApplying(true);
    try {
      // optional clear
      if (replaceExisting) {
        const toDelete = (shifts || []).filter(s => {
          if (s.department_id !== deptId) return false;
          if (s.date < startDate || s.date > endDate) return false;
          return true;
        });
        for (const s of toDelete) {
          await enqueueShiftDelete(s.id);
        }
      }

      const empByName = {};
      deptStaff.forEach(e => {
        empByName[e.full_name || e.user_email || e.id] = e;
      });

      // create shifts INCLUDING OFF
      for (const name of preview.staff) {
        const emp = empByName[name];
        if (!emp) continue;

        for (let i = 0; i < preview.dates.length; i++) {
          const code = String(preview.schedule[name][i] || "").toUpperCase();
          if (!code) continue;

          const meta = codeIndex[code] || { id: null, start: null, end: null, brk: 0 };
          const dStr = dfFormat(preview.dates[i], "yyyy-MM-dd");

          await enqueueShiftCreate({
            employee_id: emp.id,
            department_id: deptId,
            role_id: null,
            date: dStr,
            shift_code: code,
            ...(meta.id ? { shift_code_id: meta.id } : {}),
            start_time: meta.start ?? (code === "OFF" ? "00:00" : "09:00"),
            end_time:   meta.end   ?? (code === "OFF" ? "00:00" : "17:00"),
            break_minutes: typeof meta.brk === "number" ? meta.brk : 0,
            status: "scheduled",
            is_open: false
          });
        }
      }

      alert("Shifts applied successfully.");
      setPreview(null);
    } catch (e) {
      alert("Failed to apply: " + (e?.message || e));
    } finally {
      setApplying(false);
    }
  };

  const handleClearRange = () => setPreview(null);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-xl ${className}`}>
      <Card className="border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold">Shift Randomiser</CardTitle>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-slate-600 mb-1">Department</div>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-slate-600">Date range</div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={replaceExisting} onCheckedChange={setReplaceExisting} id="replace" />
            <label htmlFor="replace" className="text-sm text-slate-600">Replace existing shifts in range</label>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button type="button" onClick={() => setShowRules(!showRules)} className="flex items-center gap-1 hover:text-slate-700">
              <Info className="w-4 h-4" />
              Show rules
            </button>
            <span>13-shift target. Balanced OFF pacing. No LD↔LN flips unless needed.</span>
          </div>

          {showRules && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
              • Each staff: 13 shifts per period<br/>
              • OFFs paced daily with quotas (weekend 50%)<br/>
              • Max 3 consecutive identical shifts<br/>
              • No LD→LN or LN→LD on consecutive days (relaxed only to hit 13)<br/>
              • Minimum daily coverage enforced
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handlePreview} disabled={!deptId || !startDate || !endDate} className="bg-sky-500 hover:bg-sky-600">
              Preview summary
            </Button>
            <Button onClick={handleApply} disabled={!preview || applying} className="bg-blue-600 hover:bg-blue-700">
              {applying ? "Applying..." : "Apply shifts"}
            </Button>
            <Button variant="outline" onClick={handleClearRange} disabled={!preview}>
              Clear range
            </Button>
          </div>

          {preview && (
            <ScrollArea className="h-64 border rounded">
              <div className="p-2">
                <div className="text-sm font-semibold mb-2">
                  Preview ({preview.staff.length} staff, {preview.dates.length} days)
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1">Staff</th>
                      {preview.dates.map((d, i) => (
                        <th key={i} className="p-1">{dfFormat(d, "dd MMM")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.staff.map(name => (
                      <tr key={name} className="border-b">
                        <td className="p-1">{name}</td>
                        {preview.schedule[name].map((code, i) => (
                          <td key={i} className="p-1 text-center">
                            <span
                              className={`inline-block px-1 rounded text-[10px] ${
                                code === "LD" ? "bg-orange-200" :
                                code === "LN" ? "bg-purple-200" : "bg-gray-100"
                              }`}
                            >
                              {code}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}