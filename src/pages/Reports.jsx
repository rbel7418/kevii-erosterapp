
import React, { useState, useEffect, useMemo } from "react";
import { Shift, Employee, Leave, Department, Role } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock,
  Users,
  DollarSign,
  Calendar,
  FileBarChart,
  TrendingUp,
  Download
} from "lucide-react";
import { format, parseISO, differenceInHours, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// Add safe time helper
import { calcShiftHoursSafe } from "@/components/utils/time";

export default function Reports() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedDept, setSelectedDept] = useState("all");
  const [activeReport, setActiveReport] = useState("daily_totals");

  const reports = [
    { key: "daily_totals", label: "Daily Totals" },
    { key: "monthly_totals", label: "Monthly Totals" },
    { key: "employee_totals", label: "Employee Hours" },
    { key: "location_totals", label: "Location Totals" },
    { key: "role_totals", label: "Role Totals" },
    { key: "coverage", label: "Coverage" },
    { key: "working_time", label: "Working Time" },
    { key: "leave_totals", label: "Leave Summary" },
    { key: "leave_by_employee", label: "Leave by Employee" },
    { key: "unavailability", label: "Unavailability & Swaps" },
    { key: "bradford_factor", label: "Bradford Factor" },
    { key: "employees_per_role", label: "Employees Per Role" },
    { key: "shift_acknowledgement", label: "Shift Acknowledgement" },
    { key: "unclaimed_shifts", label: "Unclaimed Open Shifts" },
    { key: "shifts_claimed", label: "Shifts Claimed" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const gbp = useMemo(() => new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }), []);

  // Removed parseHHMM and calcHours as they are replaced by calcShiftHoursSafe utility

  const loadData = async () => {
    try {
      const [shiftsData, employeesData, leavesData, deptData, rolesData] = await Promise.all([
        Shift.list("-date", 1000),
        Employee.list(),
        Leave.list(),
        Department.list(),
        Role.list()
      ]);

      setShifts(shiftsData);
      setEmployees(employeesData);
      setLeaves(leavesData);
      setDepartments(deptData);
      setRoles(rolesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const filteredShifts = shifts.filter(s => {
    const shiftDate = parseISO(s.date);
    const inRange = shiftDate >= parseISO(startDate) && shiftDate <= parseISO(endDate);
    const inDept = selectedDept === "all" || s.department_id === selectedDept;
    return inRange && inDept;
  });

  // Replace totals to use safe calc
  const calculateTotalHours = () => filteredShifts.reduce((acc, s) => acc + calcShiftHoursSafe(s, 0), 0);

  const calculateTotalCost = () => filteredShifts.reduce((acc, s) => {
    const role = roles.find(r => r.id === s.role_id);
    const hrs = calcShiftHoursSafe(s, 0);
    return acc + (hrs * (role?.hourly_rate || 0));
  }, 0);

  const getEmployeeHours = () => {
    const hoursByEmployee = {};
    filteredShifts.forEach(shift => {
      if (!hoursByEmployee[shift.employee_id]) {
        hoursByEmployee[shift.employee_id] = 0;
      }
      hoursByEmployee[shift.employee_id] += calcShiftHoursSafe(shift, 0); // Updated to use safe calc
    });
    return hoursByEmployee;
  };

  const totalHoursValue = calculateTotalHours();
  const totalCostValue = calculateTotalCost();
  const totalShiftsValue = filteredShifts.length;
  const avgHours = totalShiftsValue ? totalHoursValue / totalShiftsValue : 0;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="app-title">Reports & Analytics</h1>
          <p className="app-subtitle">Executive overview of hours, cost, and coverage</p>
        </div>

        {/* Controls: filters in one compact bar */}
        <Card className="shadow-sm mb-4">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-5 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Department</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" className="gap-2">
                  <Download className="app-icon" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report selector: horizontal, compact, scrollable if overflow */}
        <Card className="shadow-sm mb-6">
          <CardContent className="p-3">
            <Tabs value={activeReport} onValueChange={setActiveReport}>
              <TabsList className="w-full justify-start overflow-x-auto flex gap-1">
                {reports.map(r => (
                  <TabsTrigger key={r.key} value={r.key} className="whitespace-nowrap text-xs md:text-sm">
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* KPI strip: 4 symmetric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Hours</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{totalHoursValue.toFixed(1)}</p>
                </div>
                <Clock className="app-icon text-teal-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Cost</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{gbp.format(totalCostValue)}</p>
                </div>
                <DollarSign className="app-icon text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Shifts</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{totalShiftsValue}</p>
                </div>
                <Calendar className="app-icon text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Avg Hours / Shift</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{avgHours.toFixed(1)}</p>
                </div>
                <TrendingUp className="app-icon text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Content */}
        <Card className="shadow-sm">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-base">
              {reports.find(r => r.key === activeReport)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {activeReport === "employee_totals" && (
              <div className="space-y-3">
                {Object.entries(getEmployeeHours())
                  .sort(([, a], [, b]) => b - a)
                  .map(([empId, hours]) => {
                    const emp = employees.find(e => e.id === empId);
                    return (
                      <div key={empId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {emp?.user_email?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{emp?.user_email?.split('@')[0]}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-slate-900">{hours.toFixed(1)}h</p>
                          <p className="text-xs text-slate-500">{emp?.contracted_hours_weekly}h contracted</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {activeReport === "location_totals" && (
              <div className="grid md:grid-cols-2 gap-3">
                {departments.map(dept => {
                  const deptShifts = filteredShifts.filter(s => s.department_id === dept.id);
                  const deptHours = deptShifts.reduce((total, shift) => total + calcShiftHoursSafe(shift, 0), 0); // Updated to use safe calc

                  return (
                    <div key={dept.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dept.color }}
                        />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-slate-900">{deptHours.toFixed(1)}h</p>
                        <p className="text-xs text-slate-500">{deptShifts.length} shifts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeReport === "role_totals" && (
              <div className="grid md:grid-cols-2 gap-3">
                {roles.map(role => {
                  const roleShifts = filteredShifts.filter(s => s.role_id === role.id);
                  const roleHours = roleShifts.reduce((total, shift) => total + calcShiftHoursSafe(shift, 0), 0); // Updated to use safe calc
                  const roleCost = roleHours * (role.hourly_rate || 0);

                  return (
                    <div key={role.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="font-medium">{role.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-slate-900">{roleHours.toFixed(1)}h</p>
                        <p className="text-xs text-slate-500">
                          {gbp.format(roleCost)} • {roleShifts.length} shifts
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeReport === "unclaimed_shifts" && (
              <div className="space-y-3">
                {filteredShifts
                  .filter(s => s.is_open && !s.employee_id)
                  .map(shift => {
                    const dept = departments.find(d => d.id === shift.department_id);
                    const role = roles.find(r => r.id === shift.role_id);
                    return (
                      <div key={shift.id} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {format(parseISO(shift.date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-sm text-slate-600">
                              {shift.start_time} - {shift.end_time}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {dept?.name} • {role?.name}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            Open
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {filteredShifts.filter(s => s.is_open && !s.employee_id).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No unclaimed shifts in this period
                  </div>
                )}
              </div>
            )}

            {activeReport === "leave_by_employee" && (
              <div className="space-y-3">
                {employees.map(emp => {
                  const empLeaves = leaves.filter(l =>
                    l.employee_id === emp.id &&
                    l.status === 'approved'
                  );
                  const totalDays = empLeaves.reduce((sum, l) => sum + (l.days_count || 0), 0);

                  if (totalDays === 0) return null;

                  return (
                    <div key={emp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {emp.user_email?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{emp.user_email?.split('@')[0]}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-slate-900">{totalDays} days</p>
                        <p className="text-xs text-slate-500">{empLeaves.length} leave periods</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeReport === "daily_totals" && (
              <div className="text-center py-8 text-slate-600">
                <FileBarChart className="app-icon mx-auto mb-2" />
                Showing {filteredShifts.length} shifts for selected period
              </div>
            )}

            {activeReport === "monthly_totals" && (
              <div className="text-center py-8 text-slate-600">
                <TrendingUp className="app-icon mx-auto mb-2" />
                Monthly breakdown coming soon
              </div>
            )}

            {["coverage", "working_time", "leave_totals", "unavailability", "bradford_factor", "employees_per_role", "shift_acknowledgement", "shifts_claimed"].includes(activeReport) && (
              <div className="text-center py-8 text-slate-600">
                <FileBarChart className="app-icon mx-auto mb-2" />
                This report is being developed
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
