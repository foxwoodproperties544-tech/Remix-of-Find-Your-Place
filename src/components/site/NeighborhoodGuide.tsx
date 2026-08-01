import { Info, Train, Building2, TrendingUp } from "lucide-react";
import { getAreaGuide } from "@/lib/area-guides";

export function NeighborhoodGuide({ town, county }: { town: string; county: string }) {
  const guide = getAreaGuide(town, county);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold">About {town}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{guide.overview}</p>

      <h4 className="mt-4 text-sm font-semibold">Best suited for</h4>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
        {guide.bestFor.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> {b}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 text-sm">
        <p className="flex gap-2 text-muted-foreground">
          <Train className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {guide.transport}
        </p>
        <p className="flex gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Nearby: {guide.amenities.join(" · ")}
        </p>
        <p className="flex gap-2 text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {guide.investment}
        </p>
      </div>

      <h4 className="mt-5 text-sm font-semibold">{town} property FAQs</h4>
      <div className="mt-2 grid gap-2">
        {guide.faqs.map((f) => (
          <details key={f.q} className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
