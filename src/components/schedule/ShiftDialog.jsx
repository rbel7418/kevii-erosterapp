
import React, { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { emailPrefix } from "@/components/utils/strings";

const defaultShiftFormData = {
  employee_id: "", // Will be enforced as required
  department_id: "",
  role_id: "",
  date: "",
  shift_code: "",
  shift_period: "",
  work_status: "Pending",
  start_time: "09:00",
  end_time: "17:00",
  break_minutes: 30,
  notes: "",
  is_open: false,
  status: "scheduled"
};

export default function ShiftDialog({
  open,
  onClose,
  onSave,
  onDelete,
  shift,
  initialDate,
  initialEmployee,
  initialShiftData,
  employees,
  departments,
  roles
}) {
  const [formData, setFormData] = useState(defaultShiftFormData);
  const [mode, setMode] = useState(shift ? "edit" : "default");

  useEffect(() => {
    if (shift) {
      setFormData(shift);
      setMode("edit"); // editing existing shift -> edit mode
    } else {
      // When creating a new shift, re-initialize from default form data
      // and then merge any provided initialDate, initialEmployee, or initialShiftData
      const newFormData = {
        ...defaultShiftFormData, // Ensures a clean slate for new shifts
        ...(initialDate ? { date: format(initialDate, "yyyy-MM-dd") } : {}),
        ...(initialEmployee ? { employee_id: initialEmployee } : {}),
        ...(initialShiftData || {})
      };

      // Ensure employee_id is set if it's required and not already provided
      // Defaults to the first employee if available and employee_id is still empty
      if (!newFormData.employee_id && employees && employees.length > 0) {
        newFormData.employee_id = employees[0].id;
      }

      setFormData(newFormData);
      setMode("default"); // creating -> default quick mode
    }
  }, [shift, initialDate, initialEmployee, initialShiftData, employees]); // Added employees to dependency array

  const handleSubmit = (e) => {
    e.preventDefault();

    // Client-side validation for required fields
    if (!formData.employee_id) {
      alert("Please select an employee.");
      return;
    }

    // Additional required fields for "Full Edit" mode
    if (mode === "edit" && (!formData.department_id || !formData.role_id)) {
      alert("Department and Role are required in Full Edit mode.");
      return;
    }

    onSave(formData);
  };

  const handleDeleteClick = () => {
    if (shift?.id && onDelete) {
      onDelete(shift.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {shift ? 'Edit Shift' : 'Create Shift'}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle buttons for new shifts */}
        {!shift && ( 
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              variant={mode === "default" ? "default" : "outline"}
              onClick={() => setMode("default")}
              className="px-4"
            >
              Default
            </Button>
            <Button
              type="button"
              variant={mode === "edit" ? "default" : "outline"}
              onClick={() => setMode("edit")}
              className="px-4"
            >
              Full Edit
            </Button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "default" ? (
            // Quick entry mode (only times, break, and date)
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="break">Break (min)</Label>
                  <Input
                    id="break"
                    type="number"
                    min="0"
                    value={formData.break_minutes}
                    onChange={(e) => setFormData({...formData, break_minutes: parseInt(e.target.value || '0')})}
                  />
                </div>
                {/* Employee selection is required in quick mode too */}
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee *</Label>
                  <Select
                    value={formData.employee_id || ""}
                    onValueChange={(value) => setFormData({...formData, employee_id: value})}
                    // Required attribute is handled by custom validation in handleSubmit
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee *" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Removed "Unassigned" option as employee is now required */}
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name || emailPrefix(emp.user_email)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            // Existing full edit form
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee">Employee *</Label>
                  <Select
                    value={formData.employee_id || ""}
                    onValueChange={(value) => setFormData({...formData, employee_id: value})}
                    // Required attribute is handled by custom validation in handleSubmit
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee *" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Removed "Unassigned" option as employee is now required */}
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name || emailPrefix(emp.user_email)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({...formData, department_id: value})}
                    required // HTML required attribute for department
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role_id}
                    onValueChange={(value) => setFormData({...formData, role_id: value})}
                    required // HTML required attribute for role
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shift_code">Shift Code</Label>
                  <Input
                    id="shift_code"
                    value={formData.shift_code}
                    onChange={(e) => setFormData({...formData, shift_code: e.target.value.toUpperCase()})}
                    placeholder="LD, LN, E, L"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shift_period">Shift Period</Label>
                  <Select
                    value={formData.shift_period || ""}
                    onValueChange={(value) => setFormData({...formData, shift_period: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Day">Day</SelectItem>
                      <SelectItem value="Night">Night</SelectItem>
                      <SelectItem value="Early">Early</SelectItem>
                      <SelectItem value="Late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="break">Break (min)</Label>
                  <Input
                    id="break"
                    type="number"
                    min="0"
                    value={formData.break_minutes}
                    onChange={(e) => setFormData({...formData, break_minutes: parseInt(e.target.value || '0')})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_status">Work Status</Label>
                <Select
                  value={formData.work_status}
                  onValueChange={(value) => setFormData({...formData, work_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Requested">Requested</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Add any important information about this shift..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <Label htmlFor="is_open" className="font-semibold">Open Shift</Label>
                  <p className="text-sm text-slate-600">Allow team members to claim this shift</p>
                </div>
                <Switch
                  id="is_open"
                  checked={formData.is_open}
                  onCheckedChange={(checked) => setFormData({...formData, is_open: checked})}
                />
              </div>
            </>
          )}

          <DialogFooter className="gap-2">
            {shift && mode === "edit" && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteClick}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              {shift ? 'Update' : 'Create'} Shift
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
