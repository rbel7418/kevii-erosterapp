
import React, { useState, useEffect } from "react";
import { Shift, Employee, Department, Role } from "@/entities/all";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Briefcase, Check, AlertCircle } from "lucide-react";
import { format, parseISO, isFuture } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { withRetry } from "@/components/utils/withRetry"; // Updated import path

export default function OpenShifts() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [myEmployee, setMyEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingShift, setClaimingShift] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await withRetry(() => User.me());
      setCurrentUser(user);

      const [shiftsData, employeesData, deptData, rolesData] = await Promise.all([
        withRetry(() => Shift.filter({ is_open: true })),
        withRetry(() => Employee.list()),
        withRetry(() => Department.list()),
        withRetry(() => Role.list())
      ]);

      setShifts(shiftsData.filter(s => isFuture(parseISO(s.date))));
      setEmployees(employeesData);
      setDepartments(deptData);
      setRoles(rolesData);

      const emp = employeesData.find(e => e.user_email === user.email);
      setMyEmployee(emp);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleClaimShift = async (shift) => {
    if (!myEmployee) {
      alert("You need to be registered as an employee to claim shifts");
      return;
    }

    setClaimingShift(shift.id);
    try {
      // It's good practice to also wrap individual critical write operations with retry
      await withRetry(() => Shift.update(shift.id, {
        ...shift,
        employee_id: myEmployee.id,
        claimed_by: currentUser.email,
        is_open: false,
        status: "confirmed"
      }));
      await loadData();
    } catch (error) {
      console.error("Error claiming shift:", error);
      alert("Failed to claim shift. Please try again.");
    }
    setClaimingShift(null);
  };

  const getDepartmentName = (deptId) => {
    return departments.find(d => d.id === deptId)?.name || "Unknown";
  };

  const getRoleName = (roleId) => {
    return roles.find(r => r.id === roleId)?.name || "Unknown";
  };

  const getRoleColor = (roleId) => {
    return roles.find(r => r.id === roleId)?.color || "#0d9488";
  };

  const canClaimShift = (shift) => {
    if (!myEmployee) return false;
    return myEmployee.role_ids?.includes(shift.role_id);
  };

  const groupedShifts = shifts.reduce((acc, shift) => {
    const date = shift.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(shift);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedShifts).sort();

  return (
    <div className="p-6 md:p-8 themed min-h-screen" style={{ background: 'var(--dm-bg-base)' }}>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--dm-text-primary)' }}>Open Shifts</h1>
          <p className="text-lg mt-2" style={{ color: 'var(--dm-text-tertiary)' }}>Claim available shifts that match your role</p>
        </div>

        {!myEmployee && (
          <Alert className="mb-6 bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You're not registered as an employee yet. Contact your manager to set up your profile.
            </AlertDescription>
          </Alert>
        )}

        {shifts.length === 0 && !isLoading && (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Open Shifts</h3>
              <p className="text-slate-500">Check back later for new opportunities</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {sortedDates.map(date => (
            <Card key={date} className="shadow-lg">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-4 h-4 text-teal-600" />
                  {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {groupedShifts[date].map(shift => {
                    const roleColor = getRoleColor(shift.role_id);
                    const eligible = canClaimShift(shift);

                    return (
                      <div 
                        key={shift.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border-l-4 rounded-lg hover:shadow-md transition-all"
                        style={{ borderLeftColor: roleColor }}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge 
                              className="font-semibold"
                              style={{ 
                                backgroundColor: `${roleColor}20`,
                                color: roleColor,
                                borderColor: roleColor
                              }}
                            >
                              <Briefcase className="w-4 h-4 mr-1" />
                              {getRoleName(shift.role_id)}
                            </Badge>
                            <div className="flex items-center gap-1 text-slate-600">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                {shift.start_time} - {shift.end_time}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">{getDepartmentName(shift.department_id)}</span>
                            </div>
                          </div>
                          {shift.notes && (
                            <p className="text-sm text-slate-600 mt-2">{shift.notes}</p>
                          )}
                          {!eligible && myEmployee && (
                            <p className="text-xs text-orange-600 mt-2">
                              This role is not in your qualified roles
                            </p>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => handleClaimShift(shift)}
                          disabled={!eligible || claimingShift === shift.id}
                          className={`mt-4 md:mt-0 md:ml-4 ${
                            eligible 
                              ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' 
                              : 'bg-slate-300'
                          }`}
                        >
                          {claimingShift === shift.id ? (
                            <>Processing...</>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Claim Shift
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
