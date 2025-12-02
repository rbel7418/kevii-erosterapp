import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function DepartmentDialog({ open, onClose, department, onSave }) {
  const [form, setForm] = React.useState({ name: "", code: "", is_active: true });

  React.useEffect(() => {
    setForm({
      name: department?.name || "",
      code: department?.code || "",
      is_active: department?.is_active !== false
    });
  }, [department]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{department?.id ? "Edit Department" : "New Department"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between rounded border p-3 bg-slate-50">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-xs text-slate-500">Inactive departments won&apos;t show in pickers</div>
            </div>
            <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: !!v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}