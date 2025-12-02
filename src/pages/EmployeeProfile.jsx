
import React from "react";
import { useLocation } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Employee, Department, Shift, ShiftCode, User, Role } from "@/entities/all";
import ReorderableArea from "@/components/common/ReorderableArea";
import PhotoUploader from "@/components/employee/PhotoUploader";
import FinanceKpis from "@/components/employee/FinanceKpis";
import ShiftChip from "@/components/roster/ShiftChip";
import ProfileEditToolbar from "@/components/employee/ProfileEditToolbar";
import ProfileEditTopbar from "@/components/employee/ProfileEditTopbar";
import CredentialCard from "@/components/employee/CredentialCard";
import IndividualComplianceView from "@/components/compliance/IndividualComplianceView";
import { calcShiftHoursSafe } from "@/components/utils/time";

// Add a Tag component styled like the Executive Summary template
const EXECPAL = {
  bg: "#f7fafc",
  ink: "#0f172a",
  sub: "#64748b",
  card: "#ffffff",
  border: "#e5e7eb",
};

function ExecTag({ icon = "⬆", label, value }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-3 py-2"
      style={{ background: EXECPAL.card, borderColor: EXECPAL.border }}
    >
      <span className="text-lg">{icon}</span>
      <div className="text-xs" style={{ color: EXECPAL.sub }}>{label}</div>
      <div className="ml-auto text-sm font-semibold" style={{ color: EXECPAL.ink }}>{value}</div>
    </div>
  );
}

export default function EmployeeProfile() {
  const location = useLocation();

  // STATE
  const [editLayout, setEditLayout] = React.useState(false);
  const [me, setMe] = React.useState(null);
  const [employee, setEmployee] = React.useState(null);
  const [departments, setDepartments] = React.useState([]);
  const [shiftCodes, setShiftCodes] = React.useState([]);
  const [shifts, setShifts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedWidget, setSelectedWidget] = React.useState("identity");
  const [profileApi, setProfileApi] = React.useState(null); // NEW: pass API to toolbar
  const [roles, setRoles] = React.useState([]);
  const storageKey = React.useMemo(() => employee ? `emp_profile_widgets_${employee.id}` : "", [employee]);

  // PERIOD
  const now = React.useMemo(() => new Date(), []);
  const monthStart = React.useMemo(() => startOfMonth(now), [now]);
  const monthEnd = React.useMemo(() => endOfMonth(now), [now]);
  const monthLabel = React.useMemo(() => format(monthStart, "MMM yyyy"), [monthStart]);
  const days = React.useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  // HELPERS
  const deptById = React.useMemo(() => {
    const m = {};
    (departments || []).forEach(d => { m[d.id] = d; });
    return m;
  }, [departments]);

  const byDate = React.useMemo(() => {
    const m = {};
    (shifts || []).forEach(s => {
      const d = String(s.date);
      if (!m[d]) m[d] = [];
      m[d].push(s);
    });
    return m;
  }, [shifts]);

  const canManage = React.useMemo(() => {
    return me?.role === "admin" || me?.access_level === "manager";
  }, [me]);

  // Backup current layout when entering edit
  const enterEdit = () => {
    setEditLayout(true);
    try {
      if (storageKey) {
        const cur = localStorage.getItem(storageKey);
        if (cur) localStorage.setItem(`${storageKey}_bak`, cur);
      }
    } catch (e) {
      console.error("Error backing up layout:", e);
    }
  };
  const saveAndClose = () => setEditLayout(false); // ReorderableArea automatically saves
  const undoOnce = () => {
    try {
      if (!storageKey) return;
      const bak = localStorage.getItem(`${storageKey}_bak`);
      if (bak) {
        localStorage.setItem(storageKey, bak);
        window.location.reload();
      }
    } catch (e) {
      console.error("Error undoing layout:", e);
    }
  };
  const discardAll = () => {
    try {
      if (!storageKey) return;
      const bak = localStorage.getItem(`${storageKey}_bak`);
      if (bak) {
        localStorage.setItem(storageKey, bak);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.error("Error discarding layout:", e);
    }
    window.location.reload();
  };


  // LOAD DATA
  React.useEffect(() => {
    (async () => {
      setLoading(true);

      const qs = new URLSearchParams(location.search);
      const idParam = qs.get("id");              // entity record id
      const empCodeParam = qs.get("employee_id"); // some links pass record id in employee_id
      const emailParam = qs.get("email");

      const [user, emps, depts, codes, allShifts, allRoles] = await Promise.all([
        User.me().catch(() => null),
        Employee.list(),
        Department.list(),
        ShiftCode.list().catch(() => []),
        Shift.list("-date", 2000),
        Role.list().catch(() => [])
      ]);

      setMe(user);
      setDepartments(depts || []);
      setShiftCodes(codes || []);
      setRoles(allRoles || []);

      let emp = null;
      const empsArr = emps || [];
      if (idParam) {
        emp = empsArr.find(e => String(e.id) === String(idParam)) || null;
      }
      if (!emp && empCodeParam) {
        // Tolerate both record id and business employee_id in the employee_id param
        emp = empsArr.find(e =>
          String(e.id) === String(empCodeParam) || String(e.employee_id) === String(empCodeParam)
        ) || null;
      }
      if (!emp && emailParam) {
        emp = empsArr.find(e => (e.user_email || "").toLowerCase() === String(emailParam).toLowerCase()) || null;
      }
      if (!emp && user) {
        emp = empsArr.find(e => e.user_email === user.email) || null;
      }
      if (!emp) emp = empsArr[0] || null;

      setEmployee(emp || null);

      const startStr = format(monthStart, "yyyy-MM-dd");
      const endStr = format(monthEnd, "yyyy-MM-dd");
      const mine = (allShifts || []).filter(s =>
        emp && s.employee_id === emp.id && String(s.date) >= startStr && String(s.date) <= endStr
      );
      setShifts(mine);
      setLoading(false);
    })();
  }, [location.search, monthStart, monthEnd]);

  // KPI scaffold for FinanceKpis (now computed from real data)
  const kpis = React.useMemo(() => {
    const list = Array.isArray(shifts) ? shifts : [];
    const codeMap = new Map((shiftCodes || []).map(c => [c.code, c]));
    const stdHoursPerFTE = Number(employee?.contracted_hours_weekly) || 37.5;
    const weeksInMonth = 4.345; // avg weeks per month

    const totalWorkedHours = list.reduce((acc, s) => acc + calcShiftHoursSafe(s, 8), 0);

    const totalBillableHours = list.reduce((acc, s) => {
      const h = calcShiftHoursSafe(s, 8);
      const sc = codeMap.get(s.shift_code);
      return acc + (sc?.finance_tag === "Billable" ? h : 0);
    }, 0);

    // In absence of payroll data, assume paid hours ~ scheduled hours
    const totalPaidHours = totalWorkedHours;

    const sevenDaysAgo = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d;
    })();
    const last7Worked = list.reduce((acc, s) => {
      const d = new Date(s.date);
      return acc + (!isNaN(d.getTime()) && d >= sevenDaysAgo ? calcShiftHoursSafe(s, 8) : 0);
    }, 0);

    // Role lenses (best-effort based on Role entity)
    const roleWorkedHours = list.reduce((acc, s) => {
      const h = calcShiftHoursSafe(s, 8);
      const r = (roles || []).find(rr => rr.id === s.role_id);
      const key = r?.name || "Other";
      acc[key] = (acc[key] || 0) + h;
      return acc;
    }, {});

    const totalH = totalWorkedHours || 1;
    const rgnHours = Object.entries(roleWorkedHours).reduce((sum, [name, hrs]) => {
      return sum + (/(rgn|nurse)/i.test(String(name)) ? Number(hrs) : 0);
    }, 0);
    const skillMix = { rgn: Math.round((rgnHours / totalH) * 100) };

    const workedFTE = totalWorkedHours / (stdHoursPerFTE * weeksInMonth);
    const paidFTE = totalPaidHours / (stdHoursPerFTE * weeksInMonth);

    return {
      totalShiftHours: totalWorkedHours,         // legacy alias
      totalSlotsPlanned: list.length,
      totalWorkedHours,
      totalPaidHours,
      totalBillableHours,
      totalFloaterHours: 0,
      stdHoursPerFTE,
      paidFTE,
      workedFTE,
      avgHoursPerStaffWorked: totalWorkedHours,  // single-employee page
      shiftsPlanned: list.length,
      shiftsFilled: list.length,
      utilisation: totalPaidHours ? (totalWorkedHours / totalPaidHours) : 0,
      billableRatio: totalWorkedHours ? (totalBillableHours / totalWorkedHours) : 0,
      floaterRatio: 0,
      coverageVsRota: 1,
      fillRate: 1,
      roleWorkedHours,
      skillMix,
      workedPctOfPaid: totalPaidHours ? (totalWorkedHours / totalPaidHours) : 0,
      billablePctOfWorked: totalWorkedHours ? (totalBillableHours / totalWorkedHours) : 0,
      toilDebitHours: 0,
      toilCreditHours: 0,
      toilNetHours: 0,
      toilBalancePerStaff: 0,
      last7Worked,
      mtdPaid: totalPaidHours
    };
  }, [shifts, employee, shiftCodes, roles]);

  // Helper to format dates safely inside widgets
  const formatDate = React.useCallback((d) => {
    if (!d) return "—";
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "—";
    return format(date, "d MMM yyyy");
  }, []);

  if (loading) {
    return <div className="p-6 md:p-8 text-slate-500">Loading…</div>;
  }
  if (!employee) {
    return <div className="p-6 md:p-8 text-slate-500">No employee selected.</div>;
  }

  // REORDERABLE WIDGETS
  const widgets = [
    {
      id: "identity",
      title: "Identity",
      defaultSize: "md",
      defaultWidth: 6,
      content: (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <PhotoUploader
                employee={employee}
                onUpdated={(url) => setEmployee({ ...employee, photo_url: url })}
                size={100}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{employee.full_name}</h1>
                  <Badge className={employee.is_active !== false ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-200 text-slate-600"}>
                    {employee.is_active !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-1 text-slate-600">
                  <span className="font-medium">{employee.job_title || "Team Member"}</span>
                  {" • "}
                  {deptById[employee.department_id]?.name || "Unassigned"}
                </div>
                {employee.user_email && (
                  <div className="text-sm text-slate-500">{employee.user_email}</div>
                )}
              </div>
            </div>
          </div>
          {/* quick stats (these stats are now replicated by ExecTag row in the new outer template structure) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {/* The individual Stat components are no longer directly defined or used here, their content is moved to ExecTag */}
            {/* For now, keeping the structure as per the outline's lack of modification to this specific widget's content,
                this will result in some redundant display if 'identity' widget is rendered.
                A production change would modify this widget content to avoid duplication.
            */}
          </div>
        </>
      )
    },
    {
      id: "roster",
      title: `Roster — ${format(monthStart, "MMM d")} to ${format(monthEnd, "MMM d")}`,
      defaultSize: "lg",
      defaultWidth: 12,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-14 gap-2">
          {days.map((d) => {
            const dateStr = format(d, "yyyy-MM-dd");
            const list = byDate[dateStr] || [];
            return (
              <div key={dateStr} className="border rounded-lg overflow-hidden">
                <div className="px-2 py-1 text-[11px] bg-slate-50 border-b text-slate-600 flex items-center justify-between">
                  <span>{format(d, "EEE")}</span>
                  <span className="font-semibold text-slate-800">{format(d, "d")}</span>
                </div>
                <div className="p-1 min-h-[54px] space-y-1">
                  {list.length === 0 ? (
                    <div className="text-[11px] text-slate-400 text-center pt-3">—</div>
                  ) : (
                    list.map(s => (
                      <ShiftChip
                        key={s.id}
                        shift={s}
                        canManage={canManage}
                        locked={false}
                        onChanged={async () => {
                          // refresh this day's shifts
                          const startStr = format(monthStart, "yyyy-MM-dd");
                          const endStr = format(monthEnd, "yyyy-MM-dd");
                          const all = await Shift.list("-date", 2000);
                          const mine = (all || []).filter(x =>
                            x.employee_id === employee.id &&
                            String(x.date) >= startStr &&
                            String(x.date) <= endStr
                          );
                          setShifts(mine);
                        }}
                        codes={shiftCodes}
                        compact
                        currentUser={me}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )
    },
    {
      id: "kpis",
      title: "Workforce KPIs (MTD)",
      defaultSize: "lg",
      defaultWidth: 12,
      content: (
        <FinanceKpis
          data={kpis}
          monthLabel={monthLabel}
          periodLabel={monthLabel}
        />
      )
    }
  ];

  // NEW: enhance widgets array by inserting four credential cards after Identity widget
  // Replace the useMemo with a plain computed constant to avoid calling hooks after early returns
  const widgetsFinal = (() => {
    const base = Array.isArray(widgets) ? widgets : [];
    const extras = [
      {
        id: "nmc_reval",
        title: "NMC Revalidation",
        defaultWidth: 4,
        defaultHeightPx: 140,
        content: () => ( // CHANGED from render to content
          <CredentialCard
            label="NMC Revalidation Date"
            value={employee?.nmc_revalidation_date}
            isDate
          />
        ),
      },
      {
        id: "dbs_expiry",
        title: "DBS Expiration",
        defaultWidth: 4,
        defaultHeightPx: 140,
        content: () => ( // CHANGED from render to content
          <CredentialCard
            label="DBS Expiration Date"
            value={employee?.dbs_expiry_date}
            isDate
          />
        ),
      },
      {
        id: "ils_expiry",
        title: "ILS Expiration",
        defaultWidth: 4,
        defaultHeightPx: 140,
        content: () => ( // CHANGED from render to content
          <CredentialCard
            label="ILS Expiration Date"
            value={employee?.ils_expiry_date}
            isDate
          />
        ),
      },
      {
        id: "nmc_status",
        title: "NMC Number/Status",
        defaultWidth: 4,
        defaultHeightPx: 140,
        content: () => ( // CHANGED from render to content
          <CredentialCard
            label="NMC Number/Status"
            value={
              employee?.nmc_number
                ? `${employee.nmc_number} — ${employee?.nmc_status || "Active"}`
                : (employee?.nmc_status || "Active")
            }
          />
        ),
      },
      {
        id: "ipc_compliance",
        title: "IPC Training — Personal Compliance",
        defaultWidth: 12,
        defaultHeightPx: 380,
        content: () => ( // CHANGED from render to content
          <div className="p-1">
            <IndividualComplianceView
              employee={employee}
              departmentName={deptById[employee?.department_id || ""]?.name}
            />
          </div>
        ),
      },
    ];

    // Insert extras after the Identity widget if present; otherwise, prefix them
    const idx = base.findIndex((w) => w.id === "identity");
    if (idx >= 0) {
      return [...base.slice(0, idx + 1), ...extras, ...base.slice(idx + 1)];
    }
    return [...extras, ...base];
  })();

  return (
    // Executive Summary outer wrapper
    <div className="w-full min-h-screen" style={{ background: EXECPAL.bg }}>
      <div
        className="mx-auto max-w-[960px] bg-white"
        style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}
      >
        {/* Header (Executive Summary style) */}
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className="leading-[1.05] font-extrabold"
                style={{ color: EXECPAL.ink, fontSize: 32 }}
              >
                {employee.full_name}
              </div>
              <div className="mt-1 text-xs" style={{ color: EXECPAL.sub }}>
                {(employee.job_title || "Team Member")} • {deptById[employee.department_id]?.name || "Unassigned"}
                {employee.user_email ? ` • ${employee.user_email}` : ""}
              </div>
            </div>
            <div className="shrink-0">
              <Button variant={editLayout ? "default" : "outline"} onClick={() => (editLayout ? setEditLayout(false) : enterEdit())}>
                {editLayout ? "Lock layout" : "Edit layout"}
              </Button>
            </div>
          </div>
          <div className="mt-2 text-xs" style={{ color: EXECPAL.sub }}>
            Month: {monthLabel}
          </div>
        </div>

        {/* KPI Tag row (4-wide, Executive Summary look) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 px-6 pb-6">
          <ExecTag icon="📝" label="Contract" value={`${employee.contracted_hours_weekly || 0} h/wk`} />
          <ExecTag icon="📅" label="Shifts this month" value={(shifts || []).length} />
          <ExecTag icon="⏱️" label="Worked hours (MTD)" value={Math.round(kpis.totalWorkedHours)} />
          <ExecTag icon="⚡" label="Last 7 days (hrs)" value={Math.round(kpis.last7Worked || 0)} />
        </div>

        {/* Edit toolbars */}
        {editLayout && (
          <div className="px-6 pb-3">
            <ProfileEditTopbar
              onSave={saveAndClose}
              onUndo={undoOnce}
              onDiscard={discardAll}
              onReset={() => {
                try { localStorage.removeItem(storageKey); } catch (e) {}
                window.location.reload();
              }}
            />
          </div>
        )}

        {editLayout && (
          <div className="px-6 pb-3">
            <ProfileEditToolbar
              widgets={widgetsFinal}
              api={profileApi}
              selectedId={selectedWidget}
              onSelect={setSelectedWidget}
              employee={employee}
              onEmployeeChange={(next) => setEmployee(next)}
              onClose={() => setEditLayout(false)}
              onResetLayout={() => {
                try { localStorage.removeItem(`emp_profile_widgets_${employee?.id}`); } catch (e) {}
                window.location.reload();
              }}
            />
          </div>
        )}

        {/* Main content stays the same (widgets grid) */}
        <div className="px-6 pb-8">
          <ReorderableArea
            storageKey={storageKey}
            items={widgetsFinal}
            editMode={editLayout}
            layoutMode="grid"
            selectedId={selectedWidget}
            onSelect={setSelectedWidget}
            registerApi={(api) => {
              setProfileApi(api);
            }}
          />
        </div>

        {/* Footer note */}
        <div className="px-6 pb-8 text-xs" style={{ color: EXECPAL.sub }}>
          Live profile built from Employee, Shift, Department, and IPC records.
        </div>
      </div>
    </div>
  );
}
