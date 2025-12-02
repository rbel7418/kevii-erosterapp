import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp } from "lucide-react";
import { format, addDays } from "date-fns";

export default function InteractiveForecast({ historicalAdmissions, workforceConfig, loading }) {
  const [forecastDays, setForecastDays] = useState(14);
  const [growthRate, setGrowthRate] = useState(1.0);
  const [seasonalFactor, setSeasonalFactor] = useState(1.0);

  const forecastData = useMemo(() => {
    const avgDaily = (historicalAdmissions || []).length / 90;
    const results = [];
    
    for (let i = 0; i < forecastDays; i++) {
      const date = format(addDays(new Date(), i), 'MMM d');
      const seasonal = 1 + (Math.sin(i / 7 * Math.PI) * (seasonalFactor - 1) * 0.2);
      const predicted = Math.round(avgDaily * growthRate * seasonal);
      const ratio = workforceConfig?.patient_to_nurse_ratio || 4;
      
      results.push({
        date,
        admissions: predicted,
        nurses: Math.ceil(predicted / ratio),
        confidence: 85 - (i * 2)
      });
    }
    
    return results;
  }, [historicalAdmissions, forecastDays, growthRate, seasonalFactor, workforceConfig]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-96 bg-slate-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Forecast Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label>Forecast Days: {forecastDays}</Label>
              <Slider
                value={[forecastDays]}
                onValueChange={([val]) => setForecastDays(val)}
                min={7}
                max={30}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Growth Rate: {(growthRate * 100).toFixed(0)}%</Label>
              <Slider
                value={[growthRate * 100]}
                onValueChange={([val]) => setGrowthRate(val / 100)}
                min={80}
                max={120}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Seasonal Factor: {seasonalFactor.toFixed(1)}x</Label>
              <Slider
                value={[seasonalFactor * 10]}
                onValueChange={([val]) => setSeasonalFactor(val / 10)}
                min={8}
                max={12}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Forecasted Demand & Staffing Needs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="admissionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="nursesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="admissions" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#admissionsGradient)" />
                <Area type="monotone" dataKey="nurses" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#nursesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}