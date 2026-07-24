import { createFileRoute } from "@tanstack/react-router";

type CallbackItem = { Name: string; Value?: string | number };
type Callback = {
  Body?: {
    stkCallback?: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: CallbackItem[] };
    };
  };
};

export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: Callback;
        try { payload = (await request.json()) as Callback; }
        catch { return Response.json({ ResultCode: 0, ResultDesc: "Accepted" }); }

        const stk = payload?.Body?.stkCallback;
        if (!stk) return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Look up the pending transaction by checkout id
        const { data: txn } = await supabaseAdmin
          .from("mpesa_transactions")
          .select("*")
          .eq("checkout_request_id", stk.CheckoutRequestID)
          .maybeSingle();

        // Unknown callback — accept but do nothing (never create purchases from
        // an unverified callback).
        if (!txn) return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });

        // Cross-check MerchantRequestID matches the one we recorded when we
        // initiated the STK push. Rejects spoofed callbacks that guess a
        // CheckoutRequestID but not the paired MerchantRequestID.
        if (txn.merchant_request_id && txn.merchant_request_id !== stk.MerchantRequestID) {
          return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
        }

        // Idempotency: if this txn is already in a terminal state, ack and skip
        // side-effects. Safaricom retries callbacks; without this we would
        // re-activate purchases and re-send notifications on every retry.
        if (txn.status === "success" || txn.status === "failed" || txn.status === "cancelled") {
          return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
        }

        const success = stk.ResultCode === 0;
        let receipt: string | undefined;
        if (success && stk.CallbackMetadata?.Item) {
          for (const it of stk.CallbackMetadata.Item) {
            if (it.Name === "MpesaReceiptNumber") receipt = String(it.Value);
          }
        }

        // Guarded update: only flip from `pending` → terminal. If a concurrent
        // callback beat us to it, `updated` will be null and we skip effects.
        const { data: updated } = await supabaseAdmin.from("mpesa_transactions").update({
          status: success ? "success" : stk.ResultCode === 1032 ? "cancelled" : "failed",
          result_code: stk.ResultCode,
          result_desc: stk.ResultDesc,
          mpesa_receipt: receipt,
          raw_callback: JSON.parse(JSON.stringify(payload)),
        }).eq("id", txn.id).eq("status", "pending").select("id").maybeSingle();

        if (!updated) return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });

        if (success && txn) {
          // Apply the purchase effect
          if (txn.purpose === "feature_listing" && txn.property_id && txn.duration_days) {
            const until = new Date(Date.now() + txn.duration_days * 86400_000).toISOString();
            await supabaseAdmin.from("properties").update({
              is_featured: true, featured_until: until, featured: true,
            }).eq("id", txn.property_id);
          } else if (txn.purpose === "upgrade_tier" && txn.tier) {
            const { data: plan } = await supabaseAdmin
              .from("tier_plans").select("*").eq("slug", txn.tier).maybeSingle();
            const days = plan?.duration_days ?? txn.duration_days ?? 30;
            const quota = plan?.listing_quota ?? 3;
            // Renewal of the *same* active plan extends from the current expiry;
            // a new/upgrade plan starts today.
            const { data: cur } = await supabaseAdmin
              .from("profiles").select("tier, tier_expires_at").eq("id", txn.user_id).maybeSingle();
            const base =
              cur?.tier === txn.tier && cur?.tier_expires_at && new Date(cur.tier_expires_at).getTime() > Date.now()
                ? new Date(cur.tier_expires_at).getTime()
                : Date.now();
            const expires = new Date(base + days * 86400_000).toISOString();
            await supabaseAdmin.from("profiles").update({
              tier: txn.tier,
              tier_expires_at: expires,
              listing_quota: quota,
              subscription_started_at: cur?.tier === txn.tier ? undefined : new Date().toISOString(),
              pending_tier: null,
              subscription_suspended: false,
              last_expiry_reminder_days: null,
            }).eq("id", txn.user_id);
            // Promote to agent role so they can access the Listings section.
            await supabaseAdmin.from("user_roles").upsert(
              { user_id: txn.user_id, role: "agent" as any },
              { onConflict: "user_id,role" }
            );

          } else if (txn.purpose === "verification_fee" && txn.property_id) {
            // Auto-create a pending verification request tied to the payment
            await supabaseAdmin.from("verification_requests").insert({
              property_id: txn.property_id,
              user_id: txn.user_id,
              notes: `Verification fee paid (${receipt ?? "unknown"})`,
            });
          } else if (txn.purpose === "listing_package" && txn.property_id && txn.package_id) {
            const { data: pkg } = await supabaseAdmin
              .from("listing_packages").select("*").eq("id", txn.package_id).maybeSingle();
            const days = pkg?.duration_days ?? txn.duration_days ?? 30;
            const expires = new Date(Date.now() + days * 86400_000).toISOString();
            // Activate the pending purchase
            await supabaseAdmin.from("property_package_purchases").update({
              status: "active",
              activated_at: new Date().toISOString(),
              expires_at: expires,
            }).eq("mpesa_transaction_id", txn.id);
            // Push property to admin review with the package's perks applied
            await supabaseAdmin.from("properties").update({
              status: "pending",
              featured: pkg?.is_featured ?? false,
              is_featured: pkg?.is_featured ?? false,
              featured_until: pkg?.is_featured ? expires : null,
            }).eq("id", txn.property_id);
          } else if (txn.purpose === "advertisement" && (txn as any).ad_campaign_id) {
            const campaignId = (txn as any).ad_campaign_id as string;
            // Move campaign into admin review; days start when admin approves.
            await supabaseAdmin.from("ad_campaigns").update({
              status: "pending_review",
            }).eq("id", campaignId);
          } else if (txn.purpose === "blog_submission" && (txn as any).blog_post_id && txn.package_id) {
            const postId = (txn as any).blog_post_id as string;
            const { data: pkg } = await supabaseAdmin
              .from("blog_packages").select("*").eq("id", txn.package_id).maybeSingle();
            const days = pkg?.duration_days ?? txn.duration_days ?? 30;
            const expires = new Date(Date.now() + days * 86400_000).toISOString();
            await supabaseAdmin.from("blog_post_purchases").update({
              status: "active",
              activated_at: new Date().toISOString(),
              expires_at: expires,
            }).eq("mpesa_transaction_id", txn.id);
            await supabaseAdmin.from("blog_posts").update({
              status: "pending_review",
              submitted_at: new Date().toISOString(),
              expires_at: expires,
              is_sponsored: pkg?.is_sponsored ?? false,
            }).eq("id", postId);
          }

          await supabaseAdmin.from("notifications").insert({
            user_id: txn.user_id,
            type: "payment_success",
            title: "Payment received",
            body: `Your M-Pesa payment of KES ${txn.amount} was successful. ${receipt ? `Ref: ${receipt}` : ""}`,
          }).select().maybeSingle();
        }

        return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
      },
    },
  },
});
