import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function UserAccessDialog({ open, onClose, user, canEdit, initialLevel, onSave }) {
  const [level, setLevel] = React.useState(initialLevel || "staff");

  React.useEffect(() => {
    setLevel(initialLevel || "staff");
  }, [initialLevel]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>User Access</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="text-sm font-medium">{user?.full_name || user?.email}</div>
          <div className="text-xs text-slate-500">{user?.email}</div>
          <div className="pt-2">
            <Select value={level} onValueChange={setLevel} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Access level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => onSave(level)} disabled={!canEdit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}