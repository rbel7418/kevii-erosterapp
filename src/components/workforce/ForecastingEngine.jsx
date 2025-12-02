import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkforceForecast } from "@/entities/WorkforceForecast";
import { BrainCircuit, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

export default function ForecastingEngine({ onForecastGenerated, admissions, config }) {
  const [generating, setGenerating] = useState(false);

  const generateForecast = async () => {
    setGenerating(true);
    try {
      // Simple forecasting logic based on recent trends
      const recentAdmissions = (admissions || []).slice(0, 7);
      const avgAdmissions = recentAdmissions.length / 7;
      const ratio = config?.patient_to_nurse_ratio || 4;
      
      // Generate 7-day forecast
      for (let i = 1; i <= 7; i++) {
        const forecastDate = format(addDays(new Date(), i), 'yyyy-MM-dd');
        const predicted = Math.round(avgAdmissions * (0.9 + Math.random() * 0.2));
        
        const forecast = await WorkforceForecast.create({
          forecast_date: forecastDate,
          predicted_admissions: predicted,
          predicted_discharges: Math.round(predicted * 0.8),
          required_nurses_day: Math.ceil(predicted / ratio),
          required_nurses_night: Math.ceil(predicted / (ratio * 1.5)),
          confidence_score: 75 + Math.floor(Math.random() * 15),
          scenario: "base"
        });
        
        onForecastGenerated(forecast);
      }
    } catch (error) {
      console.error("Error generating forecast:", error);
    }
    setGenerating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5" />
          Generate Forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={generateForecast} 
          disabled={generating}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <BrainCircuit className="w-4 h-4 mr-2" />
              Generate 7-Day Forecast
            </>
          )}
        </Button>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Uses historical data to predict staffing needs
        </p>
      </CardContent>
    </Card>
  );
}