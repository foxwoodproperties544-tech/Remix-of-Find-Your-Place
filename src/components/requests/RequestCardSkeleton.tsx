export function RequestCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft" aria-hidden="true">
      <div className="flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-5 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-3/5 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-6 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-4 flex gap-3">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function RequestCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading requests">
      {Array.from({ length: count }).map((_, i) => <RequestCardSkeleton key={i} />)}
      <span className="sr-only">Loading requests…</span>
    </div>
  );
}
