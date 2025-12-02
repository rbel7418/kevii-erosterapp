import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function StaffingCalculator({ config, loading }) {
  const [patients, setPatients] = useState(20);
  
  const ratio = config?.patient_to_nurse_ratio || 4;
  const requiredNurses = Math.ceil(patients / ratio);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Quick Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Number of Patients</Label>
          <Input
            type="number"
            value={patients}
            onChange={(e) => setPatients(Number(e.target.value))}
          />
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-slate-600 mb-2">Required Nurses</p>
          <p className="text-3xl font-bold text-blue-600">{requiredNurses}</p>
          <p className="text-xs text-slate-500 mt-1">Based on {ratio}:1 ratio</p>
        </div>
      </CardContent>
    </Card>
  );
}