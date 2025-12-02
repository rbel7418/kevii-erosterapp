import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RoleDialog({ open, onClose, role, onSave }) {
  const [form, setForm] = React.useState({ name: "", hourly_rate: "", shift_rate: "" });

  React.useEffect(() => {
    setForm({
      name: role?.name || "",
      hourly_rate: role?.hourly_rate ?? "",
      shift_rate: role?.shift_rate ?? ""
    });
  }, [role]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{role?.id ? "Edit Role" : "New Role"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Role Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hourly Rate</Label>
              <Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))} />
            </div>
            <div>
              <Label>Shift Rate</Label>
              <Input type="number" step="0.01" value={form.shift_rate} onChange={(e) => setForm((f) => ({ ...f, shift_rate: e.target.value }))} />
            </div>
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