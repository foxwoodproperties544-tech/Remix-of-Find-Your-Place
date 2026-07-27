import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MapPin, Clock, MessageSquare, Eye, Flame, Star, ShieldCheck, BedDouble, Bath, Bookmark } from "lucide-react";
import { budgetLabel, daysLeft, KIND_LABEL, type PropertyRequest } from "@/lib/property-requests";
import { useSavedRequests } from "@/hooks/use-saved-requests";

export function RequestCard({ r, matchPct }: { r: PropertyRequest; matchPct?: number | null }) {
  const left = daysLeft(r.expires_at);
  const { isSaved, toggle, restore } = useSavedRequests();
  const saved = isSaved(r.id);

  function onToggleSaved() {
    const { previous, saved: nowSaved } = toggle(r.id);
    toast[nowSaved ? "success" : "info"](nowSaved ? "Saved to your requests" : "Removed from saved requests", {
      description: r.title,
      action: { label: "Undo", onClick: () => restore(previous) },
    });
  }

  return (
    <article className="group relative rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-glow hover:-translate-y-0.5 transition-all">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">{KIND_LABEL[r.kind] ?? r.kind}</span>
        <span className="rounded-full bg-muted text-xs font-medium px-3 py-1 text-muted-foreground">{r.property_type}</span>
        {r.is_featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold px-3 py-1">
            <Star className="h-3 w-3 fill-current" /> Featured
          </span>
        )}
        {r.is_urgent && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1">
            <Flame className="h-3 w-3" /> Urgent
          </span>
        )}
        {typeof matchPct === "number" && (
          <span className="ml-auto rounded-full bg-primary-soft text-primary text-xs font-bold px-3 py-1">{matchPct}% Match</span>
        )}
      </div>

      <h3 className="mt-3 font-semibold leading-snug line-clamp-2">
        <Link to="/property-requests/$slug" params={{ slug: r.slug ?? r.id }} className="hover:text-primary">
          {r.title}
        </Link>
      </h3>

      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" /> {[r.estate, r.town, r.county].filter(Boolean).join(", ")}
      </div>

      <div className="mt-3 text-lg font-bold text-primary">{budgetLabel(r)}</div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {r.bedrooms ? <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {r.bedrooms}+</span> : null}
        {r.bathrooms ? <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {r.bathrooms}+</span> : null}
        <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {r.response_count} responses</span>
        <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {r.view_count}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-border/70 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {r.published_at ? new Date(r.published_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
          {left != null && <span className={left <= 5 ? "text-secondary font-semibold" : ""}> · {left > 0 ? `${left}d left` : "expired"}</span>}
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSaved}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved requests" : "Save this request"}
            title={saved ? "Saved" : "Save request"}
            className={`grid h-8 w-8 place-items-center rounded-full border transition-colors ${saved ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-primary hover:bg-primary-soft"}`}
          >
            <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
          </button>
          <Link
            to="/property-requests/$slug"
            params={{ slug: r.slug ?? r.id }}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            View Request
          </Link>
        </span>

      </div>
    </article>
  );
}

export function VerifiedBuyerBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft text-primary text-xs font-semibold px-3 py-1">
      <ShieldCheck className="h-3 w-3" /> Verified Buyer
    </span>
  );
}
