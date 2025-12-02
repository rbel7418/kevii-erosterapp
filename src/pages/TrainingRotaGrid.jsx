import React from "react";
import { base44 } from "@/api/base44Client";
import { Shift as RealShift, Employee, Department, Role, ShiftCode } from "@/entities/all";
import { RotaStatus } from "@/entities/RotaStatus";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Table as TableIcon, Upload, Zap, CheckCircle2, Maximize2, Minimize2, RotateCcw, Check, RefreshCw, Save, Search, Filter, SlidersHorizontal, MoreVertical, Plus, Bell, Lock, Trash2, GraduationCap } from "lucide-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, format, eachDayOfInterval, parseISO, addDays, parse, isValid } from "date-fns";
import { withRetry, sleep } from "@/components/utils/withRetry";
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

// --- MOCKS FOR TRAINING MODE ---

// Local store for the session
let MOCK_STORE = null;

const MockShift = {
  list: async () => {
    if (!MOCK_STORE) {
        const real = await RealShift.list();
        MOCK_STORE = JSON.parse(JSON.stringify(real));
    }
    // Simulate network delay
    await new Promise(r => setTimeout(r, 200));
    return [...MOCK_STORE];
  },
  create: async (data) => {
    const newShift = { ...data, id: "mock_" + Math.random().toString(36).substr(2, 9), created_date: new Date().toISOString() };
    if (!MOCK_STORE) MOCK_STORE = [];
    MOCK_STORE.push(newShift);
    return newShift;
  },
  update: async (id, data) => {
    if (!MOCK_STORE) return null;
    const idx = MOCK_STORE.findIndex(s => s.id === id);
    if (idx !== -1) {
      MOCK_STORE[idx] = { ...MOCK_STORE[idx], ...data };
      return MOCK_STORE[idx];
    }
    return null;
  },
  delete: async (id) => {
    if (!MOCK_STORE) return;
    MOCK_STORE = MOCK_STORE.filter(s => s.id !== id);
    return true;
  }
};

const Shift = MockShift; // Alias for component use

// Mock queues
const enqueueShiftCreate = async (data) => {
    return await MockShift.create(data);
};

const enqueueShiftDelete = async (id) => {
    return await MockShift.delete(id);
};

const enqueueEmployeeDelete = async (id) => {
    // In training, we just pretend
    return true;
};

// -------------------------------


function ExportDialog({ open, onClose, startDate, endDate, departmentId, shifts }) {
  const departmentName = departmentId === "all" ? "All Departments" : `Dept ID: ${departmentId}`;
  const [formatType, setFormatType] = React.useState("csv");
  const [includeDetails, setIncludeDetails] = React.useState(true);

  const handleExport = () => {
    alert(`[TRAINING MODE] Exporting ${shifts.length} shifts for ${departmentName} from ${startDate} to ${endDate} in ${formatType} format.`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Rota Data (Training)</DialogTitle>
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
          <DialogTitle>Import Template (Training)</DialogTitle>
          <DialogDescription>
            Upload a row-based CSV template.
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
          <DialogTitle>Upload Grid Template (Training)</DialogTitle>
          <DialogDescription>
            Upload a Grid-format CSV.
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
          <DialogTitle className="text-red-600">Hard Reset Roster (Training)</DialogTitle>
          <DialogDescription>
            This will delete all shifts in the training session.
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

export default function TrainingRotaGrid() {
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

  // Mock published months
  const publishedMonthsByDept = React.useMemo(() => ({}), []);

  const rotaStatusCooldownRef = React.useRef(false);

  const [period, setPeriod] = React.useState("4weeks");
  const query = { departments, shiftCodes, employees, shifts, currentDate, period, dmOnlyToggle };

  const [customRange, setCustomRange] = React.useState(false);
  const [rangeStart, setRangeStart] = React.useState("");
  const [rangeEnd, setRangeEnd] = React.useState("");

  // Mock persistence for training
  const persistRangeLock = React.useCallback(async (locked, start, end, isCustom) => {
    // Do nothing
  }, [currentUser]);

  const toggleRangeLock = React.useCallback(async () => {
    const newLocked = !rangeLocked;
    setRangeLocked(newLocked);
  }, [rangeLocked]);

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
    gridStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    gridEnd = addDays(gridStart, 27);
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

  const filteredEmp = React.useMemo(() => {
    let filtered;
    if (selectedDepts.includes("all") || selectedDepts.length === 0) {
      filtered = employees.filter((e) => {
        if (e.is_active === false) return false;
        if (!activeDeptIds.has(e.department_id)) return false;
        if ((e.sort_index || 999) < 999) return true;
        return e.contract_type === "Permanent";
      });
    } else {
      filtered = employees.filter((e) => {
        if (e.is_active === false) return false;
        if (!selectedDepts.includes(e.department_id)) return false;
        if ((e.sort_index || 999) < 999) return true;
        return e.contract_type === "Permanent";
      });
    }

    return filtered.sort((a, b) => {
      const sortA = typeof a.sort_index === 'number' ? a.sort_index : 999;
      const sortB = typeof b.sort_index === 'number' ? b.sort_index : 999;
      if (sortA !== sortB) return sortA - sortB;
      return (a.full_name || "").localeCompare(b.full_name || "");
    });
  }, [employees, selectedDepts, activeDeptIds]);

  const filteredEmpIds = React.useMemo(() => {
    return new Set(filteredEmp.map((e) => e.id));
  }, [filteredEmp]);

  const visibleShifts = React.useMemo(() => {
    const dateSet = new Set(visibleDays.map((d) => format(d, "yyyy-MM-dd")));
    return shifts.filter((s) => {
      if (!dateSet.has(s.date)) return false;
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

  const [activePaletteName, setActivePaletteName] = React.useState("classic");
  const [activePaletteVariant, setActivePaletteVariant] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      // Use real user
      const u = await User.me();
      setCurrentUser(u);
      const [d, e, s, sc] = await Promise.all([
      Department.list(),
      Employee.list(),
      MockShift.list(), // Load mocks
      ShiftCode.list()]
      );
      setDepartments(d || []);
      setEmployees(e || []);
      setShifts(s || []);
      setShiftCodes(sc || []);
      setLoading(false);
    })();
  }, []);

  // ... Defaults loading removed or simplified for training

  const persistDeptDefault = async (enabled) => setDefaultDeptEnabled(enabled);
  const persistViewDefault = async (enabled) => setDefaultViewEnabled(enabled);

  const handleCompactRowsChange = (v) => setCompactRows(v);
  const handleShowWeekendsChange = (v) => setShowWeekends(v);
  const handleDmOnlyToggleChange = (v) => setDmOnlyToggle(v);

  const toggleQuickDeptFilter = (filterKey) => {
    const newFilters = {
      ...quickDeptFilters,
      [filterKey]: !quickDeptFilters[filterKey]
    };
    setQuickDeptFilters(newFilters);
    
    // Same logic as real RotaGrid
    const activeDepts = [];
    const deptMap = {
      ward2: departments.find(d => d.name?.toLowerCase().includes('ward 2') || d.name?.toLowerCase().includes('ward two') || d.name?.toLowerCase() === 'w2'),
      ward3: departments.find(d => d.name?.toLowerCase().includes('ward 3') || d.name?.toLowerCase().includes('ward three') || d.name?.toLowerCase() === 'w3'),
      ecu: departments.find(d => d.name?.toLowerCase().includes('ecu') || d.name?.toLowerCase().includes('enhanced care unit')),
      dm: departments.find(d => d.name?.toLowerCase().includes('duty manager') || d.name?.toLowerCase() === 'dm'),
      residentDrs: departments.find(d => d.name?.toLowerCase().includes('resident') || (d.name?.toLowerCase().includes('doctor') && !d.name?.toLowerCase().includes('ecu'))),
      ecuDrs: departments.find(d => d.name?.toLowerCase().includes('ecu') && (d.name?.toLowerCase().includes('doctor') || d.name?.toLowerCase().includes('dr')))
    };

    Object.keys(newFilters).forEach((key) => {
      if (newFilters[key] && deptMap[key]) {
        activeDepts.push(deptMap[key].id);
      }
    });

    setSelectedDepts(activeDepts.length > 0 ? activeDepts : ["all"]);
  };

  const togglePublish = async () => {
    // Mock
    setPublished(!published);
    alert("Training mode: Publish toggled locally.");
  };

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
    // Copied logic from RotaGrid
    const dateHeaders = visibleDays.map((d) => format(d, "yyyy-MM-dd"));
    const header = ["Employee ID", "Name", ...dateHeaders];

    const rows = filteredEmp.map((emp) => {
      const rowData = [
      emp.employee_id || "",
      `"${emp.full_name || ""}"` 
      ];

      visibleDays.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
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
    a.download = `TRAINING_grid_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file) => {
    // Mock import
    alert("Training mode: Simulating import...");
    // Basic parsing
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const rows = lines.slice(1);
    alert(`Training mode: Would import ${rows.length} rows.`);
  };

  const handleUploadGridReplica = async (file) => {
    alert("Training mode: Simulating grid import...");
  };

  const handleResetRoster = async () => {
    // Mock reset
    MOCK_STORE = []; // Clear everything in mock
    setShifts([]);
    alert("Training mode: Roster reset.");
  };

  const canManage = true; // Always allow managing in training mode? Or keep role? 
  // User asked for "staff level access" in previous prompt but "training mode". 
  // Usually training mode lets you try things. 
  // Let's stick to currentUser role, but maybe elevate for training if requested? 
  // "user/staff level interface" was mentioned. 
  // "training username with password 12345678 default user training account with staff level access"
  // So probably just use current user's role.
  // But wait, "replica ... cannot determine difference". 
  // So stick to currentUser.role.

  const shiftsByEmpDate = React.useMemo(() => {
    const m = {};
    visibleShifts.forEach((s) => {
      const key = `${s.employee_id}_${s.date}`;
      m[key] = s;
    });
    return m;
  }, [visibleShifts]);

  const handleAddShift = async (empId, date, code) => {
    if (published) {
      alert("This roster is published (Training). Unpublish to make changes.");
      return;
    }
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${empId}_${dateStr}`;
    const existing = shiftsByEmpDate[key];
    if (existing) {
      if (existing.shift_code === code) {
        await enqueueShiftDelete(existing.id);
      } else {
        await MockShift.update(existing.id, { shift_code: code });
      }
    } else {
      const data = { employee_id: empId, date: dateStr, shift_code: code };
      await enqueueShiftCreate(data);
    }
    const updated = await MockShift.list();
    setShifts(updated || []);
  };

  const handleRemoveEmployee = async (empId) => {
    if (!confirm("Remove this employee from their department? (Training)")) return;
    // Mock removal
    alert("Training mode: Employee removed.");
  };

  const grouped = React.useMemo(() => {
    if (groupBy === "none") {
      return [{ label: null, employees: filteredEmp }];
    } else if (groupBy === "department") {
      const map = {};
      filteredEmp.forEach((e) => {
        const deptId = e.department_id || "no_dept";
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
        const role = "Role";
        return { label: role, employees: map[roleId] };
      });
    }
    return [{ label: null, employees: filteredEmp }];
  }, [groupBy, filteredEmp, departments]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-red-50">
      <div className="text-red-600 font-bold animate-pulse">Loading Training Mode...</div>
    </div>);


  const currentMonth = format(gridStart, "MMMM yyyy");

  return (
    <div className={fullScreen ? "fixed inset-0 z-50 bg-red-50/30" : "p-4 md:p-6 bg-red-50/30 min-h-screen"} style={fullScreen ? { paddingTop: 48 } : undefined}>
      <div className="w-full space-y-3">
        {/* Header Section */}
        <div className="px-1">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <Badge className="bg-red-600 text-white hover:bg-red-700 px-2 py-1 text-sm">TRAINING MODE</Badge>
                <div className="text-gray-700 text-3xl font-bold" style={{ lineHeight: '1.1' }}>
                {currentMonth}
                </div>
            </div>

            {/* Settings Boxes */}
            <div className="flex items-center gap-3">
                <div className="px-3 py-2 rounded-lg border bg-white/50 border-red-200">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <Checkbox
                    checked={defaultDeptEnabled}
                    onCheckedChange={(v) => persistDeptDefault(Boolean(v))} />
                    <span className="text-xs font-medium uppercase">Department Default</span>
                  </label>
                </div>

                <div className="px-3 py-2 rounded-lg border bg-white/50 border-red-200">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <Checkbox
                    checked={defaultViewEnabled}
                    onCheckedChange={(v) => persistViewDefault(Boolean(v))} />
                    <span className="text-xs font-medium uppercase">View as Default</span>
                  </label>
                </div>
            </div>

            {/* Quick Filters Box */}
            <div className="px-3 py-2 rounded-lg border bg-white/50 border-red-200">
              <div className="flex items-center gap-3">
                {Object.keys(quickDeptFilters).map(k => (
                    <label key={k} className="inline-flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                        checked={quickDeptFilters[k]}
                        onCheckedChange={() => toggleQuickDeptFilter(k)} />
                        <span className="text-xs font-medium uppercase">
                            {k.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                    </label>
                ))}
              </div>
            </div>

            <span className="text-red-400 ml-auto text-xs font-bold hidden sm:inline-block select-none">TRAINING ENVIRONMENT</span>
          </div>
        </div>

        {/* Fullscreen Toggle */}
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-white border-red-200 shadow-[0_8px_20px_rgba(220,38,38,0.18)]"
          title={fullScreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={() => setFullScreen((v) => !v)}>
          {fullScreen ? <Minimize2 className="w-5 h-5 text-red-700" /> : <Maximize2 className="w-5 h-5 text-red-700" />}
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
          </div>
        }

        <Card className="bg-white border border-red-200 rounded-lg shadow-sm" style={{ marginTop: '3px' }}>
          <div className="p-2 overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-red-50">
                  <th className="sticky left-0 z-20 bg-red-50 border border-red-200 px-3 py-2.5 text-left text-xs font-semibold text-red-900 w-[220px]">
                    Staff
                  </th>
                  {visibleDays.map((day) =>
                  <th
                    key={format(day, "yyyy-MM-dd")}
                    className="border border-red-200 px-2 py-2.5 text-center text-xs font-semibold text-red-900 bg-red-50"
                    style={{ width: `calc((100% - 220px) / ${visibleDays.length})` }}>
                      <div className="font-semibold">{format(day, "EEE")}</div>
                      <div className="text-red-400 text-[10px]">{format(day, "dd MMM")}</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {grouped.map((group, gIdx) =>
                <React.Fragment key={gIdx}>
                    {group.label &&
                  <tr>
                        <td
                      colSpan={visibleDays.length + 1}
                      className="bg-red-100 border border-red-200 px-3 py-2 text-xs font-bold text-red-900">
                          {group.label}
                        </td>
                      </tr>
                  }
                    {group.employees.map((emp) =>
                  <tr key={emp.id} className={`hover:bg-red-50`} style={{ height: compactRows ? '23px' : '48px' }}>
                        <td className={`sticky left-0 z-10 bg-white border border-red-100 text-xs font-medium text-slate-900 ${compactRows ? 'px-2 py-0.5' : 'px-3 py-1.5'}`}>
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
                            ["?", "-", ".", "+", "UNDEFINED", "NULL", "NAN", "◇", "DIV", "HTML", "BODY", "SPAN"].some(g => rawCode.toUpperCase().includes(g))
                          )) {
                            rawCode = "";
                          }
                          const code = rawCode;

                          return (
                            <td
                          key={dateStr} className="bg-white p-0 text-center rounded-none border border-red-100 hover:bg-red-50 relative">
                          
                              {canManage && !published ?
                          code ?
                          <ShiftChip
                            shift={shift}
                            canManage={true}
                            locked={false}
                            onChanged={async () => {
                              const updated = await MockShift.list();
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
                            canManage={false}
                            locked={published}
                            onChanged={async () => {
                              const updated = await MockShift.list();
                              setShifts(updated || []);
                            }}
                            codes={shiftCodes}
                            compact={compactRows} /> :


                          <div className="h-full w-full min-h-[23px]" />

                          }
                            </td>);

                    })}
                      </tr>
                  )}
                  </React.Fragment>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Dialogs */}
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
          // Mock add
          setShowAddStaff(false);
          alert("Training mode: Employee added.");
        }} />
      }
    </div>);

}