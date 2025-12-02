
import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StrategicOverview from "@/components/compliance/StrategicOverview";
import DepartmentComplianceView from "@/components/compliance/DepartmentComplianceView";
import TrainingGapAnalysis from "@/components/compliance/TrainingGapAnalysis";
import TrainingDashboard from "@/components/reports/TrainingDashboard";
import IPCTrainingDashboard from "@/components/compliance/IPCTrainingDashboard"; // New import
import IPCUnifiedDashboard from "@/components/compliance/IPCUnifiedDashboard"; // New import for unified dashboard
import { Download, BarChart3 } from "lucide-react";
import { IPCTrainingRecord } from "@/entities/IPCTrainingRecord";
import { createPageUrl } from "@/utils";

export default function Compliance() {
  const [busy, setBusy] = React.useState(false);

  const exportCSV = async () => {
    setBusy(true);
    try {
      const rows = await IPCTrainingRecord.filter({}).catch(() => []);
      const headers = [
        "FULL NAME","JOB TITLE","DEPARTMENT","STAFF TYPE","CLINICAL",
        "FFP 3 FACE FIT TESTING 3YRS","INOCULATION INJURIES","Hand Hygiene and BBE","PPE","WASTE","SHARPS BINS","LINEN DISPOSAL","SPILL KITS","ISOLATION + CLEANING, MRSA , CRE + VIRUSES","CEPHEID MACHINE competency 3YRS","UNIFORM & DRESS CODE INDUCTION","CC Alerts INDUCTION","COMMENTS"
      ];
      const toRow = (r) => [
        r.full_name || "", r.job_title || "", r.department || "", r.staff_type || "", r.is_clinical ? "Yes" : "No",
        r.ffp3_face_fit_testing_3yrs || "", r.inoculation_injuries || "", r.hand_hygiene_bbe || "", r.ppe || "", r.waste || "",
        r.sharps_bins || "", r.linen_disposal || "", r.spill_kits || "", r.isolation_cleaning_mrsa_cre_viruses || "",
        r.cepheid_machine_competency_3yrs || "", r.uniform_dress_code_induction || "", r.cc_alerts_induction || "", r.comments || ""
      ];
      const lines = [headers.join(","), ...rows.map(row => toRow(row).map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "ipc_training_export.csv"; a.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Compliance Dashboard</h1>
          <p className="text-xs md:text-sm text-slate-600">Central hub for IPC training compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.href = createPageUrl("RepGen") + "?source=ipc"}>
            <BarChart3 className="w-4 h-4 mr-2" /> Open in Report Generator
          </Button>
          <Button onClick={exportCSV} disabled={busy}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-3">
          <TabsTrigger value="overview">Strategic Overview</TabsTrigger>
          <TabsTrigger value="dept">Department</TabsTrigger>
          <TabsTrigger value="gaps">Training Gaps</TabsTrigger>
          <TabsTrigger value="training">Executive Summary</TabsTrigger>
          <TabsTrigger value="ipc">IPC Training Dashboard</TabsTrigger> {/* Original IPC tab trigger */}
          <TabsTrigger value="unified">IPC Unified Dashboard</TabsTrigger> {/* New unified dashboard tab trigger */}
        </TabsList>

        <TabsContent value="overview"><StrategicOverview /></TabsContent>
        <TabsContent value="dept"><DepartmentComplianceView /></TabsContent>
        <TabsContent value="gaps"><TrainingGapAnalysis /></TabsContent>
        <TabsContent value="training"><TrainingDashboard /></TabsContent>
        <TabsContent value="ipc"><IPCTrainingDashboard /></TabsContent> {/* Original IPC tab content */}
        <TabsContent value="unified"><IPCUnifiedDashboard /></TabsContent> {/* New unified dashboard tab content */}
      </Tabs>
    </div>
  );
}
