
import React from "react";
import { format } from "date-fns";
import ShiftCodeDropdown from "./ShiftCodeDropdown";
import StaffBadge from "@/components/common/StaffBadge";
import { emailPrefix } from "@/components/utils/strings";
import { Checkbox } from "@/components/ui/checkbox";

export default function DayView({
  selectedDate,
  shifts,
  employees,
  leaves,
  departments,
  roles,
  onCreateShift,
  onEditShift,
  canEdit,
  isLoading,
  activeDepartment,
  shiftCodeColors = {},
  shiftCodeHours = {},
  dateRange,
  // NEW selection props
  selectable = false,
  selectedIds,
  onToggleSelect,
  fullScreen = false
}) {
  const norm = (v) => (v == null ? "" : String(v)).trim().toLowerCase();
  // UPDATED: robust department match
  const deptMatches = (shiftDepartmentIdOrName) => {
    if (!activeDepartment?.id) return true;

    const nVal = norm(shiftDepartmentIdOrName);
    const aId = norm(activeDepartment.id);
    const aName = norm(activeDepartment.name);
    const aCode = norm(activeDepartment.code);

    if (nVal === aId || nVal === aName || nVal === aCode) return true;

    const shiftDepartment = (departments || []).find(d =>
      norm(d.id) === nVal || norm(d.name) === nVal || norm(d.code) === nVal
    );
    if (!shiftDepartment) return false;

    return norm(shiftDepartment.name) === aName || (aCode && norm(shiftDepartment.code) === aCode);
  };

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

  // NEW: dropdown state
  const [dropdownPosition, setDropdownPosition] = React.useState(null);
  const [selectedCell, setSelectedCell] = React.useState(null); // { employeeId: string|null }

  // UPDATED: scroll container to keep header sticky
  const internalScrollRef = React.useRef(null);

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    const prefix = emailPrefix(emp?.user_email);
    return emp?.full_name || prefix || "Unassigned";
  };

  const getRoleName = (roleId) => {
    return roles.find(r => r.id === roleId)?.name || "Unknown";
  };

  const getRoleColor = (roleId) => {
    return roles.find(r => r.id === roleId)?.color || "#0d9488";
  };

  const getDepartmentName = (deptId) => {
    return departments.find(d => d.id === deptId)?.name || "Unknown";
  };

  // NEW: hours helpers - formatHours function removed as per new JSX usage
  const computeHours = (s) => {
    const codeKey = String(s.shift_code || "").toUpperCase();
    if (shiftCodeHours[codeKey] != null) return shiftCodeHours[codeKey];

    const st = s.start_time, et = s.end_time;
    if (!st || !et) return null;

    const [sh, sm] = st.split(":").map(Number);
    const [eh, em] = et.split(":").map(Number);

    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60; // Handle overnight shifts

    mins -= Number(s.break_minutes || 0);

    // Convert minutes to hours and round to nearest 0.5
    const hrs = Math.round((mins / 60) * 2) / 2;
    return hrs > 0 ? hrs : null;
  };

  const safeTime = (t) => (typeof t === "string" && t.length ? t : "00:00");

  // STRICT: include only shifts where the shift.department_id matches the active ward (no employee-bypass)
  const key = format(selectedDate, "yyyy-MM-dd");
  const dayShifts = shifts.filter((s) => {
    if (normalizeDateKey(s.date) !== key) return false;

    if (!activeDepartment?.id) return true;

    // Only keep if the shift directly matches the ward
    return deptMatches(s.department_id);
  });

  // UPDATED: compute unassigned shifts for the selected day (respecting ward filter via dayShifts calculation)
  const unassignedForDay = React.useMemo(() => {
    return dayShifts.filter(s => !s.employee_id && !s.employee_email && !s.employee_name);
  }, [dayShifts]);

  // Map for quick lookup by employeeId (null for unassigned)
  const shiftsByEmp = React.useMemo(() => {
    const map = new Map();
    map.set(null, unassignedForDay); // Use the pre-computed unassignedForDay list
    employees.forEach(e => {
      map.set(e.id, dayShifts.filter(s => s.employee_id === e.id));
    });
    return map;
  }, [dayShifts, employees, unassignedForDay]); // Added unassignedForDay to dependencies

  const handleCellClick = (event, employeeId) => {
    if (!canEdit) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX,
    });
    setSelectedCell({ employeeId: employeeId || null });
  };

  const handleShiftCodeSelect = (shiftCode) => {
    if (!selectedCell) return;

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

    onCreateShift(selectedDate, selectedCell.employeeId || null, {
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
    onCreateShift(selectedDate, selectedCell.employeeId || null, {
      department_id: activeDepartment?.id || undefined,
    });
    setDropdownPosition(null);
    setSelectedCell(null);
  };

  const isSelected = (id) => !!selectedIds && selectedIds.has && selectedIds.has(id);

  // Minimal professional table UI
  const shiftCardClass = `p-2 rounded-md border border-slate-200 ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`;

  return (
    <div className="relative">
      {/* UPDATED: taller in full screen */}
      <div className={`overflow-auto ${fullScreen ? "max-h-[calc(100vh-200px)]" : "max-h-[70vh]"}`} ref={internalScrollRef}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20"> {/* UPDATED: sticky header */}
              <th className="p-3 text-left font-semibold text-slate-800 sticky left-0 bg-slate-50 z-30 min-w-[220px]"> {/* UPDATED width and z-index */}
                Team Member
              </th>
              <th className="p-3 text-center font-semibold text-slate-800 min-w-[160px]">
                <div className="text-xs text-slate-500">{format(selectedDate, 'EEE')}</div>
                <div className="text-lg font-bold">{format(selectedDate, 'd')}</div>
                <div className="text-[11px] text-slate-500">{format(selectedDate, 'MMM')}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* UPDATED: show Unassigned row only if we actually have unassigned shifts */}
            {unassignedForDay.length > 0 && (
              <tr className="border-b border-slate-100">
                <td className="p-3 sticky left-0 bg-white z-20 border-r border-slate-100"> {/* UPDATED z-index */}
                  <div className="flex items-center gap-2">
                    <StaffBadge name="Unassigned" size={32} variant="slate" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">Unassigned</p>
                      <p className="text-[11px] text-slate-500">Open shifts</p>
                    </div>
                  </div>
                </td>
                <td
                  className={`p-2 align-top relative ${canEdit ? "cursor-pointer" : ""}`}
                  onClick={(e) => handleCellClick(e, null)}
                >
                  <div className="space-y-2">
                    {unassignedForDay.map(shift => {
                      const role = roles.find(r => r.id === shift.role_id);
                      const codeKey = String(shift.shift_code || "").toUpperCase();
                      const color = shiftCodeColors[codeKey] || role?.color || "#334155";
                      const hours = computeHours(shift); // Using the helper function
                      return (
                        <div
                          key={shift.id}
                          onClick={(evt) => { evt.stopPropagation(); canEdit && onEditShift(shift); }}
                          className={shiftCardClass}
                          style={{ borderLeft: `3px solid ${color}` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-semibold text-slate-800">
                              {shift.shift_code || role?.name || "Shift"}
                            </div>
                            {hours != null && (
                              <div className="text-[11px] text-slate-600">{hours} hrs</div>
                            )}
                          </div>
                          <div className="text-xs text-slate-700">
                            {shift.start_time} - {shift.end_time}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            )}

            {/* Employee rows */}
            {employees
              .filter(emp => {
                const hasLeave = leaves.some(l => {
                  const sd = normalizeDateKey(l.start_date);
                  const ed = normalizeDateKey(l.end_date);
                  const k = normalizeDateKey(selectedDate);
                  return l.employee_id === emp.id && k >= sd && k <= ed;
                });
                const hasShifts = (shiftsByEmp.get(emp.id) || []).length > 0;
                return hasLeave || hasShifts;
              })
              .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
              .map(emp => {
              const leave = leaves.find(l => {
                const sd = normalizeDateKey(l.start_date);
                const ed = normalizeDateKey(l.end_date);
                const k = normalizeDateKey(selectedDate);
                return l.employee_id === emp.id && k >= sd && k <= ed;
              });
              return (
                <tr key={emp.id} className="border-b border-slate-100">
                  <td className="p-3 sticky left-0 bg-white z-20 border-r border-slate-100"> {/* UPDATED z-index */}
                    <div className="flex items-center gap-2">
                      {selectable && (
                        <Checkbox
                          checked={isSelected(emp.id)}
                          onCheckedChange={() => onToggleSelect && onToggleSelect(emp.id)}
                          onClick={(e) => e.stopPropagation()} // Prevent parent td click
                        />
                      )}
                      <StaffBadge name={emp.full_name || emp.user_email} size={32} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {emp.full_name || emailPrefix(emp.user_email)}
                        </p>
                        {/* UPDATED: softer job/role line */}
                        <p className="text-[10px] text-slate-500 truncate">
                          {emp.job_title || (Array.isArray(emp.role_ids) && roles.find(r => r.id === emp.role_ids?.[0])?.name) || ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td
                    className={`p-2 align-top relative ${canEdit ? "cursor-pointer" : ""}`}
                    onClick={(e) => !leave && handleCellClick(e, emp.id)}
                  >
                    {leave ? (
                      <div className="border border-amber-200 text-amber-700 bg-amber-50 rounded-md p-2 text-center text-xs">
                        Leave
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(shiftsByEmp.get(emp.id) || []).map(shift => {
                          const role = roles.find(r => r.id === shift.role_id);
                          const codeKey = String(shift.shift_code || "").toUpperCase();
                          const color = shiftCodeColors[codeKey] || role?.color || "#334155";
                          const hours = computeHours(shift); // Using the helper function
                          return (
                            <div
                              key={shift.id}
                              onClick={(evt) => { evt.stopPropagation(); canEdit && onEditShift(shift); }}
                              className={shiftCardClass}
                              style={{ borderLeft: `3px solid ${color}` }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-[11px] font-semibold text-slate-800">
                                  {shift.shift_code || role?.name || "Shift"}
                                </div>
                                {hours != null && (
                                  <div className="text-[11px] text-slate-600">{hours} hrs</div>
                                )}
                              </div>
                              <div className="text-xs text-slate-700">
                                {shift.start_time} - {shift.end_time}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
