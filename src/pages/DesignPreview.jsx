import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ShiftCodeColorManager from "@/components/settings/ShiftCodeColorManager";
import { Card, CardContent } from "@/components/ui/card";
import ThemeManager from "@/components/settings/ThemeManager";
import NativeThemePicker from "@/components/settings/NativeThemePicker";
import BrandingCard from "@/components/settings/BrandingCard";
import ExcelVisualsGenerator from "@/components/visuals/ExcelVisualsGenerator";

export default function DesignPreview() {
  return (
    <div className="p-4 md:p-6">
      <div className="ml-[-1rem] md:ml-[-1.5rem] mr-0 max-w-none space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 px-4 md:px-6">Design Console</h1>

        <Tabs defaultValue="theme" className="px-4 md:px-6">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="theme">Theme & Branding</TabsTrigger>
            <TabsTrigger value="visuals">Excel Visuals Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="space-y-4">
            {/* Two-column layout: Theme Manager (left) and Curated Themes (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5">
                <ThemeManager />
              </div>
              <div className="lg:col-span-7">
                <NativeThemePicker />
              </div>
            </div>

            {/* Branding placed under theme tools */}
            <BrandingCard />

            {/* Shift code color manager helper text + tool (full width below) */}
            <Card>
              <CardContent className="p-4 text-sm text-slate-600">
                Configure the colors of your Shift Codes below. Updates are live across the roster grid.
              </CardContent>
            </Card>
            <ShiftCodeColorManager />
          </TabsContent>

          <TabsContent value="visuals">
            <ExcelVisualsGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}