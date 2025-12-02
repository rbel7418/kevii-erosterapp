
import React from "react";
import { AppPermission } from "@/entities/AppPermission";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Save, ShieldAlert } from "lucide-react";
import PermissionDialog from "@/components/settings/PermissionDialog";

const KNOWN_PAGES = [
  // Keep in sync with navigation and existing pages
  "Dashboard","RotaGrid","Settings","Reports","Utilities","ActivityKPIs","InteractiveBI","DesignPreview",
  "UserAdmin","AdminPagesPermissions","AdminEmployeePermissions","AdminCommandCenter","InvitePreview","Parameters",
  "OpenShifts","Team","LeaveRequests","ShiftMap","EmployeeSchedule","TabularRoster","DepartmentMonth","Attendance",
  "Availability","Branding","DepartmentAdmin"
];

export default function AdminPagesPermissions() {
  const [me, setMe] = React.useState(null);
  const [rows, setRows] = React.useState([]);
  const [filter, setFilter] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogItem, setDialogItem] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      const u = await User.me().catch(() => null);
      setMe(u);
      await load();
    })();
  }, []);

  const isAdmin = me?.role === "admin";

  const openDialog = (row) => {
    setDialogItem(row);
    setDialogOpen(true);
  };

  const saveDialog = async (patch) => {
    if (!dialogItem) return;
    const next = { ...dialogItem, ...patch };
    setRows(prev => prev.map(r => r.id === dialogItem.id ? next : r));
    await AppPermission.update(dialogItem.id, patch);
    setDialogOpen(false);
    setDialogItem(null);
  };

  const load = async () => {
    const list = await AppPermission.list();
    setRows(list || []);
  };

  const syncDefaults = async () => {
    setBusy(true);
    try {
      const existing = await AppPermission.list();
      const existingKeys = new Set((existing || []).map(r => `${r.resource_type}:${r.resource_key}`));
      const toCreate = [];
      KNOWN_PAGES.forEach(p => {
        const key = `page:${p}`;
        if (!existingKeys.has(key)) {
          toCreate.push({
            resource_key: p,
            resource_type: "page",
            allow_admin: true,
            allow_manager: true,
            allow_staff: p === "AdminPagesPermissions" || p === "AdminEmployeePermissions" || p === "UserAdmin" || p === "AdminCommandCenter" ? false : true,
            notes: ""
          });
        }
      });
      if (toCreate.length > 0) {
        await AppPermission.bulkCreate(toCreate);
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const updateRow = async (row, patch) => {
    const next = { ...row, ...patch };
    setRows(prev => prev.map(r => r.id === row.id ? next : r));
    await AppPermission.update(row.id, patch);
  };

  const addCustom = async () => {
    const name = prompt("Enter a custom page/component key (e.g., PageName or component-id):");
    if (!name) return;
    const type = (prompt("Type 'page' or 'component':", "page") || "page").toLowerCase() === "component" ? "component" : "page";
    const created = await AppPermission.create({
      resource_key: name,
      resource_type: type,
      allow_admin: true,
      allow_manager: true,
      allow_staff: true
    });
    setRows(prev => [created, ...prev]);
  };

  const filtered = rows.filter(r => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return String(r.resource_key || "").toLowerCase().includes(q) || String(r.resource_type || "").toLowerCase().includes(q);
  });

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8">
        <Card className="max-w-xl mx-auto">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-600" />Restricted</CardTitle></CardHeader>
          <CardContent className="text-slate-700">Admins only.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pages & Components Permissions</h1>
          <p className="text-sm text-slate-600">Toggle access per role. Use Sync to auto-add known pages.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-56" />
          <Button variant="outline" onClick={syncDefaults} disabled={busy} className="gap-2">
            <RefreshCw className={busy ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> Sync defaults
          </Button>
          <Button variant="outline" onClick={addCustom} className="gap-2">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base flex items-center gap-2">
            Permission matrix
            <Badge variant="outline" className="text-xs">{rows.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold text-slate-500">
            <div className="col-span-6">Component / Page</div>
            <div className="col-span-2 text-center">Manager</div>
            <div className="col-span-2 text-center">Staff</div>
            <div className="col-span-2 text-center">Admin</div>
          </div>
          <div className="divide-y">
            {filtered.map(row => (
              <div key={row.id} className="grid grid-cols-12 items-center px-4 py-2 hover:bg-slate-50">
                <div className="col-span-6">
                  <button
                    className="font-medium text-slate-900 hover:underline text-left"
                    onClick={() => openDialog(row)}
                    title="Edit permissions"
                  >
                    {row.resource_key}
                  </button>
                  <div className="text-xs text-slate-500">{row.resource_type}</div>
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  <Checkbox checked={!!row.allow_manager} onCheckedChange={(v) => updateRow(row, { allow_manager: !!v })} />
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  <Checkbox checked={!!row.allow_staff} onCheckedChange={(v) => updateRow(row, { allow_staff: !!v })} />
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  <Checkbox checked={!!row.allow_admin} onCheckedChange={(v) => updateRow(row, { allow_admin: !!v })} />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-500">No items. Click Sync defaults to add known pages.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <PermissionDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          item={dialogItem}
          onSave={saveDialog}
        />
      )}
    </div>
  );
}
