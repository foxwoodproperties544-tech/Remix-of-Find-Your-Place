import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Check, Minus, Info } from "lucide-react";
import {
  fetchPropertyChecks,
  fetchVerificationCriteria,
  computeVerificationScore,
  UUID_RE,
} from "@/lib/scoring";

interface Props {
  propertyId: string;
  propertyType?: string | null;
  compact?: boolean;
}

/** Foxwood Verification Score — reusable, works on any property id. */
export function VerificationScoreCard({ propertyId, propertyType, compact }: Props) {
  const enabled = UUID_RE.test(propertyId);
  const { data } = useQuery({
    queryKey: ["verification-score", propertyId],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const [criteria, checks] = await Promise.all([
        fetchVerificationCriteria(),
        fetchPropertyChecks(propertyId),
      ]);
      return computeVerificationScore(criteria, checks, propertyType);
    },
  });

  if (!enabled || !data || data.total === 0) return null;
  const { score, applicable, passedKeys } = data;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft text-primary text-xs font-semibold px-2.5 py-1">
        <ShieldCheck className="h-3.5 w-3.5" /> {score}/100 verified
      </span>
    );
  }

  return (
    <section aria-labelledby="verification-score" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 id="verification-score" className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Foxwood Verification Score
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Each check below is confirmed by our team before it counts towards the score.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-primary">
            {score}<span className="text-lg text-muted-foreground">/100</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {passedKeys.size} of {applicable.length} checks verified
          </div>
        </div>
      </div>

      <div className="mt-4 h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-primary transition-all" style={{ width: `${score}%` }} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {applicable.map((c) => {
          const ok = passedKeys.has(c.key);
          return (
            <li
              key={c.key}
              className={`flex items-start gap-2 rounded-xl border p-3 ${ok ? "border-primary/25 bg-primary-soft/40" : "border-border bg-background"}`}
            >
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${ok ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                aria-hidden="true"
              >
                {ok ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {c.label} <span className="sr-only">{ok ? "verified" : "not verified"}</span>
                </div>
                {c.explanation && <div className="text-xs text-muted-foreground mt-0.5">{c.explanation}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">Weight {c.weight} pts</div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        A high score means more of the listing details were independently confirmed. Always complete your own
        due diligence before paying any money.
      </p>
    </section>
  );
}
