import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function QuickAddShift({ shiftCodes = [], empId, date, onAdd }) {
  const [query, setQuery] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const sorted = React.useMemo(() => {
    const list = (shiftCodes || []).map(c => ({
      code: String(c.code || "").toUpperCase(),
      descriptor: c.descriptor || "",
      weighted_hours: typeof c.weighted_hours === "number" ? c.weighted_hours : null,
    }));
    return list
      .filter(c => {
        if (!query) return true;
        const q = query.toLowerCase();
        return c.code.toLowerCase().includes(q) || c.descriptor.toLowerCase().includes(q);
      })
      .sort((a, b) => a.code.localeCompare(b.code))
      .slice(0, 80);
  }, [shiftCodes, query]);

  const handlePick = async (code) => {
    if (pending) return;
    setPending(true);
    try {
      await onAdd?.(empId, date, code);
    } finally {
      setPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`mx-auto block w-6 h-6 md:w-7 md:h-7 rounded-md border ${
            pending 
              ? "border-slate-300 bg-slate-100 opacity-70" 
              : "border-dashed border-slate-300 hover:bg-slate-50 hover:border-slate-400"
          } text-slate-600 text-xs leading-5 active:scale-[0.98] transition`}
          title={pending ? "Adding…" : "Add shift"}
          aria-label="Add shift"
          disabled={pending}
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" /> : "+"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-0 shadow-lg">
        <div className="p-2 border-b">
          <Input
            placeholder="Search shift code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8"
            autoFocus
            disabled={pending}
          />
        </div>
        <div className="max-h-64 overflow-auto py-1">
          {sorted.map((c) => (
            <DropdownMenuItem
              key={c.code}
              className="flex items-center justify-between gap-2 text-sm"
              onClick={() => handlePick(c.code)}
              disabled={pending}
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-800">{c.code}</div>
                {c.descriptor ? (
                  <div className="text-[11px] text-slate-500 truncate">{c.descriptor}</div>
                ) : null}
              </div>
              {c.weighted_hours !== null && (
                <div className="text-[11px] text-slate-600 shrink-0">{c.weighted_hours}h</div>
              )}
            </DropdownMenuItem>
          ))}
          {sorted.length === 0 && (
            <div className="px-3 py-4 text-xs text-slate-500">No shift codes found</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}