import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shift } from "@/entities/all";
import { Clock } from "lucide-react";

export default function RedeploymentDetailsDialog({ open, onClose, shift, canManage, departments, onShiftUpdated }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [startTime, setStartTime] = React.useState("");
    const [endTime, setEndTime] = React.useState("");

    React.useEffect(() => {
        if (open && shift) {
            setStartTime(shift.start_time || "");
            setEndTime(shift.end_time || "");
            setIsEditing(false);
        }
    }, [open, shift]);

    const handleSave = async () => {
        try {
            await Shift.update(shift.id, { start_time: startTime, end_time: endTime });
            if (onShiftUpdated) {
                onShiftUpdated();
            }
            setIsEditing(false);
        } catch (error) {
            alert("Failed to update shift: " + error.message);
        }
    };

    if (!shift) return null;

    // Allow editing if < 48h from initiation
    const isEditable = canManage && (!shift.redeploy_meta?.initiated_at || (new Date() - new Date(shift.redeploy_meta.initiated_at)) < 48 * 60 * 60 * 1000);

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
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
                            <div className="col-span-2 font-medium text-slate-900">
                                {departments.find(d => d.id === shift.department_id)?.name || 'Unknown'}
                            </div>

                            <div className="text-slate-500">Shift Code</div>
                            <div className="col-span-2 font-medium text-slate-900">{shift.shift_code}</div>
                            
                            <div className="text-slate-500 self-start mt-2">Time</div>
                            <div className="col-span-2">
                                {isEditing ? (
                                    <div className="flex items-center gap-2 bg-white p-1.5 rounded border border-blue-200">
                                        <div className="relative flex-1">
                                            <Clock className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            <Input 
                                                type="time" 
                                                value={startTime} 
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="pl-7 h-8 text-sm"
                                            />
                                        </div>
                                        <span className="text-slate-400">-</span>
                                        <div className="relative flex-1">
                                            <Clock className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            <Input 
                                                type="time" 
                                                value={endTime} 
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="pl-7 h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="font-medium text-slate-900 py-1.5">
                                        {shift.start_time} - {shift.end_time}
                                    </div>
                                )}
                            </div>

                            {shift.redeploy_meta?.notes && (
                                <>
                                    <div className="text-slate-500 self-start">Notes</div>
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
                        {isEditable && (
                            <div className="mr-auto">
                                {isEditing ? (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setIsEditing(false)} 
                                        className="text-slate-500"
                                    >
                                        Cancel
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setIsEditing(true)}
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        Edit Hours
                                    </Button>
                                )}
                            </div>
                        )}
                        
                        {isEditing ? (
                            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                                Save Changes
                            </Button>
                        ) : (
                            <Button onClick={onClose}>Close</Button>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}