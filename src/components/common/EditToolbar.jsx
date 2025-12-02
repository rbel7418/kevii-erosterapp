import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
// Removed: PalettePicker import

export default function EditToolbar({
  widgets = [],
  api,
  currentPalette,      // kept for compatibility but no longer used
  onPaletteChange,     // kept for compatibility but no longer used
  onResetLayout,
  onExitEdit
}) {
  const [selectedId, setSelectedId] = React.useState(widgets[0]?.id || "");
  const [title, setTitle] = React.useState("");
  const [size, setSize] = React.useState("md");

  React.useEffect(() => {
    if (!selectedId || !api?.getState) return;
    const st = api.getState(selectedId) || { size: "md", title: "" };
    setTitle(st.title || (widgets.find(w => w.id === selectedId)?.title || ""));
    setSize(st.size || "md");
  }, [selectedId, api, widgets]);

  const applyTitle = () => {
    if (!api?.setState || !selectedId) return;
    const cur = api.getState(selectedId) || {};
    api.setState(selectedId, { ...cur, title: title || "" });
  };

  const applySize = () => {
    if (!api?.setState || !selectedId) return;
    const cur = api.getState(selectedId) || {};
    api.setState(selectedId, { ...cur, size });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-center gap-2">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-56 h-9">
            <SelectValue placeholder="Select widget" />
          </SelectTrigger>
          <SelectContent>
            {widgets.map(w => (
              <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Widget title"
          className="w-56 h-9"
        />
        <Button size="sm" onClick={applyTitle} className="h-9">Rename</Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={size} onValueChange={setSize}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={applySize} className="h-9">Resize</Button>
      </div>

      {/* Removed palette picker controls */}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onResetLayout} className="h-9">Reset layout</Button>
        <Button size="sm" onClick={onExitEdit} className="h-9">Done</Button>
      </div>
    </div>
  );
}