
import React from "react";
import { Department } from "@/entities/Department";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Save, Pencil, Trash2 } from "lucide-react";
import DepartmentDialog from "./DepartmentDialog"; // Added import for DepartmentDialog

export default function DepartmentManager() {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({ name: "", code: "", is_active: true });
  const [togglingId, setTogglingId] = React.useState(null); // NEW: track toggle-in-progress

  // NEW: State for the dialog
  const [showDialog, setShowDialog] = React.useState(false);
  const [dialogDept, setDialogDept] = React.useState(null);

  const load = async () => {
    setLoading(true);
    const rows = await Department.list();
    setList(rows || []);
    setLoading(false);
  };

  React.useEffect(() => {load();}, []);

  React.useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "",
        code: editing.code || "",
        is_active: editing.is_active !== false
      });
    } else {
      setForm({ name: "", code: "", is_active: true });
    }
  }, [editing]);

  const save = async () => {
    const payload = {
      name: form.name?.trim(),
      code: form.code?.trim(),
      // intentionally not exposing color here
      is_active: !!form.is_active
    };
    if (editing?.id) {
      await Department.update(editing.id, payload);
    } else {
      await Department.create(payload);
    }
    setEditing(null);
    await load();
  };

  // NEW: quick toggle directly from the list
  const toggleActive = async (row, next) => {
    setTogglingId(row.id);
    await Department.update(row.id, { is_active: !!next });
    setTogglingId(null);
    await load();
    try {window.dispatchEvent(new CustomEvent("department-activity-changed", { detail: { id: row.id, is_active: !!next } }));} catch (e) {
      console.error("Failed to dispatch department-activity-changed event", e);
    }
  };

  const remove = async (id) => {
    if (!id) return;
    if (!confirm("Delete this department?")) return;
    await Department.delete(id);
    if (editing?.id === id) setEditing(null);
    await load();
  };

  // NEW: Functions for dialog management
  const openDialog = (d) => {
    setDialogDept(d || null);
    setShowDialog(true);
  };

  const saveDialog = async (payload) => {
    if (dialogDept?.id) {
      await Department.update(dialogDept.id, payload);
    } else {
      await Department.create(payload);
    }
    setShowDialog(false);
    setDialogDept(null);
    await load();
  };


  return (
    <Card className="shadow-sm border-slate-200 rounded-md">
      <CardHeader className="border-b py-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="w-4 h-4 text-teal-600" />
          Departments & Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="mx-24 p-3 space-y-3">
        {/* Form without color picker */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <Label>Department Name</Label>
            <Input
              className="h-8"
              placeholder="e.g., Emergency Ward"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

          </div>
          <div className="md:col-span-4">
            <Label>Code</Label>
            <Input
              className="h-8"
              placeholder="EW"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />

          </div>
          <div className="md:col-span-2 flex items-end">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: !!v }))} />
              <span className="text-sm text-slate-700">Active</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={!form.name?.trim()} className="gap-2 h-8">
            <Save className="w-4 h-4" />
            {editing ? "Update" : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(null)} disabled={!editing} className="h-8">
            New
          </Button>
        </div>

        {/* List */}
        <div className="divide-y rounded-md border bg-white">
          {loading ?
          <div className="p-4 text-sm text-slate-500">Loading…</div> :
          (list || []).length === 0 ?
          <div className="p-4 text-sm text-slate-500">No departments yet. Add one above.</div> :

          list.map((d) =>
          <div
            key={d.id} className="bg-sky-950 mr-64 ml-64 pt-2 pr-16 pb-2 pl-16 flex items-center justify-between gap-3 hover:bg-slate-50">


                <div className="min-w-0">
                  {/* Changed department name to a clickable button */}
                  <button
                className="font-medium text-slate-900 hover:underline text-left"
                onClick={() => openDialog(d)}
                title="Edit department">

                    {d.name}
                  </button>
                  <div className="text-xs text-slate-500">Code: {d.code || "—"}</div>
                  <div className="mt-1">
                    <Badge variant={d.is_active !== false ? "default" : "secondary"}>
                      {d.is_active !== false ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* NEW: Quick active/inactive toggle (like Employees tab) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Active</span>
                    <Switch
                  checked={d.is_active !== false}
                  onCheckedChange={(v) => toggleActive(d, v)}
                  disabled={togglingId === d.id} />

                  </div>

                  {/* Existing Edit button, still populates inline form */}
                  <Button size="sm" variant="outline" onClick={() => setEditing(d)} className="bg-red-700 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(d.id)} className="h-8">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
          )
          }
        </div>
      </CardContent>

      {/* NEW: Department Dialog component */}
      {showDialog &&
      <DepartmentDialog
        open={showDialog}
        onClose={() => {setShowDialog(false);setDialogDept(null);}} // Ensure dialogDept is cleared on close
        department={dialogDept}
        onSave={saveDialog} />

      }
    </Card>);

}