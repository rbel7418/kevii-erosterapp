import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calendar, Send, ArrowRightLeft, Loader2 } from "lucide-react";
import { Shift } from "@/entities/all";
import { format, parseISO, addDays, startOfDay } from "date-fns";

export default function RequestForm({ submitting, onSubmit, myEmployee, employees }) {
  const [type, setType] = React.useState("annual_leave");
  
  // Standard Request State
  const [subject, setSubject] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");

  // Swap Request State
  const [myShifts, setMyShifts] = React.useState([]);
  const [targetShifts, setTargetShifts] = React.useState([]);
  const [myShiftId, setMyShiftId] = React.useState("");
  const [targetEmpId, setTargetEmpId] = React.useState("");
  const [targetShiftId, setTargetShiftId] = React.useState("");
  const [loadingShifts, setLoadingShifts] = React.useState(false);
  const [loadingMyShifts, setLoadingMyShifts] = React.useState(false);

  // Fetch my upcoming shifts
  React.useEffect(() => {
    if (!myEmployee) return;
    (async () => {
      setLoadingMyShifts(true);
      try {
        // BRUTE FORCE STRATEGY: Fetch large batch of recent shifts and filter in-memory
        // This guarantees we match exactly how the RotaGrid works (which also fetches list and filters locally)
        // avoiding any potential issues with backend filtering or exact field matching.
        const allRecentShifts = await Shift.list("-date", 1000);
        
        // Build a set of all possible identifiers for me
        const myIdentifiers = new Set();
        if (myEmployee.id) myIdentifiers.add(myEmployee.id);
        if (myEmployee.employee_id) myIdentifiers.add(myEmployee.employee_id);
        if (myEmployee.user_email) myIdentifiers.add(myEmployee.user_email);
        if (myEmployee.full_name) myIdentifiers.add(myEmployee.full_name);
        
        // Also add fuzzy variants (trimmed)
        [...myIdentifiers].forEach(id => {
            if (typeof id === 'string') myIdentifiers.add(id.trim());
        });

        const matchedShifts = allRecentShifts.filter(s => {
            return myIdentifiers.has(s.employee_id) || myIdentifiers.has(String(s.employee_id).trim());
        });

        // Deduplicate by ID
        const uniqueShifts = Array.from(new Map(matchedShifts.map(s => [s.id, s])).values());

        // PERMISSIVE Date Parsing Helper
        const parseShiftDate = (dateStr) => {
          if (!dateStr) return new Date(2100, 0, 1); // Treat missing dates as future so they show up
          
          let d;
          // Handle ISO YYYY-MM-DD
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) d = parseISO(dateStr);
          
          // Handle DD/MM/YYYY
          else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [day, month, year] = dateStr.split('/');
            d = new Date(year, month - 1, day);
          }
          
          // Handle DD-Mon
          else if (dateStr.match(/^\d{1,2}-[A-Za-z]{3}$/)) {
             const year = new Date().getFullYear();
             d = new Date(`${dateStr}-${year}`);
          }
          
          // Fallback
          else {
            d = new Date(dateStr);
          }

          // If invalid, treat as future (so it appears in list) instead of filtering out
          return isNaN(d.getTime()) ? new Date(2100, 0, 1) : d;
        };

        // Look back 30 days just to be safe
        const lookback = addDays(startOfDay(new Date()), -30);

        const future = uniqueShifts
          .filter(s => {
            if (s.status === 'cancelled') return false;
            const sDate = parseShiftDate(s.date);
            return sDate >= lookback;
          })
          .sort((a, b) => parseShiftDate(a.date) - parseShiftDate(b.date));
          
        setMyShifts(future);
      } catch (e) {
        console.error("Failed to load my shifts", e);
      } finally {
        setLoadingMyShifts(false);
      }
    })();
  }, [myEmployee]);

  // Fetch target employee shifts when target selected
  React.useEffect(() => {
    if (!targetEmpId) {
      setTargetShifts([]);
      setTargetShiftId("");
      return;
    }
    (async () => {
      setLoadingShifts(true);
      try {
        const targetEmp = employees?.find(e => e.id === targetEmpId);
        
        // BRUTE FORCE STRATEGY for target as well
        const allRecentShifts = await Shift.list("-date", 1000);

        const targetIdentifiers = new Set();
        if (targetEmpId) targetIdentifiers.add(targetEmpId);
        if (targetEmp?.employee_id) targetIdentifiers.add(targetEmp.employee_id);
        if (targetEmp?.user_email) targetIdentifiers.add(targetEmp.user_email);
        if (targetEmp?.full_name) targetIdentifiers.add(targetEmp.full_name);
        
        [...targetIdentifiers].forEach(id => {
            if (typeof id === 'string') targetIdentifiers.add(id.trim());
        });

        const matchedShifts = allRecentShifts.filter(s => {
            return targetIdentifiers.has(s.employee_id) || targetIdentifiers.has(String(s.employee_id).trim());
        });

        // Deduplicate
        const uniqueShifts = Array.from(new Map(matchedShifts.map(s => [s.id, s])).values());
        
        const parseShiftDate = (dateStr) => {
          if (!dateStr) return new Date(2100, 0, 1);
          let d;
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) d = parseISO(dateStr);
          else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [day, month, year] = dateStr.split('/');
            d = new Date(year, month - 1, day);
          }
          else if (dateStr.match(/^\d{1,2}-[A-Za-z]{3}$/)) {
             const year = new Date().getFullYear();
             d = new Date(`${dateStr}-${year}`);
          }
          else d = new Date(dateStr);
          return isNaN(d.getTime()) ? new Date(2100, 0, 1) : d;
        };

        // Look back 7 days for target too, just in case
        const lookback = addDays(startOfDay(new Date()), -7);
        
        const future = uniqueShifts
          .filter(s => {
             if (s.status === 'cancelled') return false;
             const sDate = parseShiftDate(s.date);
             return sDate >= lookback;
          })
          .sort((a, b) => parseShiftDate(a.date) - parseShiftDate(b.date));
          
        setTargetShifts(future);
      } catch (e) {
        console.error("Failed to load target shifts", e);
      } finally {
        setLoadingShifts(false);
      }
    })();
  }, [targetEmpId, employees]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (type === "swap_shift") {
      const myShift = myShifts.find(s => s.id === myShiftId);
      const targetShift = targetShifts.find(s => s.id === targetShiftId);
      const targetEmp = employees.find(e => e.id === targetEmpId);
      
      if (!myShift || !targetShift || !targetEmp) return;

      onSubmit({
        request_type: "swap_shift",
        myShift,
        targetShift,
        targetEmp
      });
    } else {
      onSubmit({
        request_type: type,
        subject: subject || (type === "annual_leave" ? "Annual leave request" : "Schedule change request"),
        details,
        start_date: start || null,
        end_date: end || null
      });
    }
  };

  const targetOptions = React.useMemo(() => {
    return (employees || [])
      .filter(e => e.id !== myEmployee?.id && e.is_active)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [employees, myEmployee]);

  const formatShiftLabel = (s) => {
    return `${format(parseISO(s.date), "EEE d MMM")} - ${s.shift_code} (${s.start_time}-${s.end_time})`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <div className="text-xs font-medium text-slate-600 mb-1.5">What is the request about?</div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual_leave">Annual Leave</SelectItem>
              <SelectItem value="schedule_change">Schedule Change</SelectItem>
              <SelectItem value="swap_shift">Swap Shift</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === "swap_shift" ? (
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span>Select the shifts you want to swap</span>
            </div>

            {/* My Shift */}
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1.5">
                Your Shift to Swap {myEmployee && <span className="text-sky-600 font-normal">- {myEmployee.full_name}</span>}
              </div>
              <Select value={myShiftId} onValueChange={setMyShiftId} disabled={loadingMyShifts || !myEmployee}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder={
                    !myEmployee ? "Employee profile not found for your account" :
                    loadingMyShifts ? "Scanning for your shifts..." : 
                    "Select one of your upcoming shifts"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {loadingMyShifts ? (
                    <div className="p-2 text-xs text-slate-500 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Scanning database...
                    </div>
                  ) : myShifts.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500">
                      No upcoming shifts found.<br/>
                      <span className="opacity-70 text-[10px]">Checked ID: {myEmployee?.employee_id} / {myEmployee?.id?.slice(0,5)}...</span>
                    </div>
                  ) : (
                    myShifts.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {formatShiftLabel(s)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Target Employee */}
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1.5">Swap With (Colleague)</div>
              <Select value={targetEmpId} onValueChange={setTargetEmpId}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="Select colleague" />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Shift */}
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1.5">Their Shift</div>
              <Select value={targetShiftId} onValueChange={setTargetShiftId} disabled={!targetEmpId || loadingShifts}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder={loadingShifts ? "Loading shifts..." : (targetEmpId ? "Select their shift" : "Select colleague first")} />
                </SelectTrigger>
                <SelectContent>
                  {targetShifts.length === 0 && !loadingShifts ? (
                    <div className="p-2 text-xs text-slate-500">Colleague has no upcoming shifts</div>
                  ) : (
                    targetShifts.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {formatShiftLabel(s)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Summary Check */}
            {myShiftId && targetShiftId && (
              <div className="text-xs text-blue-700 bg-blue-50 p-3 rounded border border-blue-100 mt-2">
                Swapping your <strong>{myShifts.find(s=>s.id===myShiftId)?.shift_code}</strong> on {format(parseISO(myShifts.find(s=>s.id===myShiftId)?.date || ""), "d MMM")} <br/>
                with <strong>{targetOptions.find(e=>e.id===targetEmpId)?.full_name}</strong>'s <strong>{targetShifts.find(s=>s.id===targetShiftId)?.shift_code}</strong> on {format(parseISO(targetShifts.find(s=>s.id===targetShiftId)?.date || ""), "d MMM")}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="md:col-span-2">
              <div className="text-xs font-medium text-slate-600 mb-1">Subject</div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short subject"
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start date
                </div>
                <Input type="date" value={start || ""} onChange={(e) => setStart(e.target.value)} className="h-9" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> End date
                </div>
                <Input type="date" value={end || ""} onChange={(e) => setEnd(e.target.value)} className="h-9" />
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Details</div>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add context for your manager..."
                className="min-h-[110px]"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button 
          type="submit" 
          disabled={submitting || (type === 'swap_shift' && (!myShiftId || !targetShiftId))} 
          className="bg-sky-600 hover:bg-sky-700 w-full md:w-auto"
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </form>
  );
}