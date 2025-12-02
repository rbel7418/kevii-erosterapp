import React, { useState, useEffect } from "react";
import { AdmissionEvent } from "@/entities/AdmissionEvent";
import { WorkforceConfig } from "@/entities/WorkforceConfig";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import InteractiveForecast from "@/components/forecast/InteractiveForecast";

export default function ForecastingPage() {
  const [admissions, setAdmissions] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [admissionData, configData] = await Promise.all([
          AdmissionEvent.list(),
          WorkforceConfig.list()
        ]);
        setAdmissions(admissionData || []);
        if (configData && configData.length > 0) {
          setConfig(configData[0]);
        }
      } catch (error) {
        console.error("Error fetching forecasting data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-8xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Interactive Forecasting</h1>
            <p className="text-slate-600 mt-1">
              Model future demand and explore the impact of variable changes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Activity className="w-3 h-3 mr-1" />
              Modeling Mode
            </Badge>
          </div>
        </div>

        <InteractiveForecast
          historicalAdmissions={admissions}
          workforceConfig={config}
          loading={loading}
        />
      </div>
    </div>
  );
}