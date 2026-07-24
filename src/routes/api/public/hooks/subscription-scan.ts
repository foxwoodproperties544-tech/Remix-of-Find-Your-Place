import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily automation hook — call from pg_cron.
 * 1. Sends renewal reminders (14/7/3/1/0 days before tier expiry).
 * 2. Runs the expiry sweep (applies grace periods, downgrades, expires listings).
 */
export const Route = createFileRoute("/api/public/hooks/subscription-scan")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: reminded, error: rErr } = await supabaseAdmin.rpc("send_subscription_reminders");
        if (rErr) return Response.json({ ok: false, step: "reminders", error: rErr.message }, { status: 500 });
        const { error: eErr } = await supabaseAdmin.rpc("expire_listing_packages");
        if (eErr) return Response.json({ ok: false, step: "expire", error: eErr.message }, { status: 500 });
        return Response.json({ ok: true, remindersSent: reminded ?? 0 });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run the scan" }),
    },
  },
});
