import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Search, X } from "lucide-react";

export default function KpiFilters({ allRecords, startDate, endDate, onDates, patientId, onPatient }) {
  const [query, setQuery] = React.useState("");
  const [openList, setOpenList] = React.useState(false);

  const patients = React.useMemo(() => {
    const set = new Set((allRecords || []).map(r => String(r.patient_id || "").trim()).filter(Boolean));
    const arr = Array.from(set);
    if (!query) return arr.slice(0, 10);
    const q = query.toLowerCase();
    return arr.filter(id => id.toLowerCase().includes(q)).slice(0, 10);
  }, [allRecords, query]);

  return (
    <div className="grid gap-3 md:grid-cols-12 items-end">
      <div className="md:col-span-3">
        <div className="text-xs text-slate-600 mb-1">Start date</div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <Input type="date" value={startDate} onChange={(e)=>onDates(e.target.value, endDate)} />
        </div>
      </div>
      <div className="md:col-span-3">
        <div className="text-xs text-slate-600 mb-1">End date</div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <Input type="date" value={endDate} onChange={(e)=>onDates(startDate, e.target.value)} />
        </div>
      </div>
      <div className="md:col-span-5 relative">
        <div className="text-xs text-slate-600 mb-1">Patient Journey (search Patient Id)</div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-2 top-2.5" />
            <Input
              placeholder="Type to search patient id…"
              className="pl-7"
              value={query}
              onChange={(e)=>{ setQuery(e.target.value); setOpenList(true); }}
              onFocus={()=>setOpenList(true)}
            />
            {openList && patients.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow">
                {patients.map(id => (
                  <div
                    key={id}
                    className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                    onClick={()=>{ onPatient(id); setQuery(id); setOpenList(false); }}
                  >
                    {id}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={()=>{ onPatient(""); setQuery(""); setOpenList(false); }}><X className="w-4 h-4 mr-1" />Clear</Button>
        </div>
        {patientId && <div className="text-xs text-slate-500 mt-1">Filtering for Patient Id: <span className="font-semibold">{patientId}</span></div>}
      </div>
      <div className="md:col-span-1">
        <div className="text-xs mb-1">&nbsp;</div>
        <Button className="w-full" onClick={()=>setOpenList(false)}>Apply</Button>
      </div>
    </div>
  );
}