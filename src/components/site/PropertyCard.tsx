import { Link } from "@tanstack/react-router";
import { Bed, Bath, Maximize, MapPin, Heart, GitCompare, ShieldCheck, Star, Compass } from "lucide-react";
import { formatKsh, type Property } from "@/lib/mock-data";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { normalizedPrice } from "@/lib/measure";

export function PropertyCard({ p, distanceKm }: { p: Property; distanceKm?: number | null }) {
  const { isFavorite, toggle } = useFavorites();
  const { has, toggle: toggleCompare } = useCompare();
  const fav = isFavorite(p.id);
  const cmp = has(p.id);
  const perUnit = normalizedPrice(p.price, p.size, p.priceSuffix);
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-soft hover:shadow-glow hover:-translate-y-0.5 transition-all">
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          aria-label={fav ? "Remove from favorites" : "Save to favorites"}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(p.id); }}
          className="grid h-9 w-9 place-items-center rounded-full bg-background/95 backdrop-blur shadow-soft hover:scale-110 transition-transform"
        >
          <Heart className={"h-4 w-4 " + (fav ? "fill-secondary text-secondary" : "text-foreground/70")} />
        </button>
        <button
          type="button"
          aria-label={cmp ? "Remove from compare" : "Add to compare"}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(p.id); }}
          className={"grid h-9 w-9 place-items-center rounded-full backdrop-blur shadow-soft hover:scale-110 transition-transform " + (cmp ? "bg-primary text-primary-foreground" : "bg-background/95")}
        >
          <GitCompare className="h-4 w-4" />
        </button>
      </div>
      <Link to="/properties/$id" params={{ id: p.slug ?? p.id }} aria-label={`View details for ${p.title}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={p.image} alt={p.title} loading="lazy" decoding="async" width={640} height={480} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[70%]">
            <span className="rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1">{p.category}</span>
            {p.featured && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold px-3 py-1 shadow-md"><Star className="h-3 w-3 fill-current" /> Featured</span>}
            {p.verified && <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1"><ShieldCheck className="h-3 w-3" /> Verified</span>}
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-1">{p.title}</h3>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {p.area}, {p.town}
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-primary">
              {formatKsh(p.price)}<span className="text-xs font-medium text-muted-foreground">{p.priceSuffix ?? ""}</span>
            </span>
            {perUnit && (
              <span className="rounded-full bg-muted text-[11px] font-semibold px-2 py-0.5 text-muted-foreground" title="Normalized price for like-for-like comparison">
                {perUnit.label}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-border/70 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {p.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {p.bedrooms}</span>}
            {p.bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {p.bathrooms}</span>}
            {p.size && <span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> {p.size}</span>}
            {typeof distanceKm === "number" && (
              <span className="flex items-center gap-1 text-primary font-semibold"><Compass className="h-4 w-4" /> {distanceKm < 1 ? "<1" : distanceKm.toFixed(1)} km</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
