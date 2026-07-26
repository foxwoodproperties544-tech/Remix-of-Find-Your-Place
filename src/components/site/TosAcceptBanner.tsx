import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENT_TOS_VERSION, CURRENT_TOS_LABEL } from "@/lib/tos";
import { toast } from "sonner";
import { ShieldCheck, X } from "lucide-react";

const dismissKey = (userId: string) => `foxwood:tos-dismissed:${userId}:${CURRENT_TOS_VERSION}`;

export function TosAcceptBanner() {
  const { user } = useAuth();
  const [needsAccept, setNeedsAccept] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setNeedsAccept(false); setDismissed(true); return; }
    try {
      setDismissed(window.localStorage.getItem(dismissKey(user.id)) === "1");
    } catch { setDismissed(false); }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("tos_version_accepted")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setNeedsAccept((data?.tos_version_accepted ?? null) !== CURRENT_TOS_VERSION);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  function dismiss() {
    setDismissed(true);
    if (!user) return;
    try { window.localStorage.setItem(dismissKey(user.id), "1"); } catch { /* ignore */ }
  }

  async function accept() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ tos_version_accepted: CURRENT_TOS_VERSION, tos_accepted_at: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks — updated terms accepted.");
    setNeedsAccept(false);
    try { window.localStorage.setItem(dismissKey(user.id), "1"); } catch { /* ignore */ }
  }

  if (!user || !needsAccept || dismissed) return null;


  return (
    <div className="sticky top-0 z-40 border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="container-page flex flex-wrap items-center gap-3 py-2 text-sm">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span className="flex-1 min-w-[220px]">
          We updated our Terms &amp; Privacy Policy (v{CURRENT_TOS_LABEL}). Please review and accept to continue using Foxwood.
        </span>
        <Link
          to="/terms"
          className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-semibold"
        >
          Read terms
        </Link>
        <button
          type="button"
          onClick={accept}
          disabled={saving}
          className="rounded-md bg-secondary hover:opacity-90 px-3 py-1 text-xs font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "I accept"}
        </button>
        <button
          type="button"
          aria-label="Dismiss for now"
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
