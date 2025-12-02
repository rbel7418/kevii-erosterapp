
import React from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronUp, ChevronDown, Minimize2, Maximize2 } from "lucide-react";

const sizeOrder = ["sm", "md", "lg"];

export default function CardShell({
  title,
  editMode = false,
  selected = false,
  state = { size: "md", collapsed: false },
  onStateChange = () => {},
  dragHandleProps = {},
  children,
  className = ""
}) {
  const { size = "md", collapsed = false, heightPx = 0 } = state;

  const setSize = (next) => onStateChange({ ...state, size: next });
  const toggleCollapsed = () => onStateChange({ ...state, collapsed: !collapsed });

  const incSize = () => {
    const idx = sizeOrder.indexOf(size);
    if (idx < sizeOrder.length - 1) setSize(sizeOrder[idx + 1]);
  };
  const decSize = () => {
    const idx = sizeOrder.indexOf(size);
    if (idx > 0) setSize(sizeOrder[idx - 1]);
  };

  // NEW: read style overrides safely
  const style = state?.style || {};
  const titleStyle = {
    fontSize: style.titleFontSize ? `${Number(style.titleFontSize)}px` : undefined,
    color: style.titleColor || undefined,
    textAlign: style.titleAlign || undefined
  };
  const contentStyle = {
    fontSize: style.contentFontSize ? `${Number(style.contentFontSize)}px` : undefined,
    color: style.contentColor || undefined,
    textAlign: style.contentAlign || undefined,
    paddingLeft: style.contentIndent ? `${Number(style.contentIndent)}px` : undefined,
    paddingRight: style.contentIndentRight ? `${Number(style.contentIndentRight)}px` : undefined
  };

  // The original heightClass logic is no longer used due to the new contentStyle implementation
  // const heightClass =
  //   heightPx > 0
  //     ? ""
  //     : size === "sm"
  //       ? "min-h-[10rem]"
  //       : size === "lg"
  //         ? "min-h-[26rem]"
  //         : "min-h-[18rem]";

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${selected ? "ring-1 ring-sky-400" : ""} ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center justify-between" {...dragHandleProps}>
        <div className="bg-slate-50 text-slate-900 mx-8 px-8 py-2 font-semibold truncate" style={titleStyle}>
          {/* Replaced original title with state?.title or prop title */}
          {state?.title ?? title}
        </div>
        {editMode &&
        <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={decSize} title="Smaller">
              <Minimize2 className="w-4 h-4 text-slate-500" />
            </Button>
            <Button size="icon" variant="ghost" onClick={incSize} title="Larger">
              <Maximize2 className="w-4 h-4 text-slate-500" />
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleCollapsed} title={collapsed ? "Expand" : "Collapse"}>
              {collapsed ?
            <ChevronDown className="w-4 h-4 text-slate-500" /> :

            <ChevronUp className="w-4 h-4 text-slate-500" />
            }
            </Button>
          </div>
        }
      </div>

      {/* Body */}
      {!collapsed && // Preserve collapse functionality
      <div
        className="p-3" // heightClass and heightPx specific styles removed as per outline
        style={contentStyle}>

          {children}
        </div>
      }
    </div>);

}