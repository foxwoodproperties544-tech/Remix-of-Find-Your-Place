import { Info } from "lucide-react";

export function NeighborhoodGuide({ town, county }: { town: string; county: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold">About {town}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {town} is one of the sought-after areas in {county} county, popular with families,
        first-time buyers, investors, and short-let hosts. Foxwood Properties lists verified
        homes, apartments, plots, and commercial spaces here so you can compare prices,
        neighborhoods, and amenities before you visit.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
        <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> Buy, rent, or lease with vetted agents and owners in {town}.</li>
        <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> Real-time median prices update as new {town} listings go live.</li>
        <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> Request a viewing or WhatsApp the agent directly from any listing.</li>
        <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> Save searches and get email alerts when new {town} homes match.</li>
      </ul>
    </div>
  );
}
