import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightCircle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function RedeployDialog({ 
  open, 
  onClose, 
  shift, 
  employee, 
  currentDepartment, 
  departments,
  onConfirm 
}) {
  const [targetDeptId, setTargetDeptId] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [step, setStep] = React.useState(1);

  React.useEffect(() => {
    if (open && shift) {
      setStartTime(shift.start_time || "08:00");
      setEndTime(shift.end_time || "20:00");
      setTargetDeptId("");
      setNotes("");
      setStep(1);
    }
  }, [open, shift]);

  if (!shift || !employee) return null;

  const targetDept = departments.find(d => d.id === targetDeptId);
  const homeDeptName = currentDepartment?.name || "Unknown";
  
  // Calculate hours roughly
  const getDuration = () => {
    if (!startTime || !endTime) return "0h";
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? m + 'm' : ''}`;
  };

  const handleNext = () => {
    if (!targetDeptId) return;
    setStep(2);
  };

  const handleConfirm = () => {
    onConfirm({
      targetDeptId,
      startTime,
      endTime,
      notes
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Redeploy Staff</DialogTitle>
          <DialogDescription>
            Move this shift to another department.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid gap-4 py-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-3 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-slate-500">Staff Member</div>
                <div className="font-semibold text-slate-900">{employee.full_name}</div>
                
                <div className="text-slate-500">Home Ward</div>
                <div className="font-medium text-slate-900">{homeDeptName}</div>
                
                <div className="text-slate-500">Current Allocation</div>
                <div className="font-medium text-slate-900">{homeDeptName}</div>
                
                <div className="text-slate-500">Shift Hours</div>
                <div className="font-medium text-slate-900">
                  {shift.start_time && shift.end_time 
                    ? `${shift.start_time} - ${shift.end_time} (${getDuration().replace(' ', '')})` 
                    : "Not set"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Redeploy To</Label>
              <Select value={targetDeptId} onValueChange={setTargetDeptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target department" />
                </SelectTrigger>
                <SelectContent>
                  {departments
                    .filter(d => d.id !== currentDepartment?.id && d.is_active !== false)
                    .map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    type="time" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Reason for redeployment..."
                className="h-20"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-3 w-full justify-center">
                <div className="bg-white px-3 py-1.5 rounded shadow-sm border text-sm font-medium">
                  {homeDeptName}
                </div>
                <ArrowRightCircle className="w-6 h-6 text-blue-500" />
                <div className="bg-white px-3 py-1.5 rounded shadow-sm border text-sm font-medium text-blue-700 border-blue-200">
                  {targetDept?.name}
                </div>
              </div>
              
              <div className="text-sm text-blue-800 max-w-[80%]">
                Confirm redeployment for <strong>{employee.full_name}</strong>.
                <br />
                Shift cost will actully move to <strong>{targetDept?.name}</strong>.
              </div>

              <div className="w-full border-t border-blue-200 pt-2 mt-2 text-xs text-blue-600 grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="block opacity-70">New Time:</span>
                  {startTime} - {endTime} ({getDuration()})
                </div>
                <div>
                  <span className="block opacity-70">Notes:</span>
                  {notes || "None"}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Shift will disappear from {homeDeptName} and appear in {targetDept?.name} with a redeployment indicator.
                Manager edits allowed for 48h.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => step === 2 ? setStep(1) : onClose()}>
            {step === 2 ? "Back" : "Cancel"}
          </Button>
          {step === 1 ? (
            <Button onClick={handleNext} disabled={!targetDeptId}>
              Next
            </Button>
          ) : (
            <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
              Confirm Redeployment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}