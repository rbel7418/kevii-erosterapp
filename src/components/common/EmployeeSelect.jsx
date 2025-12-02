import React from "react";
import { Employee } from "@/entities/Employee";
import { Department } from "@/entities/Department";
import { withRetry } from "@/components/utils/withRetry";
import { emailPrefix } from "@/components/utils/strings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EmployeeSelect({
  value,
  onChange,
  placeholder = "Select staff",
  disabled = false,
  className = "",
  allowUnassigned = false, // shows an "Unassigned" option
  departmentScopeId = null, // if provided, restrict to this department id
  filterByRoles = null, // optional array of role ids
  excludeIds = [], // optional array of employee ids to exclude
  includeInactiveDepts = false, // override: include staff from inactive departments
  includeInactiveEmployees = false, // override: include inactive staff
}) {
  const [employees, setEmployees] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [emps, depts] = await Promise.all([
        withRetry(() => Employee.list()),
        withRetry(() => Department.list()),
      ]);
      setEmployees(emps || []);
      setDepartments(depts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Live refresh when admin toggles department active/inactive or employee active status elsewhere
  React.useEffect(() => {
    const refetch = () => load();
    window.addEventListener("department-activity-changed", refetch);
    window.addEventListener("employee-activity-updated", refetch);
    return () => {
      window.removeEventListener("department-activity-changed", refetch);
      window.removeEventListener("employee-activity-updated", refetch);
    };
  }, [load]);

  const activeDeptIds = React.useMemo(() => {
    if (includeInactiveDepts) return null; // don't filter by dept activity when override is on
    const set = new Set((departments || []).filter(d => d.is_active !== false).map(d => d.id));
    return set;
  }, [departments, includeInactiveDepts]);

  const visibleEmployees = React.useMemo(() => {
    let list = employees || [];

    // 1) Filter inactive employees unless override enabled
    if (!includeInactiveEmployees) {
      list = list.filter(e => e.is_active !== false);
    }

    // 2) Filter by active departments unless override enabled
    if (activeDeptIds) {
      list = list.filter(e => !e.department_id || activeDeptIds.has(e.department_id));
    }

    // 3) Optional: restrict to a specific department scope
    if (departmentScopeId) {
      list = list.filter(e => e.department_id === departmentScopeId);
    }

    // 4) Optional: filter by roles
    if (Array.isArray(filterByRoles) && filterByRoles.length > 0) {
      const need = new Set(filterByRoles);
      list = list.filter(e => Array.isArray(e.role_ids) && e.role_ids.some(r => need.has(r)));
    }

    // 5) Optional: exclude certain employees
    if (Array.isArray(excludeIds) && excludeIds.length > 0) {
      const ex = new Set(excludeIds);
      list = list.filter(e => !ex.has(e.id));
    }

    // 6) Sort by name/email for stable UX
    list = list.slice().sort((a, b) => {
      const an = (a.full_name || emailPrefix(a.user_email || "") || "").toLowerCase();
      const bn = (b.full_name || emailPrefix(b.user_email || "") || "").toLowerCase();
      return an.localeCompare(bn);
    });

    return list;
  }, [employees, activeDeptIds, departmentScopeId, filterByRoles, excludeIds, includeInactiveEmployees]);

  const labelFor = (e) => e.full_name || emailPrefix(e.user_email) || "Unnamed";

  return (
    <Select
      value={value || (allowUnassigned && value === null ? "" : value)}
      onValueChange={(v) => onChange?.(v || null)}
      disabled={disabled || loading}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowUnassigned && <SelectItem value={null}>Unassigned</SelectItem>}
        {visibleEmployees.map(e => (
          <SelectItem key={e.id} value={e.id}>
            {labelFor(e)}
          </SelectItem>
        ))}
        {!loading && visibleEmployees.length === 0 && (
          <div className="px-3 py-2 text-xs text-slate-500">
            No staff available {activeDeptIds ? "(inactive departments hidden)" : ""}.
          </div>
        )}
      </SelectContent>
    </Select>
  );
}