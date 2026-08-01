import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare } from "lucide-react";
import type { Conversation } from "@/lib/rentals";

export const Route = createFileRoute("/_authenticated/dashboard/messages/")({
  component: Inbox,
  head: () => ({ meta: [{ title: "Messages — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function Inbox() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("conversations" as any)
        .select("*, property:properties(id, title, slug, images)")
        .order("last_message_at", { ascending: false });
      return (rows ?? []) as unknown as Conversation[];
    },
  });

  const rows = data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="text-sm text-muted-foreground">
        Private, on-platform conversations between you and the other party on a listing.
      </p>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading conversations…</p>}

      {!isLoading && rows.length === 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-bold">No conversations yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start one from any listing with the “Message agent” button.
          </p>
          <Link to="/properties" className="btn-primary mt-4 inline-flex">Browse listings</Link>
        </div>
      )}

      <ul className="mt-6 space-y-2">
        {rows.map((c) => (
          <li key={c.id}>
            <Link
              to="/dashboard/messages/$id"
              params={{ id: c.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary"
            >
              {c.property?.images?.[0] ? (
                <img src={c.property.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted"><MessageSquare className="h-5 w-5" /></div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.subject ?? c.property?.title ?? "Conversation"}</p>
                <p className="text-xs text-muted-foreground">
                  {c.agent_id === user?.id ? "With a buyer/tenant" : "With the listing agent"} · last activity{" "}
                  {new Date(c.last_message_at).toLocaleString()}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
