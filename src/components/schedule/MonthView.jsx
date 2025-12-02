
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ShiftCodeDropdown from "./ShiftCodeDropdown";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StaffBadge from "@/components/common/StaffBadge";
import { emailPrefix } from "@/components/utils/strings";
import { Checkbox } from "@/components/ui/checkbox";

export default function MonthView(props) {
  const {
    currentDate,
    shifts,
    employees,
    leaves,
    departments,
    roles, // ensure roles available in helpers
    onCreateShift,
    onEditShift,
    canEdit,
    isLoading,
    compact = false,
    activeDepartment,
    shiftCodeColors = {},
    scrollRefExternal,
    shiftCodeHours = {},
    dateRange = null,
    // selection props
    selectable = false,
    selectedIds,
    onToggleSelect,
    fullScreen = false // NEW
  } = props;

  const [dropdownPosition, setDropdownPosition] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const internalScrollRef = useRef(null);
  const scrollRef = scrollRefExternal || internalScrollRef;

  // Month bounds
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Robust date to Date
  const asDate = useCallback((v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === "string") {
      const d1 = parseISO(v);
      if (!isNaN(d1)) return d1;
      const d2 = new Date(v);
      return isNaN(d2) ? null : d2;
    }
    const d3 = new Date(v);
    return isNaN(d3) ? null : d3;
  }, []);

  // NEW: subtle job/role label under names
  const primaryLabelForEmp = React.useCallback((emp) => {
    if (emp?.job_title) return emp.job_title;
    if (Array.isArray(emp?.role_ids) && emp.role_ids.length) {
      const r = roles?.find(r => r.id === emp.role_ids[0]);
      return r?.name || "";
    }
    return "";
  }, [roles]);

  const periodStart = useMemo(() => asDate(dateRange?.start) || monthStart, [asDate, dateRange?.start, monthStart]);
  const periodEnd = useMemo(() => asDate(dateRange?.end) || monthEnd, [asDate, dateRange?.end, monthEnd]);

  // Days to render
  const daysInMonth = useMemo(() => {
    const start = periodStart || monthStart;
    const end = periodEnd && periodEnd >= start ? periodEnd : start;
    return eachDayOfInterval({ start, end });
  }, [periodStart, periodEnd, monthStart]);

  // Column widths + resizer
  const defaultColWidth = compact ? 72 : 100;
  const [columnWidths, setColumnWidths] = useState({});
  const [resizing, setResizing] = useState(null); // {key, startX, startWidth}

  useEffect(() => {
    const initial = {};
    daysInMonth.forEach((d) => {
      initial[dateKey(d)] = defaultColWidth;
    });
    setColumnWidths(initial);
  }, [daysInMonth, defaultColWidth]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      const delta = e.clientX - resizing.startX;
      const newW = Math.max(44, Math.min(220, resizing.startWidth + delta));
      setColumnWidths((prev) => ({ ...prev, [resizing.key]: newW }));
    };
    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const onResizeStart = (e, key) => {
    e.preventDefault();
    setResizing({
      key,
      startX: e.clientX,
      startWidth: columnWidths[key] || defaultColWidth,
    });
  };

  // Helpers
  const dateKey = (d) => format(d, "yyyy-MM-dd");
  const normalizeDateKey = (input) => {
    if (!input) return "";
    if (input instanceof Date) return format(input, "yyyy-MM-dd");
    let s = String(input).trim();
    if (s.length >= 10) s = s.slice(0, 10);
    s = s.replace(/\./g, "-").replace(/\//g, "-");
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parts = s.split("-");
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
      if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
  };

  const norm = (v) => (v == null ? "" : String(v)).trim().toLowerCase();
  // UPDATED: robust dept matcher (resolve shift's dept record and compare names/codes)
  const deptMatches = useCallback((deptIdentifier) => {
    if (!activeDepartment?.id) return true; // If no active filter, all shifts match

    const nId = norm(deptIdentifier); // Normalized identifier from the shift
    const aId = norm(activeDepartment.id);
    const aName = norm(activeDepartment.name);
    const aCode = norm(activeDepartment.code);

    // First, check if the identifier directly matches the active department's id, name, or code
    // This handles cases where shift.department_id might be the name or code itself
    if (nId === aId || nId === aName || nId === aCode) return true;

    // If not a direct match, try to resolve the shift's department_id to a department object
    // from the 'departments' list and then compare its properties.
    const dep = (departments || []).find(d =>
      norm(d.id) === nId || norm(d.name) === nId || norm(d.code) === nId
    );

    // If we can't find a corresponding department for the shift, it doesn't match
    if (!dep) return false;

    // Now, compare the resolved shift department's name/code with the active department's name/code
    const dName = norm(dep.name);
    const dCode = norm(dep.code);

    // Match if names are the same, OR if both have codes and codes are the same
    return dName === aName || (aCode && dCode && dCode === aCode);
  }, [activeDepartment?.id, activeDepartment?.name, activeDepartment?.code, departments]);

  const matchesEmployee = (shift, employeeId) => {
    if (!employeeId) return !shift.employee_id && !shift.employee_email && !shift.employee_name;
    if (shift.employee_id === employeeId) return true;

    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return false;

    const sEmail = String(shift.employee_email || "").toLowerCase();
    const eEmail = String(emp.user_email || "").toLowerCase();
    if (sEmail && eEmail && sEmail === eEmail) return true;

    const shiftName = String(shift.employee_name || shift.employee || "").trim().toLowerCase();
    const empFullName = String(emp.full_name || "").trim().toLowerCase();
    const empEmailPrefix = emailPrefix(emp.user_email).toLowerCase();
    if (shiftName && empFullName && shiftName === empFullName) return true;
    if (shiftName && empEmailPrefix && shiftName === empEmailPrefix) return true;

    return false;
  };

  // STRICT: allow shifts to appear only if their department_id matches the active ward (no employee-bypass)
  const getShiftsForEmployeeAndDay = (employeeId, date) => {
    const key = dateKey(date);
    const safeTime = (t) => (typeof t === "string" && t.length ? t : "00:00");
    return shifts
      .filter((s) => {
        const matchesDate = normalizeDateKey(s.date) === key;
        if (!matchesDate) return false;

        if (activeDepartment?.id) {
          const shiftDeptMatches = s.department_id && deptMatches(s.department_id);
          if (!shiftDeptMatches) return false; // Strict: require ward match
        }

        return matchesEmployee(s, employeeId);
      })
      .sort((a, b) => safeTime(a.start_time).localeCompare(safeTime(b.start_time)));
  };

  // UPDATED: show Unassigned row only if there are actual unassigned shifts in-period (and in ward if filtered)
  const hasUnassigned = useMemo(() => {
    const inPeriod = (dk) => {
      if (!dk) return false;
      const d = asDate(dk);
      return d && d >= periodStart && d <= periodEnd;
    };
    const matchesWard = (s) => !activeDepartment?.id || deptMatches(s.department_id);
    return shifts.some((s) =>
      !s.employee_id && !s.employee_email && !s.employee_name &&
      inPeriod(normalizeDateKey(s.date)) &&
      matchesWard(s)
    );
  }, [shifts, asDate, periodStart, periodEnd, activeDepartment?.id, deptMatches]);

  const periodShiftCount = useMemo(() => {
    return shifts.filter((s) => {
      const dk = normalizeDateKey(s.date);
      if (!dk) return false;
      const d = asDate(dk);
      return d && d >= periodStart && d <= periodEnd;
    }).length;
  }, [shifts, asDate, periodStart, periodEnd]);

  const periodUnassignedCount = useMemo(() => {
    return shifts.filter((s) => {
      const dk = normalizeDateKey(s.date);
      if (!dk) return false;
      const d = asDate(dk);
      return !s.employee_id && !s.employee_email && !s.employee_name && d && d >= periodStart && d <= periodEnd;
    }).length;
  }, [shifts, asDate, periodStart, periodEnd]);

  const getLeaveForEmployeeAndDay = (employeeId, day) => {
    // Ensure day is a Date object for comparison
    const targetDate = day instanceof Date ? day : parseISO(format(day, 'yyyy-MM-dd'));

    return leaves.find((l) => {
      if (!l.start_date || !l.end_date) return false; // Skip if leave dates are invalid

      const startDate = parseISO(l.start_date);
      const endDate = parseISO(l.end_date);
      // Check if targetDate is between startDate and endDate (inclusive)
      return l.employee_id === employeeId && targetDate >= startDate && targetDate <= endDate;
    });
  };


  const getRoleInfo = (roleId) => {
    return roles.find((r) => r.id === roleId);
  };

  const computeHours = (s) => {
    const codeKey = String(s.shift_code || "").toUpperCase();
    if (shiftCodeHours[codeKey] != null) return shiftCodeHours[codeKey];
    const st = s.start_time,
      et = s.end_time;
    if (!st || !et) return null;
    const [sh, sm] = st.split(":").map(Number);
    const [eh, em] = et.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    mins -= Number(s.break_minutes || 0);
    const hrs = Math.round((mins / 60) * 2) / 2;
    return hrs > 0 ? hrs : null;
  };
  const formatHours = (v) => (v == null ? null : `${v} hrs`);

  const handleCellClick = (event, day, employee) => {
    if (!canEdit) return;
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX,
    });
    setSelectedCell({ day, employee });
  };

  const handleShiftCodeSelect = async (shiftCode) => {
    if (!selectedCell) return;
    const { day, employee } = selectedCell;

    let startTime = "09:00";
    let endTime = "17:00";
    const hours = shiftCode.weighted_hours || 8;

    const descriptor = String(shiftCode.descriptor || "").toLowerCase();
    if (descriptor.includes("night")) {
      startTime = "20:00";
      endTime = hours === 12.5 ? "08:30" : "08:00";
    } else if (descriptor.includes("day") || descriptor.includes("long day")) {
      startTime = "08:00";
      endTime = hours === 12.5 ? "20:30" : "20:00";
    } else if (descriptor.includes("early")) {
      startTime = "07:00";
      endTime = hours === 8 ? "15:00" : "15:30";
    } else if (descriptor.includes("late")) {
      startTime = "15:00";
      endTime = hours === 8 ? "23:00" : "23:30";
    }

    onCreateShift(day, employee.id, {
      shift_code: shiftCode.code,
      shift_period: descriptor.includes("night")
        ? "Night"
        : descriptor.includes("early")
        ? "Early"
        : descriptor.includes("late")
        ? "Late"
        : "Day",
      start_time: startTime,
      end_time: endTime,
      break_minutes: 30,
      department_id: activeDepartment?.id || undefined,
    });

    setDropdownPosition(null);
    setSelectedCell(null);
  };

  const handleCreateCustomFromCell = () => {
    if (!selectedCell) return;
    const { day, employee } = selectedCell;
    onCreateShift(day, employee.id, {
      department_id: activeDepartment?.id || undefined,
    });
    setDropdownPosition(null);
    setSelectedCell(null);
  };

  // Left names column width
  const leftColWidth = compact ? 192 : 220;

  const getTintFromShifts = (list) => {
    if (!list || list.length === 0) return null;
    const first = list[0];
    const role = getRoleInfo(first.role_id);
    const codeKey = String(first.shift_code || "").toUpperCase();
    const color = shiftCodeColors[codeKey] || role?.color || "#0d9488";
    return `${color}14`;
  };

  const headerTitle = useMemo(() => {
    if (!periodStart || !periodEnd) return "Invalid Date Range";
    const sameMonth =
      periodStart.getFullYear() === periodEnd.getFullYear() &&
      periodStart.getMonth() === periodEnd.getMonth();
    if (sameMonth) return format(periodStart, "MMMM yyyy");
    return `${format(periodStart, "MMM d")} – ${format(periodEnd, "MMM d, yyyy")}`;
  }, [periodStart, periodEnd]);

  const isSelected = useCallback(
    (id) => selectable && selectedIds && selectedIds.has && selectedIds.has(id),
    [selectable, selectedIds]
  );

  return (
    <div className="bg-white relative">
      {canEdit && (
        <div className="absolute top-1 right-2 z-10 bg-teal-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
          {compact ? "Compact" : "Standard"} • {canEdit ? "Edit" : "View"}
        </div>
      )}

      {/* UPDATED: taller in full screen */}
      <div className={`overflow-auto ${fullScreen ? "max-h-[calc(100vh-200px)]" : "max-h-[70vh]"}`} ref={scrollRef}>
        {/* Sticky header */}
        <div className="border-b border-slate-200 bg-slate-50 sticky top-0 z-30">
          <div className="flex">
            <div
              className="border-r border-slate-200 flex-shrink-0 sticky left-0 z-40 bg-slate-50"
              style={{ width: leftColWidth }}
            >
              <p className={`p-2 font-semibold text-slate-700 ${compact ? "text-xs" : "text-sm"} whitespace-nowrap`}>
                {headerTitle}
              </p>
            </div>
            <div className="flex">
              {daysInMonth.map((day) => {
                const key = dateKey(day);
                const w = columnWidths[key] || defaultColWidth;
                return (
                  <div
                    key={day.toISOString()}
                    className={`relative text-center border-r border-slate-200 ${compact ? "py-1" : "p-2"}`}
                    style={{ width: w }}
                  >
                    <div className={`${compact ? "text-[10px]" : "text-xs"} text-slate-500 font-medium`}>
                      {format(day, "EEE")}
                    </div>
                    <div className={`${compact ? "text-base" : "text-lg"} font-bold text-slate-900`}>
                      {format(day, "d")}
                    </div>
                    <div className={`${compact ? "text-[10px]" : "text-xs"} text-slate-500`}>
                      {format(day, "MMM")}
                    </div>
                    <div
                      onMouseDown={(e) => onResizeStart(e, key)}
                      className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-slate-300"
                      title="Drag to resize column"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hint */}
        <div className={`px-3 ${compact ? "py-1 text-[11px]" : "py-2 text-xs"} text-slate-600`}>
          Showing {periodShiftCount} shifts in this period
          {periodUnassignedCount > 0 ? ` • ${periodUnassignedCount} unassigned` : ""}
        </div>

        {/* Body */}
        <div>
          {isLoading ? (
            Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex border-b border-slate-100">
                  <div className="border-r border-slate-200 flex-shrink-0" style={{ width: leftColWidth }}>
                    <Skeleton className={compact ? "h-8 w-full" : "h-10 w-full"} />
                  </div>
                  <div className="flex">
                    {daysInMonth.map((d, j) => {
                      const key = dateKey(d);
                      const w = columnWidths[key] || defaultColWidth;
                      return (
                        <div key={j} className="p-1" style={{ width: w }}>
                          <Skeleton className={compact ? "h-10 w-full" : "h-16 w-full"} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
          ) : (
            <>
              {/* Unassigned Row */}
              {hasUnassigned && (
                <div className="flex border-b border-slate-100">
                  <div
                    className="border-r border-slate-200 flex-shrink-0 bg-white sticky left-0 z-30"
                    style={{ width: leftColWidth }}
                  >
                    <div className={`flex items-center gap-2 ${compact ? "p-2" : "p-4"}`}>
                      <StaffBadge name="Unassigned" size={compact ? 28 : 32} variant="slate" />
                      <span className={`font-medium text-slate-900 truncate ${compact ? "text-xs" : "text-sm"}`}>
                        Unassigned
                      </span>
                    </div>
                  </div>
                  <div className="flex">
                    {daysInMonth.map((day) => {
                      const key = dateKey(day);
                      const w = columnWidths[key] || defaultColWidth;
                      const dayShifts = getShiftsForEmployeeAndDay("", day);
                      const cellTint = getTintFromShifts(dayShifts);
                      return (
                        <div
                          key={`unassigned-${day.toISOString()}`}
                          className={`relative border-r border-slate-200 ${
                            compact ? "p-1 min-h-[48px]" : "p-2 min-h-[80px]"
                          } ${canEdit ? "group cursor-pointer hover:bg-teal-50 hover:ring-2 hover:ring-inset hover:ring-teal-400" : ""} transition-all`}
                          style={{ width: w, backgroundColor: cellTint || undefined }}
                          onClick={(e) => handleCellClick(e, day, { id: "" })}
                        >
                          {dayShifts.map((shift) => {
                            const role = getRoleInfo(shift.role_id);
                            const codeKey = String(shift.shift_code || "").toUpperCase();
                            const color = shiftCodeColors[codeKey] || role?.color || "#0d9488";
                            const hours = computeHours(shift);
                            return (
                              <div
                                key={shift.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canEdit) onEditShift(shift);
                                }}
                                className={`mb-1 rounded border-l-4 ${compact ? "p-0.5" : "p-1"} ${
                                  canEdit ? "cursor-pointer hover:shadow" : ""
                                }`}
                                style={{
                                  backgroundColor: `${color}22`,
                                  borderLeft: `3px solid ${color}`,
                                  color,
                                }}
                              >
                                <div
                                  className={`${
                                    compact ? "text-[10px] leading-tight" : "text-[11px] leading-tight"
                                  } font-extrabold uppercase tracking-wide text-slate-900`}
                                >
                                  {shift.shift_code || role?.name || "Shift"}
                                </div>
                                {hours != null && (
                                  <div className="text-[10px] text-slate-600">{formatHours(hours)}</div>
                                )}
                                {(shift.start_time || shift.end_time) && !compact && (
                                  <div className="text-[10px] text-slate-700">
                                    {shift.start_time || "--"} - {shift.end_time || "--"}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {canEdit && dayShifts.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <div className="bg-teal-500 rounded-full p-1.5">
                                <Plus className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Employee Rows */}
              {employees.map((employee) => (
                <div key={employee.id} className="flex border-b border-slate-100">
                  <div
                    className="border-r border-slate-200 flex-shrink-0 bg-white sticky left-0 z-30"
                    style={{ width: leftColWidth }}
                  >
                    <div className={`flex items-center gap-2 ${compact ? "p-2" : "p-4"}`}>
                      {selectable && (
                        <Checkbox
                          checked={isSelected(employee.id)}
                          onCheckedChange={() => onToggleSelect && onToggleSelect(employee.id)}
                          className="mr-1"
                        />
                      )}
                      <StaffBadge name={employee.full_name || employee.user_email} size={compact ? 28 : 32} />
                      <div className="min-w-0">
                        <Link
                          to={createPageUrl(`EmployeeSchedule?employee_id=${employee.id}`)}
                          className={`font-medium text-slate-900 truncate ${
                            compact ? "text-xs hover:underline" : "text-sm hover:underline"
                          } whitespace-nowrap`}
                          title="View individual's rota"
                        >
                          {employee.full_name || emailPrefix(employee.user_email) || "Unknown"}
                        </Link>
                        {/* UPDATED: always show a subtle role/job line */}
                        <div className={`${compact ? "text-[10px]" : "text-xs"} text-slate-500 truncate whitespace-nowrap`}>
                          {primaryLabelForEmp(employee)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex">
                    {daysInMonth.map((day) => {
                      const key = dateKey(day);
                      const w = columnWidths[key] || defaultColWidth;
                      const dayShifts = getShiftsForEmployeeAndDay(employee.id, day);
                      const leave = getLeaveForEmployeeAndDay(employee.id, day);
                      const cellTint = !leave ? getTintFromShifts(dayShifts) : null;

                      return (
                        <div
                          key={day.toISOString()}
                          className={`relative border-r border-slate-200 ${
                            compact ? "p-1 min-h-[48px]" : "p-2 min-h-[80px]"
                          } ${canEdit ? "group cursor-pointer hover:bg-teal-50 hover:ring-2 hover:ring-inset hover:ring-teal-400" : ""} transition-all`}
                          style={{
                            width: w,
                            backgroundColor: cellTint || (leave ? "#fff7ed" : "white"),
                          }}
                          onClick={(e) => handleCellClick(e, day, employee)}
                        >
                          {leave ? (
                            <div className="bg-orange-100 border border-orange-300 rounded px-1.5 py-0.5 text-[10px] text-center font-semibold text-orange-700">
                              Leave
                            </div>
                          ) : (
                            <>
                              {dayShifts.map((shift) => {
                                const role = getRoleInfo(shift.role_id);
                                const codeKey = String(shift.shift_code || "").toUpperCase();
                                const color = shiftCodeColors[codeKey] || role?.color || "#0d9488";
                                const hours = computeHours(shift);
                                return (
                                  <div
                                    key={shift.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (canEdit) onEditShift(shift);
                                    }}
                                    className={`mb-1 rounded border-l-4 ${compact ? "p-0.5" : "p-1"} ${
                                      canEdit ? "hover:shadow" : ""
                                    }`}
                                    style={{
                                      backgroundColor: `${color}22`,
                                      borderLeft: `3px solid ${color}`,
                                      color,
                                    }}
                                  >
                                    <div
                                      className={`${
                                        compact ? "text-[10px] leading-tight" : "text-[11px] leading-tight"
                                      } font-extrabold uppercase tracking-wide text-slate-900`}
                                    >
                                      {shift.shift_code || role?.name || "Shift"}
                                    </div>
                                    {hours != null && (
                                      <div className="text-[10px] text-slate-600">{formatHours(hours)}</div>
                                    )}
                                    {(shift.start_time || shift.end_time) && !compact && (
                                      <div className="text-[10px] text-slate-700">
                                        {shift.start_time || "--"} - {shift.end_time || "--"}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {canEdit && dayShifts.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <div className="bg-teal-500 rounded-full p-1.5">
                                    <Plus className="w-3 h-3 text-white" />
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {dropdownPosition && (
        <ShiftCodeDropdown
          position={dropdownPosition}
          onSelect={handleShiftCodeSelect}
          onClose={() => {
            setDropdownPosition(null);
            setSelectedCell(null);
          }}
          currentCode={null}
          onCreateCustom={handleCreateCustomFromCell}
          allowCustom={true}
        />
      )}
    </div>
  );
}
