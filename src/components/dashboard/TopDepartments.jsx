import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function TopDepartments({ departments, shifts, loading }) {
  const topDepts = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    
    return (departments || [])
      .filter(d => d.is_active !== false)
      .map(dept => {
        const deptShifts = (shifts || []).filter(s => {
          const d = new Date(s.date);
          return s.department_id === dept.id && 
                 d >= monthStart && 
                 d <= monthEnd && 
                 s.status !== 'cancelled';
        });
        
        return {
          name: dept.name,
          shifts: deptShifts.length,
          filled: deptShifts.filter(s => s.employee_id).length
        };
      })
      .sort((a, b) => b.shifts - a.shifts)
      .slice(0, 5);
  }, [departments, shifts]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 bg-slate-100 animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Busiest Departments
        </CardTitle>
        <p className="text-xs text-slate-500">By shift count this month</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topDepts.map((dept, index) => {
            const fillRate = dept.shifts > 0 ? Math.round((dept.filled / dept.shifts) * 100) : 0;
            return (
              <div key={dept.name} className="flex items-center justify-between group hover:bg-slate-50 p-3 rounded-lg transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{dept.name}</p>
                    <p className="text-xs text-slate-500">{dept.shifts} shifts • {fillRate}% filled</p>
                  </div>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                  {dept.filled}/{dept.shifts}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}