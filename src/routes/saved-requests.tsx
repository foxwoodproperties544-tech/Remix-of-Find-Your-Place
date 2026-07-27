import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/site/PageHero";
import { RequestCard } from "@/components/requests/RequestCard";
import { fetchRequestsByIds } from "@/lib/property-requests";
import { useSavedRequests } from "@/hooks/use-saved-requests";
import { absoluteUrl } from "@/lib/site-url";
import { Loader2, Bookmark, Trash2 } from "lucide-react";
import heroTools from "@/assets/hero-tools.jpg";

const TITLE = "Saved Property Requests | Foxwood Properties";
const DESC = "Your bookmarked buyer and tenant property requests on Foxwood Properties. Come back and respond when you have a matching listing.";

export const Route = createFileRoute("/saved-requests")({
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
  const { ids, clear } = useSavedRequests();
  const { data, isLoading } = useQuery({
    queryKey: ["saved-requests", ids],
    queryFn: () => fetchRequestsByIds(ids),
    enabled: ids.length > 0,
  });

  return (
    <>
      <PageHero
        image={heroTools}
        eyebrow="Property Request Marketplace"
        title="Saved requests"
        subtitle="Requests you bookmarked while browsing. Saved on this device."
      />

      <section className="container-page py-10">
        {ids.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">You haven't saved any requests yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Tap the bookmark icon on any request to keep it here.</p>
            <Link to="/property-requests" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Browse requests</Link>
          </div>
        ) : isLoading ? (
          <div className="grid place-items-center py-24 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{data?.length ?? 0} saved request{(data?.length ?? 0) === 1 ? "" : "s"}</p>
              <button type="button" onClick={clear} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                <Trash2 className="h-4 w-4" /> Clear all
              </button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {(data ?? []).map((r) => <RequestCard key={r.id} r={r} />)}
            </div>
          </>
        )}
      </section>
    </>
  );
}
