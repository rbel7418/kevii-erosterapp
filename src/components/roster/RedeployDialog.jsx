import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ArrowRight, AlertCircle } from "lucide-react";

export default function RedeployDialog({ open, onClose, shift, employee, departments, onConfirm }) {
  const [targetDeptId, setTargetDeptId] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [step, setStep] = React.useState("input"); // input | confirm

  React.useEffect(() => {
    if (shift) {
      setStartTime(shift.start_time || "");
      setEndTime(shift.end_time || "");
      setTargetDeptId(""); // Reset target on open
      setNotes("");
      setStep("input");
    }
  }, [shift, open]);

  if (!shift || !employee) return null;

  const currentDept = departments.find(d => d.id === (shift.department_id || employee.department_id));
  const targetDept = departments.find(d => d.id === targetDeptId);

  const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins < 0) mins += 24 * 60; // Cross midnight
    return (mins / 60).toFixed(1);
  };

  const totalHours = calculateHours(startTime, endTime);

  const handleSubmit = () => {
    if (!targetDeptId) {
      alert("Please select a ward to redeploy to.");
      return;
    }
    setStep("confirm");
  };

  const handleFinalConfirm = () => {
    onConfirm({
      shiftId: shift.id,
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
            Move {employee.full_name} to another ward for this shift.
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="grid gap-4 py-4">
            {/* Current Details */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500">Home Ward:</span>
                <span className="font-medium">{departments.find(d => d.id === employee.department_id)?.name || "Unknown"}</span>
                
                <span className="text-slate-500">Current Allocation:</span>
                <span className="font-medium">{currentDept?.name || "Unknown"}</span>
                
                <span className="text-slate-500">Date:</span>
                <span className="font-medium">{shift.date} ({shift.shift_code})</span>
              </div>
            </div>

            {/* Redeploy Form */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Redeploy To</Label>
                <Select value={targetDeptId} onValueChange={setTargetDeptId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target ward..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments
                      .filter(d => d.id !== (shift.department_id || employee.department_id))
                      .map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Start Time</Label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>End Time</Label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="text-xs text-right text-slate-500">
                Total Duration: <span className="font-medium text-slate-900">{totalHours} hrs</span>
              </div>

              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea 
                  placeholder="Reason for redeployment..." 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="h-20"
                />
              </div>
            </div>
          </div>
        ) : (
          // Confirmation Step
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center gap-4 text-lg font-medium text-slate-900">
              <span>{currentDept?.name}</span>
              <ArrowRight className="text-blue-600 w-6 h-6" />
              <span>{targetDept?.name}</span>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
              <div>
                <p className="font-semibold mb-1">Confirm Redeployment</p>
                <p>This shift will be moved to <strong>{targetDept?.name}</strong>.</p>
                <p className="mt-1">
                  Time: {startTime} - {endTime} ({totalHours} hrs)<br/>
                  Staff: {employee.full_name}
                </p>
              </div>
            </div>
            
            <div className="text-xs text-slate-500 text-center">
              This action will update the schedule immediately.
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "input" ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit}>Review & Confirm</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>Back</Button>
              <Button onClick={handleFinalConfirm} className="bg-blue-600 hover:bg-blue-700">
                Confirm Redeployment
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}