import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Activity } from "lucide-react";
import { format } from "date-fns";

export default function LiveStaffing({ shifts, employees, loading }) {
  const liveData = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayShifts = (shifts || []).filter(s => s.date === today && s.status !== 'cancelled');
    
    const onDuty = new Set(todayShifts.filter(s => s.employee_id).map(s => s.employee_id)).size;
    const openShifts = todayShifts.filter(s => s.is_open).length;
    const totalScheduled = todayShifts.length;
    
    return {
      onDuty,
      openShifts,
      totalScheduled,
      fillRate: totalScheduled > 0 ? Math.round(((totalScheduled - openShifts) / totalScheduled) * 100) : 100
    };
  }, [shifts]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-48 bg-slate-100 animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Live Staffing
          </CardTitle>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></div>
            Live
          </Badge>
        </div>
        <p className="text-xs text-slate-500">Current shift status for {format(new Date(), 'MMM d')}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">On Duty</p>
                <p className="text-2xl font-bold text-slate-900">{liveData.onDuty}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                <UserX className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Open Shifts</p>
                <p className="text-2xl font-bold text-slate-900">{liveData.openShifts}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Fill Rate</p>
                <p className="text-2xl font-bold text-slate-900">{liveData.fillRate}%</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 text-center">
              {liveData.totalScheduled} total shifts scheduled for today
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}