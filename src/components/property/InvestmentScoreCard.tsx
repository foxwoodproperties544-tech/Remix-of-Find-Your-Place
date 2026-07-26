import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchInvestmentFactors,
  fetchInvestmentRatings,
  computeInvestmentScore,
  investmentVerdict,
  UUID_RE,
} from "@/lib/scoring";

interface Props {
  propertyId: string;
  compact?: boolean;
}

/** Investment Score out of 10 built from admin-weighted factors. */
export function InvestmentScoreCard({ propertyId, compact }: Props) {
  const enabled = UUID_RE.test(propertyId);
  const { data } = useQuery({
    queryKey: ["investment-score", propertyId],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const [factors, ratings, note] = await Promise.all([
        fetchInvestmentFactors(),
        fetchInvestmentRatings(propertyId),
        supabase.from("properties").select("investment_note").eq("id", propertyId).maybeSingle(),
      ]);
      return {
        ...computeInvestmentScore(factors, ratings),
        note: (note.data as any)?.investment_note as string | null | undefined,
      };
    },
  });

  if (!enabled || !data || data.score == null) return null;
  const { score, rated, byKey, note } = data;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold px-2.5 py-1">
        <TrendingUp className="h-3.5 w-3.5" /> {score.toFixed(1)}/10 investment
      </span>
    );
  }

  return (
    <section aria-labelledby="investment-score" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 id="investment-score" className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-secondary" /> Investment Score
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{investmentVerdict(score)}</p>
        </div>
        <div className="text-3xl font-extrabold text-secondary">
          {score.toFixed(1)}<span className="text-lg text-muted-foreground">/10</span>
        </div>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {rated.map((f) => {
          const v = byKey.get(f.key) ?? 0;
          return (
            <li key={f.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{f.label}</span>
                <span className="text-muted-foreground">{v.toFixed(1)}/10</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: `${Math.min(100, v * 10)}%` }} />
              </div>
              {f.explanation && <div className="mt-1 text-[11px] text-muted-foreground">{f.explanation}</div>}
            </li>
          );
        })}
      </ul>

      {note && <p className="mt-4 rounded-xl bg-muted/50 p-3 text-sm">{note}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        Scores are Foxwood estimates based on area fundamentals and are not financial advice.
      </p>
    </section>
  );
}
