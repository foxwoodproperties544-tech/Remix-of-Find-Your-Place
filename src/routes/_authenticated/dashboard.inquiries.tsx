import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Inbox, Mail, Phone as PhoneIcon, Calendar, ExternalLink, Check, X, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/inquiries")({
  component: Inquiries,
  head: () => ({ meta: [{ title: "Inquiries — Foxwood Properties" }] }),
});

interface Inquiry {
  id: string;
  property_key: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  preferred_date: string | null;
  status: string;
  created_at: string;
}

function Inquiries() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-inquiries", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("id, property_key, name, email, phone, message, preferred_date, status, created_at")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Inquiry[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["my-inquiries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="container-page py-10">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1"><Inbox className="h-3.5 w-3.5" /> Inquiries</div>
        <h1 className="text-3xl font-bold mt-2">Viewing requests</h1>
        <p className="text-sm text-muted-foreground mt-1">People who reached out about your listings.</p>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No inquiries yet</h3>
            <p className="text-sm text-muted-foreground mt-1">When someone requests a viewing, it will show up here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map(q => (
              <div key={q.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{q.name}</h3>
                      <StatusBadge status={q.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <a href={`mailto:${q.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" /> {q.email}</a>
                      {q.phone && <a href={`tel:${q.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><PhoneIcon className="h-3 w-3" /> {q.phone}</a>}
                      {q.preferred_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(q.preferred_date).toLocaleDateString()}</span>}
                      <span>· {new Date(q.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to="/properties/$id" params={{ id: q.property_key }} className="btn-ghost !px-3 !py-2 text-xs" title="View listing"><ExternalLink className="h-4 w-4" /></Link>
                    <LeadLink inquiryId={q.id} />
                    {q.status !== "contacted" && (
                      <button onClick={() => setStatus.mutate({ id: q.id, status: "contacted" })} className="btn-ghost !px-3 !py-2 text-xs text-primary" title="Mark contacted"><Check className="h-4 w-4" /></button>
                    )}
                    {q.status !== "closed" && (
                      <button onClick={() => setStatus.mutate({ id: q.id, status: "closed" })} className="btn-ghost !px-3 !py-2 text-xs text-muted-foreground" title="Close"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap">{q.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-secondary/15 text-secondary",
    contacted: "bg-primary-soft text-primary",
    closed: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-semibold capitalize ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function LeadLink({ inquiryId }: { inquiryId: string }) {
  const { data } = useQuery({
    queryKey: ["inquiry-lead", inquiryId],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id").eq("inquiry_id", inquiryId).maybeSingle();
      return data;
    },
  });
  if (!data) return null;
  return <Link to="/dashboard/leads/$id" params={{ id: data.id }} className="btn-ghost !px-3 !py-2 text-xs text-primary" title="Open lead in CRM"><Users className="h-4 w-4" /></Link>;
}
