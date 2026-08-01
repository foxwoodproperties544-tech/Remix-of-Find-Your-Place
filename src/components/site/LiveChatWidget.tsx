import { useCallback, useEffect, useRef, useState } from "react";
import { MessagesSquare, X, Send, Phone, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSupportAvailability,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  supportMessageFor,
  trackSupportClick,
  whatsappUrl,
  type Availability,
} from "@/lib/support";

type Msg = {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_role: "user" | "admin" | "system";
  body: string;
  created_at: string;
};

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Availability polling (every 60s)
  useEffect(() => {
    let cancelled = false;
    const load = () => fetchSupportAvailability().then((a) => { if (!cancelled) setAvail(a); });
    load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const sub = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  // Load or create session when opened & signed in & online
  const startSession = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "open")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let sid = existing?.id;
      if (!sid) {
        const { data: created, error } = await supabase
          .from("chat_sessions")
          .insert({ user_id: userId, subject: "Live chat" })
          .select("id")
          .single();
        if (error) throw error;
        sid = created.id;
      }
      setSessionId(sid);
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Msg[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId && avail?.online && !sessionId) startSession();
  }, [open, userId, avail?.online, sessionId, startSession]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Msg;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, open]);

  const send = async () => {
    const body = text.trim();
    if (!body || !sessionId || !userId) return;
    setSending(true);
    try {
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        sender_id: userId,
        sender_role: "user",
        body,
      });
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open live chat"
        className="hidden md:inline-flex fixed bottom-5 right-24 z-40 items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
      >
        <MessagesSquare className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-semibold">Live chat</span>
        <span
          className={`ml-1 h-2 w-2 rounded-full ${avail?.online ? "bg-emerald-400" : "bg-amber-400"}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Live chat with Foxwood Properties"
          className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "70vh" }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div>
              <div className="text-sm font-semibold">Foxwood Support</div>
              <div className="text-[11px] opacity-90 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${avail?.online ? "bg-emerald-300" : "bg-amber-300"}`} />
                {avail?.reason ?? "Checking availability…"}
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Offline fallback */}
          {avail && !avail.online && (
            <div className="p-4 space-y-3 text-sm">
              <p className="text-muted-foreground">
                Our agents are offline. We'll be back during business hours. In the meantime, reach us on:
              </p>
              <div className="grid gap-2">
                <a
                  href={`tel:${SUPPORT_PHONE_TEL}`}
                  onClick={() => trackSupportClick("call", "floating")}
                  className="btn-primary btn-primary-hover !py-2 !px-3 justify-center text-sm"
                >
                  <Phone className="h-4 w-4" /> Call {SUPPORT_PHONE_DISPLAY}
                </a>
                <a
                  href={whatsappUrl(supportMessageFor("floating"))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSupportClick("whatsapp", "floating")}
                  className="btn-secondary !py-2 !px-3 justify-center text-sm"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <a href="/help-center" className="btn-ghost !py-2 !px-3 justify-center text-sm">
                  Submit a support ticket
                </a>
              </div>
            </div>
          )}

          {/* Signed-out state */}
          {avail?.online && !userId && (
            <div className="p-4 space-y-3 text-sm">
              <p className="text-muted-foreground">Sign in to start a live chat with our team.</p>
              <a href="/auth" className="btn-primary btn-primary-hover !py-2 !px-3 justify-center text-sm">
                Sign in to chat
              </a>
              <div className="text-xs text-muted-foreground">Or WhatsApp us:</div>
              <a
                href={whatsappUrl(supportMessageFor("floating"))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSupportClick("whatsapp", "floating")}
                className="btn-secondary !py-2 !px-3 justify-center text-sm"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          )}

          {/* Chat view */}
          {avail?.online && userId && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30" style={{ minHeight: 200 }}>
                {loading && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {!loading && messages.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    Say hi! An agent will reply shortly.
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      m.sender_role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : m.sender_role === "admin"
                        ? "bg-card border border-border"
                        : "mx-auto bg-transparent text-xs text-muted-foreground"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-center gap-2 p-2 border-t border-border bg-card"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 rounded-full border border-border bg-field px-3 py-2 text-sm outline-none focus:border-primary"
                  aria-label="Chat message"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                  aria-label="Send"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
