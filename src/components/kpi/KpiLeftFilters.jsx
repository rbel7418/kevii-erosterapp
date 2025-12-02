import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function KpiLeftFilters({ options, state, onChange }) {
  const { years = [], months = [], days = [], clinicians = [], insurers = [], specialties = [] } = options || {};
  const {
    yearFilter, monthFilter, dayFilter, clinician, insurance, specialty, timeBand,
    dayCaseOnly, inpatientOnly, admissionsToday, dischargesToday, activePatientsOnly
  } = state || {};

  return (
    <Card className="sticky top-20">
      <CardContent className="p-3 space-y-3">
        <div className="text-xs font-semibold text-slate-700">Quick Filters</div>
        <div className="grid grid-cols-1 gap-2">
          <Button variant={admissionsToday ? "default" : "outline"} onClick={() => onChange({ admissionsToday: !admissionsToday, dischargesToday: false })}>
            Admissions Today
          </Button>
          <Button variant={dischargesToday ? "default" : "outline"} onClick={() => onChange({ dischargesToday: !dischargesToday, admissionsToday: false })}>
            Discharges Today
          </Button>
          <Button variant={activePatientsOnly ? "default" : "outline"} onClick={() => onChange({ activePatientsOnly: !activePatientsOnly })}>
            Active Patients
          </Button>
        </div>

        <div className="h-px bg-slate-200" />

        <div className="text-xs font-semibold text-slate-700">Date Breakdown</div>
        <div className="space-y-2">
          <Select value={yearFilter} onValueChange={(v)=>onChange({ yearFilter: v })}>
            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={(v)=>onChange({ monthFilter: v })}>
            <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dayFilter} onValueChange={(v)=>onChange({ dayFilter: v })}>
            <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="h-px bg-slate-200" />

        <div className="text-xs font-semibold text-slate-700">Clinical</div>
        <div className="space-y-2">
          <Select value={clinician} onValueChange={(v)=>onChange({ clinician: v })}>
            <SelectTrigger><SelectValue placeholder="Clinician" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinicians</SelectItem>
              {clinicians.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={specialty} onValueChange={(v)=>onChange({ specialty: v })}>
            <SelectTrigger><SelectValue placeholder="Specialty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="h-px bg-slate-200" />

        <div className="text-xs font-semibold text-slate-700">Payer/Insurance</div>
        <Select value={insurance} onValueChange={(v)=>onChange({ insurance: v })}>
          <SelectTrigger><SelectValue placeholder="Purchaser / Insurance" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {insurers.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="h-px bg-slate-200" />

        <div className="text-xs font-semibold text-slate-700">Care Type</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={dayCaseOnly ? "default" : "outline"} onClick={() => onChange({ dayCaseOnly: !dayCaseOnly, inpatientOnly: false })}>
            Day Cases
          </Button>
          <Button variant={inpatientOnly ? "default" : "outline"} onClick={() => onChange({ inpatientOnly: !inpatientOnly, dayCaseOnly: false })}>
            Inpatients
          </Button>
        </div>

        <div className="h-px bg-slate-200" />

        <div className="text-xs font-semibold text-slate-700">Arrivals by Time Block</div>
        <Select value={timeBand} onValueChange={(v)=>onChange({ timeBand: v })}>
          <SelectTrigger><SelectValue placeholder="Time band" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="06-08">06:00–08:00</SelectItem>
            <SelectItem value="08-12">08:00–12:00</SelectItem>
            <SelectItem value="12-16">12:00–16:00</SelectItem>
            <SelectItem value="16-20">16:00–20:00</SelectItem>
            <SelectItem value="20-06">20:00–06:00</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}