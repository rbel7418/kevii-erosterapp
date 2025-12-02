import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CardGenerator from "./CardGenerator";
import VariableVisualGenerator from "./VariableVisualGenerator";
import PieChartGenerator from "./PieChartGenerator";

export default function ExcelVisualsGenerator() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Excel Visuals Generator</CardTitle>
        <p className="text-sm text-slate-600">Create custom visualizations and save them to your library</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cards" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="cards">Card Generator</TabsTrigger>
            <TabsTrigger value="1var">1 Variable</TabsTrigger>
            <TabsTrigger value="2var">2 Variables</TabsTrigger>
            <TabsTrigger value="3var">3 Variables</TabsTrigger>
            <TabsTrigger value="pie">Pie & Donut</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="mt-6">
            <CardGenerator />
          </TabsContent>

          <TabsContent value="1var" className="mt-6">
            <VariableVisualGenerator variableCount={1} />
          </TabsContent>

          <TabsContent value="2var" className="mt-6">
            <VariableVisualGenerator variableCount={2} />
          </TabsContent>

          <TabsContent value="3var" className="mt-6">
            <VariableVisualGenerator variableCount={3} />
          </TabsContent>

          <TabsContent value="pie" className="mt-6">
            <PieChartGenerator />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}