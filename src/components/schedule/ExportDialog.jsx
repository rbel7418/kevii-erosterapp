
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { emailPrefix } from "@/components/utils/strings";

export default function ExportDialog({
  open,
  onClose,
  shifts,
  employees,
  departments,
  roles,
  dateRange,
  exportTarget = "excel"
}) {
  const [exportFormat, setExportFormat] = useState(exportTarget === "powerbi" ? "powerbi" : "excel");

  const handleExport = () => {
    // UPDATED: slimmed headers
    const headers = [
      "StaffName",
      "Role",
      "Date",
      "ShiftCode",
      "ShiftPeriod",
      "StartTime",
      "EndTime",
      "EmpID"
    ];

    const exportData = shifts.map(shift => {
      const employee = employees.find(e => e.id === shift.employee_id);
      const role = roles.find(r => r.id === shift.role_id);
      // departments are no longer used in the export data, so `dept` variable is removed

      const staffName = employee?.full_name || emailPrefix(employee?.user_email) || "Unassigned";
      const empId = employee?.employee_id || ""; // NEW: Get employee_id

      return [
        staffName,
        role?.name || "",
        shift.date,
        shift.shift_code || "",
        shift.shift_period || "",
        shift.start_time || "", // Added fallback for potential null/undefined
        shift.end_time || "",   // Added fallback for potential null/undefined
        empId // NEW: Added EmpID
      ];
    });

    const csvContent = [
      headers.join(','),
      ...exportData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const filename = exportFormat === "powerbi"
      ? `powerbi_roster_${format(new Date(), 'yyyy-MM-dd')}.csv`
      : `schedule_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>
            {exportFormat === "powerbi" ? "Export for Power BI" : "Export Schedule"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Export Target</Label>
            <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="cursor-pointer">Excel (CSV)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="powerbi" id="powerbi" />
                <Label htmlFor="powerbi" className="cursor-pointer">Power BI</Label>
              </div>
            </RadioGroup>
          </div>

          {exportFormat === "powerbi" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              Note: Direct .pbix generation is not supported here. We’ll export a CSV that opens easily in Power BI Desktop.
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>Shifts to export:</strong> {shifts.length}
            </p>
            {dateRange && (
              <p className="text-sm text-slate-600 mt-1">
                From {format(dateRange.start, 'MMM d, yyyy')} to {format(dateRange.end, 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-teal-500 to-teal-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
