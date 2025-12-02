
import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function MonthPicker({ value, onChange, buttonVariant = "outline", size = "icon", label, className }) {
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(value ? value.getFullYear() : new Date().getFullYear());

  React.useEffect(() => {
    if (value instanceof Date) {
      const y = value.getFullYear();
      if (!Number.isNaN(y)) setYear(y);
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={buttonVariant} size={size} title="Pick month" className={className}>
          {label ? (
            <span className="w-full text-left">{label}</span>
          ) : (
            <CalendarIcon className="w-4 h-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="font-medium">{year}</div>
          <Button variant="ghost" size="icon" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, i) => {
            const d = new Date(year, i, 1);
            const active =
              value instanceof Date &&
              value.getFullYear() === year &&
              value.getMonth() === i;
            return (
              <Button
                key={i}
                variant={active ? "default" : "outline"}
                className="h-8"
                onClick={() => {
                  onChange?.(d);
                  setOpen(false);
                }}
              >
                {format(d, "MMM")}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
