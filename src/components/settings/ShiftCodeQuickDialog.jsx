import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ShiftCodeQuickDialog({ open, onClose, shiftCode, onSave }) {
  const [color, setColor] = React.useState("#0ea5a5");

  React.useEffect(() => {
    setColor(shiftCode?.color || "#0ea5a5");
  }, [shiftCode]);

  if (!shiftCode) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Shift Code: {shiftCode.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-slate-600">{shiftCode.descriptor || "—"}</div>
          <div className="flex items-center gap-3">
            <input type="color" className="h-9 w-12 rounded border" value={color} onChange={(e) => setColor(e.target.value)} />
            <div className="h-9 w-12 rounded border" style={{ backgroundColor: color }} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(color)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}