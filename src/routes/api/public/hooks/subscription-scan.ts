import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily automation hook — call from pg_cron.
 * 1. Sends renewal reminders (14/7/3/1/0 days before tier expiry).
 * 2. Runs the expiry sweep (applies grace periods, downgrades, expires listings).
 * Every invocation logs a row in `scan_runs` so admins can see history + errors.
 */
export const Route = createFileRoute("/api/public/hooks/subscription-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        const url = new URL(request.url);
        const triggeredBy = url.searchParams.get("by") ?? "cron";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const log = async (row: {
          ok: boolean;
          reminders_sent?: number;
          error_step?: string | null;
          error_message?: string | null;
        }) => {
          await supabaseAdmin.from("scan_runs").insert({
            ok: row.ok,
            reminders_sent: row.reminders_sent ?? 0,
            error_step: row.error_step ?? null,
            error_message: row.error_message ?? null,
            duration_ms: Date.now() - started,
            triggered_by: triggeredBy,
          });
        };

        const { data: reminded, error: rErr } = await supabaseAdmin.rpc("send_subscription_reminders");
        if (rErr) {
          await log({ ok: false, error_step: "reminders", error_message: rErr.message });
          return Response.json({ ok: false, step: "reminders", error: rErr.message }, { status: 500 });
        }
        const { error: eErr } = await supabaseAdmin.rpc("expire_listing_packages");
        if (eErr) {
          await log({ ok: false, reminders_sent: reminded ?? 0, error_step: "expire", error_message: eErr.message });
          return Response.json({ ok: false, step: "expire", error: eErr.message }, { status: 500 });
        }
        await log({ ok: true, reminders_sent: reminded ?? 0 });
        return Response.json({ ok: true, remindersSent: reminded ?? 0, durationMs: Date.now() - started });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run the scan" }),
    },
  },
});
