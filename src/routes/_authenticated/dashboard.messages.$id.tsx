import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Paperclip, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sendConversationMessage, markConversationRead } from "@/lib/messaging.functions";
import type { Conversation, ConversationMessage } from "@/lib/rentals";

export const Route = createFileRoute("/_authenticated/dashboard/messages/$id")({
  component: Thread,
  head: () => ({ meta: [{ title: "Conversation — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function Thread() {
  const { id } = useParams({ from: "/_authenticated/dashboard/messages/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState("");
  const [showAttach, setShowAttach] = useState(false);

  const send = useServerFn(sendConversationMessage);
  const markRead = useServerFn(markConversationRead);

  const convQ = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations" as any)
        .select("*, property:properties(id, title, slug, images)")
        .eq("id", id)
        .maybeSingle();
      return (data ?? null) as unknown as Conversation | null;
    },
  });

  const msgQ = useQuery({
    queryKey: ["conversation-messages", id],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversation_messages" as any)
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as ConversationMessage[];
    },
  });

  const messages = msgQ.data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  useEffect(() => {
    if (messages.length) markRead({ data: { conversationId: id } }).catch(() => {});
  }, [messages.length, id, markRead]);

  const mut = useMutation({
    mutationFn: () =>
      send({
        data: {
          conversationId: id,
          body: body.trim() || undefined,
          attachments: attachment.trim() ? [attachment.trim()] : undefined,
        },
      }),
    onSuccess: () => {
      setBody("");
      setAttachment("");
      setShowAttach(false);
      qc.invalidateQueries({ queryKey: ["conversation-messages", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Message not sent"),
  });

  const conv = convQ.data;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard/messages" className="btn-ghost mb-3 inline-flex"><ArrowLeft className="h-4 w-4" /> All messages</Link>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h1 className="text-lg font-bold">{conv?.subject ?? conv?.property?.title ?? "Conversation"}</h1>
        {conv?.property && (
          <Link
            to="/properties/$id"
            params={{ id: conv.property.slug ?? conv.property.id }}
            className="text-xs text-primary underline"
          >
            View the listing
          </Link>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Visible only to you, the other party and Foxwood admins.
        </p>

        <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {msgQ.isLoading && <p className="text-sm text-muted-foreground">Loading messages…</p>}
          {!msgQ.isLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                  {m.attachments?.map((a) => (
                    <a key={a} href={a} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs underline">
                      <Paperclip className="mr-1 inline h-3 w-3" />{a.split("/").pop()}
                    </a>
                  ))}
                  <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleString()}{mine ? (m.read_at ? " · Read" : " · Sent") : ""}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="mt-4 space-y-2">
          {showAttach && (
            <input
              value={attachment}
              onChange={(e) => setAttachment(e.target.value)}
              placeholder="Paste an image or document link (https://…)"
              className="input-base text-sm"
            />
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowAttach((v) => !v)} className="btn-ghost shrink-0" aria-label="Attach a file link">
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && (body.trim() || attachment.trim())) {
                  e.preventDefault();
                  mut.mutate();
                }
              }}
              placeholder="Write a message…"
              maxLength={4000}
              className="input-base flex-1"
            />
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || (!body.trim() && !attachment.trim())}
              className="btn-primary shrink-0 disabled:opacity-50"
            >
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
