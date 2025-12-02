
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseISO, isSameDay } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function EmployeeHoursPanel({ employees, shifts, weekStart, weekEnd }) {
  const calculateHoursForEmployee = (employeeId) => {
    const employeeShifts = shifts.filter(s => {
      if (s.employee_id !== employeeId) return false;
      const shiftDate = parseISO(s.date);
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });

    const totalMinutes = employeeShifts.reduce((sum, shift) => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const [endHour, endMin] = shift.end_time.split(':').map(Number);
      const shiftMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin) - (shift.break_minutes || 0);
      return sum + shiftMinutes;
    }, 0);

    return totalMinutes / 60;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Weekly Hours</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {employees.map(employee => {
            const actualHours = calculateHoursForEmployee(employee.id);
            const contractedHours = employee.contracted_hours_weekly || 0;
            const difference = actualHours - contractedHours;
            const percentageOfContracted = contractedHours > 0 
              ? (actualHours / contractedHours) * 100 
              : 0;

            return (
              <div key={employee.id} className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-sm text-slate-900 truncate">
                    {employee.full_name || String(employee.user_email || "").split('@')[0]}
                  </p>
                  {difference > 0.5 ? (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{difference.toFixed(1)}h
                    </Badge>
                  ) : difference < -0.5 ? (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {difference.toFixed(1)}h
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <Minus className="w-3 h-3 mr-1" />
                      On track
                    </Badge>
                  )}
                </div>
                
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>{actualHours.toFixed(1)}h scheduled</span>
                    <span>{contractedHours}h contracted</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        percentageOfContracted > 110 ? 'bg-orange-500' :
                        percentageOfContracted < 90 ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentageOfContracted, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
