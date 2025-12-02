import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Maximize2, Minimize2, Crop, ChevronDown, GripVertical, RefreshCw, CheckCircle2 } from "lucide-react";
import { Employee } from "@/entities/Employee";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function ProfileEditToolbar({
  widgets = [],
  api,
  selectedId,
  onSelect,
  employee,
  onEmployeeChange,
  onClose,
  onResetLayout
}) {
  const items = widgets.map(w => ({ id: w.id, title: w.title }));
  const sel = selectedId || (items[0]?.id || null);
  const st = api?.getState ? api.getState(sel) : { size: "md", collapsed: false, width: 12 };

  // Local state for renaming and custom height
  const [title, setTitle] = React.useState(st?.title ?? "");
  const [heightPx, setHeightPx] = React.useState(Number(st?.heightPx || 0));

  React.useEffect(() => {
    // Sync when selection changes
    const cur = api?.getState ? api.getState(sel) : null;
    setTitle(cur?.title ?? "");
    setHeightPx(Number(cur?.heightPx || 0));
  }, [sel, api]);

  const changeWidth = (delta) => {
    if (!api || !sel) return;
    const cur = api.getState(sel);
    const w = clamp(Number(cur?.width || 12) + delta, 3, 12);
    api.setState(sel, { ...cur, width: w });
  };

  const setSize = (size) => {
    if (!api || !sel) return;
    const cur = api.getState(sel);
    api.setState(sel, { ...cur, size });
  };

  const toggleCollapse = () => {
    if (!api || !sel) return;
    const cur = api.getState(sel);
    api.setState(sel, { ...cur, collapsed: !cur?.collapsed });
  };

  const applyHeight = (v) => {
    if (!api || !sel) return;
    const cur = api.getState(sel);
    api.setState(sel, { ...cur, heightPx: v });
  };

  const applyTitle = () => {
    if (!api || !sel) return;
    const cur = api.getState(sel);
    api.setState(sel, { ...cur, title: title || undefined });
  };

  // Photo crop controls (for identity widget mainly, but available generally)
  const [zoom, setZoom] = React.useState(Number(employee?.photo_zoom || 1));
  const [offX, setOffX] = React.useState(Number(employee?.photo_offset_x || 0));
  const [offY, setOffY] = React.useState(Number(employee?.photo_offset_y || 0));
  const [savingPhoto, setSavingPhoto] = React.useState(false);
  const canSavePhoto = !!employee?.id;

  React.useEffect(() => {
    setZoom(Number(employee?.photo_zoom || 1));
    setOffX(Number(employee?.photo_offset_x || 0));
    setOffY(Number(employee?.photo_offset_y || 0));
  }, [employee?.photo_zoom, employee?.photo_offset_x, employee?.photo_offset_y, employee?.id]);

  const savePhotoCrop = async () => {
    if (!canSavePhoto) return;
    setSavingPhoto(true);
    try {
      const payload = {
        photo_zoom: clamp(zoom, 1, 2.5),
        photo_offset_x: clamp(offX, -100, 100),
        photo_offset_y: clamp(offY, -100, 100)
      };
      await Employee.update(employee.id, payload);
      onEmployeeChange?.({ ...employee, ...payload });
    } finally {
      setSavingPhoto(false);
    }
  };

  const resetPhotoCrop = async () => {
    if (!canSavePhoto) return;
    setSavingPhoto(true);
    try {
      const payload = { photo_zoom: 1, photo_offset_x: 0, photo_offset_y: 0 };
      await Employee.update(employee.id, payload);
      setZoom(1); setOffX(0); setOffY(0);
      onEmployeeChange?.({ ...employee, ...payload });
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <div className="bg-white border border-blue-100 rounded-xl shadow-md p-3">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Selection and basic actions */}
        <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-7 gap-3">
          <div className="col-span-2">
            <div className="text-[11px] text-slate-500 mb-1">Selected widget</div>
            <Select value={sel || ""} onValueChange={(v) => onSelect?.(v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {items.map(it => (
                  <SelectItem key={it.id} value={it.id}>{it.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <div className="text-[11px] text-slate-500 mb-1">Title</div>
            <div className="flex gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Override title…" className="h-8" />
              <Button variant="outline" className="h-8" onClick={applyTitle}>
                Apply
              </Button>
            </div>
          </div>

          <div className="col-span-1">
            <div className="text-[11px] text-slate-500 mb-1">Width</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeWidth(-1)}>
                <Minimize2 className="w-4 h-4" />
              </Button>
              <div className="text-sm font-semibold w-10 text-center">{st?.width ?? 12}</div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeWidth(1)}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="col-span-1">
            <div className="text-[11px] text-slate-500 mb-1">Size</div>
            <div className="flex gap-1">
              {["sm","md","lg"].map(s => (
                <Button key={s} variant={st?.size === s ? "default" : "outline"} size="sm" className="h-8 px-2"
                  onClick={() => setSize(s)}>
                  {s.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <div className="col-span-1">
            <div className="text-[11px] text-slate-500 mb-1">Collapse</div>
            <Button variant="outline" className="h-8 w-full" onClick={toggleCollapse}>
              {st?.collapsed ? "Expand" : "Collapse"}
            </Button>
          </div>

          <div className="col-span-7">
            <div className="text-[11px] text-slate-500 mb-1">Custom height {heightPx ? `(${heightPx}px)` : "(auto by size)"}</div>
            <div className="flex items-center gap-3">
              <Slider
                value={[heightPx || 0]}
                min={0}
                max={800}
                step={20}
                onValueChange={(v) => setHeightPx(v[0])}
                className="w-full"
              />
              <Button variant="outline" className="h-8" onClick={() => { setHeightPx(0); applyHeight(0); }}>
                Auto
              </Button>
              <Button className="h-8 bg-sky-600 hover:bg-sky-700" onClick={() => applyHeight(heightPx || 0)}>
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Photo crop tools */}
        <div className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-slate-200 pl-0 lg:pl-3 pt-3 lg:pt-0">
          <div className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Crop className="w-4 h-4 text-sky-600" /> Photo crop
          </div>
          <div className="grid grid-cols-3 gap-3 items-center">
            <div className="col-span-1 text-[11px] text-slate-500">Zoom</div>
            <div className="col-span-2">
              <Slider value={[zoom]} min={1} max={2.5} step={0.05} onValueChange={(v) => setZoom(v[0])} />
            </div>

            <div className="col-span-1 text-[11px] text-slate-500">Offset X</div>
            <div className="col-span-2">
              <Slider value={[offX]} min={-100} max={100} step={1} onValueChange={(v) => setOffX(v[0])} />
            </div>

            <div className="col-span-1 text-[11px] text-slate-500">Offset Y</div>
            <div className="col-span-2">
              <Slider value={[offY]} min={-100} max={100} step={1} onValueChange={(v) => setOffY(v[0])} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={savePhotoCrop} disabled={!canSavePhoto || savingPhoto} className="bg-sky-600 hover:bg-sky-700">
              {savingPhoto ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save crop
            </Button>
            <Button variant="outline" onClick={resetPhotoCrop} disabled={!canSavePhoto || savingPhoto}>
              Reset
            </Button>
          </div>
        </div>

        {/* Done / Reset */}
        <div className="w-full lg:w-auto flex items-center gap-2 lg:pl-2">
          <Button variant="outline" onClick={onResetLayout}>Reset layout</Button>
          <Button className="bg-sky-600 hover:bg-sky-700" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}