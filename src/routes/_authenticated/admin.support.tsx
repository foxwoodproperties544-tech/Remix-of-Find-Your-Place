import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, MessagesSquare, LifeBuoy, Search, RefreshCw, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: AdminSupport,
  head: () => ({ meta: [{ title: "Support inbox — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  admin_response: string | null;
  screenshot_path: string | null;
  created_at: string;
  updated_at: string;
};

type ChatSession = {
  id: string;
  user_id: string;
  subject: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_role: "user" | "admin" | "system";
  body: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_user: "bg-purple-100 text-purple-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  normal: "bg-slate-100 text-slate-700",
  low: "bg-slate-100 text-slate-500",
};

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function AdminSupport() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const nav = useNavigate();
  const [tab, setTab] = useState<"tickets" | "chats">("tickets");

  useEffect(() => {
    if (!rolesLoading && !isAdmin) nav({ to: "/dashboard" });
  }, [rolesLoading, isAdmin, nav]);

  if (rolesLoading || !isAdmin) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support inbox</h1>
        <p className="text-sm text-muted-foreground">Answer tickets and reply in live chat sessions.</p>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <button
          onClick={() => setTab("tickets")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 ${tab === "tickets" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <LifeBuoy className="h-4 w-4" /> Tickets
        </button>
        <button
          onClick={() => setTab("chats")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 ${tab === "chats" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <MessagesSquare className="h-4 w-4" /> Live chats
        </button>
      </div>

      {tab === "tickets" ? <TicketsPanel /> : <ChatsPanel adminUserId={user!.id} />}
    </div>
  );
}

/* -------------------------------- Tickets -------------------------------- */

function TicketsPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("open");
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState<string>("in_progress");
  const [saving, setSaving] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(200);
    if (status !== "all") query = query.eq("status", status);
    const { data } = await query;
    const rows = (data ?? []) as Ticket[];
    setTickets(rows);
    if (rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name ?? "Unknown"; });
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  const filtered = useMemo(() => {
    if (!q.trim()) return tickets;
    const needle = q.trim().toLowerCase();
    return tickets.filter((t) =>
      t.subject.toLowerCase().includes(needle) ||
      t.body.toLowerCase().includes(needle) ||
      (names[t.user_id] ?? "").toLowerCase().includes(needle)
    );
  }, [q, tickets, names]);

  useEffect(() => {
    setScreenshotUrl(null);
    if (!active?.screenshot_path) return;
    supabase.storage.from("support-uploads").createSignedUrl(active.screenshot_path, 60 * 10)
      .then(({ data }) => setScreenshotUrl(data?.signedUrl ?? null));
  }, [active?.id, active?.screenshot_path]);

  const openTicket = (t: Ticket) => {
    setActive(t);
    setReply(t.admin_response ?? "");
    setNewStatus(t.status === "open" ? "in_progress" : t.status);
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    const patch: Partial<Ticket> = { admin_response: reply.trim() || null, status: newStatus };
    if (newStatus === "resolved" || newStatus === "closed") (patch as any).resolved_at = new Date().toISOString();
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", active.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }

    // Notify the ticket author
    await supabase.from("notifications").insert({
      user_id: active.user_id,
      type: `support_${newStatus}`,
      title: `Support: ${newStatus.replace("_", " ")}`,
      body: reply.trim() ? `Foxwood support replied to "${active.subject}"` : `Your ticket "${active.subject}" is ${newStatus.replace("_", " ")}.`,
      link: "/help-center",
    });

    toast.success("Ticket updated");
    setActive(null);
    load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="rounded-2xl border border-border bg-card">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, body, user"
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="waiting_user">Waiting on user</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <button onClick={load} className="btn-ghost !py-2 !px-3 text-sm"><RefreshCw className="h-4 w-4" /></button>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No tickets in this view.</div>
        ) : (
          <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {filtered.map((t) => (
              <li key={t.id}>
                <button onClick={() => openTicket(t)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/40 ${active?.id === t.id ? "bg-primary-soft/50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{t.subject}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {names[t.user_id] ?? "Unknown"} · {t.category} · {fmt(t.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status] ?? ""}`}>{t.status.replace("_", " ")}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${PRIORITY_STYLES[t.priority] ?? ""}`}>{t.priority}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card min-h-[400px]">
        {!active ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Select a ticket to reply.</div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-lg">{active.subject}</h3>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLES[active.status] ?? ""}`}>{active.status.replace("_", " ")}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                From {names[active.user_id] ?? active.user_id} · {active.category} · {active.priority} · {fmt(active.created_at)}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border p-4 text-sm whitespace-pre-wrap">{active.body}</div>
            {active.screenshot_path && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Screenshot</div>
                {screenshotUrl ? (
                  <a href={screenshotUrl} target="_blank" rel="noreferrer">
                    <img src={screenshotUrl} alt="Ticket screenshot" className="max-h-64 rounded-lg border border-border" />
                  </a>
                ) : (
                  <div className="text-xs text-muted-foreground">Loading preview…</div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your reply</label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={6}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Write a response to the user…" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="waiting_user">Waiting on user</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button onClick={save} disabled={saving} className="btn-primary btn-primary-hover !py-2 !px-4 text-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Save & notify
              </button>
              <button onClick={() => setActive(null)} className="btn-ghost !py-2 !px-3 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Chats --------------------------------- */

function ChatsPanel({ adminUserId }: { adminUserId: string }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("chat_sessions").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(100);
    const rows = (data ?? []) as ChatSession[];
    setSessions(rows);
    if (rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name ?? "Unknown"; });
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!active) return;
    supabase.from("chat_messages").select("*").eq("session_id", active.id).order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as ChatMessage[]));

    const ch = supabase
      .channel(`admin-chat:${active.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${active.id}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, active?.id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || !text.trim()) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      session_id: active.id, sender_id: adminUserId, sender_role: "admin", body,
    });
    if (error) { toast.error(error.message); setText(body); }
    // Notify the customer
    await supabase.from("notifications").insert({
      user_id: active.user_id, type: "chat_reply", title: "Foxwood support replied", body,
    });
    setSending(false);
  };

  const closeSession = async () => {
    if (!active) return;
    const { error } = await supabase.from("chat_sessions").update({ status: "closed" }).eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Session closed");
    setActive(null);
    load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="rounded-2xl border border-border bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold">Sessions ({sessions.length})</div>
          <button onClick={load} className="btn-ghost !py-2 !px-3 text-sm"><RefreshCw className="h-4 w-4" /></button>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No chat sessions yet.</div>
        ) : (
          <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {sessions.map((s) => (
              <li key={s.id}>
                <button onClick={() => setActive(s)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/40 ${active?.id === s.id ? "bg-primary-soft/50" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm truncate">{names[s.user_id] ?? "Unknown"}</div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.status === "open" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {s.subject ?? "Live chat"} · {fmt(s.last_message_at ?? s.created_at)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card flex flex-col min-h-[500px]">
        {!active ? (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Select a session to reply.</div>
        ) : (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{names[active.user_id] ?? "Unknown"}</div>
                <div className="text-[11px] text-muted-foreground">{active.subject ?? "Live chat"} · started {fmt(active.created_at)}</div>
              </div>
              {active.status !== "closed" && (
                <button onClick={closeSession} className="btn-ghost !py-2 !px-3 text-xs">Close session</button>
              )}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20" style={{ maxHeight: "60vh" }}>
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">No messages yet.</div>
              )}
              {messages.map((m) => (
                <div key={m.id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.sender_role === "admin"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : m.sender_role === "system"
                      ? "mx-auto bg-transparent text-xs text-muted-foreground"
                      : "bg-card border border-border"
                  }`}>
                  {m.body}
                  <div className={`text-[10px] mt-1 opacity-70 ${m.sender_role === "admin" ? "text-primary-foreground" : "text-muted-foreground"}`}>{fmt(m.created_at)}</div>
                </div>
              ))}
            </div>
            {active.status !== "closed" && (
              <form onSubmit={send} className="p-3 border-t border-border flex items-center gap-2 bg-card">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Reply as Foxwood support…"
                  className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary" />
                <button type="submit" disabled={sending || !text.trim()}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground disabled:opacity-50">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
