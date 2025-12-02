import React from "react";
import { PTListAdmission } from "@/entities/PTListAdmission";
import { applyFilters, explainFilters } from "./KpiFilterEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, X } from "lucide-react";

function readParamsFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const val = (k) => p.get(k) || undefined;
  return {
    startDate: val("start") || undefined,
    endDate: val("end") || undefined,
    year: val("year") || "all",
    month: val("month") || "all",
    day: val("day") || "all",
    patientId: val("patient") || undefined,
    clinician: val("clinician") || "all",
    insurance: val("insurance") || "all",
    specialty: val("specialty") || "all",
    timeBand: val("band") || "all",
    dayCaseOnly: p.get("daycase") === "1",
    inpatientOnly: p.get("inpatient") === "1",
    admissionsToday: p.get("admToday") === "1",
    dischargesToday: p.get("disToday") === "1",
    activePatientsOnly: p.get("active") === "1",
  };
}

export function KpiDiagnosticsButton({ onOpen }) {
  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={onOpen} title="Open KPI Data Diagnostics">
      <Bug className="w-4 h-4" /> Debug
    </Button>
  );
}

export default function KpiDiagnosticsPanel({ onClose }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [params, setParams] = React.useState(readParamsFromUrl());
  const [report, setReport] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await PTListAdmission.list("-admission_date", 10000);
        setRows(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!rows.length) return;
    const rep = explainFilters(rows, params);
    setReport(rep);
  }, [rows, params]);

  const filtered = React.useMemo(() => applyFilters(rows, params), [rows, params]);

  return (
    <div className="fixed z-[10050] right-3 bottom-20 w-[96vw] max-w-[720px]">
      <Card className="shadow-lg border-slate-300">
        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">KPI Data Diagnostics</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-3">
          {loading ? (
            <div className="text-sm text-slate-600">Loading PTListAdmissions…</div>
          ) : (
            <>
              <div className="text-xs text-slate-700 mb-2">
                Total rows: <b>{rows.length}</b> • After filters: <b>{filtered.length}</b>
              </div>
              {report && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div className="border rounded p-2">
                    <div className="text-xs font-semibold mb-1">Step-by-step counts</div>
                    <ol className="text-xs space-y-1">
                      {report.steps.map((s, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{s.step}</span>
                          <span className="font-medium">{s.count}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="border rounded p-2">
                    <div className="text-xs font-semibold mb-1">Anomalies</div>
                    <ul className="text-xs space-y-1">
                      <li>Missing admission_date: <b>{report.anomalies.missing_admission_date}</b></li>
                      <li>Missing admission_time: <b>{report.anomalies.missing_admission_time}</b></li>
                      <li>Invalid time format: <b>{report.anomalies.invalid_time_format}</b></li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-600">
                Tip: When both “Day Cases” and “Inpatients” are ON, we apply a union (not intersection). Same for “Admissions Today” + “Discharges Today”.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}