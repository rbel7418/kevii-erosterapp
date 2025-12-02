import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function BulkEmailUpdate() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const runUpdate = async () => {
    if (!confirm("This will update emails for ~100 employees based on the provided list. Continue?")) return;
    
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke("bulkUpdateEmails");
      setResult(data);
    } catch (error) {
      alert("Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Email Update Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
            This tool matches employees by name and updates their email address to the correct format (e.g. NameSurname@kingedwardvii.co.uk).
            <br/>It handles approx 100 predefined names from the request.
          </div>

          <Button onClick={runUpdate} disabled={loading} className="w-full bg-sky-600 hover:bg-sky-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            {loading ? "Processing Updates..." : "Run Bulk Update"}
          </Button>

          {result && (
            <div className="space-y-4 border-t pt-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-3 rounded border border-green-100 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.updated}</div>
                  <div className="text-xs text-green-600">Updated</div>
                </div>
                <div className="bg-amber-50 p-3 rounded border border-amber-100 text-center">
                  <div className="text-2xl font-bold text-amber-700">{result.notFound}</div>
                  <div className="text-xs text-amber-600">Not Found</div>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                   <div className="text-2xl font-bold text-slate-700">{result.failed}</div>
                   <div className="text-xs text-slate-600">Failed</div>
                </div>
              </div>

              {result.notFoundNames?.length > 0 && (
                <div className="text-sm">
                  <div className="font-semibold text-amber-700 mb-2">Names not found in database:</div>
                  <div className="bg-slate-100 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                    {result.notFoundNames.join("\n")}
                  </div>
                </div>
              )}
              
              {result.details?.length > 0 && (
                <div className="text-sm">
                  <div className="font-semibold text-green-700 mb-2">Updated:</div>
                  <div className="bg-slate-100 p-3 rounded text-xs font-mono max-h-60 overflow-y-auto">
                     {result.details.map((d, i) => (
                       <div key={i} className="border-b border-slate-200 last:border-0 py-1">
                         {d.name}: {d.from} → {d.to}
                       </div>
                     ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}