
import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

export default function DateRangePicker({ start, end, onChange, className }) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState({
    from: start instanceof Date ? start : (start ? new Date(start) : undefined),
    to: end instanceof Date ? end : (end ? new Date(end) : undefined),
  });

  React.useEffect(() => {
    setRange({
      from: start instanceof Date ? start : (start ? new Date(start) : undefined),
      to: end instanceof Date ? end : (end ? new Date(end) : undefined),
    });
  }, [start, end]);

  const displayStart = range.from ? format(range.from, "dd/MM/yyyy") : "Start date";
  const displayEnd = range.to ? format(range.to, "dd/MM/yyyy") : "End date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={`flex items-center gap-2 ${className || ""}`}>
          <Button variant="outline" className="w-[160px] justify-between h-9 rounded-xl bg-white border-transparent shadow-[0_4px_14px_rgba(0,0,0,0.18)]">
            <span className="truncate">{displayStart}</span>
            <CalendarIcon className="w-4 h-4 opacity-70" />
          </Button>
          <Button variant="outline" className="w-[160px] justify-between h-9 rounded-xl bg-white border-transparent shadow-[0_4px_14px_rgba(0,0,0,0.18)]">
            <span className="truncate">{displayEnd}</span>
            <CalendarIcon className="w-4 h-4 opacity-70" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[720px]">
        <div className="px-1 pb-2">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={(r) => setRange(r || { from: undefined, to: undefined })}
            initialFocus
            defaultMonth={range.from || new Date()}
          />
          <div className="mt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cleared = { from: undefined, to: undefined };
                setRange(cleared);
                onChange?.({ start: undefined, end: undefined });
              }}
            >
              Clear
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-sky-600 hover:bg-sky-700"
                disabled={!range.from || !range.to}
                onClick={() => {
                  onChange?.({ start: range.from, end: range.to });
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
