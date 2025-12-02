
import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CardShell from "./CardShell";

function loadState(key, items) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { order: items.map(i => i.id), states: {} };
    const parsed = JSON.parse(raw);
    return {
      order: Array.isArray(parsed.order) ? parsed.order : items.map(i => i.id),
      states: parsed.states || {}
    };
  } catch {
    return { order: items.map(i => i.id), states: {} };
  }
}

function saveState(key, order, states) {
  localStorage.setItem(key, JSON.stringify({ order, states }));
}

export default function ReorderableArea({
  storageKey,
  items,
  editMode = false,
  registerApi,
  layoutMode = "stack", // "stack" | "grid"
  selectedId,
  onSelect
}) {
  const map = React.useMemo(() => {
    const m = {};
    items.forEach(it => { m[it.id] = it; });
    return m;
  }, [items]);

  const [order, setOrder] = React.useState(() => loadState(storageKey, items).order);
  const [states, setStates] = React.useState(() => loadState(storageKey, items).states);

  React.useEffect(() => {
    const known = new Set(order);
    const missing = items.map(i => i.id).filter(id => !known.has(id));
    if (missing.length) {
      const next = [...order, ...missing];
      setOrder(next);
      saveState(storageKey, next, states);
    }
  }, [items, order, states, storageKey]);

  // Track resizing gesture
  const containerRef = React.useRef(null);
  const [resizing, setResizing] = React.useState(null); // {id, side, startX, startY, startCols, startHeight}

  // NEW: ref to safely access api inside handlers before memo is created in code order
  const apiRef = React.useRef(null);

  // Utility: compute column width (12-col grid on lg+)
  const getColumnWidth = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    return rect.width / 12;
  }, []);

  // Begin resize on mousedown
  const startResize = (e, id, side) => {
    e.preventDefault();
    e.stopPropagation();
    const curApi = apiRef.current;
    if (!curApi) return;
    const st = curApi.getState(id);
    const startCols = Number(st?.width || 12);
    const startHeight = Number(st?.heightPx || 0);
    setResizing({
      id, side,
      startX: e.clientX,
      startY: e.clientY,
      startCols,
      startHeight
    });
  };

  // Handle resize move/end
  React.useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      const curApi = apiRef.current;
      if (!curApi) return;
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      const cw = getColumnWidth();

      // Update width by columns
      if (resizing.side === "right" || resizing.side === "left" || resizing.side === "br" || resizing.side === "bl") {
        let deltaCols = Math.round(dx / Math.max(1, cw));
        if (resizing.side === "left" || resizing.side === "bl") {
          deltaCols = -deltaCols;
        }
        const base = resizing.startCols || 12;
        const nextCols = Math.max(3, Math.min(12, base + deltaCols));
        curApi.setState(resizing.id, { ...curApi.getState(resizing.id), width: nextCols });
      }

      // Update heightPx by pixels (bottom drag)
      if (resizing.side === "bottom" || resizing.side === "br" || resizing.side === "bl") {
        const baseH = resizing.startHeight || 0;
        const nextH = Math.max(120, Math.min(800, (baseH || 300) + dy));
        curApi.setState(resizing.id, { ...curApi.getState(resizing.id), heightPx: nextH });
      }
    };
    const onUp = () => {
      setResizing(null);
      // state already saved through setState -> saveState()
      // nothing else needed
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, getColumnWidth]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const next = Array.from(order);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setOrder(next);
    saveState(storageKey, next, states);
  };

  const setCardState = React.useCallback((id, nextState) => {
    const it = map[id];
    const prev = states[id] || { 
      size: it?.defaultSize || "md", 
      collapsed: false, 
      width: it?.defaultWidth || 12,
      heightPx: it?.defaultHeightPx || null
    };
    const merged = { ...prev, ...nextState };
    const next = { ...states, [id]: merged };
    setStates(next);
    saveState(storageKey, order, next);
  }, [states, map, storageKey, order]);

  const api = React.useMemo(() => ({
    getState: (id) => {
      const it = map[id];
      return states[id] || { 
        size: it?.defaultSize || "md", 
        collapsed: false, 
        width: it?.defaultWidth || 12,
        heightPx: it?.defaultHeightPx || null
      };
    },
    setState: (id, st) => setCardState(id, st)
  }), [states, map, setCardState]);

  // Keep apiRef in sync with current api
  React.useEffect(() => {
    apiRef.current = api;
  }, [api]);

  React.useEffect(() => {
    if (typeof registerApi === "function") registerApi(api);
  }, [api, registerApi]);

  // Also, when API becomes available, broadcast it once for listeners
  React.useEffect(() => {
    if (!apiRef.current) return;
    try {
      window.dispatchEvent(new CustomEvent("visual-api-available", {
        detail: { storageKey, api: apiRef.current }
      }));
    } catch (e) {}
  }, [storageKey, apiRef.current]);

  const containerClass = layoutMode === "grid"
    ? "grid grid-cols-1 lg:grid-cols-12 gap-4"
    : "space-y-4";

  const colClass = (w) => {
    const span = Math.min(12, Math.max(3, Number(w || 12)));
    return `col-span-1 lg:col-span-${span}`;
  };

  // Resizer grips
  const Grip = ({ side, onMouseDown }) => {
    const base = "absolute bg-sky-500/50 hover:bg-sky-500 rounded-full pointer-events-auto z-10";
    if (side === "right") return <div onMouseDown={onMouseDown} className={`${base} top-2 bottom-2 -right-1 w-1 cursor-ew-resize`} />;
    if (side === "left") return <div onMouseDown={onMouseDown} className={`${base} top-2 bottom-2 -left-1 w-1 cursor-ew-resize`} />;
    if (side === "bottom") return <div onMouseDown={onMouseDown} className={`${base} left-2 right-6 -bottom-1 h-1 cursor-ns-resize`} />;
    if (side === "br") return <div onMouseDown={onMouseDown} className={`${base} -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize`} />;
    if (side === "bl") return <div onMouseDown={onMouseDown} className={`${base} -left-2 -bottom-2 h-4 w-4 cursor-nesw-resize`} />;
    return null;
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={storageKey}>
        {(provided) => (
          <div ref={(el) => { provided.innerRef(el); containerRef.current = el; }} {...provided.droppableProps} className={containerClass}>
            {order.filter(id => !!map[id]).map((id, idx) => {
              const it = map[id];
              const st = api.getState(id);
              const title = st.title ?? it.title;
              const width = st.width ?? it.defaultWidth ?? 12;
              const wrapperProps = layoutMode === "grid" ? { className: colClass(width) } : {};
              const isSelected = selectedId === id;

              return (
                <div key={id} {...wrapperProps}>
                  <Draggable draggableId={id} index={idx} isDragDisabled={!editMode}>
                    {(drag) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        onClick={() => {
                          onSelect?.(id);
                          // Broadcast globally so the VisualStyleEditor can attach
                          try {
                            window.dispatchEvent(new CustomEvent("visual-card-selected", {
                              detail: { id, storageKey, api: apiRef.current }
                            }));
                          } catch (e) {}
                        }}
                        className="relative"
                        data-visual
                      >
                        <CardShell
                          title={title}
                          editMode={editMode}
                          selected={isSelected}
                          state={st}
                          onStateChange={(ns) => setCardState(id, ns)}
                          dragHandleProps={editMode ? drag.dragHandleProps : {}}
                        >
                          {typeof it.content === "function" ? it.content(st) : it.content}
                        </CardShell>

                        {editMode && isSelected && (
                          <>
                            <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-sky-400 ring-offset-2" />
                            <Grip side="left" onMouseDown={(e) => startResize(e, id, "left")} />
                            <Grip side="right" onMouseDown={(e) => startResize(e, id, "right")} />
                            <Grip side="bottom" onMouseDown={(e) => startResize(e, id, "bottom")} />
                            <Grip side="bl" onMouseDown={(e) => startResize(e, id, "bl")} />
                            <Grip side="br" onMouseDown={(e) => startResize(e, id, "br")} />
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                </div>
              );
            })}
            {provided.placeholder}
            {/* Tailwind safelist for dynamic column spans to ensure generated classes exist */}
            <div className="hidden lg:col-span-3 lg:col-span-4 lg:col-span-5 lg:col-span-6 lg:col-span-7 lg:col-span-8 lg:col-span-9 lg:col-span-10 lg:col-span-11 lg:col-span-12" />
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
