import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export default function ConfigPanel({ config, onUpdate, loading }) {
  const [localConfig, setLocalConfig] = useState(config || {
    config_name: "Default Config",
    patient_to_nurse_ratio: 4,
    hca_credit_factor: 0.5,
    shift_duration_hours: 12,
    minimum_staff_per_shift: 2
  });

  const handleSave = () => {
    onUpdate(localConfig);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Patient:Nurse Ratio</Label>
          <Input
            type="number"
            value={localConfig.patient_to_nurse_ratio}
            onChange={(e) => setLocalConfig({...localConfig, patient_to_nurse_ratio: Number(e.target.value)})}
          />
        </div>
        <div>
          <Label>HCA Credit Factor</Label>
          <Input
            type="number"
            step="0.1"
            value={localConfig.hca_credit_factor}
            onChange={(e) => setLocalConfig({...localConfig, hca_credit_factor: Number(e.target.value)})}
          />
        </div>
        <div>
          <Label>Shift Duration (hours)</Label>
          <Input
            type="number"
            value={localConfig.shift_duration_hours}
            onChange={(e) => setLocalConfig({...localConfig, shift_duration_hours: Number(e.target.value)})}
          />
        </div>
        <div>
          <Label>Min Staff per Shift</Label>
          <Input
            type="number"
            value={localConfig.minimum_staff_per_shift}
            onChange={(e) => setLocalConfig({...localConfig, minimum_staff_per_shift: Number(e.target.value)})}
          />
        </div>
        <Button onClick={handleSave} className="w-full">Save Configuration</Button>
      </CardContent>
    </Card>
  );
}