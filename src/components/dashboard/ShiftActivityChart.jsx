import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, subDays } from "date-fns";
import { TrendingUp } from "lucide-react";

export default function ShiftActivityChart({ shifts, loading }) {
  const chartData = useMemo(() => {
    const last14Days = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShifts = (shifts || []).filter(s => s.date === dateStr && s.status !== 'cancelled');
      
      last14Days.push({
        date: format(date, 'MMM d'),
        Scheduled: dayShifts.length,
        Filled: dayShifts.filter(s => s.employee_id).length,
        Open: dayShifts.filter(s => s.is_open).length
      });
    }
    
    return last14Days;
  }, [shifts]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-80 bg-slate-100 animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Shift Activity Trend
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">Last 14 days shift scheduling and fill rates</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFilled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }} 
              />
              <Legend />
              <Area type="monotone" dataKey="Scheduled" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorScheduled)" />
              <Area type="monotone" dataKey="Filled" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorFilled)" />
              <Area type="monotone" dataKey="Open" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorOpen)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}