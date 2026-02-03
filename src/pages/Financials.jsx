import React from "react";
import { format, addDays } from "date-fns";
import { FinancialViews, normalizeToPeriodStart, getPeriodEnd } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, FileText, AlertCircle } from "lucide-react";

export default function Financials() {
  const [periodStart, setPeriodStart] = React.useState(() => normalizeToPeriodStart(new Date()));
  const [wardData, setWardData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const periodEnd = React.useMemo(() => getPeriodEnd(periodStart), [periodStart]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await FinancialViews.getWardPeriodCumulative(periodStart);
      if (result.success) {
        setWardData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [periodStart]);

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

  const grandTotals = React.useMemo(() => {
    if (!wardData.length) return null;
    return {
      headcount: wardData.reduce((sum, w) => sum + (w.headcount || 0), 0),
      total_rostered_hours: wardData.reduce((sum, w) => sum + (w.total_rostered_hours || 0), 0),
      total_actual_hours: wardData.reduce((sum, w) => sum + (w.total_actual_hours || 0), 0),
      variance_hours: wardData.reduce((sum, w) => sum + (w.variance_hours || 0), 0),
      ho_debt_hours: wardData.reduce((sum, w) => sum + (w.ho_debt_hours || 0), 0),
      pb_worked_hours: wardData.reduce((sum, w) => sum + (w.pb_worked_hours || 0), 0),
      period_toil_net: wardData.reduce((sum, w) => sum + (w.period_toil_net || 0), 0),
      opening_toil_hours: wardData.reduce((sum, w) => sum + (w.opening_toil_hours || 0), 0),
      closing_toil_hours: wardData.reduce((sum, w) => sum + (w.closing_toil_hours || 0), 0)
    };
  }, [wardData]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ward Financials</h1>
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error loading financial data</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : wardData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No financial data for this period</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left p-3 font-semibold">Ward</th>
                  <th className="text-right p-3 font-semibold">Staff</th>
                  <th className="text-right p-3 font-semibold">Rostered</th>
                  <th className="text-right p-3 font-semibold">Actual</th>
                  <th className="text-right p-3 font-semibold">Variance</th>
                  <th className="text-right p-3 font-semibold">HO (Debt)</th>
                  <th className="text-right p-3 font-semibold">PB (Worked)</th>
                  <th className="text-right p-3 font-semibold">Period TOIL</th>
                  <th className="text-right p-3 font-semibold">Opening TOIL</th>
                  <th className="text-right p-3 font-semibold">Closing TOIL</th>
                </tr>
              </thead>
              <tbody>
                {wardData.map((ward, idx) => (
                  <tr key={ward.ward || idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{ward.ward}</td>
                    <td className="p-3 text-right">{ward.headcount || 0}</td>
                    <td className="p-3 text-right">{formatHours(ward.total_rostered_hours)}</td>
                    <td className="p-3 text-right">{formatHours(ward.total_actual_hours)}</td>
                    <td className={`p-3 text-right font-medium ${(ward.variance_hours || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatHours(ward.variance_hours)}
                    </td>
                    <td className="p-3 text-right text-orange-600">{formatHours(ward.ho_debt_hours)}</td>
                    <td className="p-3 text-right text-blue-600">{formatHours(ward.pb_worked_hours)}</td>
                    <td className={`p-3 text-right font-medium ${(ward.period_toil_net || 0) >= 0 ? 'text-amber-600' : 'text-teal-600'}`}>
                      {formatHours(ward.period_toil_net)}
                    </td>
                    <td className="p-3 text-right">{formatHours(ward.opening_toil_hours)}</td>
                    <td className={`p-3 text-right font-bold ${(ward.closing_toil_hours || 0) >= 0 ? 'text-amber-700' : 'text-teal-700'}`}>
                      {formatHours(ward.closing_toil_hours)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {grandTotals && (
                <tfoot>
                  <tr className="bg-gray-200 font-bold">
                    <td className="p-3">TOTAL</td>
                    <td className="p-3 text-right">{grandTotals.headcount}</td>
                    <td className="p-3 text-right">{formatHours(grandTotals.total_rostered_hours)}</td>
                    <td className="p-3 text-right">{formatHours(grandTotals.total_actual_hours)}</td>
                    <td className={`p-3 text-right ${grandTotals.variance_hours >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatHours(grandTotals.variance_hours)}
                    </td>
                    <td className="p-3 text-right text-orange-700">{formatHours(grandTotals.ho_debt_hours)}</td>
                    <td className="p-3 text-right text-blue-700">{formatHours(grandTotals.pb_worked_hours)}</td>
                    <td className={`p-3 text-right ${grandTotals.period_toil_net >= 0 ? 'text-amber-700' : 'text-teal-700'}`}>
                      {formatHours(grandTotals.period_toil_net)}
                    </td>
                    <td className="p-3 text-right">{formatHours(grandTotals.opening_toil_hours)}</td>
                    <td className={`p-3 text-right ${grandTotals.closing_toil_hours >= 0 ? 'text-amber-800' : 'text-teal-800'}`}>
                      {formatHours(grandTotals.closing_toil_hours)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-2">Hours Owed (HO)</h3>
              <p className="text-sm text-orange-700">Staff sent home but paid - creates a debt they must work back</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">{formatHours(grandTotals?.ho_debt_hours)} hrs</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Paid Back (PB)</h3>
              <p className="text-sm text-blue-700">Extra shifts worked to repay HO debt</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{formatHours(grandTotals?.pb_worked_hours)} hrs</p>
            </div>
            <div className={`rounded-lg p-4 border ${(grandTotals?.closing_toil_hours || 0) >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'}`}>
              <h3 className={`font-semibold mb-2 ${(grandTotals?.closing_toil_hours || 0) >= 0 ? 'text-amber-800' : 'text-teal-800'}`}>
                Closing TOIL Balance
              </h3>
              <p className={`text-sm ${(grandTotals?.closing_toil_hours || 0) >= 0 ? 'text-amber-700' : 'text-teal-700'}`}>
                {(grandTotals?.closing_toil_hours || 0) >= 0 ? 'Staff owe hours (debt)' : 'Hospital owes staff (credit)'}
              </p>
              <p className={`text-2xl font-bold mt-2 ${(grandTotals?.closing_toil_hours || 0) >= 0 ? 'text-amber-600' : 'text-teal-600'}`}>
                {formatHours(grandTotals?.closing_toil_hours)} hrs
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
