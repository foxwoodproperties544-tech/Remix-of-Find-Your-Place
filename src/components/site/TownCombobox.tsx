import { useEffect, useMemo, useRef, useState } from "react";
import { KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { fuzzySearch } from "@/lib/fuzzy";
import { Check, ChevronDown, X } from "lucide-react";

export interface TownComboboxProps {
  county: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  extraOptions?: string[];
  className?: string;
  error?: string;
}

export function TownCombobox({ county, value, onChange, placeholder, extraOptions = [], className, error }: TownComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pool = useMemo(() => {
    const base = county ? KENYA_SUBLOCATIONS[county] ?? [] : Object.values(KENYA_SUBLOCATIONS).flat();
    return Array.from(new Set([...base, ...extraOptions])).sort();
  }, [county, extraOptions]);

  const results = useMemo(() => fuzzySearch(pool, query, (x) => x, 8).map((r) => r.item), [pool, query]);

  const base = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors";
  const border = error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary";

  function pick(v: string) { onChange(v); setQuery(v); setOpen(false); }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); onChange(e.target.value); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter") { if (open && results[active]) { e.preventDefault(); pick(results[active]); } }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder ?? (county ? `Search areas in ${county}...` : "Search any area in Kenya...")}
          className={`${base} ${border} pr-16`}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button type="button" onClick={() => { setQuery(""); onChange(""); }} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={() => setOpen((o) => !o)} className="p-1 text-muted-foreground" aria-label="Toggle">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lift">
          {results.map((r, i) => (
            <button
              key={r}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-muted ${i === active ? "bg-muted" : ""}`}
            >
              <span>{r}</span>
              {value === r && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </div>
  );
}
