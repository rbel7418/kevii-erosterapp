import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function PermissionDialog({ open, onClose, item, onSave }) {
  const [admin, setAdmin] = React.useState(true);
  const [manager, setManager] = React.useState(true);
  const [staff, setStaff] = React.useState(true);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    setAdmin(item?.allow_admin !== false);
    setManager(item?.allow_manager !== false);
    setStaff(item?.allow_staff !== false);
    setNotes(item?.notes || "");
  }, [item]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{item?.resource_key || "Item"} Permissions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded border p-3 bg-slate-50">
            <Label>Admin</Label>
            <Switch checked={admin} onCheckedChange={setAdmin} />
          </div>
          <div className="flex items-center justify-between rounded border p-3 bg-slate-50">
            <Label>Manager</Label>
            <Switch checked={manager} onCheckedChange={setManager} />
          </div>
          <div className="flex items-center justify-between rounded border p-3 bg-slate-50">
            <Label>Staff</Label>
            <Switch checked={staff} onCheckedChange={setStaff} />
          </div>
          <div>
            <Label className="mb-1 block">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ allow_admin: admin, allow_manager: manager, allow_staff: staff, notes })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}