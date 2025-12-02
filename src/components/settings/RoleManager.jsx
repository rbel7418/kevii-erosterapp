
import React from "react";
import { Role } from "@/entities/Role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Save, Pencil, Trash2 } from "lucide-react";
import RoleDialog from "./RoleDialog"; // Added import

export default function RoleManager() {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({ name: "", hourly_rate: "", shift_rate: "" });
  const [showDialog, setShowDialog] = React.useState(false); // Added state
  const [dialogRole, setDialogRole] = React.useState(null); // Added state

  const load = async () => {
    setLoading(true);
    const rows = await Role.list();
    setList(rows || []);
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "",
        hourly_rate: editing.hourly_rate ?? "",
        shift_rate: editing.shift_rate ?? ""
      });
    } else {
      setForm({ name: "", hourly_rate: "", shift_rate: "" });
    }
  }, [editing]);

  const save = async () => {
    const payload = {
      name: form.name?.trim(),
      hourly_rate: form.hourly_rate === "" ? null : Number(form.hourly_rate),
      shift_rate: form.shift_rate === "" ? null : Number(form.shift_rate),
      // not exposing color or requires_qualification toggles here
    };
    if (editing?.id) {
      await Role.update(editing.id, payload);
    } else {
      await Role.create(payload);
    }
    setEditing(null);
    await load();
  };

  const remove = async (id) => {
    if (!id) return;
    if (!confirm("Delete this role?")) return;
    await Role.delete(id);
    if (editing?.id === id) setEditing(null);
    await load();
  };

  const openDialog = (r) => { // Added function
    setDialogRole(r || null);
    setShowDialog(true);
  };

  const saveDialog = async (payload) => { // Added function
    const data = {
      name: payload.name?.trim(),
      hourly_rate: payload.hourly_rate === "" ? null : Number(payload.hourly_rate),
      shift_rate: payload.shift_rate === "" ? null : Number(payload.shift_rate),
    };
    if (dialogRole?.id) {
      await Role.update(dialogRole.id, data);
    } else {
      await Role.create(data);
    }
    setShowDialog(false);
    setDialogRole(null);
    await load();
  };

  return (
    <Card className="shadow-sm border-slate-200 rounded-md">
      <CardHeader className="border-b py-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="w-4 h-4 text-teal-600" />
          Roles & Positions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Form without color picker */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <Label>Role Name</Label>
            <Input
              className="h-8"
              placeholder="e.g., Registered Nurse"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="md:col-span-3">
            <Label>Hourly Rate</Label>
            <Input
              className="h-8"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.hourly_rate}
              onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
            />
          </div>
          <div className="md:col-span-3">
            <Label>Shift Rate</Label>
            <Input
              className="h-8"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.shift_rate}
              onChange={(e) => setForm((f) => ({ ...f, shift_rate: e.target.value }))}
            />
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
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Loading…</div>
          ) : (list || []).length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No roles yet. Add one above.</div>
          ) : (
            list.map((r) => (
              <div key={r.id} className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <button // Modified element
                    className="font-medium text-slate-900 hover:underline text-left"
                    onClick={() => openDialog(r)}
                    title="Edit role"
                  >
                    {r.name}
                  </button>
                  <div className="text-xs text-slate-500">
                    {r.hourly_rate != null ? `£${r.hourly_rate}/h` : "—"} {r.shift_rate != null ? `• £${r.shift_rate}/shift` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)} className="h-8">
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(r.id)} className="h-8">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {showDialog && ( // Added RoleDialog component
        <RoleDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          role={dialogRole}
          onSave={saveDialog}
        />
      )}
    </Card>
  );
}
