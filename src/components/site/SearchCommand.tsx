import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Building2, Home as HomeIcon, ArrowRight, Command as CmdIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { fuzzySearch } from "@/lib/fuzzy";
import { CATEGORIES, ALL_TYPES } from "@/lib/taxonomy";
import { KENYA_COUNTIES, KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { fetchPublishedProperties } from "@/lib/properties";
import { formatKsh } from "@/lib/mock-data";

type Loc = { name: string; county: string; kind: "county" | "town" };
const LOCATIONS: Loc[] = [
  ...KENYA_COUNTIES.map((c): Loc => ({ name: c, county: c, kind: "county" })),
  ...Object.entries(KENYA_SUBLOCATIONS).flatMap(([county, towns]) =>
    towns.map((t): Loc => ({ name: t, county, kind: "town" })),
  ),
];

export function SearchCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const { data: props = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: fetchPublishedProperties,
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const propMatches = useMemo(() => {
    if (!q) return props.slice(0, 5);
    return fuzzySearch(props, q, (p) => `${p.title} ${p.area ?? ""} ${p.town ?? ""}`, 6).map((r) => r.item);
  }, [q, props]);

  const locMatches = useMemo(() => {
    if (!q) return LOCATIONS.slice(0, 6);
    return fuzzySearch(LOCATIONS, q, (l) => `${l.name} ${l.county}`, 6).map((r) => r.item);
  }, [q]);

  const typeMatches = useMemo(() => {
    if (!q) return [] as string[];
    return fuzzySearch(ALL_TYPES, q, (t) => t, 4).map((r) => r.item);
  }, [q]);

  const catMatches = useMemo(() => {
    if (!q) return [] as string[];
    return fuzzySearch(CATEGORIES as unknown as string[], q, (c) => c, 3).map((r) => r.item);
  }, [q]);

  function go(fn: () => void) { onOpenChange(false); fn(); }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Search properties, towns, categories…" />
      <CommandList>
        <CommandEmpty>No matches. Try a town, county, or property type.</CommandEmpty>

        {propMatches.length > 0 && (
          <CommandGroup heading={q ? "Matching properties" : "Latest properties"}>
            {propMatches.map((p) => (
              <CommandItem
                key={`p-${p.id}`}
                value={`property ${p.title} ${p.town} ${p.area}`}
                onSelect={() => go(() => navigate({ to: "/properties/$id", params: { id: p.slug ?? p.id } }))}
              >
                <HomeIcon className="mr-2 h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{p.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.area}, {p.town} · {formatKsh(p.price)}</div>
                </div>
                <ArrowRight className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {locMatches.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Locations">
              {locMatches.map((l) => (
                <CommandItem
                  key={`l-${l.kind}-${l.county}-${l.name}`}
                  value={`location ${l.name} ${l.county}`}
                  onSelect={() => go(() => navigate({
                    to: "/properties",
                    search: l.kind === "county" ? { county: l.name } : { county: l.county, town: l.name },
                  }))}
                >
                  <MapPin className="mr-2 h-4 w-4 text-secondary" />
                  <span className="flex-1">{l.name}{l.kind === "town" ? <span className="text-muted-foreground"> · {l.county}</span> : null}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{l.kind}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {(typeMatches.length > 0 || catMatches.length > 0) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Filters">
              {catMatches.map((c) => (
                <CommandItem key={`c-${c}`} value={`category ${c}`}
                  onSelect={() => go(() => navigate({ to: "/properties", search: { category: c } }))}>
                  <Search className="mr-2 h-4 w-4" /> {c}
                </CommandItem>
              ))}
              {typeMatches.map((t) => (
                <CommandItem key={`t-${t}`} value={`type ${t}`}
                  onSelect={() => go(() => navigate({ to: "/properties", search: { type: t } }))}>
                  <Building2 className="mr-2 h-4 w-4" /> {t}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {q && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem value={`search ${q}`}
                onSelect={() => go(() => navigate({ to: "/properties", search: { q } }))}>
                <Search className="mr-2 h-4 w-4" /> Search properties for “{q}”
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
        <CmdIcon className="h-3 w-3" /> Tip: press <kbd className="rounded bg-muted px-1">Ctrl</kbd>+<kbd className="rounded bg-muted px-1">K</kbd> anywhere
      </div>
    </CommandDialog>
  );
}
