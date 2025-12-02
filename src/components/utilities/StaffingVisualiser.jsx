
import React from "react";
import { format } from "date-fns";
import { Shift } from "@/entities/Shift";
import { Employee } from "@/entities/Employee";
import { Badge } from "@/components/ui/badge";
import { pastelForCode, textColorForBg, colorForCode } from "@/components/utils/colors";
import { Crown, Shield, Sun, Moon, Users, ClipboardList, Shuffle, Activity } from "lucide-react";

function Title({ children, count, Icon }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
        <div className="text-[18px] font-semibold tracking-tight text-slate-900">
          {children}
        </div>
      </div>
      {typeof count === "number" && (
        <Badge variant="outline" className="bg-white/70 text-slate-700 border-slate-200">
          {count}
        </Badge>
      )}
    </div>
  );
}

function NamesBlock({ names = [], placeholder }) {
  if (!names.length) {
    return <div className="text-[12px] text-slate-500 italic">{placeholder}</div>;
  }
  return (
    <div className="space-y-1.5">
      {names.map((item, i) => {
        const isObj = item && typeof item === "object";
        const name = isObj ? (item.name || "") : String(item || "");
        const codesList = isObj
          ? (Array.isArray(item.codes) ? item.codes : (item.code ? [item.code] : []))
          : [];

        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <div className="text-[14px] font-semibold text-slate-900 leading-snug">{name}</div>
            {codesList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {Array.from(new Set(codesList.map((c) => String(c || "").toUpperCase()))).map((code, idx) => {
                  const bg = pastelForCode(code);
                  const txt = textColorForBg(bg);
                  const bd = colorForCode(code);
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] uppercase tracking-wide"
                      style={{ background: bg, color: txt, borderColor: bd }}
                      title={`Shift code ${code}`}
                    >
                      {code}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helpers
const hasAny = (tokens, set) => tokens.some((t) => set.has(t));
const tokenize = (code = "") =>
  String(code || "")
    .replace(/[^\w\s\-\/]/g, " ")
    .split(/[\s\/\-_,.]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

// robust helpers per formula
const equalsIgnoreCase = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
const includesWord = (s, needle) => String(s || "").toUpperCase().includes(String(needle || "").toUpperCase());

// Interpret "Working" status per formula; fallback to not-cancelled
const isWorking = (s) => {
  const ws = String(s?.work_status || "").toLowerCase();
  if (ws) return ws === "working";
  return String(s?.status || "").toLowerCase() !== "cancelled";
};

// Determine day/night primarily from ShiftPeriod; fallback to code/times like before
const isDayShift = (s, tokens) => {
  const sp = String(s?.shift_period || "").toLowerCase();
  if (sp) {
    if (sp.includes("morning")) return true;
    if (sp.includes("night")) return false;
  }
  if (tokens.includes("LD") || tokens.includes("L") || tokens.includes("E")) return true;
  const st = s?.start_time || "";
  return st && st < "19:00";
};
const isNightShift = (s, tokens) => {
  const sp = String(s?.shift_period || "").toLowerCase();
  if (sp) {
    if (sp.includes("night")) return true;
    if (sp.includes("morning")) return false;
  }
  if (tokens.includes("LN") || tokens.includes("N")) return true;
  const st = s?.start_time || "";
  return st && st >= "19:00";
};

// Exact floater patterns from the formula
const floaterPatterns = [
  ["PBCU"],
  ["LD", "BCU"],
  ["LD", "POA"],
  ["LD", "OP"],
  ["E", "POA"],
  ["E", "OP"],
  ["EBCU"],
  ["L", "BCD"], // as in provided list; keep exact
  ["L", "POA"],
  ["L", "OP"],
  ["LD", "W3"],
  ["LD", "W2"],
];
const matchesPattern = (tokens, pattern) => pattern.every((tok) => tokens.includes(tok));
const isFloaterByFormula = (tokens) => floaterPatterns.some((p) => matchesPattern(tokens, p));

// detect long hex-ish IDs so we don't print them as names
const isLikelyRecordId = (val) =>
  typeof val === "string" && /^[a-f0-9]{20,}$/i.test(val);

export default function StaffingVisualiser() {
  const [date, setDate] = React.useState(() => {
    const d = new Date();
    return format(d, "yyyy-MM-dd");
  });
  const [loading, setLoading] = React.useState(false);
  // REPLACE: single map with two robust maps (by record id and by employee code)
  const [namesByRecordId, setNamesByRecordId] = React.useState({});
  const [namesByEmpCode, setNamesByEmpCode] = React.useState({});
  const [shifts, setShifts] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [emps, sh] = await Promise.all([
          Employee.list(),
          Shift.filter({ date }) // only selected day
        ]);

        // Build display name maps:
        const byId = {};
        const byCode = {};
        (emps || []).forEach((e) => {
          const display =
            (e && (e.full_name || e.user_email || e.employee_id)) || "—";
          if (e?.id) byId[e.id] = display;
          if (e?.employee_id) byCode[e.employee_id] = display;
        });
        setNamesByRecordId(byId);
        setNamesByEmpCode(byCode);

        // Exclude cancelled; keep scheduled/confirmed/completed
        const filtered = (sh || []).filter(
          (s) => (s.status || "scheduled") !== "cancelled"
        );
        setShifts(filtered);
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  // Helper to resolve a readable name for a shift row (record id or code)
  const getShiftName = React.useCallback(
    (s) => {
      const key = s?.employee_id;
      // Try to resolve by employee record ID first (more unique)
      const resolved = namesByRecordId[key] || namesByEmpCode[key];
      if (resolved) return resolved;
      
      // If not resolved, check if the key itself is a likely record ID and hide it
      if (isLikelyRecordId(key)) return "—";
      
      // Otherwise, return the key as is or a dash if null/undefined
      return key || "—";
    },
    [namesByRecordId, namesByEmpCode]
  );

  // Helper to deduplicate and aggregate codes per name, sorted by name ASC
  const dedupeEntries = React.useCallback((entries = []) => {
    const map = new Map();
    entries.forEach((e) => {
      const nm = e && typeof e === "object" ? e.name : String(e || "");
      const cd = e && typeof e === "object" ? (e.code || "") : "";
      if (!nm) return;
      if (!map.has(nm)) map.set(nm, { name: nm, codes: new Set() });
      if (cd) map.get(nm).codes.add(String(cd).toUpperCase());
    });
    const arr = Array.from(map.values()).map(v => {
      const codes = Array.from(v.codes);
      return {
        name: v.name,
        code: codes[0] || "",
        codes: codes.length > 1 ? codes : undefined
      };
    });
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, []);

  // Build groups using the provided formula logic
  const groups = React.useMemo(() => {
    const result = {
      dutyManagers: [],
      nicDay: [],
      nicNight: [],
      rgnDay: [],     // corresponds to DayBlock in the formula
      rgnNight: [],   // corresponds to NightBlock in the formula
      hcaDay: [],
      hcaNight: [],
      wardClerk: [],
      floaters: [],
      doctors24h: []
    };

    shifts.forEach((s) => {
      const name = getShiftName(s);
      if (!name || name === "—") return;

      // Apply Working filter (formula)
      if (!isWorking(s)) return;

      const tokens = tokenize(s.shift_code || "");
      const roleName = String(s.role_name || s.role || ""); // if role name is embedded, else fallback
      const onDay = isDayShift(s, tokens);
      const onNight = isNightShift(s, tokens);

      const isDM = tokens.includes("DM");
      const isNIC = tokens.includes("NIC");
      const isDoctor = tokens.includes("24H") || tokens.includes("24HR") || equalsIgnoreCase(s.shift_code, "24H");
      const isFloater = isFloaterByFormula(tokens);
      // HCA and CLERK derived from role per formula
      const isHCAByRole = includesWord(roleName, "HCA");
      const isClerkByRole = includesWord(roleName, "CLERK");

      const entry = { name, code: s.shift_code || "" };

      // Blocks per formula
      if (isDM) result.dutyManagers.push(entry);
      if (isNIC && onDay) result.nicDay.push(entry);
      if (isNIC && onNight) result.nicNight.push(entry);
      if (onDay && !isDM && !isNIC && !isFloater) result.rgnDay.push(entry);
      if (onNight && !isDM && !isNIC && !isFloater) result.rgnNight.push(entry);
      if (onDay && isHCAByRole) result.hcaDay.push(entry);
      if (onNight && isHCAByRole) result.hcaNight.push(entry);
      if (onDay && isClerkByRole) result.wardClerk.push(entry);
      if (isFloater) result.floaters.push(entry);
      if (isDoctor) result.doctors24h.push(entry);
    });

    // De-duplicate and aggregate codes
    result.dutyManagers = dedupeEntries(result.dutyManagers);
    // For UI, expose merged NIC list under 'nic'
    result.nic = dedupeEntries([...result.nicDay, ...result.nicNight]);
    result.rgnDay = dedupeEntries(result.rgnDay);
    result.rgnNight = dedupeEntries(result.rgnNight);
    result.hcaDay = dedupeEntries(result.hcaDay);
    result.hcaNight = dedupeEntries(result.hcaNight);
    result.wardClerk = dedupeEntries(result.wardClerk);
    result.floaters = dedupeEntries(result.floaters);
    result.doctors24h = dedupeEntries(result.doctors24h);

    return result;
  }, [shifts, getShiftName, dedupeEntries]);

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-lg p-4 md:p-6">
      {/* Header row: date filter (left) and subtle guidance (right) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border border-slate-300 px-2 text-sm bg-white shadow-sm"
            aria-label="Date filter"
          />
          <span className="text-xs text-slate-500">
            Viewing roster for {format(new Date(date), "dd/MM/yyyy")}
          </span>
        </div>
        <div className="text-[12px] font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded-md px-2 py-1">
          Live staffing overview
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={Crown} count={groups.dutyManagers.length}>DUTY MANAGERS</Title>
            <NamesBlock
              names={groups.dutyManagers}
              placeholder="Output staff with LD DM & LN DM codes"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={Shield} count={groups.nic.length}>NURSES IN CHARGE</Title>
            <NamesBlock
              names={groups.nic}
              placeholder="Output staff with LD NIC & LN NIC codes"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={Sun} count={groups.rgnDay.length}>RGN'S - DAY</Title>
            <NamesBlock
              names={groups.rgnDay}
              placeholder="Output staff with LD, E, L codes"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={Users} count={groups.hcaDay.length}>HCAS — DAY</Title>
            <NamesBlock
              names={groups.hcaDay}
              placeholder="Staff with LD HCA, LD PB"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={ClipboardList} count={groups.wardClerk.length}>WARD CLERK</Title>
            <NamesBlock
              names={groups.wardClerk}
              placeholder="Staff with WC shift codes"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={Shuffle} count={groups.floaters.length}>FLOATERS</Title>
            <NamesBlock
              names={groups.floaters}
              placeholder='PBCU, "LD BCU", "LD PB", "LD OP", "E OP", "E POA", "E BCU", "L BCD", "L POA", "L OP", "LD W3", "LD W2"'
            />
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={Activity} count={groups.doctors24h.length}>DOCTORS ON SHIFT TODAY</Title>
            <NamesBlock
              names={groups.doctors24h}
              placeholder="Staff with 24H codes"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={Moon} count={groups.rgnNight.length}>RGN'S - NIGHT</Title>
            <NamesBlock
              names={groups.rgnNight}
              placeholder="Staff with LN, N, LN PB codes"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all">
            <Title Icon={Users} count={groups.hcaNight.length}>HCAS — NIGHT</Title>
            <NamesBlock
              names={groups.hcaNight}
              placeholder="Staff with LN HCA, LN PB"
            />
          </section>
        </div>
      </div>

      {loading && (
        <div className="mt-4 text-xs text-slate-500">Loading…</div>
      )}
    </div>
  );
}
