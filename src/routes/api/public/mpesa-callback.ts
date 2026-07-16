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

        // Look up the pending transaction
        const { data: txn } = await supabaseAdmin
          .from("mpesa_transactions")
          .select("*")
          .eq("checkout_request_id", stk.CheckoutRequestID)
          .maybeSingle();

        const success = stk.ResultCode === 0;
        let receipt: string | undefined;
        if (success && stk.CallbackMetadata?.Item) {
          for (const it of stk.CallbackMetadata.Item) {
            if (it.Name === "MpesaReceiptNumber") receipt = String(it.Value);
          }
        }

        await supabaseAdmin.from("mpesa_transactions").update({
          status: success ? "success" : stk.ResultCode === 1032 ? "cancelled" : "failed",
          result_code: stk.ResultCode,
          result_desc: stk.ResultDesc,
          mpesa_receipt: receipt,
          raw_callback: JSON.parse(JSON.stringify(payload)),
        }).eq("checkout_request_id", stk.CheckoutRequestID);

        if (success && txn) {
          // Apply the purchase effect
          if (txn.purpose === "feature_listing" && txn.property_id && txn.duration_days) {
            const until = new Date(Date.now() + txn.duration_days * 86400_000).toISOString();
            await supabaseAdmin.from("properties").update({
              is_featured: true, featured_until: until, featured: true,
            }).eq("id", txn.property_id);
          } else if (txn.purpose === "upgrade_tier" && txn.tier) {
            const expires = new Date(Date.now() + (txn.duration_days ?? 30) * 86400_000).toISOString();
            const quotaByTier: Record<string, number> = { basic: 15, pro: 60, elite: 999 };
            await supabaseAdmin.from("profiles").update({
              tier: txn.tier,
              tier_expires_at: expires,
              listing_quota: quotaByTier[txn.tier] ?? 3,
            }).eq("id", txn.user_id);
          } else if (txn.purpose === "verification_fee" && txn.property_id) {
            // Auto-create a pending verification request tied to the payment
            await supabaseAdmin.from("verification_requests").insert({
              property_id: txn.property_id,
              user_id: txn.user_id,
              notes: `Verification fee paid (${receipt ?? "unknown"})`,
            });
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
