import React from "react";
import { Department } from "@/entities/Department";
import { Employee } from "@/entities/Employee";
import { withRetry, sleep } from "@/components/utils/withRetry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, X } from "lucide-react";

export default function DepartmentAdmin() {
  const [depts, setDepts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [savingId, setSavingId] = React.useState(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [counts, setCounts] = React.useState({ active: 0, inactive: 0, staffInInactive: 0 });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await withRetry(() => Department.list());
      setDepts(list || []);
      // compute staff in inactive depts (lightweight)
      const staff = await withRetry(() => Employee.list());
      const inactiveIds = new Set((list || []).filter(d => d.is_active === false).map(d => d.id));
      const staffInInactive = (staff || []).filter(e => e.department_id && inactiveIds.has(e.department_id)).length;
      const active = (list || []).filter(d => d.is_active !== false).length;
      const inactive = (list || []).filter(d => d.is_active === false).length;
      setCounts({ active, inactive, staffInInactive });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const toggleOne = async (row, next) => {
    setSavingId(row.id);
    try {
      await withRetry(() => Department.update(row.id, { is_active: next }));
      await load();
      try { window.dispatchEvent(new CustomEvent("department-activity-changed")); } catch {}
    } finally {
      setSavingId(null);
    }
  };

  const setAll = async (next) => {
    setBulkBusy(true);
    try {
      const current = depts.filter(d => (d.is_active !== false) !== next);
      for (const d of current) {
        await withRetry(() => Department.update(d.id, { is_active: next }));
        await sleep(100);
      }
      await load();
      try { window.dispatchEvent(new CustomEvent("department-activity-changed")); } catch {}
    } finally {
      setBulkBusy(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return depts;
    return depts.filter(d =>
      String(d.name || "").toLowerCase().includes(q) ||
      String(d.code || "").toLowerCase().includes(q)
    );
  }, [depts, filter]);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
            <p className="text-sm text-slate-600">Toggle department availability. Staff in inactive departments are hidden from selection lists.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={load} disabled={loading || bulkBusy} className="gap-2">
              <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setAll(true)} disabled={bulkBusy} className="gap-2">
              <Check className="w-4 h-4" />
              Activate all
            </Button>
            <Button variant="outline" onClick={() => setAll(false)} disabled={bulkBusy} className="gap-2">
              <X className="w-4 h-4" />
              Deactivate all
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <span>Department list</span>
                <Badge variant="outline" className="text-xs">{depts.length} total</Badge>
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">{counts.active} active</Badge>
                <Badge className="bg-amber-100 text-amber-700 text-xs">{counts.inactive} inactive</Badge>
                {counts.staffInInactive > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 text-xs">{counts.staffInInactive} staff in inactive</Badge>
                )}
              </div>
              <div className="w-72">
                <Input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="Search name or code…" className="h-9" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((d) => (
                <div key={d.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{d.name || "(no name)"}</div>
                    <div className="text-xs text-slate-500">Code: {d.code || "—"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{d.is_active === false ? "Inactive" : "Active"}</Badge>
                    <Switch
                      checked={d.is_active !== false}
                      onCheckedChange={(val) => toggleOne(d, Boolean(val))}
                      disabled={savingId === d.id || bulkBusy}
                    />
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No departments match your filter.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}