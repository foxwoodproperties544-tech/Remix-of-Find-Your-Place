import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/leads";
import { LeadStatusBadge } from "@/components/site/LeadStatusBadge";
import { PlusCircle, Users, Mail, Phone as PhoneIcon, MessageCircle, ExternalLink, LayoutGrid, List as ListIcon } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads (CRM) — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

type Lead = {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  status: LeadStatus;
  source: string;
  priority: string;
  assigned_to: string | null;
  owner_id: string | null;
  property_id: string | null;
  deal_value: number | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
  message: string | null;
};

function LeadsPage() {
  const { user } = useAuth();
  const { isAdmin, isAgent } = useRoles();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");

  const canSeeAll = isAdmin;

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", user?.id, scope, canSeeAll],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select("id, contact_name, contact_email, contact_phone, contact_whatsapp, status, source, priority, assigned_to, owner_id, property_id, deal_value, next_follow_up_at, last_contacted_at, created_at, message")
        .order("created_at", { ascending: false });
      if (scope === "mine" || !canSeeAll) {
        q = q.or(`assigned_to.eq.${user!.id},owner_id.eq.${user!.id},created_by.eq.${user!.id}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Lead[];
    },
  });

  const filtered = useMemo(() => {
    let list = leads ?? [];
    if (statusFilter !== "all") list = list.filter(l => l.status === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(l =>
        l.contact_name.toLowerCase().includes(s) ||
        (l.contact_email ?? "").toLowerCase().includes(s) ||
        (l.contact_phone ?? "").toLowerCase().includes(s));
    }
    return list;
  }, [leads, statusFilter, search]);

  const byStatus = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = { new: [], contacted: [], qualified: [], viewing_scheduled: [], negotiation: [], won: [], lost: [] };
    for (const l of filtered) map[l.status].push(l);
    return map;
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: leads?.length ?? 0 };
    for (const s of LEAD_STATUSES) c[s] = (leads ?? []).filter(l => l.status === s).length;
    return c;
  }, [leads]);

  return (
    <div className="container-page py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <Users className="h-3.5 w-3.5" /> CRM
          </div>
          <h1 className="text-3xl font-bold mt-2">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.total} total · {counts.new} new · {counts.won} won
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/dashboard/crm" className="btn-ghost !py-2 !px-4 text-sm">CRM Insights</Link>
          {(isAdmin || isAgent) && (
            <Link to="/dashboard/leads/new" className="btn-primary btn-primary-hover !py-2 !px-4 text-sm">
              <PlusCircle className="h-4 w-4" /> New lead
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-2 flex-wrap">
        {canSeeAll && (
          <div className="inline-flex rounded-full bg-muted p-1 text-xs">
            {(["mine", "all"] as const).map(s => (
              <button key={s} onClick={() => setScope(s)}
                className={`rounded-full px-3 py-1.5 font-semibold capitalize ${scope === s ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}>
                {s === "mine" ? "My leads" : "All leads"}
              </button>
            ))}
          </div>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone"
          className="rounded-full border border-border bg-background px-4 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm">
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
        </select>
        <div className="ml-auto inline-flex rounded-full border border-border p-1 text-xs">
          <button onClick={() => setView("board")} aria-label="Board view"
            className={`rounded-full px-2.5 py-1.5 ${view === "board" ? "bg-primary-soft text-primary" : "text-foreground/70"}`}><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setView("list")} aria-label="List view"
            className={`rounded-full px-2.5 py-1.5 ${view === "list" ? "bg-primary-soft text-primary" : "text-foreground/70"}`}><ListIcon className="h-4 w-4" /></button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : !filtered.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No leads yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Enquiries and viewing requests will show up here automatically.</p>
        </div>
      ) : view === "board" ? (
        <div className="mt-6 grid gap-4 grid-flow-col auto-cols-[minmax(260px,1fr)] overflow-x-auto pb-4">
          {LEAD_STATUSES.map(s => (
            <div key={s} className="rounded-2xl bg-muted/40 border border-border p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <LeadStatusBadge status={s} />
                <span className="text-xs text-muted-foreground">{byStatus[s].length}</span>
              </div>
              <div className="space-y-2">
                {byStatus[s].map(l => <LeadCard key={l.id} lead={l} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link to="/dashboard/leads/$id" params={{ id: l.id }} className="font-medium hover:text-primary">{l.contact_name}</Link>
                    <div className="text-xs text-muted-foreground">{l.contact_email ?? l.contact_phone}</div>
                  </td>
                  <td className="px-4 py-3"><LeadStatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{l.source.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.next_follow_up_at ? new Date(l.next_follow_up_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/dashboard/leads/$id" params={{ id: l.id }} className="btn-ghost !py-1.5 !px-3 text-xs">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link to="/dashboard/leads/$id" params={{ id: lead.id }}
      className="block rounded-xl bg-background border border-border p-3 hover:shadow-soft hover:border-primary/40 transition">
      <div className="font-medium text-sm truncate">{lead.contact_name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {lead.contact_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{lead.contact_email}</span>}
        {lead.contact_phone && <span className="inline-flex items-center gap-1"><PhoneIcon className="h-3 w-3" />{lead.contact_phone}</span>}
      </div>
      {lead.message && <p className="mt-2 text-xs text-foreground/70 line-clamp-2">{lead.message}</p>}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="capitalize">{lead.source.replace("_", " ")}</span>
        {lead.next_follow_up_at && <span>↻ {new Date(lead.next_follow_up_at).toLocaleDateString()}</span>}
      </div>
    </Link>
  );
}
