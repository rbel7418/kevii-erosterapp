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
        // Fetch using BOTH the internal UUID and the Business ID to cover all data scenarios
        const queries = [
          Shift.filter({ employee_id: myEmployee.id }, "-date", 100)
        ];
        
        if (myEmployee.employee_id && myEmployee.employee_id !== myEmployee.id) {
          queries.push(Shift.filter({ employee_id: myEmployee.employee_id }, "-date", 100));
        }

        const results = await Promise.all(queries);
        const allShifts = results.flat();
        
        // Deduplicate by ID
        const uniqueShifts = Array.from(new Map(allShifts.map(s => [s.id, s])).values());

        // Use yesterday to avoid timezone issues excluding today's shifts
        const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
        
        const future = uniqueShifts
          .filter(s => s.date >= yesterday && s.status !== 'cancelled')
          .sort((a, b) => a.date.localeCompare(b.date));
          
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
        // Find the full target employee object to get their business ID
        const targetEmp = employees?.find(e => e.id === targetEmpId);
        
        // Fetch using BOTH UUID and Business ID
        const queries = [
          Shift.filter({ employee_id: targetEmpId }, "-date", 100)
        ];

        if (targetEmp?.employee_id && targetEmp.employee_id !== targetEmpId) {
          queries.push(Shift.filter({ employee_id: targetEmp.employee_id }, "-date", 100));
        }

        const results = await Promise.all(queries);
        const allShifts = results.flat();
        
        // Deduplicate
        const uniqueShifts = Array.from(new Map(allShifts.map(s => [s.id, s])).values());
        
        const today = format(new Date(), 'yyyy-MM-dd');
        
        const future = uniqueShifts
          .filter(s => s.date >= today && s.status !== 'cancelled')
          .sort((a, b) => a.date.localeCompare(b.date));
          
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
              <div className="text-xs font-medium text-slate-600 mb-1.5">Your Shift to Swap</div>
              <Select value={myShiftId} onValueChange={setMyShiftId} disabled={loadingMyShifts || !myEmployee}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder={
                    !myEmployee ? "Employee profile not found" :
                    loadingMyShifts ? "Loading your shifts..." : 
                    "Select one of your upcoming shifts"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {loadingMyShifts ? (
                    <div className="p-2 text-xs text-slate-500 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                    </div>
                  ) : myShifts.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500">No upcoming shifts found (next 100 shifts)</div>
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