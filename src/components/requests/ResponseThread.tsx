import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MessageSquare, Send, CheckCircle2, XCircle, ShieldCheck, ExternalLink, Loader2, Paperclip } from "lucide-react";
import {
  requestWhatsappMessage,
  whatsappHref,
  type PropertyRequest,
  type RequestResponse,
  type RequestMessage,
} from "@/lib/property-requests";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  verified: boolean | null;
  whatsapp: string | null;
  phone: string | null;
  role_primary: string | null;
}

export function ResponseThread({ request }: { request: PropertyRequest }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOwner = user?.id === request.user_id;

  const { data: responses, isLoading } = useQuery({
    queryKey: ["request-responses", request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_request_responses" as any)
        .select("*")
        .eq("request_id", request.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RequestResponse[];
    },
    enabled: !!user,
  });

  const responderIds = useMemo(() => [...new Set((responses ?? []).map((r) => r.responder_id))], [responses]);
  const { data: profiles } = useQuery({
    queryKey: ["request-responder-profiles", responderIds],
    enabled: responderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("id, full_name, avatar_url, company_name, verified, whatsapp, phone, role_primary")
        .in("id", responderIds);
      const map = new Map<string, Profile>();
      for (const p of (data ?? []) as any[]) map.set(p.id, p as Profile);
      return map;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "rejected" }) => {
      const { error } = await supabase.from("property_request_responses" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Response updated");
      qc.invalidateQueries({ queryKey: ["request-responses", request.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update response"),
  });

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="font-semibold">Sign in to view and send responses</p>
        <p className="mt-1 text-sm text-muted-foreground">Responses are private between the buyer and responding professionals.</p>
        <Link to="/auth" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isOwner && <RespondForm request={request} />}

      <h3 className="text-lg font-bold flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" /> Responses ({responses?.length ?? 0})
      </h3>

      {isLoading ? (
        <div className="py-8 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : !responses?.length ? (
        <p className="text-sm text-muted-foreground">No responses yet.</p>
      ) : (
        responses.map((r) => {
          const p = profiles?.get(r.responder_id);
          const wa = p?.whatsapp || p?.phone;
          return (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{p?.full_name ?? "Foxwood professional"}</span>
                {p?.company_name && <span className="text-xs text-muted-foreground">{p.company_name}</span>}
                {p?.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
                <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                  r.status === "accepted" ? "bg-primary text-primary-foreground"
                    : r.status === "rejected" ? "bg-muted text-muted-foreground"
                    : "bg-secondary/15 text-secondary"
                }`}>{r.status}</span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm">{r.message}</p>

              <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                {r.price != null && <div><dt className="font-semibold text-foreground">Price</dt><dd>KES {Number(r.price).toLocaleString()}</dd></div>}
                {r.availability && <div><dt className="font-semibold text-foreground">Availability</dt><dd>{r.availability}</dd></div>}
                {r.viewing_dates && <div><dt className="font-semibold text-foreground">Viewing dates</dt><dd>{r.viewing_dates}</dd></div>}
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {r.property_id && (
                  <Link to="/properties/$id" params={{ id: r.property_id }} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                    View listing <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                {r.property_link && (
                  <a href={r.property_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                    Property link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {r.attachments?.map((a, i) => (
                  <a key={i} href={a} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">
                    <Paperclip className="h-3 w-3" /> Attachment {i + 1}
                  </a>
                ))}
                {wa && request.allow_whatsapp && (
                  <a
                    href={whatsappHref(wa, requestWhatsappMessage(request.title, (r.property_id ?? r.id).slice(0, 8).toUpperCase()))}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    WhatsApp
                  </a>
                )}
                {isOwner && r.status === "pending" && (
                  <>
                    <button onClick={() => setStatus.mutate({ id: r.id, status: "accepted" })} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Accept
                    </button>
                    <button onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </>
                )}
              </div>

              <MessageThread responseId={r.id} />
            </article>
          );
        })
      )}
    </div>
  );
}

function MessageThread({ responseId }: { responseId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);

  const { data: messages } = useQuery({
    queryKey: ["request-messages", responseId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_request_messages" as any)
        .select("*")
        .eq("response_id", responseId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as RequestMessage[];
    },
  });

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`req-msg-${responseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "property_request_messages", filter: `response_id=eq.${responseId}` }, () => {
        qc.invalidateQueries({ queryKey: ["request-messages", responseId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, responseId, qc]);

  // read receipts
  useEffect(() => {
    if (!open || !messages?.length || !user) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at);
    if (!unread.length) return;
    supabase
      .from("property_request_messages" as any)
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((m) => m.id))
      .then(() => qc.invalidateQueries({ queryKey: ["request-messages", responseId] }));
  }, [open, messages, user, responseId, qc]);

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to send messages");
      const text = body.trim();
      if (!text) throw new Error("Message cannot be empty");
      if (text.length > 2000) throw new Error("Message is too long");
      const ok = await checkRateLimit("request_message", rateLimitKey(user.id), 30, 300);
      if (!ok) throw new Error("Too many messages — please wait a moment");
      const { error } = await supabase.from("property_request_messages" as any).insert({
        response_id: responseId,
        sender_id: user.id,
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["request-messages", responseId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mt-4 border-t border-border/70 pt-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-primary hover:underline">
        {open ? "Hide conversation" : "Open conversation"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-3">
            {!messages?.length ? (
              <p className="text-xs text-muted-foreground">No messages yet — start the conversation.</p>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${mine ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString()}
                      {mine && (m.read_at ? " · Read" : " · Sent")}
                    </p>
                  </div>
                );
              })
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send.mutate(); }}
            className="flex items-center gap-2"
          >
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="Write a message…"
              className="input-base"
            />
            <button type="submit" disabled={send.isPending} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function RespondForm({ request }: { request: PropertyRequest }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ message: "", price: "", property_id: "", property_link: "", availability: "", viewing_dates: "" });

  const { data: myListings } = useQuery({
    queryKey: ["my-listings-for-response", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, title, price").eq("owner_id", user!.id).eq("status", "published").limit(50);
      return (data ?? []) as { id: string; title: string; price: number }[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to respond");
      const msg = form.message.trim();
      if (msg.length < 20) throw new Error("Please write at least 20 characters");
      if (msg.length > 4000) throw new Error("Response is too long");
      const ok = await checkRateLimit("request_response", rateLimitKey(user.id), 10, 3600);
      if (!ok) throw new Error("Too many responses — please try again later");
      const { error } = await supabase.from("property_request_responses" as any).insert({
        request_id: request.id,
        responder_id: user.id,
        property_id: form.property_id || null,
        message: msg,
        price: form.price ? Number(form.price) : null,
        property_link: form.property_link || null,
        availability: form.availability || null,
        viewing_dates: form.viewing_dates || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Response sent to the buyer");
      setForm({ message: "", price: "", property_id: "", property_link: "", availability: "", viewing_dates: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["request-responses", request.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send response"),
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-primary/50 bg-primary-soft/40 px-5 py-4 text-sm font-semibold text-primary hover:bg-primary-soft">
        Respond with a matching property
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
    >
      <h3 className="font-bold">Respond to this request</h3>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Use one of your listings (optional)</span>
        <select className="input-base" value={form.property_id} onChange={(e) => {
          const id = e.target.value;
          const l = myListings?.find((m) => m.id === id);
          setForm((f) => ({ ...f, property_id: id, price: l ? String(l.price) : f.price }));
        }}>
          <option value="">Custom proposal</option>
          {myListings?.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Response message</span>
        <textarea rows={5} maxLength={4000} required className="input-base" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Describe the property, why it matches, and next steps." />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Price (KES)</span>
          <input type="number" className="input-base" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Property link</span>
          <input type="url" className="input-base" value={form.property_link} onChange={(e) => setForm((f) => ({ ...f, property_link: e.target.value }))} placeholder="https://" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Availability</span>
          <input className="input-base" value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))} placeholder="Available immediately" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Viewing dates</span>
          <input className="input-base" value={form.viewing_dates} onChange={(e) => setForm((f) => ({ ...f, viewing_dates: e.target.value }))} placeholder="Weekdays 10am–4pm" />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={submit.isPending} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {submit.isPending ? "Sending…" : "Send response"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
      </div>
    </form>
  );
}
