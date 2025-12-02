import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightCircle, AlertCircle, Clock, Briefcase, User as UserIcon, Calendar, ArrowRight, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
      <DialogContent className="max-w-2xl flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="w-5 h-5 text-sky-600" />
            Redeploy Staff
          </DialogTitle>
          <DialogDescription>
            Move a staff member's shift to another department for cost/resource tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-6">
          {/* Staff & Shift Context Card */}
          <div className="border rounded-lg p-4 bg-slate-50">
             <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-full bg-white border flex items-center justify-center text-slate-500">
                      <UserIcon className="w-5 h-5" />
                   </div>
                   <div>
                      <div className="font-semibold text-slate-900">{employee.full_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                         <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-normal">
                            {homeDeptName}
                         </Badge>
                         <span>•</span>
                         <span>{employee.job_title || "Staff"}</span>
                      </div>
                   </div>
                </div>
                
                <div className="text-right">
                   <div className="flex items-center gap-1.5 justify-end mb-1">
                      <Badge className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm">
                        {shift.shift_code}
                      </Badge>
                   </div>
                   <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {shift.date ? format(parseISO(shift.date), "EEE, MMM d") : "No date"}
                   </div>
                </div>
             </div>
          </div>

          {step === 1 ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-800">Where are they moving to?</Label>
                <Select value={targetDeptId} onValueChange={setTargetDeptId}>
                  <SelectTrigger className="h-11 text-base bg-white">
                    <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <SelectValue placeholder="Select target department..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {departments
                      .filter(d => d.id !== currentDepartment?.id && d.is_active !== false)
                      .map(d => (
                        <SelectItem key={d.id} value={d.id} className="py-3">
                          <span className="font-medium">{d.name}</span>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Start Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      type="time" 
                      value={startTime} 
                      onChange={e => setStartTime(e.target.value)}
                      className="pl-9 h-10 bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">End Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      type="time" 
                      value={endTime} 
                      onChange={e => setEndTime(e.target.value)}
                      className="pl-9 h-10 bg-white"
                    />
                  </div>
                  <div className="text-xs text-right text-slate-500 font-medium">
                     Duration: {getDuration()}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Notes (Optional)</Label>
                <Textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Reason for redeployment, specific location details, etc."
                  className="min-h-[80px] bg-white resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="relative p-6 bg-blue-50/50 border border-blue-100 rounded-xl text-center overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                  
                  <div className="flex items-center justify-center gap-4 mb-6">
                     <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 font-semibold text-slate-700">
                        {homeDeptName}
                     </div>
                     <div className="text-blue-500">
                        <ArrowRightCircle className="w-8 h-8" />
                     </div>
                     <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200 font-semibold text-blue-700 ring-2 ring-blue-50">
                        {targetDept?.name}
                     </div>
                  </div>

                  <div className="space-y-1 mb-4">
                     <h3 className="text-lg font-semibold text-slate-900">Confirm Redeployment</h3>
                     <p className="text-slate-500 text-sm max-w-md mx-auto">
                        This will move the shift cost and visibility to <strong>{targetDept?.name}</strong>. 
                        The home ward will see a "Redeployed Out" indicator.
                     </p>
                  </div>

                  <div className="bg-white/60 rounded-lg p-3 text-sm grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
                     <div>
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Time</span>
                        <div className="font-medium text-slate-900">{startTime} - {endTime}</div>
                     </div>
                     <div>
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Duration</span>
                        <div className="font-medium text-slate-900">{getDuration()}</div>
                     </div>
                     {notes && (
                        <div className="col-span-2 border-t border-slate-200 pt-2 mt-1">
                           <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Notes</span>
                           <div className="text-slate-700 italic">"{notes}"</div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/50">
          <Button variant="outline" onClick={() => step === 2 ? setStep(1) : onClose()} className="mr-auto">
            {step === 2 ? "Back" : "Cancel"}
          </Button>
          {step === 1 ? (
            <Button onClick={handleNext} disabled={!targetDeptId} className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm px-6">
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6">
              Confirm Redeployment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}