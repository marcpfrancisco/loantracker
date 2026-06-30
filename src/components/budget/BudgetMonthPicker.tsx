import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMonthLabel, shiftMonth, toFirstOfMonth } from "@/lib/budgetRules";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

interface BudgetMonthPickerProps {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  /** When false, months after the current calendar month are disabled. */
  allowFuture?: boolean;
}

export function BudgetMonthPicker({
  monthKey,
  onMonthChange,
  allowFuture = true,
}: BudgetMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = new Date(monthKey + "T12:00:00");
  const [viewYear, setViewYear] = useState(parsed.getFullYear());

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  function isFutureMonth(monthIdx: number): boolean {
    if (allowFuture) return false;
    return viewYear > currentYear || (viewYear === currentYear && monthIdx > currentMonthIdx);
  }

  function selectMonth(monthIdx: number) {
    onMonthChange(toFirstOfMonth(new Date(viewYear, monthIdx, 1)));
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setViewYear(parsed.getFullYear());
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
        className="border-border/60 hover:bg-muted/50 rounded-lg border p-2"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          className={cn(
            "border-border/60 hover:border-primary/40 hover:bg-muted/30 flex min-w-[10.5rem] flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          )}
          aria-label="Choose budget month"
        >
          <CalendarDays className="text-primary h-4 w-4 shrink-0" />
          <span className="text-foreground truncate">{formatMonthLabel(monthKey)}</span>
        </PopoverTrigger>

        <PopoverContent side="bottom" align="center" className="w-72 p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="text-muted-foreground hover:text-foreground rounded p-1"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-foreground text-sm font-semibold">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={!allowFuture && viewYear >= currentYear}
              className="text-muted-foreground hover:text-foreground rounded p-1 disabled:opacity-30"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_LABELS.map((label, idx) => {
              const selected = viewYear === parsed.getFullYear() && idx === parsed.getMonth();
              const disabled = isFutureMonth(idx);

              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectMonth(idx)}
                  className={cn(
                    "rounded-lg py-2 text-xs font-medium transition-colors",
                    disabled && "text-muted-foreground/40 cursor-not-allowed",
                    !disabled &&
                      !selected &&
                      "text-foreground hover:bg-primary/10 hover:text-primary",
                    selected && "bg-primary/15 text-primary ring-primary/30 ring-1"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
        className="border-border/60 hover:bg-muted/50 rounded-lg border p-2"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
