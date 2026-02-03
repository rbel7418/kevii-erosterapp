import React from "react";
import { format, addDays } from "date-fns";
import { FinancialViews, normalizeToPeriodStart, getPeriodEnd } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Users, AlertCircle, Filter } from "lucide-react";

export default function FinancialsLedgers() {
  const [periodStart, setPeriodStart] = React.useState(() => normalizeToPeriodStart(new Date()));
  const [staffData, setStaffData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [selectedWard, setSelectedWard] = React.useState(null);
  const [sortField, setSortField] = React.useState("name");
  const [sortDir, setSortDir] = React.useState("asc");

  const periodEnd = React.useMemo(() => getPeriodEnd(periodStart), [periodStart]);
  const wards = ["ECU", "WARD 2", "WARD 3"];

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await FinancialViews.getStaffCumulative(periodStart, selectedWard);
      if (result.success) {
        setStaffData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [periodStart, selectedWard]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const navigatePeriod = (direction) => {
    const current = new Date(periodStart);
    const newDate = addDays(current, direction * 28);
    setPeriodStart(normalizeToPeriodStart(newDate));
  };

  const formatHours = (val) => {
    if (val == null || isNaN(val)) return "0.0";
    return Number(val).toFixed(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    const sorted = [...staffData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [staffData, sortField, sortDir]);

  const SortHeader = ({ field, label }) => (
    <th
      className="text-right p-3 font-semibold cursor-pointer hover:bg-gray-200 select-none"
      onClick={() => handleSort(field)}
    >
      {label}
      {sortField === field && (
        <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Financial Ledgers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Period: {format(new Date(periodStart), "dd MMM yyyy")} - {format(new Date(periodEnd), "dd MMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigatePeriod(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigatePeriod(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Ward:</span>
        <Button
          variant={selectedWard === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedWard(null)}
        >
          All
        </Button>
        {wards.map((ward) => (
          <Button
            key={ward}
            variant={selectedWard === ward ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedWard(ward)}
          >
            {ward}
          </Button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error loading staff data</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : sortedData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No staff data for this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg shadow text-sm">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="text-left p-3 font-semibold cursor-pointer hover:bg-gray-200" onClick={() => handleSort("name")}>
                  Name {sortField === "name" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th className="text-left p-3 font-semibold cursor-pointer hover:bg-gray-200" onClick={() => handleSort("department")}>
                  Ward {sortField === "department" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <SortHeader field="rostered_to_ward_hours" label="Rostered" />
                <SortHeader field="actual_hours" label="Actual" />
                <SortHeader field="sick_hours" label="Sick" />
                <SortHeader field="unpl_hours" label="Unpaid" />
                <SortHeader field="ho_hours" label="HO" />
                <SortHeader field="pb_hours" label="PB" />
                <SortHeader field="opening_toil_balance" label="Open TOIL" />
                <SortHeader field="period_toil_net" label="Period" />
                <SortHeader field="cumulative_toil_balance" label="Close TOIL" />
              </tr>
            </thead>
            <tbody>
              {sortedData.map((staff, idx) => (
                <tr key={staff.employee_id || idx} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{staff.name || staff.employee_id}</td>
                  <td className="p-3">{staff.department}</td>
                  <td className="p-3 text-right">{formatHours(staff.rostered_to_ward_hours)}</td>
                  <td className="p-3 text-right">{formatHours(staff.actual_hours)}</td>
                  <td className="p-3 text-right text-orange-600">{formatHours(staff.sick_hours)}</td>
                  <td className="p-3 text-right text-red-600">{formatHours(staff.unpl_hours)}</td>
                  <td className="p-3 text-right text-amber-600">{formatHours(staff.ho_hours)}</td>
                  <td className="p-3 text-right text-blue-600">{formatHours(staff.pb_hours)}</td>
                  <td className="p-3 text-right">{formatHours(staff.opening_toil_balance)}</td>
                  <td className={`p-3 text-right font-medium ${(staff.period_toil_net || 0) >= 0 ? 'text-amber-600' : 'text-teal-600'}`}>
                    {formatHours(staff.period_toil_net)}
                  </td>
                  <td className={`p-3 text-right font-bold ${(staff.cumulative_toil_balance || 0) >= 0 ? 'text-amber-700' : 'text-teal-700'}`}>
                    {formatHours(staff.cumulative_toil_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-gray-500 mt-3">{sortedData.length} staff members</p>
        </div>
      )}

      <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm">
        <h3 className="font-semibold mb-2">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><span className="text-orange-600 font-medium">Sick:</span> Hours lost to sickness (paid)</div>
          <div><span className="text-red-600 font-medium">Unpaid:</span> Leave requiring payroll deduction</div>
          <div><span className="text-amber-600 font-medium">HO:</span> Hours Owed (sent home, debt)</div>
          <div><span className="text-blue-600 font-medium">PB:</span> Paid Back (repaying HO debt)</div>
        </div>
        <div className="mt-2">
          <span className="font-medium">TOIL Balance:</span>
          <span className="text-amber-700 ml-2">Positive = staff owe hours</span>
          <span className="text-teal-700 ml-4">Negative = hospital owes staff</span>
        </div>
      </div>
    </div>
  );
}
