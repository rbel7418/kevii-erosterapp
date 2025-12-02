
import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";

export default function EmployeeList({ employees, departments, roles, onEdit, isLoading }) {
  const getDepartmentName = (deptId) => {
    return departments.find(d => d.id === deptId)?.name || "N/A";
  };

  const getPrimaryRoleName = (emp) => {
    if (emp.job_title) return emp.job_title;
    if (Array.isArray(emp.role_ids) && emp.role_ids.length > 0) {
      const r = roles.find(ro => ro.id === emp.role_ids[0]);
      return r?.name || "";
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 border rounded-lg bg-white">
            <div className="h-5 w-40 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-64 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!employees.length) {
    return <div className="text-center py-12 text-slate-500">No team members found</div>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-slate-200">
      {/* make table fixed width and keep each row to a single line */}
      <Table className="table-fixed w-full text-sm">
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-28 whitespace-nowrap">EmployeeID</TableHead>
            <TableHead className="w-56 whitespace-nowrap">Full Name</TableHead>
            <TableHead className="w-32 whitespace-nowrap">Date of Join</TableHead>
            <TableHead className="w-60 whitespace-nowrap">Role</TableHead>
            <TableHead className="w-56 whitespace-nowrap">Department</TableHead>
            <TableHead className="w-60 whitespace-nowrap">LineManager</TableHead>
            <TableHead className="w-40 whitespace-nowrap">Contract Type</TableHead>
            <TableHead className="w-28 text-right whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map(emp => (
            <TableRow key={emp.id} className="align-middle">
              <TableCell className="font-medium whitespace-nowrap">{emp.employee_id || "-"}</TableCell>
              <TableCell className="whitespace-nowrap truncate max-w-[260px]">
                {emp.full_name || emp.user_email?.split("@")[0]}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {emp.date_of_join ? format(parseISO(emp.date_of_join), "yyyy-MM-dd") : "-"}
              </TableCell>
              <TableCell className="whitespace-nowrap truncate max-w-[320px]">{getPrimaryRoleName(emp) || "-"}</TableCell>
              <TableCell className="whitespace-nowrap truncate max-w-[260px]">{getDepartmentName(emp.department_id)}</TableCell>
              <TableCell className="whitespace-nowrap truncate max-w-[320px]">{emp.reports_to || "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{emp.contract_type || "-"}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="outline" size="sm" onClick={() => onEdit(emp)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
