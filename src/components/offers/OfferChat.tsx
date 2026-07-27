import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { sendOfferMessage } from "@/lib/offers.functions";
import type { OfferMessage } from "@/lib/offers";

export function OfferChat({
  offerId, messages, meId, disabled,
}: { offerId: string; messages: OfferMessage[]; meId: string; disabled?: boolean }) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const send = useServerFn(sendOfferMessage);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);

  const mut = useMutation({
    mutationFn: () =>
      send({ data: { offerId, body: body.trim() || undefined, attachments: attachment.trim() ? [attachment.trim()] : undefined } }),
    onSuccess: () => {
      setBody(""); setAttachment(""); setShowAttach(false);
      qc.invalidateQueries({ queryKey: ["offer", offerId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Message not sent"),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">Private conversation</h2>
      <p className="mt-1 text-xs text-muted-foreground">Visible only to the buyer, the seller, the assigned agent and Foxwood admins.</p>

      <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
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

      {!disabled && (
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
            <button onClick={() => setShowAttach((v) => !v)} className="btn-ghost shrink-0" aria-label="Attach a file link"><Paperclip className="h-4 w-4" /></button>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && (body.trim() || attachment.trim())) { e.preventDefault(); mut.mutate(); } }}
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
      )}
    </section>
  );
}
