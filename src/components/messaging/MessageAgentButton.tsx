import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MessageSquare, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { startConversation } from "@/lib/messaging.functions";

export function MessageAgentButton({
  propertyId,
  propertyTitle,
  className,
}: {
  propertyId: string;
  propertyTitle: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(`Hi, I'm interested in "${propertyTitle}". Is it still available?`);
  const { user } = useAuth();
  const navigate = useNavigate();
  const start = useServerFn(startConversation);

  const mut = useMutation({
    mutationFn: () => start({ data: { propertyId, body: body.trim() } }),
    onSuccess: (res: any) => {
      setOpen(false);
      toast.success("Message sent — the agent has been notified");
      navigate({ to: "/dashboard/messages/$id", params: { id: res.conversationId } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Message not sent"),
  });

  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "btn-ghost"} aria-haspopup="dialog">
        <MessageSquare className="h-4 w-4" /> Message agent
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Message the agent">
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-card p-5 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Message the agent</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Private, on-platform conversation about {propertyTitle}.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>

            {!user ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Sign in to keep the whole conversation in one secure inbox.</p>
                <Link to="/auth" className="btn-primary w-full justify-center">Sign in to message</Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  className="input-base w-full"
                  placeholder="Write your message…"
                />
                <button
                  onClick={() => mut.mutate()}
                  disabled={mut.isPending || body.trim().length < 1}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Send message
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
