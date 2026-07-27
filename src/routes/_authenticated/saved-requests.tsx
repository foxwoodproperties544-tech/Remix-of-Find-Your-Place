import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequestCard } from "@/components/requests/RequestCard";
import { RequestCardSkeletonGrid } from "@/components/requests/RequestCardSkeleton";
import { RequestsErrorState } from "@/components/requests/RequestsErrorState";
import { fetchRequestsByIds } from "@/lib/property-requests";
import { useSavedRequests } from "@/hooks/use-saved-requests";
import { absoluteUrl } from "@/lib/site-url";
import { Bookmark, Trash2 } from "lucide-react";

const TITLE = "Saved Property Requests | Foxwood Properties";
const DESC = "Your bookmarked buyer and tenant property requests on Foxwood Properties. Come back and respond when you have a matching listing.";
const PER_PAGE = 12;

export const Route = createFileRoute("/_authenticated/saved-requests")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/saved-requests") }],
  }),
  component: SavedRequestsPage,
});

function SavedRequestsPage() {
  const { ids, hydrated, clear, restore } = useSavedRequests();
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(ids.length / PER_PAGE));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const pageIds = useMemo(() => ids.slice((page - 1) * PER_PAGE, page * PER_PAGE), [ids, page]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["saved-requests", pageIds],
    queryFn: () => fetchRequestsByIds(pageIds),
    enabled: pageIds.length > 0,
  });

  function onClearAll() {
    if (!window.confirm("Remove all saved requests?")) return;
    const previous = clear();
    setPage(1);
    toast.info("Cleared all saved requests", {
      action: { label: "Undo", onClick: () => restore(previous) },
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <Bookmark className="h-3.5 w-3.5" /> Property Request Marketplace
          </div>
          <h1 className="mt-2 text-2xl font-bold">Saved requests</h1>
          <p className="text-sm text-muted-foreground">Requests you bookmarked while browsing. Saved on this device.</p>
        </div>
        {ids.length > 0 && (
          <button type="button" onClick={onClearAll} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            <Trash2 className="h-4 w-4" /> Clear all
          </button>
        )}
      </div>

      <div className="mt-8">
        {!hydrated ? (
          <RequestCardSkeletonGrid count={3} />
        ) : ids.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">You haven't saved any requests yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Tap the bookmark icon on any request to keep it here.</p>
            <Link to="/property-requests" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Browse requests</Link>
          </div>
        ) : isError ? (
          <RequestsErrorState onRetry={() => refetch()} retrying={isFetching} />
        ) : isLoading ? (
          <RequestCardSkeletonGrid count={Math.min(pageIds.length, 6)} />
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="font-semibold">These saved requests are no longer available.</p>
            <p className="mt-1 text-sm text-muted-foreground">They may have expired or been closed by the buyer.</p>
            <button type="button" onClick={onClearAll} className="mt-4 inline-flex rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-muted">Clear saved list</button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {ids.length} saved request{ids.length === 1 ? "" : "s"} · showing {pageIds.length}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {(data ?? []).map((r) => <RequestCard key={r.id} r={r} />)}
            </div>
            {pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
                <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
