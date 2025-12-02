import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";

export default function StaffingAlerts({ shifts, employees, loading }) {
  const alerts = useMemo(() => {
    const today = new Date();
    const next7Days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShifts = (shifts || []).filter(s => s.date === dateStr && s.status !== 'cancelled');
      const openCount = dayShifts.filter(s => s.is_open).length;
      
      if (openCount > 0) {
        next7Days.push({
          date: format(date, 'MMM d, EEE'),
          dateStr,
          openShifts: openCount,
          severity: openCount >= 5 ? 'high' : openCount >= 3 ? 'medium' : 'low'
        });
      }
    }
    
    return next7Days.slice(0, 5);
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
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Staffing Alerts
        </CardTitle>
        <p className="text-xs text-slate-500">Open shifts needing coverage</p>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-600">All shifts covered</p>
            <p className="text-xs text-slate-500 mt-1">No alerts for the next 7 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const bgColor = alert.severity === 'high' ? 'bg-red-50' : alert.severity === 'medium' ? 'bg-amber-50' : 'bg-blue-50';
              const borderColor = alert.severity === 'high' ? 'border-red-200' : alert.severity === 'medium' ? 'border-amber-200' : 'border-blue-200';
              const textColor = alert.severity === 'high' ? 'text-red-700' : alert.severity === 'medium' ? 'text-amber-700' : 'text-blue-700';
              const badgeColor = alert.severity === 'high' ? 'bg-red-100 text-red-700 border-red-200' : alert.severity === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200';
              
              return (
                <div key={alert.dateStr} className={`p-3 ${bgColor} border ${borderColor} rounded-lg`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${textColor}`}>{alert.date}</p>
                      <p className="text-xs text-slate-600 mt-1">{alert.openShifts} open shifts</p>
                    </div>
                    <Badge className={badgeColor}>
                      {alert.severity === 'high' ? 'Urgent' : alert.severity === 'medium' ? 'Attention' : 'Notice'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}