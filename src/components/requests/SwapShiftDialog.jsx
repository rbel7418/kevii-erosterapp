import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { Shift, Employee, ShiftSwapRequest } from "@/entities/all";
import { withRetry } from "@/components/utils/withRetry";
import { SendEmail } from "@/integrations/Core";
import { Loader2 } from "lucide-react";

export default function SwapShiftDialog({ open, onClose, myEmployee, employees }) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  
  const [myDate, setMyDate] = React.useState("");
  const [targetEmpId, setTargetEmpId] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  
  const [myShift, setMyShift] = React.useState(null);
  const [targetShift, setTargetShift] = React.useState(null);
  const [summary, setSummary] = React.useState("");

  // Reset state when opened
  React.useEffect(() => {
    if (open) {
      setMyDate("");
      setTargetEmpId("");
      setTargetDate("");
      setMyShift(null);
      setTargetShift(null);
      setSummary("");
    }
  }, [open]);

  // Fetch my shift when date changes
  React.useEffect(() => {
    if (!myDate || !myEmployee) return;
    (async () => {
      try {
        const shifts = await Shift.filter({ 
          employee_id: myEmployee.id, 
          date: myDate 
        });
        // Filter out cancelled shifts or open shifts? assuming filtered by employee_id means it's assigned
        const valid = shifts.find(s => s.status !== 'cancelled');
        setMyShift(valid || null);
      } catch (e) {
        console.error(e);
        setMyShift(null);
      }
    })();
  }, [myDate, myEmployee]);

  // Fetch target shift when target + date changes
  React.useEffect(() => {
    if (!targetEmpId || !targetDate) return;
    (async () => {
      try {
        const shifts = await Shift.filter({ 
          employee_id: targetEmpId, 
          date: targetDate 
        });
        const valid = shifts.find(s => s.status !== 'cancelled');
        setTargetShift(valid || null);
      } catch (e) {
        console.error(e);
        setTargetShift(null);
      }
    })();
  }, [targetEmpId, targetDate]);

  // Update summary
  React.useEffect(() => {
    if (myShift && targetShift && targetEmpId) {
      const targetEmp = employees.find(e => e.id === targetEmpId);
      const targetName = targetEmp?.full_name || "Unknown";
      const dateStr = format(parseISO(targetDate), "d MMM yyyy");
      setSummary(`You are swapping your shift with ${targetName} on ${dateStr} for a ${targetShift.shift_code} shift.`);
    } else {
      setSummary("");
    }
  }, [myShift, targetShift, targetEmpId, targetDate, employees]);

  const handleSubmit = async () => {
    if (!myShift || !targetShift || !targetEmpId) return;
    setSubmitting(true);
    try {
      const targetEmp = employees.find(e => e.id === targetEmpId);
      
      // Determine approver: 
      // "If a senior level requesting a swap then routes to ward manager."
      // "person approves routes to ward allocated approvers for staff"
      // We'll use reports_to of the requester as the manager email for now.
      const managerEmail = myEmployee.reports_to;

      await ShiftSwapRequest.create({
        requester_id: myEmployee.id,
        requester_name: myEmployee.full_name,
        requester_email: myEmployee.user_email,
        requester_shift_id: myShift.id,
        requester_date: myDate,
        requester_shift_code: myShift.shift_code,
        
        target_employee_id: targetEmp.id,
        target_employee_name: targetEmp.full_name,
        target_employee_email: targetEmp.user_email,
        target_shift_id: targetShift.id,
        target_date: targetDate,
        target_shift_code: targetShift.shift_code,
        
        status: "pending_peer",
        manager_approver_email: managerEmail
      });

      // Notify Target
      if (targetEmp.user_email) {
        SendEmail({
          to: targetEmp.user_email,
          subject: `Shift Swap Request from ${myEmployee.full_name}`,
          body: `Hello ${targetEmp.full_name},\n\n${myEmployee.full_name} wants to swap their ${myShift.shift_code} shift on ${myDate} with your ${targetShift.shift_code} shift on ${targetDate}.\n\nPlease log in to the app to approve or reject this request.`
        }).catch(() => console.warn("Failed to send email"));
      }
      
      alert("Swap request sent! The other person needs to approve it first.");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const targetOptions = React.useMemo(() => {
    return employees
      .filter(e => e.id !== myEmployee?.id && e.is_active)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [employees, myEmployee]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Swap Shift</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* My Shift */}
          <div className="grid gap-2">
            <Label>Your Shift Date</Label>
            <Input 
              type="date" 
              value={myDate} 
              onChange={e => setMyDate(e.target.value)} 
            />
            {myDate && !myShift && (
              <p className="text-xs text-red-500">No shift found for you on this date.</p>
            )}
            {myShift && (
              <p className="text-xs text-green-600">Found: {myShift.shift_code} ({myShift.start_time}-{myShift.end_time})</p>
            )}
          </div>

          {/* Target Employee */}
          <div className="grid gap-2">
            <Label>Swap With</Label>
            <Select value={targetEmpId} onValueChange={setTargetEmpId}>
              <SelectTrigger>
                <SelectValue placeholder="Select colleague" />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Date */}
          {targetEmpId && (
            <div className="grid gap-2">
              <Label>Their Shift Date</Label>
              <Input 
                type="date" 
                value={targetDate} 
                onChange={e => setTargetDate(e.target.value)} 
              />
              {targetDate && !targetShift && (
                <p className="text-xs text-red-500">No shift found for them on this date.</p>
              )}
              {targetShift && (
                <p className="text-xs text-green-600">Found: {targetShift.shift_code} ({targetShift.start_time}-{targetShift.end_time})</p>
              )}
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-200">
              {summary}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !myShift || !targetShift}
            className="bg-sky-600 hover:bg-sky-700"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}