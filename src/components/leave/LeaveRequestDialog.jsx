import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export default function LeaveRequestDialog({ open, onClose, onSubmit, currentUser }) {
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    leave_type: "annual_leave",
    reason: ""
  });

  const daysRequested = formData.start_date && formData.end_date
    ? differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)) + 1
    : 0;

  const daysRemaining = (currentUser?.annual_leave_days || 0) - (currentUser?.annual_leave_used || 0);
  const exceedsAllowance = daysRequested > daysRemaining && formData.leave_type === 'annual_leave';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (exceedsAllowance) {
      alert("You don't have enough leave days remaining");
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Request Leave</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                min={formData.start_date}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave_type">Leave Type *</Label>
            <Select
              value={formData.leave_type}
              onValueChange={(value) => setFormData({...formData, leave_type: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual_leave">Annual Leave</SelectItem>
                <SelectItem value="sick_leave">Sick Leave</SelectItem>
                <SelectItem value="personal">Personal Leave</SelectItem>
                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              placeholder="Provide additional details..."
              rows={3}
            />
          </div>

          {daysRequested > 0 && (
            <div className={`p-4 rounded-lg ${exceedsAllowance ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Days Requested:</span>
                <span className="text-lg font-bold">{daysRequested}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Days Remaining:</span>
                <span className={exceedsAllowance ? 'text-red-600 font-semibold' : ''}>{daysRemaining}</span>
              </div>
            </div>
          )}

          {exceedsAllowance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have enough annual leave days remaining for this request.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={exceedsAllowance}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}