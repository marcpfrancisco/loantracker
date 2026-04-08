import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { filterCountries, getCountryOptions } from "@/lib/countries";

interface CountryPickerProps {
  value: string;             // ISO 3166-1 alpha-2 country code
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Show currency code next to country name. Default: true */
  showCurrency?: boolean;
}

export function CountryPicker({
  value,
  onChange,
  placeholder = "Select a country",
  className,
  disabled = false,
  showCurrency = true,
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const allOptions = useMemo(() => getCountryOptions(), []);
  const filtered = useMemo(() => filterCountries(allOptions, query), [allOptions, query]);

  const selected = allOptions.find((o) => o.code === value);

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          // Focus search input after the popover renders
          setTimeout(() => inputRef.current?.focus(), 50);
        } else {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "bg-muted/50 border-border/60 focus:border-primary/60 flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span>{selected.flag}</span>
            <span className="text-foreground">{selected.name}</span>
            {showCurrency && (
              <span className="text-muted-foreground text-xs">{selected.currency}</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--anchor-width)] p-0"
        align="start"
        sideOffset={4}
      >
        {/* Search */}
        <div className="border-border/60 flex items-center gap-2 border-b px-3 py-2">
          <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country or currency…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Options list */}
        <div className="max-h-60 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-center text-xs">
              No countries found.
            </p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => handleSelect(opt.code)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  "hover:bg-muted/50",
                  opt.code === value && "bg-primary/10"
                )}
              >
                <span className="w-6 text-base leading-none">{opt.flag}</span>
                <span className="text-foreground min-w-0 flex-1 truncate text-left">
                  {opt.name}
                </span>
                {showCurrency && (
                  <span className="text-muted-foreground shrink-0 text-xs">{opt.currency}</span>
                )}
                {opt.code === value && (
                  <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
