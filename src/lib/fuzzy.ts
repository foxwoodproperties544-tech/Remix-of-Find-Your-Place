// Small dependency-free fuzzy matcher for location suggestions.
function norm(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, "").trim();
}

function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = dp[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > max) return max + 1;
  }
  return dp[b.length];
}

export interface FuzzyMatch<T> { item: T; score: number; }

/** Higher score = better match. Returns top `limit` results with score > 0. */
export function fuzzySearch<T>(items: T[], query: string, key: (t: T) => string, limit = 8): FuzzyMatch<T>[] {
  const q = norm(query);
  if (!q) return items.slice(0, limit).map((item) => ({ item, score: 0.1 }));
  const out: FuzzyMatch<T>[] = [];
  for (const item of items) {
    const label = norm(key(item));
    if (!label) continue;
    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 80 - (label.length - q.length) * 0.1;
    else if (label.includes(q)) score = 60 - (label.indexOf(q));
    else {
      // token startsWith
      const tokens = label.split(/\s+/);
      if (tokens.some((t) => t.startsWith(q))) score = 50;
      else {
        const maxTypos = q.length <= 4 ? 1 : 2;
        const d = levenshtein(q, label.slice(0, q.length + maxTypos), maxTypos);
        if (d <= maxTypos) score = 30 - d * 5;
      }
    }
    if (score > 0) out.push({ item, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
