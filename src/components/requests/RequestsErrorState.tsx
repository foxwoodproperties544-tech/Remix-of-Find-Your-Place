import { AlertTriangle, RefreshCw } from "lucide-react";

export function RequestsErrorState({
  title = "We couldn't load these requests",
  message = "Check your connection and try again.",
  onRetry,
  retrying,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} /> {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}
