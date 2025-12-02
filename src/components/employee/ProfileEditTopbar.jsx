import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Undo2, Redo2, RotateCcw, XCircle } from "lucide-react";

export default function ProfileEditTopbar({
  onSave,
  onUndo,
  onDiscard,
  onReset
}) {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-2 flex items-center gap-2 sticky top-2 z-40">
      <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={onSave}>
        <Save className="w-4 h-4 mr-2" /> Save & close
      </Button>
      <Button size="sm" variant="outline" onClick={onUndo}>
        <RotateCcw className="w-4 h-4 mr-2" /> Undo
      </Button>
      <Button size="sm" variant="outline" onClick={onDiscard}>
        <XCircle className="w-4 h-4 mr-2" /> Discard changes
      </Button>
      <div className="ml-auto" />
      <Button size="sm" variant="outline" onClick={onReset}>
        Reset layout
      </Button>
    </div>
  );
}