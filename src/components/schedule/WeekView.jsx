
import React from "react";
import { format, parseISO } from "date-fns";
import StaffBadge from "@/components/common/StaffBadge";
import { emailPrefix } from "@/components/utils/strings";
import ShiftCodeDropdown from "./ShiftCodeDropdown";
import { Checkbox } from "@/components/ui/checkbox";


export default function WeekView({
  weekDays,
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
  scrollRefExternal,
  shiftCodeHours = {},
  dateRange,
  selectable = false,
  selectedIds,
  onToggleSelect,
  fullScreen = false,
}) {
  const internalScrollRef = React.useRef(null);
  const scrollRef = scrollRefExternal || internalScrollRef;

  // NEW: dropdown state
  const [dropdownPosition, setDropdownPosition] = React.useState(null);
  // FIX: previously missing 'const' caused 'selectedCell is not defined'
  const selectedCell = React.useRef(null); // { day: Date, employeeId: string|null }

  const norm = (v) => (v == null ? "" : String(v)).trim().toLowerCase();

  // UPDATED: robust department match using departments list (handles duplicate records with same name/code)
  const deptMatches = (identifierToCheck, departmentObject = activeDepartment) => {
    if (!departmentObject?.id) return true; // If no active department is provided, consider it a match.

    const normalizedIdentifier = norm(identifierToCheck);
    const activeId = norm(departmentObject.id);
    const activeName = norm(departmentObject.name);
    const activeCode = norm(departmentObject.code);

    // 1. Check for direct match against active department's id, name, or code
    if (
      normalizedIdentifier === activeId ||
      normalizedIdentifier === activeName ||
      normalizedIdentifier === activeCode
    ) {
      return true;
    }

    // 2. If not a direct match, try to find a department object in the full 'departments' list
    // that matches the identifierToCheck by its id, name, or code.
    const matchingDepInAllDepartments = (departments || []).find(d =>
      norm(d.id) === normalizedIdentifier ||
      norm(d.name) === normalizedIdentifier ||
      norm(d.code) === normalizedIdentifier
    );

    if (matchingDepInAllDepartments) {
      // 3. If such a department object is found, compare its name and code
      // with the active department's name and code for "unification".
      const matchedDepName = norm(matchingDepInAllDepartments.name);
      const matchedDepCode = norm(matchingDepInAllDepartments.code);

      // A match is found if the names are the same, OR
      // if both activeDepartment and the matched department have codes, and those codes are the same.
      // This handles cases where 'Ward 2' could have ID 'abc' and another 'Ward 2' could have ID 'xyz',
      // but they represent the same logical department.
      return matchedDepName === activeName || (activeCode && matchedDepCode === activeCode);
    }

    // No match found
    return false;
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

  const dateKey = (d) => format(d, 'yyyy-MM-dd');

  const matchesEmployee = (shift, employeeId) => {
    // If employeeId is null/undefined, we are looking for genuinely unassigned shifts.
    if (!employeeId) {
      // A shift is unassigned if it has no employee_id and no identifying employee info like email or name
      return !shift.employee_id && !shift.employee_email && !shift.employee_name && !shift.employee;
    }

    // First, check for direct employee_id match
    if (shift.employee_id === employeeId) return true;

    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return false; // If employee object isn't found, no match possible

    // SAFE: compare emails as strings
    const sEmail = String(shift.employee_email || "").toLowerCase();
    const eEmail = String(emp.user_email || "").toLowerCase();
    if (sEmail && eEmail && sEmail === eEmail) return true;

    // Check by employee_name or employee field (less reliable but needed for uploaded data)
    const shiftName = String(shift.employee_name || shift.employee || "").trim().toLowerCase();
    const empFullName = String(emp.full_name || "").trim().toLowerCase();
    // Use the emailPrefix utility here
    const empEmailPrefix = emailPrefix(emp.user_email).toLowerCase();

    if (shiftName) {
      if (empFullName && shiftName === empFullName) return true;
      if (empEmailPrefix && shiftName === empEmailPrefix) return true;
    }

    return false; // No match found
  };

  const getShiftsForEmployeeAndDay = (employeeId, date) => {
    const key = dateKey(date);
    const safeTime = (t) => (typeof t === "string" && t.length ? t : "00:00");
    return shifts
      .filter((s) => {
        const matchesDate = normalizeDateKey(s.date) === key;
        if (!matchesDate) return false;

        // STRICT WARD MATCH: when filtering by ward, only show shifts whose department_id matches the active ward
        if (activeDepartment?.id) {
          const shiftDepartmentMatches = deptMatches(s.department_id, activeDepartment);
          if (!shiftDepartmentMatches) return false;
        }

        return matchesEmployee(s, employeeId);
      })
      .sort((a, b) => safeTime(a.start_time).localeCompare(safeTime(b.start_time)));
  };

  const weekKeys = new Set(weekDays.map(d => dateKey(d)));
  // UPDATED: Only show unassigned row if there are unassigned shifts in this week (and in ward if filtered)
  const hasUnassigned = shifts.some(s =>
    matchesEmployee(s, null) &&
    weekKeys.has(normalizeDateKey(s.date)) &&
    (!activeDepartment?.id || deptMatches(s.department_id, activeDepartment))
  );

  const getLeaveForEmployeeAndDay = (employeeId, date) => {
    return leaves.find(l => {
      const startDate = parseISO(l.start_date);
      const endDate = parseISO(l.end_date);
      return l.employee_id === employeeId && date >= startDate && date <= endDate;
    });
  };

  const isEmployeeDayOff = (employee, date) => {
    const dayName = format(date, 'EEEE');
    return employee.days_off?.includes(dayName);
  };

  const getRoleInfo = (roleId) => {
    return roles.find(r => r.id === roleId);
  };

  // NEW: hours calculator (removed formatHours as it's handled in JSX now)
  const computeHours = (s) => {
    const codeKey = String(s.shift_code || "").toUpperCase();
    if (shiftCodeHours[codeKey] != null) return shiftCodeHours[codeKey];
    
    const st = s.start_time, et = s.end_time;
    if (!st || !et) return null;
    
    try {
      const [sh, sm] = st.split(":").map(Number);
      const [eh, em] = et.split(":").map(Number);
      
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      // Handle shifts that cross midnight
      if (mins < 0) { 
        mins += 24 * 60; 
      }
      
      mins -= Number(s.break_minutes || 0);
      
      // Round to nearest 0.5 hours
      const hrs = Math.round((mins / 60) * 2) / 2;
      return hrs > 0 ? hrs : null;
    } catch (e) {
      console.error("Error computing hours for shift:", s, e);
      return null;
    }
  };

  // NEW: open dropdown from any empty cell click
  const handleCellClick = (event, day, employeeId) => {
    if (!canEdit) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX,
    });
    selectedCell.current = { day, employeeId: employeeId || null };
  };

  // NEW: same prefill logic as MonthView
  const handleShiftCodeSelect = (shiftCode) => {
    if (!selectedCell.current) return;

    const { day, employeeId } = selectedCell.current;

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

    onCreateShift(day, employeeId || null, {
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
    selectedCell.current = null;
  };

  // NEW: custom
  const handleCreateCustomFromCell = () => {
    if (!selectedCell.current) return;
    const { day, employeeId } = selectedCell.current;
    onCreateShift(day, employeeId || null, {
      department_id: activeDepartment?.id || undefined,
    });
    setDropdownPosition(null);
    selectedCell.current = null;
  };

  // Minimal UI: remove cell tinting
  const cellBaseClass = "p-2 align-top relative";
  const shiftCardClass = `p-2 rounded-md border border-slate-200 ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`;

  const isSelected = (id) => !!selectedIds && selectedIds.has && selectedIds.has(id);

  // NEW: subtle job/role label helper
  const primaryLabelForEmp = React.useCallback((emp) => {
    if (emp?.job_title) return emp.job_title;
    if (Array.isArray(emp?.role_ids) && emp.role_ids.length) {
      const r = roles?.find(r => r.id === emp.role_ids[0]);
      return r?.name || "";
    }
    return "";
  }, [roles]);

  // NEW: Sort employees alphabetically by full_name, then by email prefix if full_name is same or missing
  const sortedEmployees = React.useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return [...employees].sort((a, b) => {
      const nameA = a.full_name || emailPrefix(a.user_email);
      const nameB = b.full_name || emailPrefix(b.user_email);
      return nameA.localeCompare(nameB);
    });
  }, [employees]);


  return (
    <div className="relative">
      {/* UPDATED: taller in full screen */}
      <div className={`overflow-auto ${fullScreen ? "max-h-[calc(100vh-200px)]" : "max-h-[70vh]"}`} ref={scrollRef}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20"> {/* UPDATED: sticky header */}
              <th className="p-3 text-left font-semibold text-slate-800 sticky left-0 bg-slate-50 z-10 min-w-[220px]"> {/* UPDATED width */}
                Team Member
              </th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className="p-3 text-center font-semibold text-slate-800 min-w-[140px]">
                  <div className="text-xs text-slate-500">{format(day, 'EEE')}</div>
                  <div className="text-lg font-bold">{format(day, 'd')}</div>
                  <div className="text-[11px] text-slate-500">{format(day, 'MMM')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-3 sticky left-0 bg-white z-10">
                    <div className="h-8 w-28 rounded bg-slate-100" />
                  </td>
                  {weekDays.map((_, j) => (
                    <td key={j} className="p-2">
                      <div className="h-12 w-full rounded bg-slate-50" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <>
                {hasUnassigned && (
                  <tr className="border-b border-slate-100">
                    <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <StaffBadge name="Unassigned" size={32} variant="slate" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">Unassigned</p>
                          <p className="text-[11px] text-slate-500">Open shifts</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dayShifts = getShiftsForEmployeeAndDay(null, day);
                      return (
                        <td
                          key={day.toISOString()}
                          className={`${cellBaseClass} ${canEdit ? "cursor-pointer" : ""}`}
                          onClick={(e) => handleCellClick(e, day, null)}
                        >
                          <div className="space-y-2">
                            {dayShifts.map(shift => {
                              const role = getRoleInfo(shift.role_id);
                              const codeKey = String(shift.shift_code || "").toUpperCase();
                              const color = shiftCodeColors[codeKey] || role?.color || "#334155";
                              const hours = computeHours(shift);
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
                      );
                    })}
                  </tr>
                )}

                {sortedEmployees.map(employee => (
                  <tr key={employee.id} className="border-b border-slate-100">
                    <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        {selectable && (
                          <Checkbox
                            checked={isSelected(employee.id)}
                            onCheckedChange={() => onToggleSelect && onToggleSelect(employee.id)}
                          />
                        )}
                        <StaffBadge name={employee.full_name || employee.user_email} size={32} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {employee.full_name || emailPrefix(employee.user_email)}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{primaryLabelForEmp(employee)}</p>
                          {employee.contracted_hours_weekly ? (
                            <p className="text-[10px] text-slate-500">{employee.contracted_hours_weekly} h/wk</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dayShifts = getShiftsForEmployeeAndDay(employee.id, day);
                      const leave = getLeaveForEmployeeAndDay(employee.id, day);
                      const isDayOff = isEmployeeDayOff(employee, day);

                      return (
                        <td
                          key={day.toISOString()}
                          className={`${cellBaseClass} ${canEdit && !leave && !isDayOff ? "cursor-pointer" : ""}`}
                          onClick={(e) => !leave && !isDayOff && handleCellClick(e, day, employee.id)}
                        >
                          {leave ? (
                            <div className="border border-amber-200 text-amber-700 bg-amber-50 rounded-md p-2 text-center text-xs">
                              Leave
                            </div>
                          ) : isDayOff ? (
                            <div className="border border-slate-200 bg-slate-50 rounded-md p-2 text-center text-xs text-slate-600">
                              Day Off
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {dayShifts.map(shift => {
                                const role = getRoleInfo(shift.role_id);
                                const codeKey = String(shift.shift_code || "").toUpperCase();
                                const color = shiftCodeColors[codeKey] || role?.color || "#334155";
                                const hours = computeHours(shift);
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
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {dropdownPosition && (
        <ShiftCodeDropdown
          position={dropdownPosition}
          onSelect={handleShiftCodeSelect}
          onClose={() => {
            setDropdownPosition(null);
            selectedCell.current = null;
          }}
          currentCode={null}
          onCreateCustom={handleCreateCustomFromCell}
          allowCustom={true}
        />
      )}
    </div>
  );
}
