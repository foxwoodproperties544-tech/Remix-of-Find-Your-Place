import { listingQualityScore, type QualityInput } from "@/lib/listing-quality";
import { Gauge, Check, X } from "lucide-react";

/** Live listing quality score shown to agents before they submit for review. */
export function ListingQualityCard({ input }: { input: QualityInput }) {
  const { score, label, checks, grade } = listingQualityScore(input);
  const tone =
    grade === "excellent" || grade === "good" ? "text-primary" : grade === "fair" ? "text-secondary" : "text-destructive";
  const bar =
    grade === "excellent" || grade === "good" ? "bg-primary" : grade === "fair" ? "bg-secondary" : "bg-destructive";

  return (
    <section aria-labelledby="listing-quality" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 id="listing-quality" className="text-base font-bold flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" /> Listing quality score
        </h2>
        <div className={`text-2xl font-extrabold ${tone}`}>{score}%</div>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full ${bar} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2 text-xs">
            {c.passed ? (
              <Check className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" aria-hidden />
            ) : (
              <X className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
            )}
            <span className={c.passed ? "text-muted-foreground line-through" : ""}>
              <span className="font-medium text-foreground">{c.label}</span>
              {!c.passed && <span className="block text-muted-foreground">{c.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
