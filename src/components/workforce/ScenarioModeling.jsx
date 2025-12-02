import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit } from "lucide-react";

export default function ScenarioModeling({ config, loading }) {
  const [scenario, setScenario] = useState("base");
  
  const scenarios = [
    { id: "base", label: "Base Case", multiplier: 1.0, color: "bg-blue-100 text-blue-700" },
    { id: "optimistic", label: "Optimistic", multiplier: 0.8, color: "bg-green-100 text-green-700" },
    { id: "pessimistic", label: "Pessimistic", multiplier: 1.2, color: "bg-red-100 text-red-700" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5" />
          Scenario Modeling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scenarios.map(s => (
          <Button
            key={s.id}
            variant={scenario === s.id ? "default" : "outline"}
            className="w-full justify-between"
            onClick={() => setScenario(s.id)}
          >
            <span>{s.label}</span>
            <Badge className={s.color}>{s.multiplier}x</Badge>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}