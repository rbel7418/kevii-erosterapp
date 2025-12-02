
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Shift, Employee, Leave, Department, Role } from "@/entities/all";
import { User } from "@/entities/User";
import { ShiftCode } from "@/entities/ShiftCode";
import { RotaStatus } from "@/entities/RotaStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Upload, Download, Calendar as CalendarIcon, Eye, EyeOff, RefreshCw, Wrench, FileSpreadsheet, Table as TableIcon, BarChart3, Lock, Unlock, UserPlus, UserMinus, Plus } from "lucide-react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, parseISO, addWeeks, subWeeks, addMonths, subMonths, eachDayOfInterval } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { withRetry, sleep } from "@/components/utils/withRetry";
import { getCached } from "@/components/utils/cache";
import { colorForCode } from "@/components/utils/colors";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import MonthView from "../components/schedule/MonthView";
import WeekView from "../components/schedule/WeekView";
import DayView from "../components/schedule/DayView";
// OPTIMIZED: lazy-load heavy dialogs
const ShiftDialog = React.lazy(() => import("../components/schedule/ShiftDialog"));
const DateRangePicker = React.lazy(() => import("../components/schedule/DateRangePicker")); // Note: DateRangePicker was not explicitly in the outline but is a dialog, so adding it.
const ExportDialog = React.lazy(() => import("../components/schedule/ExportDialog"));
const TemplateUploadDialog = React.lazy(() => import("../components/schedule/TemplateUploadDialog"));
const PublishDialog = React.lazy(() => import("../components/schedule/PublishDialog")); // Note: PublishDialog was not explicitly in the outline but is a dialog, so adding it.
const DeptStaffManager = React.lazy(() => import("../components/schedule/DeptStaffManager"));
const AddToDepartmentDialog = React.lazy(() => import("../components/schedule/AddToDepartmentDialog"));
const EmployeeDialog = React.lazy(() => import("@/components/team/EmployeeDialog"));

export default function Schedule() {
  const [viewMode, setViewMode] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [initialShiftData, setInitialShiftData] = useState(null);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [editEnabled, setEditEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [compact, setCompact] = useState(true);
  const [shiftCodeColors, setShiftCodeColors] = useState({});
  const [shiftCodeHours, setShiftCodeHours] = useState({});
  const [exportMode, setExportMode] = useState("excel");

  const location = useLocation();
  const [deptFilterName, setDeptFilterName] = useState(null);
  const [dutyManagerOnly, setDutyManagerOnly] = useState(false);
  const [sectionTab, setSectionTab] = useState("roster");
  const [selectedEmpIds, setSelectedEmpIds] = useState(new Set());
  const [assignDeptId, setAssignDeptId] = useState("");

  const [showAddExisting, setShowAddExisting] = useState(false);
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [newStaffPrefill, setNewStaffPrefill] = useState(null);
  const [isMassUpdating, setIsMassUpdating] = useState(false);

  const loadingRef = useRef(false);
  const gridScrollRef = React.useRef(null);

  // NEW: ensure Duty Manager department only initializes once to prevent flicker
  const dmDeptInitRef = React.useRef(false);

  const writeRangeToUrl = React.useCallback((start, end) => {
    const params = new URLSearchParams(window.location.search);
    if (start && end) {
      params.set("start", format(start, "yyyy-MM-dd"));
      params.set("end", format(end, "yyyy-MM-dd"));
    } else {
      params.delete("start");
      params.delete("end");
    }
    const newUrl = location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState({}, "", newUrl);
  }, [location.pathname]);

  const updateEmployeesThrottled = React.useCallback(
    async (idsOrArray, patch, { delayMs = 600 } = {}) => {
      const list = Array.isArray(idsOrArray) ? idsOrArray : Array.from(idsOrArray || []);
      for (let i = 0; i < list.length; i++) {
        const id = list[i];
        try {
          await withRetry(() => Employee.update(id, patch), { retries: 3, baseDelay: 700 });
        } catch (error) {
          console.error(`Failed to update employee ${id}:`, error);
        }
        if (i < list.length - 1) {
          await sleep(delayMs);
        }
      }
    },
    []
  );

  const norm = (v) => (v == null ? "" : String(v)).trim().toLowerCase();
  const resolveDeptByAny = React.useCallback(
    (val) => {
      if (!val || departments.length === 0) return null;
      const n = norm(val);
      return (
        departments.find(
          (d) => norm(d.id) === n || norm(d.name) === n || norm(d.code) === n
        ) || null
      );
    },
    [departments]
  );

  const getEmployeeDeptId = React.useCallback(
    (emp) => {
      if (!emp) return null;
      if (emp.department_id) {
        const d = resolveDeptByAny(emp.department_id);
        if (d) return d.id;
      }
      const nameish = emp.department || emp.department_name;
      if (nameish) {
        const d = resolveDeptByAny(nameish);
        if (d) return d.id;
      }
      return null;
    },
    [resolveDeptByAny]
  );

  const getShiftDeptId = React.useCallback(
    (shift) => {
      if (!shift) return null;
      if (shift.department_id) {
        const d = resolveDeptByAny(shift.department_id);
        if (d) return d.id;
      }
      return null;
    },
    [resolveDeptByAny]
  );

  const activeDepartment = React.useMemo(() => {
    if (!deptFilterName || departments.length === 0) return null;
    const needle = deptFilterName.trim().toLowerCase();
    return departments.find(d => (d.name || "").trim().toLowerCase() === needle) || null;
  }, [deptFilterName, departments]);

  const isAdmin = (currentUser?.role === 'admin') || (currentUser?.access_level === 'admin');
  const isManager = currentUser?.access_level === 'manager';
  const canPublish = isAdmin || isManager;

  const computePublishScope = React.useCallback(() => {
    const monthKey = format(currentDate, 'yyyy-MM');
    const deptId = activeDepartment?.id || "";
    const dmOnly = !!dutyManagerOnly;
    return { monthKey, deptId, dmOnly };
  }, [currentDate, activeDepartment, dutyManagerOnly]);

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const user = await withRetry(() => User.me());
      setCurrentUser(user);

      // OPTIMIZED: batch all entity fetches in parallel
      const [rolesData, deptData, employeesData, leavesData, shiftsData, shiftCodes] = await Promise.all([
        getCached("roles", 60000, () => withRetry(() => Role.list())),
        getCached("departments", 60000, () => withRetry(() => Department.list())),
        getCached("employees", 30000, () => withRetry(() => Employee.list())),
        getCached("leaves", 30000, () => withRetry(() => Leave.list())),
        getCached("shifts", 15000, () => withRetry(() => Shift.list("-date", 1000))),
        getCached("shiftcodes", 60000, () => withRetry(() => ShiftCode.list()))
      ]);

      const codeMap = {};
      (shiftCodes || []).forEach(sc => {
        const code = String(sc.code || "").toUpperCase();
        if (!code) return;
        codeMap[code] = sc.color || colorForCode(code);
      });
      setShiftCodeColors(codeMap);

      const hoursMap = {};
      (shiftCodes || []).forEach(sc => {
        const code = String(sc.code || "").toUpperCase();
        if (!code) return;
        if (typeof sc.weighted_hours === "number" && !isNaN(sc.weighted_hours)) {
          hoursMap[code] = sc.weighted_hours;
        } else {
          const desc = String(sc.descriptor || "").toLowerCase();
          hoursMap[code] = (desc.includes("night") || desc.includes("long")) ? 12.5 : 8;
        }
      });
      setShiftCodeHours(hoursMap);

      // This part was inside the original loadData, needs to be handled after shiftCodes are available
      const missing = (shiftCodes || []).filter(sc => !sc.color).slice(0, 15);
      for (const sc of missing) {
        const col = colorForCode(sc.code);
        try {
          await withRetry(() => ShiftCode.update(sc.id, { color: col }), { retries: 1, baseDelay: 400 });
          await sleep(60);
        } catch (e) {
          console.warn(`Failed to update color for shift code ${sc.code}:`, e);
        }
      }

      console.log("Loaded shifts:", shiftsData.length);
      console.log("Date range in shifts:", {
        earliest: shiftsData[shiftsData.length - 1]?.date,
        latest: shiftsData[0]?.date
      });

      setShifts(shiftsData);
      setEmployees(employeesData.filter(e => e.is_active));
      setLeaves(leavesData.filter(l => l.status === 'approved'));
      setDepartments(deptData);
      setRoles(rolesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [loadData]);

  useEffect(() => {
    if (!autoSync) return;
    const id = setInterval(() => {
      if (!loadingRef.current && !document.hidden) {
        loadData();
      }
    }, 45000);
    return () => clearInterval(id);
  }, [autoSync, loadData]);

  const applyRange = useCallback((start, end) => {
    const s = start;
    const e = end && end >= s ? end : s;

    setDateRange({ start: s, end: e });

    if (viewMode === "month") {
      setCurrentDate(startOfMonth(s));
    } else if (viewMode === "week") {
      setCurrentDate(startOfWeek(s, { weekStartsOn: 1 }));
    } else {
      setCurrentDate(s);
    }
  }, [viewMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dept = params.get("department");
    const dm = params.get("duty_manager");
    setDeptFilterName(dept ? String(dept) : null);
    setDutyManagerOnly(dm === "1" || dm === "true");

    setSectionTab("roster");

    const startParam = params.get("start");
    const endParam = params.get("end");
    let rangeApplied = false;

    if (startParam) {
      const s = parseISO(startParam);
      const e = parseISO(endParam || startParam);
      if (s instanceof Date && !isNaN(s) && e instanceof Date && !isNaN(e)) {
        applyRange(s, e);
        rangeApplied = true;
      }
    } else {
      const saved = localStorage.getItem("schedule_last_range");
      if (saved) {
        try {
          const { start, end } = JSON.parse(saved);
          const s = parseISO(start);
          const e = parseISO(end || start);
          if (s instanceof Date && !isNaN(s) && e instanceof Date && !isNaN(e)) {
            applyRange(s, e);
            rangeApplied = true;
          }
        } catch (e) {
          console.warn("Failed to parse schedule_last_range from localStorage:", e);
          localStorage.removeItem("schedule_last_range");
        }
      }
    }

    const action = params.get("action");
    const target = params.get("target");

    if (action === "export") {
      setExportMode(target === "powerbi" ? "powerbi" : "excel");
      setShowExportDialog(true);

      params.delete("action");
      params.delete("target");
      const newUrl = location.pathname + (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", newUrl);
    } else if (action === "import") {
      setShowTemplateDialog(true);

      params.delete("action");
      params.delete("target");
      const newUrl = location.pathname + (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, [location.search, location.pathname, applyRange]);

  useEffect(() => {
    if (dateRange?.start && dateRange?.end) {
      localStorage.setItem("schedule_last_range", JSON.stringify({
        start: format(dateRange.start, "yyyy-MM-dd"),
        end: format(dateRange.end, "yyyy-MM-dd")
      }));
      writeRangeToUrl(dateRange.start, dateRange.end);
    } else {
      localStorage.removeItem("schedule_last_range");
      writeRangeToUrl(null, null);
    }
  }, [dateRange?.start, dateRange?.end, writeRangeToUrl]);

  useEffect(() => {
    setSelectedEmpIds(new Set());
  }, [deptFilterName, dutyManagerOnly]);

  useEffect(() => {
    const fetchPublishStatus = async () => {
      const { monthKey, deptId, dmOnly } = computePublishScope();
      let currentStatus = false;

      let records = await RotaStatus.filter({
        month_key: monthKey,
        department_id: deptId,
        duty_manager_only: dmOnly
      });

      if (records && records.length > 0) {
        currentStatus = records[0].is_published;
      } else if (deptId) {
        let globalRecords = await RotaStatus.filter({
          month_key: monthKey,
          department_id: "",
          duty_manager_only: dmOnly
        });
        if (globalRecords && globalRecords.length > 0) {
          currentStatus = globalRecords[0].is_published;
        }
      }
      setIsPublished(!!currentStatus);
    };
    fetchPublishStatus();
  }, [computePublishScope]);

  // INIT: set Duty Manager department once (prefer saved; otherwise first in list)
  // UPDATED: add assignDeptId to deps to satisfy React Hooks exhaustive-deps
  useEffect(() => {
    if (!dutyManagerOnly) {
      dmDeptInitRef.current = false;
      return;
    }
    if (dmDeptInitRef.current) return;
    if (!Array.isArray(departments) || departments.length === 0) return;

    const saved = localStorage.getItem("dm_assign_dept");
    const valid = saved && departments.some(d => d.id === saved) ? saved : departments[0].id;

    if (assignDeptId !== valid) {
      setAssignDeptId(valid);
    }
    dmDeptInitRef.current = true;
  }, [dutyManagerOnly, departments, assignDeptId]);

  // PERSIST: save current selection (no-op if unchanged)
  useEffect(() => {
    if (!dutyManagerOnly) return;
    if (!assignDeptId) return;
    const saved = localStorage.getItem("dm_assign_dept");
    if (saved !== assignDeptId) {
      localStorage.setItem("dm_assign_dept", assignDeptId);
    }
  }, [dutyManagerOnly, assignDeptId]);

  const { displayEmployees, displayShifts } = React.useMemo(() => {
    let emps = employees;
    let shs = shifts;

    if (dutyManagerOnly) {
      const isDM = (code) => String(code || "").toUpperCase().includes("DM");

      const computeRange = () => {
        if (dateRange?.start && dateRange?.end) {
          return { start: dateRange.start, end: dateRange.end };
        }
        if (viewMode === "month") {
          return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
        }
        if (viewMode === "week") {
          const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
          return { start: ws, end: addDays(ws, 6) };
        }
        return { start: currentDate, end: currentDate };
      };
      const { start, end } = computeRange();

      shs = (shifts || []).filter((s) => {
        if (!isDM(s.shift_code)) return false;
        const d = parseISO(String(s.date || ""));
        return d instanceof Date && !isNaN(d) && d >= start && d <= end;
      });

      const idsWithDM = new Set(shs.map((s) => s.employee_id).filter(Boolean));
      emps = employees.filter((e) => idsWithDM.has(e.id));
    } else if (activeDepartment) {
      const activeId = activeDepartment.id;

      emps = employees.filter((e) => getEmployeeDeptId(e) === activeId);

      const deptEmpIds = new Set(emps.map((e) => e.id));
      shs = shifts.filter((s) => {
        const sdid = getShiftDeptId(s);
        return (sdid && sdid === activeId) || (s.employee_id && deptEmpIds.has(s.employee_id));
      });
    }

    const rank = (emp) => {
      const t = String(emp.job_title || "").toLowerCase();
      const rankFromTitle = () => {
        if (t.includes("ward manager")) return 1;
        if (t.includes("sister")) return 2;
        if (t.includes("senior") && t.includes("nurse")) return 3;
        if (/\bssn\b/.test(t)) return 3;
        if (t.includes("staff nurse") || /\bsn\b/.test(t)) return 4;
        if (t.includes("hca") || t.includes("healthcare") || t.includes("care assistant")) return 5;
        if (t.includes("ward clerk") || t.includes("clerk")) return 6;
        return 50;
      };
      let r = rankFromTitle();

      if (r === 50 && Array.isArray(emp.role_ids) && emp.role_ids.length && roles?.length) {
        const names = emp.role_ids
          .map(id => roles.find(ro => ro.id === id)?.name || "")
          .join(" ")
          .toLowerCase();
        if (names.includes("ward manager")) r = 1;
        else if (names.includes("sister")) r = 2;
        else if (names.includes("senior") && names.includes("nurse")) r = 3;
        else if (names.includes("staff nurse")) r = 4;
        else if (names.includes("hca") || names.includes("care assistant")) r = 5;
        else if (names.includes("clerk")) r = 6;
      }
      return r;
    };

    const safeName = (e) => (e.full_name || String(e.user_email || "").split("@")[0] || "").toLowerCase();

    emps = [...emps].sort((a, b) => {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return safeName(a).localeCompare(safeName(b));
    });

    return { displayEmployees: emps, displayShifts: shs };
  }, [
    employees,
    shifts,
    dutyManagerOnly,
    activeDepartment,
    getEmployeeDeptId,
    getShiftDeptId,
    roles,
    viewMode,
    currentDate,
    dateRange?.start,
    dateRange?.end
  ]);

  const startStr = dateRange?.start ? format(dateRange.start, "yyyy-MM-dd") : "";
  const endStr = dateRange?.end ? format(dateRange.end, "yyyy-MM-dd") : "";

  const handleStartInput = (val) => {
    if (!val) {
      setDateRange(null);
      return;
    }
    const start = parseISO(val);
    const currentEnd = dateRange?.end || start;
    const end = currentEnd < start ? start : currentEnd;
    applyRange(start, end);
  };

  const handleEndInput = (val) => {
    if (!val) {
      setDateRange(null);
      return;
    }
    const end = parseISO(val);
    const currentStart = dateRange?.start || end;
    const start = currentStart > end ? end : currentStart;
    applyRange(start, end);
  };

  const handlePrevious = () => {
    setDateRange(null);
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    setDateRange(null);
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setDateRange(null);
    setCurrentDate(new Date());
  };

  const handleCreateShift = (date, employeeId, prefilledData = {}) => {
    const emp = employees.find(e => e.id === employeeId);
    const defaultDepartmentId = prefilledData.department_id || (emp ? getEmployeeDeptId(emp) : null) || (activeDepartment?.id || departments[0]?.id || "");
    const defaultRoleId = prefilledData.role_id || (emp?.role_ids && emp.role_ids.length > 0 ? emp.role_ids[0] : (roles[0]?.id || ""));

    setSelectedDate(date);
    setSelectedEmployee(employeeId || "");
    setSelectedShift(null);

    setInitialShiftData({
      ...prefilledData,
      date: format(date, "yyyy-MM-dd"),
      employee_id: employeeId || "",
      department_id: defaultDepartmentId,
      role_id: defaultRoleId,
    });

    setShowShiftDialog(true);
  };

  const handleEditShift = (shift) => {
    setSelectedShift(shift);
    setInitialShiftData(null);
    setShowShiftDialog(true);
  };

  const handleSaveShift = async (shiftData) => {
    try {
      if (selectedShift && selectedShift.id) {
        await Shift.update(selectedShift.id, shiftData);
        setShifts((prev) =>
          prev.map((s) => (s.id === selectedShift.id ? { ...s, ...shiftData } : s))
        );
      } else {
        const created = await Shift.create(shiftData);
        setShifts((prev) => [created, ...prev]);
      }

      setShowShiftDialog(false);
      setSelectedShift(null);
      setInitialShiftData(null);

      loadData();
    } catch (error) {
      console.error("Error saving shift:", error);
      alert("Failed to save shift. Please try again.");
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!shiftId) return;
    if (confirm("Are you sure you want to delete this shift?")) {
      try {
        await Shift.delete(shiftId);
      } catch (error) {
        const status = error?.response?.status || error?.status;
        if (status !== 404) {
          console.error("Error deleting shift:", error);
          alert("Failed to delete shift. Please try again.");
          return;
        } else {
          console.warn("Shift not found on delete, treating as already deleted:", shiftId);
        }
      }
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      await loadData();
    }
  };

  const handleDateRangeChange = (range) => {
    if (range?.start) {
      applyRange(range.start, range.end);
    }
    setShowDateRangePicker(false);
  };

  const handlePublishRota = async (nextState) => {
    const newPublishedStatus = typeof nextState === 'boolean' ? nextState : !isPublished;
    const { monthKey, deptId, dmOnly } = computePublishScope();

    try {
      let records = await RotaStatus.filter({
        month_key: monthKey,
        department_id: deptId,
        duty_manager_only: dmOnly
      });

      if (records && records.length > 0) {
        await RotaStatus.update(records[0].id, {
          is_published: newPublishedStatus,
          published_by: currentUser?.email || "",
          published_at: new Date().toISOString()
        });
      } else {
        await RotaStatus.create({
          month_key: monthKey,
          department_id: deptId,
          duty_manager_only: dmOnly,
          is_published: newPublishedStatus,
          published_by: currentUser?.email || "",
          published_at: new Date().toISOString()
        });
      }
      setIsPublished(newPublishedStatus);
    } catch (error) {
      console.error("Error changing publish status:", error);
      alert("Failed to change publish status. Please try again.");
    }
  };

  const getDateRangeDisplay = () => {
    if (dateRange) {
      return `Start: ${format(dateRange.start, 'MMM d, yyyy')} • End: ${format(dateRange.end, 'MMM d, yyyy')}`;
    }
    if (viewMode === "month") {
      return format(currentDate, 'MMMM yyyy');
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      return `Start: ${format(weekStart, 'MMM d, yyyy')} • End: ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  const goToTabularEditor = () => {
    const start = dateRange?.start || startOfMonth(currentDate);
    const end = dateRange?.end || endOfMonth(currentDate);
    const params = new URLSearchParams();
    params.set("start", format(start, 'yyyy-MM-dd'));
    params.set("end", format(end, 'yyyy-MM-dd'));
    if (activeDepartment?.name) params.set("department", activeDepartment.name);
    if (dutyManagerOnly) params.set("duty_manager", "1");
    window.location.href = createPageUrl(`TabularRoster?${params.toString()}`);
  };

  const canEdit = editEnabled;

  const renderActiveFilterPill = () => {
    if (dutyManagerOnly) {
      return (
        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
          Duty Manager roster
        </Badge>
      );
    }
    if (activeDepartment) {
      return (
        <Badge className="bg-teal-100 text-teal-700 border-teal-200">
          {activeDepartment.name} roster
        </Badge>
      );
    }
    return null;
  };

  const weekDays = React.useMemo(() => {
    if (dateRange?.start && dateRange?.end) {
      const start = dateRange.start instanceof Date ? dateRange.start : parseISO(String(dateRange.start));
      const end = dateRange.end instanceof Date ? dateRange.end : parseISO(String(dateRange.end));
      if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return eachDayOfInterval({ start, end });
      }
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [dateRange?.start, dateRange?.end, currentDate]);

  const isSelected = useCallback((id) => selectedEmpIds.has(id), [selectedEmpIds]);
  const toggleSelect = useCallback((id) => {
    setSelectedEmpIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const selectAllVisible = useCallback(() => {
    const next = new Set(displayEmployees.map(e => e.id));
    setSelectedEmpIds(next);
  }, [displayEmployees]);
  const clearSelection = useCallback(() => setSelectedEmpIds(new Set()), []);

  const removeSelectedFromWard = async () => {
    if (!activeDepartment?.id) return;
    if (selectedEmpIds.size === 0) return;
    if (!confirm(`Remove ${selectedEmpIds.size} staff from ${activeDepartment.name}? They will remain in the master list.`)) return;

    setIsMassUpdating(true);
    try {
      await updateEmployeesThrottled(selectedEmpIds, { department_id: "" });
      clearSelection();
      await loadData();
    } catch (error) {
      console.error("Error removing selected staff from ward:", error);
      alert("Failed to remove selected staff from ward. Please try again.");
    } finally {
      setIsMassUpdating(false);
    }
  };

  const removeAllFromWard = async () => {
    if (!activeDepartment?.id) return;
    if (displayEmployees.length === 0) return;
    if (!confirm(`Remove ALL ${displayEmployees.length} staff from ${activeDepartment.name}? They will remain in the master list.`)) return;

    setIsMassUpdating(true);
    try {
      await updateEmployeesThrottled(displayEmployees.map(e => e.id), { department_id: "" });
      clearSelection();
      await loadData();
    } catch (error) {
      console.error("Error removing all staff from ward:", error);
      alert("Failed to remove all staff from ward. Please try again.");
    } finally {
      setIsMassUpdating(false);
    }
  };

  const assignSelectedToDept = async () => {
    if (!assignDeptId || selectedEmpIds.size === 0) return;

    setIsMassUpdating(true);
    try {
      await updateEmployeesThrottled(selectedEmpIds, { department_id: assignDeptId });
      clearSelection();
      await loadData();
    } catch (e) {
      console.error("Error assigning selected to department:", e);
      alert("Failed to assign selected staff to department. Please try again.");
    } finally {
      setIsMassUpdating(false);
    }
  };

  const assignAllVisibleToDept = async () => {
    if (!assignDeptId || displayEmployees.length === 0) return;
    if (!confirm(`Assign ALL ${displayEmployees.length} visible staff to the selected department?`)) return;

    setIsMassUpdating(true);
    try {
      await updateEmployeesThrottled(displayEmployees.map(e => e.id), { department_id: assignDeptId });
      clearSelection();
      await loadData();
    } catch (e) {
      console.error("Error assigning all visible to department:", e);
      alert("Failed to assign all visible staff to department. Please try again.");
    } finally {
      setIsMassUpdating(false);
    }
  };

  const removeSelectedFromAnyDept = async () => {
    if (selectedEmpIds.size === 0) return;
    if (!confirm(`Remove ${selectedEmpIds.size} selected staff from their department(s)?`)) return;

    setIsMassUpdating(true);
    try {
      await updateEmployeesThrottled(selectedEmpIds, { department_id: "" });
      clearSelection();
      await loadData();
    } catch (e) {
      console.error("Error removing selected from department:", e);
      alert("Failed to remove selected staff from department. Please try again.");
    } finally {
      setIsMassUpdating(false);
    }
  };

  const removeAllVisibleFromAnyDept = async () => {
    if (displayEmployees.length === 0) return;
    if (!confirm(`Remove ALL ${displayEmployees.length} visible staff from their department(s)?`)) return;

    setIsMassUpdating(true);
    try {
      await updateEmployeesThrottled(displayEmployees.map(e => e.id), { department_id: "" });
      clearSelection();
      await loadData();
    } catch (e) {
      console.error("Error removing all visible from department:", e);
      alert("Failed to remove all visible staff from department. Please try again.");
    } finally {
      setIsMassUpdating(false);
    }
  };

  const assignManyToActiveDept = React.useCallback(async (ids) => {
    if (!activeDepartment?.id || !ids?.length) return;

    setIsMassUpdating(true);
    try {
      await updateEmployeesThrottled(ids, { department_id: activeDepartment.id });
      clearSelection();
      await loadData();
    } catch (e) {
      console.error("Error assigning staff to active department:", e);
      alert("Failed to assign staff to department. Please try again.");
    } finally {
      setIsMassUpdating(false);
    }
  }, [activeDepartment?.id, updateEmployeesThrottled, clearSelection, loadData]);

  const assignManyToDept = React.useCallback(async (ids, deptId) => {
    if (!deptId || !ids?.length) return;

    setIsMassUpdating(true);
    try {
      await updateEmployeesThrottled(ids, { department_id: deptId });
      clearSelection();
      await loadData();
    } catch (e) {
      console.error("Error assigning staff to department:", e);
      alert("Failed to assign staff to department. Please try again.");
    } finally {
      setIsMassUpdating(false);
    }
  }, [updateEmployeesThrottled, clearSelection, loadData]);

  const handleCreateNewStaff = () => {
    const prefill =
      activeDepartment?.id
        ? { department_id: activeDepartment.id }
        : (dutyManagerOnly && assignDeptId ? { department_id: assignDeptId } : {});
    setNewStaffPrefill(prefill);
    setShowNewStaff(true);
  };

  const handleSaveNewStaff = async (data) => {
    try {
      if (data.id) {
        await Employee.update(data.id, data);
      } else {
        const departmentIdToAssign = data.department_id || activeDepartment?.id || "";
        await Employee.create({ ...data, department_id: departmentIdToAssign });
      }
      setShowNewStaff(false);
      setNewStaffPrefill(null);
      await loadData();
    } catch (error) {
      console.error("Error saving new staff:", error);
      alert("Failed to save new staff. Please try again.");
    }
  };

  const visibleRange = React.useMemo(() => {
    if (dateRange?.start && dateRange?.end) {
      return { start: dateRange.start, end: dateRange.end };
    }
    if (viewMode === "month") {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      return { start: ws, end: addDays(ws, 6) };
    }
    return { start: currentDate, end: currentDate };
  }, [dateRange?.start, dateRange?.end, viewMode, currentDate]);

  const isInVisibleRange = React.useCallback((dateStr) => {
    if (!dateStr) return false;
    const d = parseISO(String(dateStr));
    if (isNaN(d.getTime())) return false;
    return d >= visibleRange.start && d <= visibleRange.end;
  }, [visibleRange]);

  const isDMShiftCode = React.useCallback((code) => {
    const s = String(code || "").toUpperCase();
    return s.includes("DM");
  }, []);

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-2">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                className="h-9 w-9"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-500" />
                  <Input
                    type="date"
                    value={startStr}
                    onChange={(e) => handleStartInput(e.target.value)}
                    className="h-9"
                    aria-label="Start date"
                    disabled={isPublished}
                  />
                </div>
                <span className="text-slate-500 text-sm">to</span>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-500" />
                  <Input
                    type="date"
                    value={endStr}
                    onChange={(e) => handleEndInput(e.target.value)}
                    min={startStr || undefined}
                    className="h-9"
                    aria-label="End date"
                    disabled={isPublished}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleToday}
                disabled={isPublished}
              >
                Today
              </Button>

              <div className="ml-2 flex items-center gap-2 relative z-20">
                <Switch
                  checked={isPublished}
                  onCheckedChange={(checked) => {
                    if (canPublish) {
                      handlePublishRota(checked);
                    }
                  }}
                  disabled={!canPublish}
                />
                <span className={`text-sm ${isPublished ? 'text-slate-800' : 'text-slate-600'}`}>
                  {isPublished ? 'Published' : 'Unpublished'}
                  {!canPublish && isPublished ? ' (locked)' : ''}
                </span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-2 mr-2">
                <Switch checked={compact} onCheckedChange={setCompact} />
                <span className="text-sm text-slate-700">Compact View</span>
              </div>

              <Button
                variant="outline"
                onClick={loadData}
                className="flex items-center gap-2"
                disabled={isMassUpdating}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>

              <div className="flex items-center gap-2 mr-2">
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                <span className="text-sm text-slate-700">Auto Sync</span>
              </div>

              <div className="flex items-center gap-2 mr-2">
                <Switch checked={editEnabled} onCheckedChange={setEditEnabled} />
                <span className="text-sm text-slate-700">
                  {editEnabled ? "Edit Mode" : "View Mode"}
                </span>
              </div>

              <div className="flex items-center gap-2 mr-2">
                <Switch
                  checked={dutyManagerOnly}
                  onCheckedChange={(checked) => {
                    const params = new URLSearchParams(window.location.search);
                    if (checked) {
                      params.set("duty_manager", "1");
                    } else {
                      params.delete("duty_manager");
                    }
                    const newUrl = location.pathname + (params.toString() ? `?${params.toString()}` : "");
                    window.history.pushState({}, "", newUrl);
                    const event = new PopStateEvent('popstate');
                    window.dispatchEvent(event);
                  }}
                />
                <span className="text-sm text-slate-700">Duty Manager Only</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2" disabled={isMassUpdating}>
                    <Wrench className="w-4 h-4" />
                    Tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem
                    onClick={() => {
                      setExportMode("excel");
                      setShowExportDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setExportMode("powerbi");
                      setShowExportDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Export to Power BI (.pbix)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowTemplateDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import Roster (Excel/CSV)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={goToTabularEditor}
                    className="flex items-center gap-2"
                  >
                    <TableIcon className="w-4 h-4" />
                    Edit in Tabular View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(activeDepartment || dutyManagerOnly) && (
            <div className="mt-3">
              <Tabs value={sectionTab} onValueChange={setSectionTab}>
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="roster">Roster</TabsTrigger>
                  <TabsTrigger value="staff">Staff</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            {renderActiveFilterPill()}
            {isPublished && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                This rota is published and visible to all team members
              </Badge>
            )}
          </div>
        </div>

        {activeDepartment && !dutyManagerOnly && sectionTab === "roster" && (
          <div className="mt-3 bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3 shadow-sm">
            <span className="text-sm font-medium text-slate-800">
              {activeDepartment.name} • Selection
            </span>
            <Button variant="outline" size="sm" onClick={selectAllVisible} disabled={isMassUpdating}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection} disabled={isMassUpdating}>
              Clear
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddExisting(true)}
              className="flex items-center gap-2"
              title="Add existing staff from master list"
              disabled={isMassUpdating}
            >
              <UserPlus className="w-4 h-4" />
              Add Existing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewStaff}
              className="flex items-center gap-2"
              title="Create a brand new staff member"
              disabled={isMassUpdating}
            >
              <Plus className="w-4 h-4" />
              New Staff
            </Button>

            <div className="flex items-center gap-2">
              <Select value={assignDeptId} onValueChange={setAssignDeptId} disabled={isMassUpdating}>
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Choose department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={assignSelectedToDept}
                disabled={isMassUpdating || !assignDeptId || selectedEmpIds.size === 0}
                className="flex items-center gap-2"
                title="Assign selected staff to this department"
              >
                <UserPlus className="w-4 h-4" />
                {isMassUpdating ? "Working..." : "Assign Selected"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={assignAllVisibleToDept}
                disabled={isMassUpdating || !assignDeptId || displayEmployees.length === 0}
                className="flex items-center gap-2"
                title="Assign all visible staff to this department"
              >
                <UserPlus className="w-4 h-4" />
                {isMassUpdating ? "Working..." : "Assign ALL Visible"}
              </Button>
            </div>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <Button
              variant="destructive"
              size="sm"
              onClick={removeSelectedFromAnyDept}
              disabled={isMassUpdating || selectedEmpIds.size === 0}
              className="flex items-center gap-2"
              title="Remove selected staff from their department(s)"
            >
              <UserMinus className="w-4 h-4" />
              {isMassUpdating ? "Working..." : "Remove Selected from Dept"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={removeAllVisibleFromAnyDept}
              disabled={isMassUpdating || displayEmployees.length === 0}
              className="flex items-center gap-2"
              title="Remove all visible staff from their department(s)"
            >
              <UserMinus className="w-4 h-4" />
              {isMassUpdating ? "Working..." : "Remove ALL Visible"}
            </Button>

            <span className="text-sm text-slate-600 ml-auto">
              Selected: {selectedEmpIds.size}
            </span>
          </div>
        )}

        {dutyManagerOnly && sectionTab === "roster" && (
          <div className="mt-3 bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-3 shadow-sm">
            <span className="text-sm font-medium text-slate-800">
              Duty Manager • Selection
            </span>
            <Button variant="outline" size="sm" onClick={selectAllVisible} disabled={isMassUpdating}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection} disabled={isMassUpdating}>
              Clear
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddExisting(true)}
              className="flex items-center gap-2"
              title="Add existing staff from master list"
              disabled={isMassUpdating || !assignDeptId}
            >
              <UserPlus className="w-4 h-4" />
              Add Existing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewStaff}
              className="flex items-center gap-2"
              title="Create a brand new staff member"
              disabled={isMassUpdating || !assignDeptId}
            >
              <Plus className="w-4 h-4" />
              New Staff
            </Button>

            <div className="flex items-center gap-2">
              <Select value={assignDeptId} onValueChange={setAssignDeptId} disabled={isMassUpdating}>
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Choose department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={assignSelectedToDept}
                disabled={isMassUpdating || !assignDeptId || selectedEmpIds.size === 0}
                className="flex items-center gap-2"
                title="Assign selected staff to this department"
              >
                <UserPlus className="w-4 h-4" />
                {isMassUpdating ? "Working..." : "Assign Selected"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={assignAllVisibleToDept}
                disabled={isMassUpdating || !assignDeptId || displayEmployees.length === 0}
                className="flex items-center gap-2"
                title="Assign all visible staff to this department"
              >
                <UserPlus className="w-4 h-4" />
                {isMassUpdating ? "Working..." : "Assign ALL Visible"}
              </Button>
            </div>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <Button
              variant="destructive"
              size="sm"
              onClick={removeSelectedFromAnyDept}
              disabled={isMassUpdating || selectedEmpIds.size === 0}
              className="flex items-center gap-2"
              title="Remove selected staff from their department(s)"
            >
              <UserMinus className="w-4 h-4" />
              {isMassUpdating ? "Working..." : "Remove Selected from Dept"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={removeAllVisibleFromAnyDept}
              disabled={isMassUpdating || displayEmployees.length === 0}
              className="flex items-center gap-2"
              title="Remove all visible staff from their department(s)"
            >
              <UserMinus className="w-4 h-4" />
              {isMassUpdating ? "Working..." : "Remove ALL Visible"}
            </Button>

            <span className="text-sm text-slate-600 ml-auto">
              Selected: {selectedEmpIds.size}
            </span>
          </div>
        )}

        {sectionTab === "staff" && (activeDepartment || dutyManagerOnly) ? (
          <Card className="shadow-lg overflow-hidden bg-white">
            <div className="p-4">
              <React.Suspense fallback={<div>Loading staff manager...</div>}>
                <DeptStaffManager
                  activeDepartment={activeDepartment}
                  dutyManagerOnly={dutyManagerOnly}
                  employees={employees}
                  departments={departments}
                  roles={roles}
                  onChanged={loadData}
                  isMassUpdating={isMassUpdating}
                />
              </React.Suspense>
            </div>
          </Card>
        ) : (
          <Card className="shadow-lg overflow-hidden bg-white">
            {viewMode === "month" && (
              <MonthView
                currentDate={currentDate}
                shifts={displayShifts}
                employees={displayEmployees}
                leaves={leaves}
                departments={departments}
                roles={roles}
                onCreateShift={handleCreateShift}
                onEditShift={handleEditShift}
                canEdit={canEdit}
                isLoading={isLoading}
                compact={compact}
                activeDepartment={activeDepartment}
                shiftCodeColors={shiftCodeColors}
                shiftCodeHours={shiftCodeHours}
                scrollRefExternal={gridScrollRef}
                dateRange={dateRange}
                selectable={!!activeDepartment || dutyManagerOnly}
                selectedIds={selectedEmpIds}
                onToggleSelect={toggleSelect}
                isMassUpdating={isMassUpdating}
              />
            )}

            {viewMode === "week" && (
              <WeekView
                weekDays={weekDays}
                shifts={displayShifts}
                employees={displayEmployees}
                leaves={leaves}
                departments={departments}
                roles={roles}
                onCreateShift={handleCreateShift}
                onEditShift={handleEditShift}
                canEdit={canEdit}
                isLoading={isLoading}
                compact={compact}
                activeDepartment={activeDepartment}
                shiftCodeColors={shiftCodeColors}
                shiftCodeHours={shiftCodeHours}
                scrollRefExternal={gridScrollRef}
                dateRange={dateRange}
                selectable={!!activeDepartment || dutyManagerOnly}
                selectedIds={selectedEmpIds}
                onToggleSelect={toggleSelect}
                isMassUpdating={isMassUpdating}
              />
            )}

            {viewMode === "day" && (
              <DayView
                selectedDate={currentDate}
                shifts={displayShifts}
                employees={displayEmployees}
                leaves={leaves}
                departments={departments}
                roles={roles}
                onCreateShift={handleCreateShift}
                onEditShift={handleEditShift}
                canEdit={canEdit}
                isLoading={isLoading}
                compact={compact}
                activeDepartment={activeDepartment}
                shiftCodeColors={shiftCodeColors}
                shiftCodeHours={shiftCodeHours}
                dateRange={dateRange}
                selectable={!!activeDepartment || dutyManagerOnly}
                selectedIds={selectedEmpIds}
                onToggleSelect={toggleSelect}
                isMassUpdating={isMassUpdating}
              />
            )}
          </Card>
        )}

        <React.Suspense fallback={<div className="fixed inset-0 bg-black/20 flex items-center justify-center"><div className="bg-white p-4 rounded-lg">Loading...</div></div>}>
          {showShiftDialog && (
            <ShiftDialog
              open={showShiftDialog}
              onClose={() => {
                setShowShiftDialog(false);
                setSelectedShift(null);
                setInitialShiftData(null);
              }}
              onSave={handleSaveShift}
              onDelete={handleDeleteShift}
              shift={selectedShift}
              initialDate={selectedDate}
              initialEmployee={selectedEmployee}
              initialShiftData={initialShiftData}
              employees={employees}
              departments={departments}
              roles={roles}
            />
          )}

          {showDateRangePicker && (
            <DateRangePicker
              open={showDateRangePicker}
              onClose={() => setShowDateRangePicker(false)}
              onSelect={handleDateRangeChange}
            />
          )}

          {showExportDialog && (
            <ExportDialog
              open={showExportDialog}
              onClose={() => setShowExportDialog(false)}
              shifts={displayShifts}
              employees={displayEmployees}
              departments={departments}
              roles={roles}
              dateRange={dateRange}
              exportTarget={exportMode}
            />
          )}

          {showTemplateDialog && (
            <TemplateUploadDialog
              open={showTemplateDialog}
              onClose={() => setShowTemplateDialog(false)}
              onUpload={loadData}
              employees={employees}
              departments={departments}
              roles={roles}
            />
          )}

          {showPublishDialog && (
            <PublishDialog
              open={showPublishDialog}
              onClose={() => setShowPublishDialog(false)}
              onConfirm={handlePublishRota}
              isCurrentlyPublished={isPublished}
              monthName={format(currentDate, 'MMMM yyyy')}
            />
          )}

          {showAddExisting && (() => {
            const chosenDept = activeDepartment || departments.find(d => d.id === assignDeptId);
            return chosenDept ? (
              <AddToDepartmentDialog
                open={showAddExisting}
                onClose={() => setShowAddExisting(false)}
                department={chosenDept}
                employees={employees}
                onAssign={(ids) => assignManyToDept(ids, chosenDept.id)}
                isMassUpdating={isMassUpdating}
              />
            ) : null;
          })()}

          {showNewStaff && (
            <EmployeeDialog
              open={showNewStaff}
              onClose={() => { setShowNewStaff(false); setNewStaffPrefill(null); }}
              onSave={handleSaveNewStaff}
              employee={newStaffPrefill}
              departments={departments}
              roles={roles}
              isMassUpdating={isMassUpdating}
            />
          )}
        </React.Suspense>
      </div>
    </div>
  );
}
