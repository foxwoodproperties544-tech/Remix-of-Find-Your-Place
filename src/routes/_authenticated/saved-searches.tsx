import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Trash2, Search, Info } from "lucide-react";
import { toast } from "sonner";
import { formatKsh } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/saved-searches")({
  component: SavedSearches,
  head: () => ({ meta: [{ title: "Saved searches — Foxwood Properties" }] }),
});

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, any>;
  notify_email: boolean;
  notify_whatsapp: boolean;
  created_at: string;
}

function SavedSearches() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["saved-searches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("id, name, filters, notify_email, notify_whatsapp, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedSearch[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_searches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["saved-searches"] }); },
  });

  const toggleNotify = useMutation({
    mutationFn: async ({ id, channel, on }: { id: string; channel: "notify_email" | "notify_whatsapp"; on: boolean }) => {
      const patch = channel === "notify_email" ? { notify_email: on } : { notify_whatsapp: on };
      const { error } = await supabase.from("saved_searches").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });

  return (
    <div className="container-page py-10">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1"><Bell className="h-3.5 w-3.5" /> Alerts</div>
        <h1 className="text-3xl font-bold mt-2">Saved searches</h1>
        <p className="text-sm text-muted-foreground mt-1">We'll notify you when new listings match your saved filters.</p>
      </div>

      <div className="mt-6 rounded-xl border border-primary/20 bg-primary-soft/50 p-4 flex items-start gap-3 text-xs text-primary/90">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Alerts are live. We check every hour and send an in-app notification the moment a new listing matches your saved filters. Toggle the bell to pause alerts for any search.</p>
      </div>


      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Search className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No saved searches yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Run a search you like, then hit "Save this search".</p>
            <Link to="/properties" className="btn-primary btn-primary-hover mt-4 inline-flex">Browse properties</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map(s => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{s.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(s.filters).filter(([, v]) => v !== "" && v !== undefined && v !== null).map(([k, v]) => (
                      <span key={k} className="rounded-full bg-muted text-xs px-2.5 py-0.5">
                        <span className="text-muted-foreground">{labelFor(k)}:</span> <span className="font-medium">{formatFilterValue(k, v)}</span>
                      </span>
                    ))}
                    {Object.keys(s.filters).length === 0 && <span className="text-xs text-muted-foreground">Any property</span>}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs flex-wrap">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={s.notify_email} onChange={e => toggleNotify.mutate({ id: s.id, channel: "notify_email", on: e.target.checked })} className="accent-primary" />
                      <span className="text-muted-foreground">Email me new matches</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={s.notify_whatsapp} onChange={e => toggleNotify.mutate({ id: s.id, channel: "notify_whatsapp", on: e.target.checked })} className="accent-primary" />
                      <span className="text-muted-foreground">WhatsApp alerts</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link to="/properties" search={s.filters as any} className="btn-primary btn-primary-hover !py-2 !px-4 text-xs"><Search className="h-3.5 w-3.5" /> Run</Link>
                  <button onClick={() => confirm("Remove this saved search?") && del.mutate(s.id)} className="btn-ghost !px-3 !py-2 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function labelFor(k: string) {
  return ({ q: "Search", category: "Category", type: "Type", county: "County", minPrice: "Min price", maxPrice: "Max price", minBeds: "Min beds" } as Record<string,string>)[k] ?? k;
}
function formatFilterValue(k: string, v: any) {
  if (k === "minPrice" || k === "maxPrice") return formatKsh(Number(v));
  return String(v);
}
