
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// NEW: hoisted stable initial form constant (prevents effect dependency issues)
const INITIAL_EMPLOYEE_FORM = {
  user_email: "",
  full_name: "",
  employee_id: "",
  date_of_join: "",
  job_title: "",
  department_id: "",
  reports_to: "",
  contract_type: "Permanent",
  contracted_hours_weekly: 40,
  role_ids: [],
  phone: "",
  days_off: [],
  is_active: true,
  custom_hourly_rate: 0
};

export default function EmployeeDialog({
  open,
  onClose,
  onSave,
  employee,
  departments,
  roles
}) {
  const [formData, setFormData] = useState(INITIAL_EMPLOYEE_FORM);

  useEffect(() => {
    if (employee) {
      // When editing an employee, ensure all fields have default non-null/undefined values
      // to prevent controlled component warnings and "unassigned select bug"
      setFormData({
        user_email: employee.user_email || "",
        full_name: employee.full_name || "",
        employee_id: employee.employee_id || "",
        date_of_join: employee.date_of_join || "",
        job_title: employee.job_title || "",
        department_id: employee.department_id || "", // Ensure a string for select
        reports_to: employee.reports_to || "",
        contract_type: employee.contract_type || "Permanent", // Ensure a string for select, with default
        contracted_hours_weekly: employee.contracted_hours_weekly ?? 40, // Use nullish coalescing for numbers
        role_ids: employee.role_ids || [], // Ensure an array
        phone: employee.phone || "",
        days_off: employee.days_off || [], // Ensure an array
        is_active: employee.is_active ?? true, // Use nullish coalescing for boolean
        custom_hourly_rate: employee.custom_hourly_rate ?? 0
      });
    } else {
      // Reset form data for adding a new employee using the stable constant
      setFormData(INITIAL_EMPLOYEE_FORM);
    }
  }, [employee]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleRole = (roleId) => {
    const currentRoles = formData.role_ids || [];
    if (currentRoles.includes(roleId)) {
      setFormData({
        ...formData,
        role_ids: currentRoles.filter(id => id !== roleId)
      });
    } else {
      setFormData({
        ...formData,
        role_ids: [...currentRoles, roleId]
      });
    }
  };

  const toggleDayOff = (day) => {
    const currentDays = formData.days_off || [];
    if (currentDays.includes(day)) {
      setFormData({
        ...formData,
        days_off: currentDays.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        days_off: [...currentDays, day]
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {employee ? 'Edit Team Member' : 'Add Team Member'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="John Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_email">Email *</Label>
              <Input
                id="user_email"
                type="email"
                value={formData.user_email}
                onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                placeholder="employee@email.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                placeholder="EMP001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_join">Date of Join</Label>
              <Input
                id="date_of_join"
                type="date"
                value={formData.date_of_join}
                onChange={(e) => setFormData({...formData, date_of_join: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                placeholder="Senior Nurse"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => setFormData({...formData, department_id: value})}
                required
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reports_to">Reports To</Label>
              <Input
                id="reports_to"
                type="email"
                value={formData.reports_to}
                onChange={(e) => setFormData({...formData, reports_to: e.target.value})}
                placeholder="manager@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_type">Contract Type *</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) => setFormData({...formData, contract_type: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="Fixed Term">Fixed Term</SelectItem>
                  <SelectItem value="Temporary">Temporary</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Zero Hours">Zero Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contracted_hours">Contracted Hours/Week *</Label>
              <Input
                id="contracted_hours"
                type="number"
                min="0"
                max="168"
                value={formData.contracted_hours_weekly}
                onChange={(e) => setFormData({...formData, contracted_hours_weekly: parseFloat(e.target.value)})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roles *</Label>
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg">
              {roles.map(role => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={(formData.role_ids || []).includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <label htmlFor={`role-${role.id}`} className="text-sm cursor-pointer">
                    {role.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Regular Days Off</Label>
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day}`}
                    checked={(formData.days_off || []).includes(day)}
                    onCheckedChange={() => toggleDayOff(day)}
                  />
                  <label htmlFor={`day-${day}`} className="text-sm cursor-pointer">
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Label htmlFor="is_active" className="font-semibold">Active Employee</Label>
              <p className="text-sm text-slate-600">Inactive employees won't appear in scheduling</p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              {employee ? 'Update' : 'Add'} Team Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
