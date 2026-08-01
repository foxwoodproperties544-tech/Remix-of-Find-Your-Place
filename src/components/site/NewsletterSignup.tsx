import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { subscribeNewsletter } from "@/lib/blog";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { useAuth } from "@/hooks/use-auth";

/** Email capture used in the footer and blog sidebar. */
export function NewsletterSignup({ variant = "footer" }: { variant?: "footer" | "plain" }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean) || clean.length > 255) {
      toast.error("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const allowed = await checkRateLimit("newsletter", rateLimitKey(user?.id), 5, 3600);
      if (!allowed) {
        toast.error("Too many attempts. Please try again later.");
        return;
      }
      const res = await subscribeNewsletter(clean);
      if (!res.ok) {
        toast.error(res.error ?? "Could not subscribe. Try again.");
        return;
      }
      setDone(true);
      setEmail("");
      toast.success("You're subscribed — new listings and market tips are on the way.");
    } finally {
      setBusy(false);
    }
  };

  const isFooter = variant === "footer";

  if (done) {
    return (
      <p className={isFooter ? "text-sm text-primary-foreground/85" : "text-sm text-muted-foreground"}>
        Thanks! Check your inbox for Foxwood updates.
      </p>
    );
  }

  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor={`newsletter-${variant}`}>Email address</label>
      <input
        id={`newsletter-${variant}`}
        type="email"
        required
        maxLength={255}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className={
          isFooter
            ? "flex-1 min-w-0 rounded-full border border-primary-foreground/30 bg-background/10 backdrop-blur px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-secondary"
            : "flex-1 min-w-0 rounded-lg border border-border bg-field px-3 py-2 text-sm outline-none focus:border-primary"
        }
      />
      <button
        type="submit"
        disabled={busy}
        className={isFooter ? "btn-secondary !py-2 !px-4 text-sm disabled:opacity-70" : "rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-70"}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
      </button>
    </form>
  );
}
