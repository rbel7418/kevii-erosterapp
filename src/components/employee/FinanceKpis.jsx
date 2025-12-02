
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Percent, Clock, Users, BadgeDollarSign } from "lucide-react";

function Stat({ label, value, sub, tone = "default" }) {
  const toneClasses = {
    default: "text-slate-900",
    green: "text-emerald-700",
    red: "text-rose-700",
    blue: "text-sky-700",
    amber: "text-amber-700",
    violet: "text-violet-700"
  }[tone] || "text-slate-900";

  return (
    <div className="bg-sky-50 p-3 rounded-lg">
      <div className="text-gray-700">{label}</div>
      <div className="text-[#3c3772] mx-6 px-30 Aptos Display-semibold"

      style={{ fontFamily: "'Aptos Display', ui-sans-serif" }}>

        {value}
      </div>
      {sub ? <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div> : null}
    </div>);

}

export default function FinanceKpis({ data, monthLabel, periodLabel }) {
  if (!data) return null;

  const fmtH = (v) => `${Math.round((v || 0) * 10) / 10}h`;
  const fmtPct = (v) => `${Math.round((v || 0) * 1000) / 10}%`;

  // Safe defaults for optional nested structures
  const roleWorked = data && data.roleWorkedHours || {};
  const safeRoleHours = {
    RGN: roleWorked.RGN || 0,
    HCA: roleWorked.HCA || 0,
    NIC: roleWorked.NIC || 0,
    DM: roleWorked.DM || 0,
    Floaters: roleWorked.Floaters || 0
  };
  const skillMix = data && data.skillMix || {};
  const safeSkillMixRgn = typeof skillMix.rgn === "number" ? skillMix.rgn : 0;

  // Guard FTE numbers
  const paidFTE = Number.isFinite(data?.paidFTE) ? data.paidFTE : 0;
  const workedFTE = Number.isFinite(data?.workedFTE) ? data.workedFTE : 0;

  return (
    <div className="space-y-6">
      {/* Base sums quick glance */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow border-blue-100 rounded-xl">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Base Sums — {periodLabel}</CardTitle>
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {monthLabel}
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Stat label="Total Shift Hours" value={fmtH(data.totalShiftHours)} />
            <Stat label="Total Slots Planned" value={data.totalSlotsPlanned || 0} />
            <Stat label="Total Worked Hours" value={fmtH(data.totalWorkedHours)} tone="green" />
            <Stat label="Paid Hours" value={fmtH(data.totalPaidHours)} />
            <Stat label="Billable Hours" value={fmtH(data.totalBillableHours)} />
            <Stat label="Floater Hours" value={fmtH(data.totalFloaterHours)} />
          </div>
        </CardContent>
      </Card>

      {/* FTE & Averages */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow border-blue-100 rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold">FTE & Averages (MTD)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Stat label="Std Hours / FTE" value={fmtH(data.stdHoursPerFTE)} />
            <Stat label="Paid FTE" value={paidFTE.toFixed(2)} tone="blue" />
            <Stat label="Worked FTE" value={workedFTE.toFixed(2)} tone="blue" />
            <Stat label="Avg Hours / Staff (Worked)" value={fmtH(data.avgHoursPerStaffWorked)} />
            <Stat label="Shifts Planned" value={data.shiftsPlanned || 0} />
            <Stat label="Shifts Filled" value={data.shiftsFilled || 0} />
          </div>
        </CardContent>
      </Card>

      {/* Utilisation & Mix */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow border-blue-100 rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold">Utilisation & Mix (MTD)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Utilisation" value={fmtPct(data.utilisation)} tone="green" />
            <Stat label="Billable Ratio" value={fmtPct(data.billableRatio)} />
            <Stat label="Floater Ratio" value={fmtPct(data.floaterRatio)} />
            <Stat label="Coverage vs Rota" value={fmtPct(data.coverageVsRota)} />
            <Stat label="Shift Fill Rate" value={fmtPct(data.fillRate)} />
          </div>
        </CardContent>
      </Card>

      {/* Overtime / Shortfall + TOIL */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-xl hover:shadow-2xl transition-shadow border-blue-100 rounded-xl">
          <CardHeader className="border-b">
            <CardTitle className="text-base font-semibold">Overtime & Shortfall (MTD)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-3">
            <Stat label="Overtime Hours" value={fmtH(data.overtimeHours)} tone="green" />
            <Stat label="Shortfall Hours" value={fmtH(data.shortfallHours)} tone="red" />
            <Stat label="Variance (Worked - Contracted)" value={fmtH(data.rosterVarianceHours)} />
            <Stat label="Avg Shift Hours" value={fmtH(data.avgShiftHours)} />
          </CardContent>
        </Card>

        <Card className="shadow-xl hover:shadow-2xl transition-shadow border-blue-100 rounded-xl">
          <CardHeader className="border-b">
            <CardTitle className="text-base font-semibold">TOIL</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat label="TOIL Debit (HO)" value={fmtH(data.toilDebitHours)} />
            <Stat label="TOIL Credit (PB)" value={fmtH(data.toilCreditHours)} />
            <Stat label="TOIL Net" value={fmtH(data.toilNetHours)} tone={data.toilNetHours >= 0 ? "green" : "red"} />
          </CardContent>
        </Card>
      </div>

      {/* Role lenses */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow border-blue-100 rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold">Role / Group Lenses (Worked Hours)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Stat label="RGN" value={fmtH(safeRoleHours.RGN)} />
            <Stat label="HCA" value={fmtH(safeRoleHours.HCA)} />
            <Stat label="NIC" value={fmtH(safeRoleHours.NIC)} />
            <Stat label="DM" value={fmtH(safeRoleHours.DM)} />
            <Stat label="Floaters" value={fmtH(safeRoleHours.Floaters)} />
            <Stat label="Skill Mix (RGN)" value={fmtPct(safeSkillMixRgn)} />
          </div>
        </CardContent>
      </Card>

      {/* QoL */}
      <Card className="shadow-xl hover:shadow-2xl transition-shadow border-blue-100 rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold">Quality-of-life KPIs</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Worked % of Paid" value={fmtPct(data.workedPctOfPaid)} />
          <Stat label="Billable % of Worked" value={fmtPct(data.billablePctOfWorked)} />
          <Stat label="TOIL Balance / Staff" value={fmtH(data.toilBalancePerStaff)} />
          <Stat label="Worked Hours (Last 7d)" value={fmtH(data.last7Worked)} />
          <Stat label="Paid Hours (MTD)" value={fmtH(data.mtdPaid)} />
        </CardContent>
      </Card>
    </div>);

}