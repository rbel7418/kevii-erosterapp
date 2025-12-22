import React from "react";
import { base44 } from "@/api/base44Client";
import { Shift, Employee, Department, Role, ShiftCode } from "@/entities/all";
import { RotaStatus } from "@/entities/RotaStatus";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Table as TableIcon, Upload, Zap, CheckCircle2, Maximize2, Minimize2, RotateCcw, Check, RefreshCw, Save, Search, Filter, SlidersHorizontal, MoreVertical, Plus, Bell, Lock, Trash2 } from "lucide-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, format, eachDayOfInterval, parseISO, addDays, parse, isValid } from "date-fns";
import { withRetry, sleep } from "@/components/utils/withRetry";
import { enqueueShiftCreate } from "@/components/utils/shiftQueue";
import { enqueueShiftDelete, enqueueEmployeeDelete } from "@/components/utils/deleteQueue";
import { colorForCode, pastelForCode, setActivePaletteName, setActivePaletteVariant, getCustomPalette, setCustomPalette } from "@/components/utils/colors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem } from

"@/components/ui/dropdown-menu";
import MonthPicker from "@/components/common/MonthPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DateRangePicker from "@/components/common/DateRangePicker";
import QuickAddShift from "@/components/roster/QuickAddShift";
import ShiftChip from "@/components/roster/ShiftChip";
import QuickAddEmployeeDialog from "@/components/team/QuickAddEmployeeDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import SnapshotDialog from "@/components/schedule/SnapshotDialog";
import { emailPrefix } from "@/components/utils/strings";
import RedeployDialog from "@/components/roster/RedeployDialog";
import RedeploymentDetailsDialog from "@/components/roster/RedeploymentDetailsDialog";


function ExportDialog({ open, onClose, startDate, endDate, departmentId, shifts }) {
  const departmentName = departmentId === "all" ? "All Departments" : `Dept ID: ${departmentId}`;
  const [formatType, setFormatType] = React.useState("csv");
  const [includeDetails, setIncludeDetails] = React.useState(true);

  const handleExport = () => {
    console.log("Exporting data:", { startDate, endDate, departmentId, shiftsCount: shifts.length, formatType, includeDetails });
    alert(`Exporting ${shifts.length} shifts for ${departmentName} from ${startDate} to ${endDate} in ${formatType} format.`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Rota Data</DialogTitle>
          <DialogDescription>
            Export shift information for the selected period.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="period" className="text-right">
              Period
            </Label>
            <span className="col-span-3 text-sm">{startDate} to {endDate}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="department" className="text-right">
              Department
            </Label>
            <span className="col-span-3 text-sm">{departmentName}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select value={formatType} onValueChange={setFormatType} className="col-span-3">
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel (XLSX)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="includeDetails"
              checked={includeDetails}
              onChange={(e) => setIncludeDetails(e.target.checked)}
              className="ml-auto accent-sky-600" />
            <Label htmlFor="includeDetails" className="mr-4 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Include all shift details</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

function TemplateUploadDialog({ open, onClose, onUpload }) {
  const [file, setFile] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    await onUpload(file);
    setIsUploading(false);
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Template</DialogTitle>
          <DialogDescription>
            Upload a row-based CSV template. The file should have columns: date, employee_id, shift_code, etc.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              CSV File
            </Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="col-span-3" />
          </div>
          {file &&
          <div className="text-sm text-slate-600">
              Selected: {file.name}
            </div>
          }
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

function GridReplicaUploadDialog({ open, onClose, onUpload }) {
  const [file, setFile] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    await onUpload(file);
    setIsUploading(false);
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Grid Template</DialogTitle>
          <DialogDescription>
            Upload a Grid-format CSV (Employees as rows, Dates as columns). 
            Must include 'Employee ID' column and dates (YYYY-MM-DD) as column headers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              CSV File
            </Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="col-span-3" />
          </div>
          {file &&
          <div className="text-sm text-slate-600">
              Selected: {file.name}
            </div>
          }
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

function ResetRosterDialog({ open, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = React.useState("");
  const canConfirm = confirmText.trim().toLowerCase() === "reset";

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setConfirmText("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {if (!o) {setConfirmText("");onClose();}}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">Hard Reset Roster</DialogTitle>
          <DialogDescription>
            This will delete all shifts for the displayed period and department. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="confirm" className="text-sm font-medium">
              Type <span className="font-bold text-red-600">RESET</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET"
              className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-red-600 hover:bg-red-700 text-white">
            Confirm Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

function abbreviateJobTitle(title, maxLength = 20) {
  if (!title) return "";
  const trimmed = String(title).trim();
  if (trimmed.length <= maxLength) return trimmed;

  // Split into words and take first letter of each
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    // Single word - just truncate
    return trimmed.substring(0, maxLength - 3) + "...";
  }

  // Multiple words - use initials for all but last word
  const initials = words.slice(0, -1).map((w) => w.charAt(0).toUpperCase()).join("");
  const lastWord = words[words.length - 1];
  const abbreviated = `${initials} ${lastWord}`;

  // If still too long, truncate the last word
  if (abbreviated.length > maxLength) {
    const available = maxLength - initials.length - 4; // -4 for space and "..."
    if (available < 0) return initials.substring(0, maxLength - 3) + "..."; // Fallback if initials alone are too long
    return `${initials} ${lastWord.substring(0, available)}...`;
  }

  return abbreviated;
}

export default function RotaGrid() {
  const urlParams = new URLSearchParams(window.location.search);
  const [selectedDepts, setSelectedDepts] = React.useState(() => {
    const param = urlParams.get("department");
    return param ? [param] : ["all"];
  });

  const [currentDate, setCurrentDate] = React.useState(() => {
    const m = urlParams.get("month");
    if (m && /^\d{4}-\d{2}$/.test(m)) return parseISO(`${m}-01`);
    return new Date();
  });
  const [rangeLocked, setRangeLocked] = React.useState(false);

  const [currentUser, setCurrentUser] = React.useState(null);
  const [departments, setDepartments] = React.useState([]);
  const [employees, setEmployees] = React.useState([]);
  const [shifts, setShifts] = React.useReducer((state, newState) => newState, []);
  const [shiftCodes, setShiftCodes] = React.useState([]);
  const [published, setPublished] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [fullScreen, setFullScreen] = React.useState(false);

  const [quickDeptFilters, setQuickDeptFilters] = React.useState({
    ward2: false,
    ward3: false,
    ecu: false,
    dm: false,
    residentDrs: false,
    ecuDrs: false
  });

  const employeeById = React.useMemo(() => {
    const m = {};
    (employees || []).forEach((e) => {if (e?.id) m[e.id] = e;});
    return m;
  }, [employees]);

  const activeDeptIds = React.useMemo(() => {
    const set = new Set();
    (departments || []).forEach((d) => {if (d.is_active !== false) set.add(d.id);});
    return set;
  }, [departments]);

  const [defaultDeptEnabled, setDefaultDeptEnabled] = React.useState(false);
  const [defaultViewEnabled, setDefaultViewEnabled] = React.useState(false);
  const [dmOnlyToggle, setDmOnlyToggle] = React.useState(false);

  const publishedMonthsByDept = React.useMemo(() => {
    const map = {};
    (departments || []).forEach((d) => {
      const months = d.published_months || [];
      map[d.id] = new Set(months.map((m) => m.trim()));
    });
    return map;
  }, [departments]);

  const rotaStatusCooldownRef = React.useRef(false);

  // CHANGED: Default to 4weeks (28 days)
  const [period, setPeriod] = React.useState("4weeks");
  const query = { departments, shiftCodes, employees, shifts, currentDate, period, dmOnlyToggle };

  const [customRange, setCustomRange] = React.useState(false);
  const [rangeStart, setRangeStart] = React.useState("");
  const [rangeEnd, setRangeEnd] = React.useState("");

  // CRITICAL FIX: Persist rangeLocked, customRange, rangeStart, rangeEnd to user settings
  const persistRangeLock = React.useCallback(async (locked, start, end, isCustom) => {
    const next = {
      ...(currentUser?.settings || {}),
      defaults: {
        ...(currentUser?.settings?.defaults || {}),
        rangeLock: {
          locked,
          customRange: isCustom,
          rangeStart: start,
          rangeEnd: end
        }
      }
    };
    await User.updateMyUserData({ settings: next });
    setCurrentUser((u) => ({ ...(u || {}), settings: next }));
  }, [currentUser]);

  const toggleRangeLock = React.useCallback(async () => {
    const newLocked = !rangeLocked;
    setRangeLocked(newLocked);
    await persistRangeLock(newLocked, rangeStart, rangeEnd, customRange);
  }, [rangeLocked, rangeStart, rangeEnd, customRange, persistRangeLock]);

  let gridStart, gridEnd;
  if (customRange && rangeStart && rangeEnd) {
    gridStart = parseISO(rangeStart);
    gridEnd = parseISO(rangeEnd);
  } else if (period === "today") {
    gridStart = gridEnd = currentDate;
  } else if (period === "day") {
    gridStart = gridEnd = currentDate;
  } else if (period === "week") {
    gridStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    gridEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  } else if (period === "4weeks") {
    // NEW: 28-day period starting from Monday of current week
    gridStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    gridEnd = addDays(gridStart, 27); // 28 days total (0-27)
  } else {
    gridStart = startOfMonth(currentDate);
    gridEnd = endOfMonth(currentDate);
  }

  const daysInRange = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [showWeekends, setShowWeekends] = React.useState(true);
  const visibleDays = showWeekends ? daysInRange : daysInRange.filter((d) => {
    const dow = d.getDay();
    return dow !== 0 && dow !== 6;
  });

  const deptOptions = React.useMemo(() => {
    let filtered = (departments || []).filter((d) => d.is_active !== false);
    if (dmOnlyToggle) {
      filtered = filtered.filter((d) => d.is_dm_only === true);
    }
    return filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [departments, dmOnlyToggle]);

  const selectedDeptForDialog = React.useMemo(() => {
    if (selectedDepts.includes("all") || selectedDepts.length === 0) return "";
    if (selectedDepts.length === 1) return selectedDepts[0];
    return "";
  }, [selectedDepts]);

  // Calculate Visiting Staff (Redeployed IN)
  const visitingStaff = React.useMemo(() => {
    if (selectedDepts.includes("all") || selectedDepts.length === 0) return [];
    
    // Find shifts that are IN selected departments, but belong to employees NOT in selected departments
    // We need to scan ALL shifts in the period, not just visible ones (because visible ones are filtered by filteredEmpIds)
    
    const dateSet = new Set(visibleDays.map((d) => format(d, "yyyy-MM-dd")));
    
    // Get IDs of home staff
    const homeEmpIds = new Set(employees.filter(e => 
      e.is_active !== false && selectedDepts.includes(e.department_id)
    ).map(e => e.id));

    const visitingMap = new Map(); // empId -> visitingDeptId

    shifts.forEach(s => {
      if (!dateSet.has(s.date)) return;
      if (!selectedDepts.includes(s.department_id)) return; // Shift must be in this dept
      if (homeEmpIds.has(s.employee_id)) return; // Already a home employee
      
      // This is a visiting employee
      visitingMap.set(s.employee_id, s.department_id);
    });

    // Get the actual employee objects and attach the visiting dept ID
    const visitingEmps = employees
      .filter(e => visitingMap.has(e.id))
      .map(e => ({ ...e, visitingDeptId: visitingMap.get(e.id) }));
      
    return visitingEmps;
  }, [shifts, employees, selectedDepts, visibleDays]);


  const filteredEmp = React.useMemo(() => {
    let homeStaff = [];
    let visitors = [];

    // Filter by department
    if (selectedDepts.includes("all") || selectedDepts.length === 0) {
      // Show Permanent staff from all active departments
      // Also include non-Permanent if they have a sort_index < 999 (implies manual sorting/importance)
      homeStaff = employees.filter((e) => {
        if (e.is_active === false) return false;
        if (!activeDeptIds.has(e.department_id)) return false;

        // Allow non-permanent if they are manually sorted
        if ((e.sort_index || 999) < 999) return true;

        return e.contract_type === "Permanent";
      });
    } else {
      // Show Permanent staff from selected departments
      homeStaff = employees.filter((e) => {
        if (e.is_active === false) return false;
        if (!selectedDepts.includes(e.department_id)) return false;

        // Allow non-permanent if they are manually sorted
        if ((e.sort_index || 999) < 999) return true;

        return e.contract_type === "Permanent";
      });
      
      // Identify Visiting Staff
      const existingIds = new Set(homeStaff.map(e => e.id));
      visitingStaff.forEach(ve => {
        if (!existingIds.has(ve.id)) {
          visitors.push({ ...ve, isVisiting: true });
        }
      });
    }

    // Sort function
    const sorter = (a, b) => {
      const sortA = typeof a.sort_index === 'number' ? a.sort_index : 999;
      const sortB = typeof b.sort_index === 'number' ? b.sort_index : 999;

      if (sortA !== sortB) return sortA - sortB;
      return (a.full_name || "").localeCompare(b.full_name || "");
    };

    // Sort independently
    homeStaff.sort(sorter);
    visitors.sort(sorter);

    // Return combined list: Home staff first, then Visitors
    return [...homeStaff, ...visitors];
  }, [employees, selectedDepts, activeDeptIds, visitingStaff]);

  const filteredEmpIds = React.useMemo(() => {
    return new Set(filteredEmp.map((e) => e.id));
  }, [filteredEmp]);

  const visibleShifts = React.useMemo(() => {
    const dateSet = new Set(visibleDays.map((d) => format(d, "yyyy-MM-dd")));
    return shifts.filter((s) => {
      if (!dateSet.has(s.date)) return false;
      // Show if:
      // 1. Belongs to a filtered employee (Home or Visiting)
      // 2. OR if it's a "Redeployed Out" shift from a Home employee (the shift dept ID will be different, but emp ID matches)
      if (!filteredEmpIds.has(s.employee_id)) return false;
      return true;
    });
  }, [shifts, visibleDays, filteredEmpIds]);

  const [groupBy, setGroupBy] = React.useState("none");
  const [compactRows, setCompactRows] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);

  const [showExport, setShowExport] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);
  const [showReset, setShowReset] = React.useState(false);
  const [showSnapshot, setShowSnapshot] = React.useState(false);
  const [showGridReplicaImport, setShowGridReplicaImport] = React.useState(false);
  const [showAddStaff, setShowAddStaff] = React.useState(false);
  const [redeployData, setRedeployData] = React.useState(null); // { shift, employee }
  const [redeployInfoShift, setRedeployInfoShift] = React.useState(null);

  const [activePaletteName, setActivePaletteName] = React.useState("classic");
  const [activePaletteVariant, setActivePaletteVariant] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      const u = await User.me();
      setCurrentUser(u);
      const [d, e, s, sc] = await Promise.all([
      Department.list(),
      Employee.list(),
      Shift.list(),
      ShiftCode.list()]
      );
      setDepartments(d || []);
      setEmployees(e || []);
      setShifts(s || []);
      setShiftCodes(sc || []);
      setLoading(false);
    })();

    // Poll for updates (publish status sync)
    const interval = setInterval(async () => {
      try {
        const d = await Department.list();
        setDepartments((prev) => {
          // Simple check on length or JSON string
          // We prioritize published_months changes
          if (JSON.stringify(prev) !== JSON.stringify(d)) return d || [];
          return prev;
        });
      } catch (e) { console.error("Poll error", e); }
    }, 3000); // Increased frequency to 3s for better responsiveness
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!currentUser) return;
    const defaults = currentUser.settings?.defaults || {};

    // Restore view default first (as it might override dept settings)
    const viewDef = defaults.view;
    if (viewDef?.enabled) {
       // If view default is enabled, we also check if there are department settings to restore
       // because now "View as Default" controls department persistence too.
       const deptDef = defaults.department;
       if (deptDef?.enabled || viewDef.enabled) { // Respect existing Dept Default or View Default
          let enforce = ["all"];
          if (deptDef?.ids && Array.isArray(deptDef.ids)) {
            enforce = deptDef.ids.length > 0 ? deptDef.ids : ["all"];
          } else if (deptDef?.id) {
            enforce = deptDef.id === "" ? ["all"] : [deptDef.id];
          }
          // Only update if different to avoid loop
          if (JSON.stringify(selectedDepts) !== JSON.stringify(enforce)) {
             setSelectedDepts(enforce);
          }
          setDefaultDeptEnabled(true);
       } else {
          setDefaultDeptEnabled(false);
       }
       
       // Restore other view settings
       if (viewDef.period && viewDef.period !== period) setPeriod(viewDef.period);
       if (typeof viewDef.showWeekends === "boolean" && viewDef.showWeekends !== showWeekends) setShowWeekends(viewDef.showWeekends);
       if (typeof viewDef.compactRows === "boolean" && viewDef.compactRows !== compactRows) setCompactRows(viewDef.compactRows);
       if (viewDef.groupBy && viewDef.groupBy !== groupBy) setGroupBy(viewDef.groupBy);
       if (typeof viewDef.dmOnlyToggle === "boolean" && viewDef.dmOnlyToggle !== dmOnlyToggle) setDmOnlyToggle(viewDef.dmOnlyToggle);
       setDefaultViewEnabled(true);
    } else {
       // If view default is disabled, we check for legacy department default
       const deptDef = defaults.department;
       if (deptDef?.enabled) {
          let enforce = ["all"];
          if (deptDef.ids && Array.isArray(deptDef.ids)) {
            enforce = deptDef.ids.length > 0 ? deptDef.ids : ["all"];
          } else if (deptDef.id) {
            enforce = deptDef.id === "" ? ["all"] : [deptDef.id];
          }
          if (JSON.stringify(selectedDepts) !== JSON.stringify(enforce)) {
             setSelectedDepts(enforce);
          }
          setDefaultDeptEnabled(true);
       } else {
          setDefaultDeptEnabled(false);
       }
       setDefaultViewEnabled(false);
    }


    // CRITICAL FIX: Restore range lock and custom range
    const rangeLockDef = defaults.rangeLock;
    if (rangeLockDef) {
      if (typeof rangeLockDef.locked === "boolean") setRangeLocked(rangeLockDef.locked);
      if (typeof rangeLockDef.customRange === "boolean") setCustomRange(rangeLockDef.customRange);
      if (typeof rangeLockDef.rangeStart === "string" && rangeLockDef.rangeStart) setRangeStart(rangeLockDef.rangeStart);
      if (typeof rangeLockDef.rangeEnd === "string" && rangeLockDef.rangeEnd) setRangeEnd(rangeLockDef.rangeEnd);
    }

    const quickFilters = defaults.quickDeptFilters || {};
    setQuickDeptFilters({
      ward2: quickFilters.ward2 || false,
      ward3: quickFilters.ward3 || false,
      ecu: quickFilters.ecu || false,
      dm: quickFilters.dm || false,
      residentDrs: quickFilters.residentDrs || false,
      ecuDrs: quickFilters.ecuDrs || false
    });

    setActivePaletteVariant(0);
    const custom = getCustomPalette?.();
    if (Array.isArray(custom) && custom.length >= 2) {
      setActivePaletteName("custom");
    } else {
      setActivePaletteName("classic");
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (!departments.length) return;

    const month = format(gridStart, "yyyy-MM");
    let isPublished = false;
    if (selectedDepts.includes("all") || selectedDepts.length === 0) {
      isPublished = Object.keys(publishedMonthsByDept).every((deptId) => publishedMonthsByDept[deptId].has(month));
    } else {
      isPublished = selectedDepts.every((deptId) => publishedMonthsByDept[deptId]?.has(month));
    }
    setPublished(isPublished);
  }, [currentUser, gridStart, selectedDepts, departments, publishedMonthsByDept]);

  const persistDeptDefault = React.useCallback(async (enabled) => {
    const department = { enabled, ids: selectedDepts };
    const next = {
      ...(currentUser?.settings || {}),
      defaults: {
        ...(currentUser?.settings?.defaults || {}),
        department
      }
    };
    await User.updateMyUserData({ settings: next });
    setCurrentUser((u) => ({ ...(u || {}), settings: next }));
    setDefaultDeptEnabled(enabled);
  }, [currentUser, selectedDepts]);

  const persistViewDefault = React.useCallback(async (enabled) => {
    const view = {
      enabled,
      period,
      showWeekends,
      compactRows,
      groupBy,
      dmOnlyToggle
    };
    // Also persist department settings when View Default is toggled
    const department = {
      enabled,
      ids: selectedDepts
    };
    
    const next = {
      ...(currentUser?.settings || {}),
      defaults: {
        ...(currentUser?.settings?.defaults || {}),
        view,
        department
      }
    };
    await User.updateMyUserData({ settings: next });
    setCurrentUser((u) => ({ ...(u || {}), settings: next }));
    setDefaultViewEnabled(enabled);
    setDefaultDeptEnabled(enabled);
  }, [currentUser, period, showWeekends, compactRows, groupBy, dmOnlyToggle, selectedDepts]);

  const handleSelectedDeptsChange = React.useCallback((updaterOrValue) => {
    setSelectedDepts((prev) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
      
      if (defaultViewEnabled && currentUser) {
         setTimeout(() => {
             const department = { enabled: true, ids: next };
             const view = {
               enabled: true,
               period,
               showWeekends,
               compactRows,
               groupBy,
               dmOnlyToggle
             };
             const nextSettings = {
               ...(currentUser.settings || {}),
               defaults: {
                 ...(currentUser.settings?.defaults || {}),
                 department,
                 view
               }
             };
             User.updateMyUserData({ settings: nextSettings }).catch(console.error);
         }, 0);
      }
      return next;
    });
  }, [defaultViewEnabled, currentUser, period, showWeekends, compactRows, groupBy, dmOnlyToggle]);

  // Smart handlers that auto-persist when default view is enabled
  const handleCompactRowsChange = React.useCallback(async (newValue) => {
    console.log("🔧 handleCompactRowsChange called with:", newValue);
    setCompactRows(newValue);
    if (defaultViewEnabled && currentUser) {
      const view = {
        enabled: true,
        period,
        showWeekends,
        compactRows: newValue,
        groupBy,
        dmOnlyToggle
      };
      const next = {
        ...(currentUser?.settings || {}),
        defaults: {
          ...(currentUser?.settings?.defaults || {}),
          view
        }
      };
      await User.updateMyUserData({ settings: next });
      setCurrentUser((u) => ({ ...(u || {}), settings: next }));
    }
  }, [defaultViewEnabled, currentUser, period, showWeekends, groupBy, dmOnlyToggle]);

  const handleShowWeekendsChange = React.useCallback(async (newValue) => {
    console.log("🔧 handleShowWeekendsChange called with:", newValue);
    setShowWeekends(newValue);
    if (defaultViewEnabled && currentUser) {
      const view = {
        enabled: true,
        period,
        showWeekends: newValue,
        compactRows,
        groupBy,
        dmOnlyToggle
      };
      const next = {
        ...(currentUser?.settings || {}),
        defaults: {
          ...(currentUser?.settings?.defaults || {}),
          view
        }
      };
      await User.updateMyUserData({ settings: next });
      setCurrentUser((u) => ({ ...(u || {}), settings: next }));
    }
  }, [defaultViewEnabled, currentUser, period, compactRows, groupBy, dmOnlyToggle]);

  const handleDmOnlyToggleChange = React.useCallback(async (newValue) => {
    console.log("🔧 handleDmOnlyToggleChange called with:", newValue);
    setDmOnlyToggle(newValue);
    if (defaultViewEnabled && currentUser) {
      const view = {
        enabled: true,
        period,
        showWeekends,
        compactRows,
        groupBy,
        dmOnlyToggle: newValue
      };
      const next = {
        ...(currentUser?.settings || {}),
        defaults: {
          ...(currentUser?.settings?.defaults || {}),
          view
        }
      };
      await User.updateMyUserData({ settings: next });
      setCurrentUser((u) => ({ ...(u || {}), settings: next }));
    }
  }, [defaultViewEnabled, currentUser, period, showWeekends, compactRows, groupBy]);

  const toggleQuickDeptFilter = React.useCallback(async (filterKey) => {
    const newFilters = {
      ...quickDeptFilters,
      [filterKey]: !quickDeptFilters[filterKey]
    };
    setQuickDeptFilters(newFilters);

    const activeDepts = [];
    const deptMap = {
      ward2: departments.find((d) =>
      d.name?.toLowerCase().includes('ward 2') ||
      d.name?.toLowerCase().includes('ward two') ||
      d.name?.toLowerCase() === 'w2'
      ),
      ward3: departments.find((d) =>
      d.name?.toLowerCase().includes('ward 3') ||
      d.name?.toLowerCase().includes('ward three') ||
      d.name?.toLowerCase() === 'w3'
      ),
      ecu: departments.find((d) =>
      d.name?.toLowerCase().includes('ecu') ||
      d.name?.toLowerCase().includes('enhanced care unit')
      ),
      dm: departments.find((d) =>
      d.name?.toLowerCase().includes('duty manager') ||
      d.name?.toLowerCase() === 'dm'
      ),
      residentDrs: departments.find((d) =>
      d.name?.toLowerCase().includes('resident') ||
      d.name?.toLowerCase().includes('doctor') && !d.name?.toLowerCase().includes('ecu')
      ),
      ecuDrs: departments.find((d) =>
      d.name?.toLowerCase().includes('ecu') && (
      d.name?.toLowerCase().includes('doctor') || d.name?.toLowerCase().includes('dr'))
      )
    };

    Object.keys(newFilters).forEach((key) => {
      if (newFilters[key] && deptMap[key]) {
        activeDepts.push(deptMap[key].id);
      }
    });

    setSelectedDepts(activeDepts.length > 0 ? activeDepts : ["all"]);

    const next = {
      ...(currentUser?.settings || {}),
      defaults: {
        ...(currentUser?.settings?.defaults || {}),
        quickDeptFilters: newFilters
      }
    };
    await User.updateMyUserData({ settings: next });
    setCurrentUser((u) => ({ ...(u || {}), settings: next }));
  }, [quickDeptFilters, departments, currentUser]);

  const togglePublish = React.useCallback(async () => {
    if (rotaStatusCooldownRef.current) {
      alert("Please wait - publish action in progress");
      return;
    }
    rotaStatusCooldownRef.current = true;
    setTimeout(() => {rotaStatusCooldownRef.current = false;}, 2000);

    try {
      const month = format(gridStart, "yyyy-MM");
      const newPublished = !published;

      console.log("Toggle publish:", { month, newPublished, selectedDepts, currentDepts: departments.length });

      const deptsToUpdate = selectedDepts.includes("all") || selectedDepts.length === 0 ?
      departments.filter((d) => d.is_active !== false).map((d) => d.id) :
      selectedDepts;

      console.log("Departments to update:", deptsToUpdate);

      const promises = deptsToUpdate.map(async (deptId) => {
        const dept = departments.find((d) => d.id === deptId);
        if (!dept) {
          console.warn("Department not found:", deptId);
          return;
        }

        // Ensure published_months exists as an array
        let months = Array.isArray(dept.published_months) ?
        [...dept.published_months] :
        [];

        console.log(`Before update - Dept ${dept.name}:`, months);

        if (newPublished) {
          if (!months.includes(month)) months.push(month);
        } else {
          months = months.filter((m) => m !== month);
        }

        console.log(`After update - Dept ${dept.name}:`, months);

        await Department.update(deptId, { published_months: months });
      });

      await Promise.all(promises);
      console.log("All department updates complete");

      const updatedDepts = await Department.list();
      console.log("Refetched departments:", updatedDepts.length);
      setDepartments(updatedDepts || []);

      alert(`Successfully ${newPublished ? 'published' : 'unpublished'} roster for ${month}`);
    } catch (error) {
      console.error("Publish toggle failed:", error);
      alert(`Failed to ${published ? 'unpublish' : 'publish'} roster: ${error.message || 'Unknown error'}`);
      rotaStatusCooldownRef.current = false; // Reset cooldown on error
    }
  }, [published, gridStart, selectedDepts, departments, publishedMonthsByDept]);

  const handleReset = () => {
    setSelectedDepts(["all"]);
    setPeriod("month");
    setCurrentDate(new Date());
    setShowWeekends(true);
    setCompactRows(false);
    setGroupBy("none");
    setDmOnlyToggle(false);
    setCustomRange(false);
    setRangeStart("");
    setRangeEnd("");
    setRangeLocked(false);
    setShowFilters(false);
  };

  const handleExportGridTemplate = () => {
    // Create grid structure: Employee ID, Name, Date1, Date2, ...
    const dateHeaders = visibleDays.map((d) => format(d, "yyyy-MM-dd"));
    const header = ["Employee ID", "Name", ...dateHeaders];

    const rows = filteredEmp.map((emp) => {
      const rowData = [
      emp.employee_id || "", // Business ID
      `"${emp.full_name || ""}"` // Quote name to handle commas
      ];

      visibleDays.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        // Find shift using internal ID (emp.id) which links to shift.employee_id
        const shift = visibleShifts.find((s) => s.employee_id === emp.id && s.date === dateStr);
        rowData.push(shift ? shift.shift_code : "");
      });

      return rowData.join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grid_template_${format(gridStart, "yyyyMMdd")}_${format(gridEnd, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length < 2) {
        alert("CSV file must have headers and at least one data row");
        return;
      }

      // Parse CSV with flexible column matching
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));

      // Find column indices - support multiple possible names
      const dateIdx = headers.findIndex((h) =>
      h.includes('date') && !h.includes('discharge') && !h.includes('join')
      );
      const empIdx = headers.findIndex((h) =>
      h.includes('employee') || h.includes('emp') || h.includes('staff')
      );
      const codeIdx = headers.findIndex((h) =>
      h.includes('shift') && (h.includes('code') || h === 'shift')
      );

      if (dateIdx === -1 || empIdx === -1 || codeIdx === -1) {
        alert("CSV must have columns for: date, employee/staff ID, and shift code\n\nColumn headers found: " + lines[0]);
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const cells = line.split(',').map((c) => c.trim());
        // Clean the shift code immediately
        let code = cells[codeIdx] || "";
        // Remove replacement char and control chars
        code = code.replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, "").trim();

        return {
          date: cells[dateIdx],
          employee_id: cells[empIdx],
          shift_code: code
        };
      }).filter((r) => {
        // Filter out invalid rows and placeholder codes
        if (!r.date || !r.employee_id || !r.shift_code) return false;
        if (["", "◇", "?", "-", ".", "+", "UNDEFINED", "NULL", "DIV"].includes(r.shift_code)) return false;
        return true;
      });

      if (rows.length === 0) {
        alert("No valid data rows found in CSV");
        return;
      }

      // Extract unique employee IDs and date range from import
      const empIds = new Set(rows.map((r) => r.employee_id));
      const dates = rows.map((r) => r.date).filter(Boolean).sort();
      const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : "unknown range";

      // Confirm with user - make it clear existing shifts will be REPLACED
      const confirm = window.confirm(
        `Import ${rows.length} shifts for ${empIds.size} employees?\n\n` +
        `⚠️ This will DELETE all existing shifts for these employees in the date range: ${dateRange}\n\n` +
        `Then create the new shifts from the CSV file.`
      );

      if (!confirm) return;

      const shiftsToCreate = rows.map((data) => ({
        employee_id: data.employee_id,
        date: data.date,
        shift_code: data.shift_code.toUpperCase().trim()
      }));

      // Use backend function for bulk import to improve performance
      const { data } = await base44.functions.invoke("bulkImportRoster", { shifts: shiftsToCreate });

      // Reload shifts
      const updated = await Shift.list();
      setShifts(updated || []);

      alert(`Successfully processed roster: Deleted ${data.deleted} existing shifts and created ${data.created} new shifts.`);
    } catch (error) {
      console.error("Import failed:", error);
      alert(`Import failed: ${error.message}`);
    }
  };

  const handleUploadGridReplica = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length < 2) {
        alert("CSV file must have headers and at least one data row");
        return;
      }

      // Simple CSV parser that handles quoted strings basic case
      const parseCSVLine = (str) => {
        const arr = [];
        let quote = false;
        let col = "";
        for (let c of str) {
          if (c === '"') {quote = !quote;continue;}
          if (c === ',' && !quote) {arr.push(col);col = "";continue;}
          col += c;
        }
        arr.push(col);
        return arr;
      };

      const headers = parseCSVLine(lines[0]).map((h) => h.trim());

      // Identify columns
      const empIdIdx = headers.findIndex((h) => h.toLowerCase().includes('employee id') || h.toLowerCase().includes('emp_id'));

      // Identify date columns (assume format yyyy-MM-dd)
      const dateColumns = [];
      headers.forEach((h, idx) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(h)) {
          dateColumns.push({ date: h, index: idx });
        }
      });

      if (empIdIdx === -1) {
        alert("CSV must have 'Employee ID' column");
        return;
      }
      if (dateColumns.length === 0) {
        alert("CSV must have date columns (YYYY-MM-DD)");
        return;
      }

      const shiftsToCreate = [];
      const employeesFound = new Set();

      // Process rows
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const businessEmpId = cols[empIdIdx]?.trim();

        if (!businessEmpId) continue;

        // Find employee internal ID
        const emp = employees.find((e) => e.employee_id === businessEmpId);
        if (!emp) {
          console.warn(`Employee not found with ID: ${businessEmpId}`);
          continue;
        }

        employeesFound.add(emp.id); // Add internal ID to set

        dateColumns.forEach((dc) => {
          let code = cols[dc.index]?.trim();
          // STRICT SANITIZATION:
          // 1. Trim whitespace
          // 2. Remove invisible unicode characters / replacement chars
          // 3. Ignore if the result is one of the blacklist items

          // Regex to strip non-printable ASCII and common unicode junk (like replacement char )
          // This keeps alphanumeric, standard punctuation, but removes control chars and symbols
          const cleanCode = code.replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, "").trim();

          const blacklist = ["", "◇", "?", "-", ".", "+", "", "UNDEFINED", "NULL"];

          if (cleanCode && !blacklist.includes(cleanCode)) {
            shiftsToCreate.push({
              employee_id: emp.id,
              date: dc.date,
              shift_code: cleanCode.toUpperCase()
            });
          }
        });
      }

      if (shiftsToCreate.length === 0) {
        alert("No valid shifts found to import. Check employee IDs and date columns.");
        return;
      }

      // Confirm with user
      const dateRange = dateColumns.map((d) => d.date).sort();
      const start = dateRange[0];
      const end = dateRange[dateRange.length - 1];

      const confirm = window.confirm(
        `Import ${shiftsToCreate.length} shifts for ${employeesFound.size} employees?\n\n` +
        `Period: ${start} to ${end}\n\n` +
        `⚠️ This will OVERWRITE existing shifts for these employees in this period.`
      );

      if (!confirm) return;

      // Use backend function for bulk import to improve performance
      const { data } = await base44.functions.invoke("bulkImportRoster", { shifts: shiftsToCreate });

      // Reload shifts
      const updated = await Shift.list();
      setShifts(updated || []);

      alert(`Successfully processed roster: Deleted ${data.deleted} existing shifts and created ${data.created} new shifts.`);

    } catch (error) {
      console.error("Grid import failed:", error);
      alert(`Import failed: ${error.message}`);
    }
  };

  const handleResetRoster = async () => {
    const dateStrs = visibleDays.map((d) => format(d, "yyyy-MM-dd"));
    const toDelete = visibleShifts.filter((s) => dateStrs.includes(s.date) && filteredEmpIds.has(s.employee_id));

    if (toDelete.length === 0) {
      alert("No shifts to delete.");
      return;
    }

    const ids = toDelete.map((s) => s.id);
    const { data } = await base44.functions.invoke("bulkDeleteShifts", { ids });

    const updated = await Shift.list();
    setShifts(updated || []);
    alert(`${data.deleted} shifts deleted.`);
  };

  const canManage = currentUser?.role === "admin" || currentUser?.access_level === "manager";
  const access = React.useMemo(() => {
    if (currentUser?.role === "admin") return "admin";
    return currentUser?.access_level || "staff";
  }, [currentUser]);

  const shiftsByEmpDate = React.useMemo(() => {
    const m = {};
    visibleShifts.forEach((s) => {
      const key = `${s.employee_id}_${s.date}`;
      m[key] = s;
    });
    return m;
  }, [visibleShifts]);

  const handleAddShift = async (empId, date, code) => {
    // Check per-department publish status for the target date
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      const monthKey = format(date, "yyyy-MM");
      if (publishedMonthsByDept[emp.department_id]?.has(monthKey)) {
        alert("This department's roster is published for this month. Unpublish to make changes.");
        return;
      }
    } else if (published) {
       // Fallback to global check if emp not found (shouldn't happen)
       alert("This roster is published. Unpublish to make changes.");
       return;
    }
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${empId}_${dateStr}`;
    const existing = shiftsByEmpDate[key];
    if (existing) {
      if (existing.shift_code === code) {
        await enqueueShiftDelete(existing.id);
      } else {
        await Shift.update(existing.id, { shift_code: code });
      }
    } else {
      const data = { employee_id: empId, date: dateStr, shift_code: code };
      await enqueueShiftCreate(data);
    }
    const updated = await Shift.list();
    setShifts(updated || []);
    };

  const handleRemoveEmployee = async (empId) => {
    if (!confirm("Remove this employee from their department?")) return;
    await enqueueEmployeeDelete(empId);
    const updatedEmp = await Employee.list();
    setEmployees(updatedEmp || []);
  };

  const handleRedeployConfirm = async ({ targetDeptId, startTime, endTime, notes }) => {
    if (!redeployData) return;
    const { shift, employee } = redeployData;
    
    const homeDept = departments.find(d => d.id === employee.department_id);
    
    const targetDept = departments.find(d => d.id === targetDeptId);
    const meta = {
      initiated_by: currentUser.email,
      initiated_at: new Date().toISOString(),
      from_dept_id: employee.department_id,
      from_dept_name: homeDept?.name || "Unknown",
      to_dept_name: targetDept?.name || "Unknown",
      original_shift_code: shift.shift_code,
      start_time: startTime,
      end_time: endTime,
      notes: notes
    };

    await Shift.update(shift.id, {
      department_id: targetDeptId,
      redeployed_from_id: employee.department_id,
      is_redeployed: true,
      redeploy_meta: meta,
      start_time: startTime,
      end_time: endTime,
      notes: notes ? (shift.notes ? shift.notes + "\nRedeploy: " + notes : "Redeploy: " + notes) : shift.notes
    });

    const updated = await Shift.list();
    setShifts(updated || []);
    setRedeployData(null);
  };

  const grouped = React.useMemo(() => {
    if (groupBy === "none") {
      return [{ label: null, employees: filteredEmp }];
    } else if (groupBy === "department") {
      const map = {};
      filteredEmp.forEach((e) => {
        // Group visitors into their VISITING department (target), not their Home department
        // This keeps them in the relevant list view
        const deptId = (e.isVisiting && e.visitingDeptId) ? e.visitingDeptId : (e.department_id || "no_dept");
        
        if (!map[deptId]) map[deptId] = [];
        map[deptId].push(e);
      });
      return Object.keys(map).map((deptId) => {
        const dept = departments.find((d) => d.id === deptId);
        return { label: dept ? dept.name : "No Department", employees: map[deptId] };
      });
    } else if (groupBy === "role") {
      const map = {};
      filteredEmp.forEach((e) => {
        const roleId = e.role_id || "no_role";
        if (!map[roleId]) map[roleId] = [];
        map[roleId].push(e);
      });
      return Object.keys(map).map((roleId) => {
        const role = currentUser?.role === "admin" ? "Role" : "Role"; // This 'Role' seems generic; might need actual role name lookup.
        return { label: role, employees: map[roleId] };
      });
    }
    return [{ label: null, employees: filteredEmp }];
  }, [groupBy, filteredEmp, departments, currentUser]);

  // Expose state to layout
  React.useEffect(() => {
    window._rotaGridState = {
      selectedDepts,
      setSelectedDepts: handleSelectedDeptsChange,
      deptOptions,
      period,
      setPeriod,
      compactRows,
      setCompactRows: handleCompactRowsChange,
      showWeekends,
      setShowWeekends: handleShowWeekendsChange,
      dmOnlyToggle,
      setDmOnlyToggle: handleDmOnlyToggleChange,
      showFilters,
      setShowFilters,
      currentDate,
      setCurrentDate,
      rangeLocked,
      toggleRangeLock,
      rangeStart,
      rangeEnd,
      setRangeStart,
      setRangeEnd,
      setCustomRange,
      canManage,
      published,
      togglePublish,
      handleReset,
      handleExportGridTemplate,
      setShowGridReplicaImport,
      setShowExport,
      setShowReset,
      setShowImport,
      setShowSnapshot,
      setShowAddStaff,
      selectedDeptForDialog,
      gridStart,
      gridEnd,
      departments,
      defaultDeptEnabled,
      persistDeptDefault,
      defaultViewEnabled,
      persistViewDefault,
      currentUser
    };

    // CRITICAL FIX: Notify layout that state has updated
    try {
      window.dispatchEvent(new CustomEvent("rotagrid-state-updated"));
    } catch (e) {}

    return () => {delete window._rotaGridState;};
  }, [
  selectedDepts,
  deptOptions,
  period,
  compactRows,
  showWeekends,
  dmOnlyToggle,
  showFilters,
  currentDate,
  rangeLocked,
  rangeEnd,
  canManage,
  published,
  gridStart,
  gridEnd,
  departments,
  defaultDeptEnabled,
  defaultViewEnabled,
  currentUser,
  selectedDeptForDialog,
  // Add all functions/setters that are passed to _rotaGridState and are stable
  setSelectedDepts,
  setPeriod,
  handleCompactRowsChange,
  handleShowWeekendsChange,
  handleDmOnlyToggleChange,
  setShowFilters,
  setCurrentDate,
  toggleRangeLock,
  setRangeStart, // Added setRangeStart to dependency array
  setRangeEnd,
  setCustomRange,
  togglePublish,
  handleReset,
  handleExportGridTemplate,
  setShowGridReplicaImport,
  setShowExport,
  setShowReset,
  setShowImport,
  setShowSnapshot,
  setShowAddStaff,
  persistDeptDefault,
  persistViewDefault,
  rangeStart // Added rangeStart to dependency array
  ]
  );

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-slate-600">Loading roster...</div>
    </div>);


  const currentMonth = format(gridStart, "MMMM yyyy");

  return (
    <div className={fullScreen ? "fixed inset-0 z-50 bg-white" : "p-4 md:p-6 bg-slate-50 min-h-screen"} style={fullScreen ? { paddingTop: 48 } : undefined}>
      <div className="w-full space-y-3">
        {/* Header Section */}
        <div className="px-1">
          <div className="flex flex-wrap items-center gap-4">
            {/* Month - Large display */}
            <div className="text-gray-700 text-3xl font-bold" style={{ lineHeight: '1.1' }}>
              {currentMonth}
            </div>

            {/* Department Dropdown Removed */}

            {/* Settings Boxes - All Users */}
            <div className="flex items-center gap-3">
                {/* View Default Box (Controls both view and department filter persistence) */}
                <div className="px-3 py-2 rounded-lg border" style={{ background: 'var(--dm-bg-subtle)', borderColor: 'var(--dm-border)' }}>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <Checkbox
                    checked={defaultViewEnabled}
                    onCheckedChange={(v) => persistViewDefault(Boolean(v))} />
                    <span className="text-xs font-medium uppercase">View as Default</span>
                  </label>
                </div>
            </div>

            {/* Quick Filters Box */}
            <div className="px-3 py-2 rounded-lg border" style={{ background: 'var(--dm-bg-subtle)', borderColor: 'var(--dm-border)' }}>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={quickDeptFilters.ward2}
                    onCheckedChange={() => toggleQuickDeptFilter('ward2')} />
                  <span className="text-xs font-medium uppercase">Ward 2</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={quickDeptFilters.ward3}
                    onCheckedChange={() => toggleQuickDeptFilter('ward3')} />
                  <span className="text-xs font-medium uppercase">Ward 3</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={quickDeptFilters.ecu}
                    onCheckedChange={() => toggleQuickDeptFilter('ecu')} />
                  <span className="text-xs font-medium uppercase">ECU</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={quickDeptFilters.dm}
                    onCheckedChange={() => toggleQuickDeptFilter('dm')} />
                  <span className="text-xs font-medium uppercase">Duty Managers</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={quickDeptFilters.residentDrs}
                    onCheckedChange={() => toggleQuickDeptFilter('residentDrs')} />
                  <span className="text-xs font-medium uppercase">Resident Drs.</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={quickDeptFilters.ecuDrs}
                    onCheckedChange={() => toggleQuickDeptFilter('ecuDrs')} />
                  <span className="text-xs font-medium uppercase">ECU Drs.</span>
                </label>
              </div>
            </div>

            {/* Credits - right aligned */}
            <span className="text-slate-600 ml-auto text-xs font-bold hidden sm:inline-block select-none">Created by: RaymundB DM v.1 2025

            </span>
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-white border-transparent shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
          title={fullScreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={() => setFullScreen((v) => !v)}>
          {fullScreen ? <Minimize2 className="w-5 h-5 text-slate-700" /> : <Maximize2 className="w-5 h-5 text-slate-700" />}
        </Button>

        {showFilters &&
        <div className="bg-white rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-md ring-1 ring-black/5 transition-shadow">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="department">By Department</SelectItem>
                  <SelectItem value="role">By Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {access !== "staff" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 themed" title="Actions">
                      <MoreVertical className="w-4 h-4" />
                      <span className="text-xs font-medium">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="themed">
                    <DropdownMenuItem
                      onClick={() => window.location.href = createPageUrl("TabularRoster?start=" + format(gridStart, "yyyy-MM-dd") + "&end=" + format(gridEnd, "yyyy-MM-dd") + (selectedDeptForDialog !== "" ? "&department=" + encodeURIComponent(selectedDeptForDialog) : ""))}
                      disabled={!canManage}>
                      Open grid editor
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportGridTemplate} disabled={!canManage}>
                      Export grid template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowGridReplicaImport(true)} disabled={published || !canManage}>
                      Upload grid template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowExport(true)} disabled={!canManage}>
                      Export month…
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={published}>
                      Duplicate month…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowReset(true)}
                      disabled={!canManage}
                      className="text-red-600">
                      Hard reset…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (confirm("Run cleanup? This will remove all 'invisible' or garbage shifts that may have been imported incorrectly.")) {
                          const res = await base44.functions.invoke("cleanShifts");
                          alert(`Cleanup complete.\nDeleted ${res.data.deleted} bad records.`);
                          window.location.reload();
                        }
                      }}
                      disabled={!canManage}
                      className="text-amber-600">
                      Cleanup bad data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 themed" title="Add">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-medium">Add</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="themed">
                    <DropdownMenuItem
                      onClick={() => {
                        if (selectedDeptForDialog === "") {
                          alert("Select a department first");
                        } else {
                          setShowAddStaff(true);
                        }
                      }}
                      disabled={selectedDeptForDialog === ""}>
                      Add employee
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={published}>
                      New shift…
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowImport(true)} disabled={published}>
                      Import (row-based)…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 themed"
                  onClick={() => setShowSnapshot(true)}
                  title="Snapshots">
                  <Save className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Snapshot</span>
                </Button>
              )}

              {access !== "staff" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 themed"
                  onClick={handleReset}
                  title="Reset view">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Reset</span>
                </Button>
              )}
            </div>
          </div>
        }

        {!canManage && visibleShifts.length === 0 &&
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm">
            No published rota for this period. Try another date range or ask your manager to publish the roster.
          </div>
        }

        <Card className="bg-white border border-slate-300 rounded-lg shadow-sm" style={{ marginTop: '3px' }}>
          <div className="p-2 overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-100">
                  <th className="sticky left-0 z-20 bg-slate-100 border border-slate-300 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 w-[220px]">
                    Staff
                  </th>
                  {visibleDays.map((day) =>
                  <th
                    key={format(day, "yyyy-MM-dd")}
                    className="border border-slate-300 px-2 py-2.5 text-center text-xs font-semibold text-slate-700 bg-slate-100"
                    style={{ width: `calc((100% - 220px) / ${visibleDays.length})` }}>
                      <div className="font-semibold">{format(day, "EEE")}</div>
                      <div className="text-slate-500 text-[10px]">{format(day, "dd MMM")}</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {grouped.map((group, gIdx) =>
                <React.Fragment key={gIdx}>
                    {group.label && !(selectedDepts.length === 1 && selectedDepts[0] !== "all" && grouped.length === 1) && (
                      <tr>
                        <td
                          colSpan={visibleDays.length + 1} className="bg-gray-900 text-blue-50 px-3 py-2 text-xs font-bold border border-slate-300">
                          {group.label}
                        </td>
                      </tr>
                    )}
                    {group.employees.map((emp, empIdx) => {
                      const isVisitingTransition = emp.isVisiting && (empIdx === 0 || !group.employees[empIdx - 1].isVisiting);
                      
                      return (
                        <React.Fragment key={emp.id}>
                          {isVisitingTransition && (
                            <tr>
                              <td 
                                colSpan={visibleDays.length + 1} 
                                className="bg-slate-400 px-3 py-1.5 text-xs font-bold text-white border-y border-slate-400"
                              >
                                Temporary Staffing
                              </td>
                            </tr>
                          )}
                          <tr className={`hover:bg-slate-50 ${emp.isVisiting ? 'bg-blue-50/10' : ''}`} style={{ height: compactRows ? '23px' : '48px' }}>
                        <td className={`sticky left-0 z-10 bg-white border border-slate-300 text-xs font-medium text-slate-900 ${compactRows ? 'px-2 py-0.5' : 'px-3 py-1.5'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-700 font-semi truncate" style={compactRows ? { fontSize: '13px', lineHeight: '14px' } : {}}>{emp.full_name || emailPrefix(emp.email)}</div>
                              {!compactRows &&
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {abbreviateJobTitle(emp.job_title, 18)} {emp.employee_id ? `• ${emp.employee_id}` : ""}
                                </div>
                          }
                            </div>
                            {canManage && !compactRows &&
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex-shrink-0"
                          onClick={() => handleRemoveEmployee(emp.id)}
                          title="Remove from department">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                        }
                          </div>
                        </td>
                        {visibleDays.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const key = `${emp.id}_${dateStr}`;
                      const shift = shiftsByEmpDate[key];

                      let rawCode = shift ? String(shift.shift_code || "").trim() : "";
                      if (rawCode && (
                      /[\uFFFD\u0000-\u001F\u007F-\u009F]/.test(rawCode) ||
                      ["?", "-", ".", "+", "UNDEFINED", "NULL", "NAN", "◇", "DIV", "HTML", "BODY", "SPAN"].some((g) => rawCode.toUpperCase().includes(g))))
                      {
                        rawCode = "";
                      }
                      
                      // HIDE IRRELEVANT SHIFTS FOR VISITING STAFF
                      // If this is a visiting staff member (Temporary Staffing), only show shifts relevant to the current view.
                      const isShiftInView = selectedDepts.includes("all") || selectedDepts.includes(shift?.department_id);
                      if (emp.isVisiting && shift && !isShiftInView) {
                        rawCode = "";
                      }

                      const code = rawCode;

                      // Check if this specific employee's department is published for this month
                      // This allows mixed views (All Depts) to respect individual department locks
                      const monthKey = format(day, "yyyy-MM");
                      const empDeptId = emp.department_id;
                      const isDeptPublished = publishedMonthsByDept[empDeptId]?.has(monthKey);
                      const isCellLocked = isDeptPublished;

                      // Determine Redeploy Status
                      let redeployStatus = null; // null, 'out', 'in'
                      if (shift && shift.is_redeployed && code) {
                        const homeDeptId = emp.department_id;
                        const shiftDeptId = shift.department_id;
                        
                        const viewingHome = selectedDepts.includes("all") || selectedDepts.includes(homeDeptId);
                        const viewingTarget = selectedDepts.includes("all") || selectedDepts.includes(shiftDeptId);
                        
                        // If I am visiting (Temporary Staffing), I am by definition here because of a redeployment IN
                        if (emp.isVisiting && shiftDeptId !== homeDeptId && isShiftInView) {
                           redeployStatus = 'in';
                        } 
                        // Otherwise standard logic
                        else if (viewingTarget && !viewingHome) {
                           redeployStatus = 'in';
                        } else {
                           redeployStatus = 'out';
                        }
                      }

                      return (
                        <td
                          key={dateStr} className="bg-white p-0 text-center rounded-none border border-slate-300 hover:bg-slate-50 relative">
                          
                              {canManage && !isCellLocked ?
                          code ?
                          <ShiftChip
                            shift={shift}
                            canManage={true}
                            locked={false}
                            redeployStatus={redeployStatus}
                            onRedeploy={() => setRedeployData({ shift, employee: emp })}
                            onRedeployInfo={(s) => setRedeployInfoShift(s)}
                            onChanged={async () => {
                              const updated = await Shift.list();
                              setShifts(updated || []);
                            }}
                            codes={shiftCodes}
                            compact={compactRows} /> :


                          <QuickAddShift
                            empId={emp.id}
                            date={day}
                            currentCode={code}
                            shiftCodes={shiftCodes}
                            onAdd={handleAddShift} /> :



                          code ?
                          <ShiftChip
                            shift={shift}
                            canManage={canManage} // Pass canManage to allow comments even if locked
                            locked={true} // Explicitly locked because isCellLocked is true
                            redeployStatus={redeployStatus}
                            onRedeployInfo={(s) => setRedeployInfoShift(s)}
                            onChanged={async () => {
                              const updated = await Shift.list();
                              setShifts(updated || []);
                            }}
                            codes={shiftCodes}
                            compact={compactRows} /> :


                          <div className="h-full w-full min-h-[23px]" />

                          }
                            </td>);

                    })}
                      </tr>
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        startDate={format(gridStart, "yyyy-MM-dd")}
        endDate={format(gridEnd, "yyyy-MM-dd")}
        departmentId={selectedDeptForDialog || "all"}
        shifts={visibleShifts} />


      <TemplateUploadDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onUpload={handleImport} />


      <GridReplicaUploadDialog
        open={showGridReplicaImport}
        onClose={() => setShowGridReplicaImport(false)}
        onUpload={handleUploadGridReplica} />


      <ResetRosterDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={handleResetRoster} />


      {canManage && showSnapshot &&
      <SnapshotDialog
        open={showSnapshot}
        onClose={() => setShowSnapshot(false)}
        departmentId={selectedDeptForDialog}
        startDate={format(gridStart, "yyyy-MM-dd")}
        endDate={format(gridEnd, "yyyy-MM-dd")} />

      }

      {canManage && showAddStaff && selectedDeptForDialog &&
      <QuickAddEmployeeDialog
        open={showAddStaff}
        onClose={() => setShowAddStaff(false)}
        departmentId={selectedDeptForDialog}
        onAdded={async () => {
          const updatedEmp = await Employee.list();
          setEmployees(updatedEmp || []);
          setShowAddStaff(false);
        }} />

      }

      {redeployData && (
        <RedeployDialog
          open={!!redeployData}
          onClose={() => setRedeployData(null)}
          shift={redeployData.shift}
          employee={redeployData.employee}
          currentDepartment={departments.find(d => d.id === redeployData.employee.department_id)}
          departments={departments}
          onConfirm={handleRedeployConfirm}
        />
      )}
      
      <RedeploymentDetailsDialog
        open={!!redeployInfoShift}
        onClose={() => setRedeployInfoShift(null)}
        shift={redeployInfoShift}
        canManage={canManage}
        departments={departments}
        onShiftUpdated={async () => {
           const updated = await Shift.list();
           setShifts(updated || []);
           // Update the local shift object if needed, but the list refresh handles the grid.
           // We might want to close the dialog or keep it open with updated data. 
           // The component handles closing/updating local state, but we need to refresh grid.
           setRedeployInfoShift(null); // Close on save
        }}
      />

    </div>);

}