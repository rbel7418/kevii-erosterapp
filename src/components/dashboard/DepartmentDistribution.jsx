import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Building2 } from "lucide-react";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function DepartmentDistribution({ departments, employees, loading }) {
  const chartData = useMemo(() => {
    return (departments || [])
      .filter(d => d.is_active !== false)
      .map((dept, index) => ({
        name: dept.name,
        value: (employees || []).filter(e => e.department_id === dept.id && e.is_active !== false).length,
        color: COLORS[index % COLORS.length]
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [departments, employees]);

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
          <Building2 className="w-5 h-5 text-purple-600" />
          Staff by Department
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}