import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shift } from "@/entities/all";

export default function RedeployDetailsDialog({ shift, open, onClose, onUpdate, canManage, departments }) {
  const [editMode, setEditMode] = React.useState(false);
  const [times, setTimes] = React.useState({ start: "", end: "" });
  const [isSaving, setIsSaving] = React.useState(false);

  // Reset state when shift changes or dialog opens
  React.useEffect(() => {
    if (shift) {
      setTimes({
        start: shift.start_time || "",
        end: shift.end_time || ""
      });
      setEditMode(false);
    }
  }, [shift, open]);

  if (!shift) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await Shift.update(shift.id, {
        start_time: times.start,
        end_time: times.end
      });
      
      // Notify parent to refresh data
      if (onUpdate) await onUpdate();
      
      setEditMode(false);
    } catch (error) {
      console.error("Failed to update shift times:", error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Check 48h lock
  const isLocked = React.useMemo(() => {
    if (!shift.redeploy_meta?.initiated_at) return false;
    const initiated = new Date(shift.redeploy_meta.initiated_at);
    const now = new Date();
    const hoursDiff = (now - initiated) / (1000 * 60 * 60);
    return hoursDiff > 48;
  }, [shift]);

  const targetDeptName = departments.find(d => d.id === shift.department_id)?.name || 'Unknown';
  const isRedeployedOut = true; // Context implies this dialog is mostly for "Out" or generic redeploy info

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Redeployment Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm space-y-3 shadow-sm">
            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="text-slate-500">Status</div>
              <div className="col-span-2 font-semibold text-blue-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Redeployed Out
              </div>
              
              <div className="text-slate-500">To Ward</div>
              <div className="col-span-2 font-medium text-slate-900">{targetDeptName}</div>

              <div className="text-slate-500">Shift Code</div>
              <div className="col-span-2 font-medium text-slate-900">{shift.shift_code}</div>
              
              <div className="text-slate-500">Time</div>
              <div className="col-span-2 font-medium text-slate-900">
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={times.start} 
                      onChange={(e) => setTimes({...times, start: e.target.value})}
                      className="h-8 w-24 bg-white"
                      placeholder="HH:MM"
                    />
                    <span>-</span>
                    <Input 
                      value={times.end} 
                      onChange={(e) => setTimes({...times, end: e.target.value})}
                      className="h-8 w-24 bg-white"
                      placeholder="HH:MM"
                    />
                  </div>
                ) : (
                  <span>{shift.start_time} - {shift.end_time}</span>
                )}
              </div>

              {shift.redeploy_meta?.notes && (
                <>
                  <div className="text-slate-500 self-start pt-1">Notes</div>
                  <div className="col-span-2 italic text-slate-700 bg-blue-100/50 p-2 rounded">
                    "{shift.redeploy_meta.notes}"
                  </div>
                </>
              )}
              
              <div className="text-slate-500">Initiated By</div>
              <div className="col-span-2 text-xs text-slate-600">{shift.redeploy_meta?.initiated_by}</div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            {canManage && !isLocked && (
              <div className="mr-auto">
                {editMode ? (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditMode(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="text-blue-600 border-blue-200 hover:bg-blue-50" 
                    onClick={() => setEditMode(true)}
                  >
                    Edit Hours
                  </Button>
                )}
              </div>
            )}
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}