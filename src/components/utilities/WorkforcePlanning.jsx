import React, { useState, useEffect } from "react";
import { AdmissionEvent } from "@/entities/AdmissionEvent";
import { WorkforceConfig, WorkforceForecast } from "@/entities/all";
import { Card } from "@/components/ui/card";
import ConfigPanel from "@/components/workforce/ConfigPanel";
import StaffingCalculator from "@/components/workforce/StaffingCalculator";
import ScenarioModeling from "@/components/workforce/ScenarioModeling";
import WorkforceCharts from "@/components/workforce/WorkforceCharts";
import ForecastingEngine from "@/components/workforce/ForecastingEngine";

export default function WorkforcePlanning() {
  const [config, setConfig] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, forecastData, admissionData] = await Promise.all([
        WorkforceConfig.list(),
        WorkforceForecast.list(),
        AdmissionEvent.list(),
      ]);
      
      setConfig(configData && configData.length > 0 ? configData[0] : null);
      setForecasts(forecastData || []);
      setAdmissions(admissionData || []);
      
    } catch (error) {
      console.error("Error loading workforce data:", error);
    }
    setLoading(false);
  };

  const handleConfigUpdate = async (newConfig) => {
    try {
      if (config?.id) {
        await WorkforceConfig.update(config.id, newConfig);
      } else {
        await WorkforceConfig.create(newConfig);
      }
      await loadData();
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  const handleForecastGenerated = (newForecast) => {
    setForecasts(prev => [newForecast, ...prev.filter(f => f.id !== newForecast.id)]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-8xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Workforce Planning & Optimization</h1>
          <p className="text-slate-600 mt-1">
            Configure, forecast, and model your staffing needs based on patient activity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <ConfigPanel config={config} onUpdate={handleConfigUpdate} loading={loading} />
            <ForecastingEngine onForecastGenerated={handleForecastGenerated} admissions={admissions} config={config} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <WorkforceCharts forecasts={forecasts} loading={loading} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <StaffingCalculator config={config} loading={loading} />
               <ScenarioModeling config={config} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}