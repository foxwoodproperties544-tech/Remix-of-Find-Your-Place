export function BlogPostSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero */}
      <div className="relative h-[280px] md:h-[360px] w-full bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="container-page absolute inset-0 flex flex-col justify-end pb-8 gap-3">
          <div className="h-4 w-24 rounded bg-white/40" />
          <div className="h-8 md:h-10 w-3/4 rounded bg-white/50" />
          <div className="h-4 w-1/2 rounded bg-white/40" />
        </div>
      </div>

      <div className="container-page py-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-11/12 rounded bg-muted" />
          <div className="h-4 w-10/12 rounded bg-muted" />
          <div className="h-4 w-9/12 rounded bg-muted" />
          <div className="h-48 w-full rounded-xl bg-muted mt-6" />
          <div className="h-4 w-full rounded bg-muted mt-6" />
          <div className="h-4 w-11/12 rounded bg-muted" />
          <div className="h-4 w-8/12 rounded bg-muted" />
        </div>
        <aside className="space-y-4">
          <div className="h-40 rounded-2xl bg-muted" />
          <div className="h-56 rounded-2xl bg-muted" />
          <div className="h-32 rounded-2xl bg-muted" />
        </aside>
      </div>
      <span className="sr-only" role="status" aria-live="polite">Loading article…</span>
    </div>
  );
}
