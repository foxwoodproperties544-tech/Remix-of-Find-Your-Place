import { ChevronDown, X, AlertTriangle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { KENYA_COUNTIES as counties, KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { TownCombobox } from "@/components/site/TownCombobox";
import {
  CATEGORIES,
  TYPE_GROUPS,
  FEATURE_GROUPS,
  NEARBY_AMENITIES,
  PROPERTY_STATUSES,
  LISTING_TYPES,
  PROPERTY_PURPOSES,
  SALE_PRICE_BANDS,
  RENT_PRICE_BANDS,
} from "@/lib/taxonomy";

export interface FiltersState {
  category: string;
  type: string;
  county: string;
  town: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  minBaths: string;
  minSize: string;
  maxSize: string;
  features: Set<string>;
  nearby: Set<string>;
  status: string;
  listingType: string;
  purpose: string;
}

export interface FiltersSidebarProps {
  state: FiltersState;
  townOptions: string[];
  onChange: (patch: Partial<FiltersState>) => void;
  onClear: () => void;
}

export function FiltersSidebar({ state, townOptions, onChange, onClear }: FiltersSidebarProps) {
  const bands = state.category === "For Sale" ? SALE_PRICE_BANDS : RENT_PRICE_BANDS;

  function toggleSet(key: "features" | "nearby", value: string) {
    const next = new Set(state[key]);
    next.has(value) ? next.delete(value) : next.add(value);
    onChange({ [key]: next } as Partial<FiltersState>);
  }

  return (
    <aside className="space-y-2">
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="text-sm font-bold">Filters</h3>
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-secondary inline-flex items-center gap-1">
          <X className="h-3 w-3" /> Clear all
        </button>
      </div>

      <Section title="Category" defaultOpen>
        <RadioList value={state.category} onChange={(v) => onChange({ category: v })} options={["", ...CATEGORIES] as string[]} labels={{ "": "Any category" }} />
      </Section>

      <Section title="Property type" defaultOpen>
        <select aria-label="Property type" value={state.type} onChange={(e) => onChange({ type: e.target.value })} className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm">
          <option value="">All types</option>
          {TYPE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((t) => <option key={t} value={t}>{t}</option>)}
            </optgroup>
          ))}
        </select>
      </Section>

      <Section title="Location" defaultOpen>
        <div className="space-y-2">
          <select aria-label="County" value={state.county} onChange={(e) => onChange({ county: e.target.value, town: "" })} className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm">
            <option value="">All counties</option>
            {counties.map((c) => <option key={c}>{c}</option>)}
          </select>
          <TownCombobox
            county={state.county}
            value={state.town}
            onChange={(v) => onChange({ town: v })}
            extraOptions={townOptions}
          />
          {state.county && state.town && !(KENYA_SUBLOCATIONS[state.county] ?? []).includes(state.town) && (
            <div className="flex items-start gap-1.5 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>“{state.town}” isn’t a known area in {state.county}. <button onClick={() => onChange({ town: "" })} className="underline font-medium">Clear</button></span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Price">
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-1.5">
            {bands.map((b) => {
              const active = String(b.min) === state.minPrice && String(b.max ?? "") === state.maxPrice;
              return (
                <button key={b.label}
                  onClick={() => onChange({ minPrice: String(b.min), maxPrice: b.max ? String(b.max) : "" })}
                  className={`text-left rounded-lg px-3 py-2 text-xs border transition ${active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>
                  {b.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <input type="number" value={state.minPrice} onChange={(e) => onChange({ minPrice: e.target.value })} placeholder="Min" className="rounded-lg border border-border bg-field px-3 py-2 text-sm" />
            <input type="number" value={state.maxPrice} onChange={(e) => onChange({ maxPrice: e.target.value })} placeholder="Max" className="rounded-lg border border-border bg-field px-3 py-2 text-sm" />
          </div>
        </div>
      </Section>

      <Section title="Bedrooms & bathrooms">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Min beds</label>
            <select value={state.minBeds} onChange={(e) => onChange({ minBeds: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-field px-3 py-2 text-sm">
              <option value="">Any</option>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min baths</label>
            <select value={state.minBaths} onChange={(e) => onChange({ minBaths: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-field px-3 py-2 text-sm">
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Size (sq ft or acre)">
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min="0" value={state.minSize} onChange={(e) => onChange({ minSize: e.target.value })} placeholder="Min" className="rounded-lg border border-border bg-field px-3 py-2 text-sm" />
          <input type="number" min="0" value={state.maxSize} onChange={(e) => onChange({ maxSize: e.target.value })} placeholder="Max" className="rounded-lg border border-border bg-field px-3 py-2 text-sm" />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Numeric match on the listing's size value (sqft; acres auto-converted).</p>
      </Section>

      {FEATURE_GROUPS.map((g) => (
        <Section key={g.label} title={g.label}>
          <CheckList items={g.items} selected={state.features} onToggle={(v) => toggleSet("features", v)} />
        </Section>
      ))}

      <Section title="Amenities nearby">
        <CheckList items={[...NEARBY_AMENITIES]} selected={state.nearby} onToggle={(v) => toggleSet("nearby", v)} />
      </Section>

      <Section title="Property status">
        <RadioList value={state.status} onChange={(v) => onChange({ status: v })} options={["", ...PROPERTY_STATUSES] as string[]} labels={{ "": "Any status" }} />
      </Section>

      <Section title="Listing type">
        <RadioList value={state.listingType} onChange={(v) => onChange({ listingType: v })} options={["", ...LISTING_TYPES] as string[]} labels={{ "": "Any listing type" }} />
      </Section>

      <Section title="Purpose">
        <RadioList value={state.purpose} onChange={(v) => onChange({ purpose: v })} options={["", ...PROPERTY_PURPOSES] as string[]} labels={{ "": "Any purpose" }} />
      </Section>
    </aside>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold">
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function RadioList({ value, onChange, options, labels = {} }: { value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <div className="space-y-1">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
          <input type="radio" checked={value === o} onChange={() => onChange(o)} className="accent-primary" />
          <span>{labels[o] ?? o}</span>
        </label>
      ))}
    </div>
  );
}

function CheckList({ items, selected, onToggle }: { items: string[]; selected: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className="space-y-1 max-h-64 overflow-auto pr-1">
      {items.map((it) => (
        <label key={it} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">
          <input type="checkbox" checked={selected.has(it)} onChange={() => onToggle(it)} className="accent-primary" />
          <span>{it}</span>
        </label>
      ))}
    </div>
  );
}
