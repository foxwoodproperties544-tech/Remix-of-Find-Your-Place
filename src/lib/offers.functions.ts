import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Roles allowed to act on the seller side of an offer. */
type Ctx = { supabase: any; userId: string; claims: any };

async function isAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return !!data;
}

async function assertAdmin(context: Ctx) {
  if (!(await isAdmin(context))) throw new Error("Forbidden");
}

async function getSettings(context: Ctx) {
  const { data } = await context.supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "offers")
    .maybeSingle();
  return {
    enabled: true,
    allow_rentals: false,
    default_expiry_days: 7,
    max_offers_per_day: 10,
    featured_offers: false,
    premium_buyers: false,
    priority_for_premium: false,
    agent_analytics: true,
    concierge: false,
    ...((data?.value as Record<string, unknown>) ?? {}),
  } as Record<string, any>;
}

async function notify(rows: Array<{ user_id: string | null; type: string; title: string; body: string; link: string }>) {
  const clean = rows.filter((r) => !!r.user_id);
  if (!clean.length) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert(clean as any);
  } catch (e) {
    console.error("[offers] notification failed", e);
  }
}

async function loadOffer(context: Ctx, offerId: string) {
  const { data, error } = await context.supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Offer not found");
  return data as any;
}

function partyRole(offer: any, userId: string, admin: boolean) {
  if (offer.buyer_id === userId) return "buyer";
  if (offer.owner_id === userId) return "owner";
  if (offer.agent_id === userId) return "agent";
  if (admin) return "admin";
  return null;
}

/* ---------------------------------- public settings --------------------------------- */

export const getOfferSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getSettings(context as unknown as Ctx));

export const updateOfferSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        enabled: z.boolean(),
        allow_rentals: z.boolean(),
        default_expiry_days: z.number().int().min(1).max(90),
        max_offers_per_day: z.number().int().min(1).max(100),
        featured_offers: z.boolean(),
        premium_buyers: z.boolean(),
        priority_for_premium: z.boolean(),
        agent_analytics: z.boolean(),
        concierge: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { error } = await ctx.supabase
      .from("platform_settings")
      .upsert({ key: "offers", value: data }, { onConflict: "key" });
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: ctx.userId,
      actorEmail: (ctx.claims as any)?.email ?? null,
      action: "offer.settings_update",
      entityType: "platform_settings",
      entityId: null,
      summary: "Offer settings updated",
      after: data,
    });
    return data;
  });

/* -------------------------------------- submit -------------------------------------- */

const submitSchema = z.object({
  propertyId: z.string().uuid(),
  amount: z.number().positive().max(100_000_000_000),
  currency: z.string().trim().min(3).max(4).default("KES"),
  message: z.string().trim().max(2000).optional(),
  timeline: z.enum(["immediately", "within_30", "within_60", "within_90"]),
  needsMortgage: z.boolean(),
  hasViewed: z.boolean(),
  cashBuyer: z.boolean(),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().trim().email().max(255),
  buyerPhone: z.string().trim().min(7).max(30),
  acceptTerms: z.literal(true),
  captchaToken: z.string().max(500).optional(),
  captchaAnswer: z.string().trim().max(10).optional(),
});

/** Issues a signed arithmetic challenge used as a spam fallback once a buyer is rate-limited. */
export const getOfferCaptcha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { issueCaptcha } = await import("./captcha.server");
    return issueCaptcha();
  });

export const submitOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const settings = await getSettings(ctx);
    if (!settings.enabled) throw new Error("Offers are currently disabled");

    // Spam / abuse protection. Once the daily limit is hit, a solved CAPTCHA
    // buys a limited grace window instead of a hard block.
    const dailyLimit = Number(settings.max_offers_per_day) || 10;
    const { data: allowed } = await ctx.supabase.rpc("check_and_hit_rate_limit", {
      _bucket: "offer_submit",
      _key: `u:${ctx.userId}`,
      _limit: dailyLimit,
      _window_seconds: 86400,
    });
    if (allowed === false) {
      const { verifyCaptcha } = await import("./captcha.server");
      if (!verifyCaptcha(data.captchaToken, data.captchaAnswer)) {
        throw new Error("CAPTCHA_REQUIRED: Please complete the verification below to continue.");
      }
      const { data: graceOk } = await ctx.supabase.rpc("check_and_hit_rate_limit", {
        _bucket: "offer_submit_captcha",
        _key: `u:${ctx.userId}`,
        _limit: dailyLimit,
        _window_seconds: 86400,
      });
      if (graceOk === false) throw new Error("Daily offer limit reached. Try again tomorrow.");
    }


    const { data: property, error: pErr } = await ctx.supabase
      .from("properties")
      .select("id,title,slug,price,category,owner_id,status")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!property || property.status !== "published") throw new Error("Property not available");

    const isSale = (property.category ?? "").toLowerCase().includes("sale");
    if (!isSale && !settings.allow_rentals) throw new Error("Offers are only accepted on properties for sale");
    if (property.owner_id === ctx.userId) throw new Error("You cannot make an offer on your own listing");

    const { data: existing } = await ctx.supabase
      .from("offers")
      .select("id")
      .eq("property_id", data.propertyId)
      .eq("buyer_id", ctx.userId)
      .in("status", ["pending", "under_review", "counter_offered"])
      .maybeSingle();
    if (existing) throw new Error("You already have an active offer on this property");

    const expiresAt = new Date(
      Date.now() + (Number(settings.default_expiry_days) || 7) * 86400_000,
    ).toISOString();

    const { data: offer, error } = await ctx.supabase
      .from("offers")
      .insert({
        property_id: property.id,
        buyer_id: ctx.userId,
        owner_id: property.owner_id,
        asking_price: property.price,
        amount: data.amount,
        current_amount: data.amount,
        currency: data.currency,
        message: data.message ?? null,
        timeline: data.timeline,
        needs_mortgage: data.needsMortgage,
        has_viewed: data.hasViewed,
        cash_buyer: data.cashBuyer,
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail,
        buyer_phone: data.buyerPhone,
        status: "pending",
        last_actor: "buyer",
        expires_at: expiresAt,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await ctx.supabase.from("offer_events").insert({
      offer_id: offer.id,
      actor_id: ctx.userId,
      actor_role: "buyer",
      type: "offer",
      amount: data.amount,
      body: data.message ?? null,
      expires_at: expiresAt,
    });

    await notify([
      {
        user_id: property.owner_id,
        type: "offer_new",
        title: `New offer on ${property.title}`,
        body: `${data.buyerName} offered ${data.currency} ${Number(data.amount).toLocaleString()} (asking ${Number(property.price).toLocaleString()}).`,
        link: `/dashboard/offers/${offer.id}`,
      },
      {
        user_id: ctx.userId,
        type: "offer_submitted",
        title: "Offer submitted",
        body: `Your offer ${offer.offer_ref} was sent to the seller.`,
        link: `/dashboard/offers/${offer.id}`,
      },
    ]);

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: ctx.userId,
      actorEmail: (ctx.claims as any)?.email ?? null,
      action: "offer.submit",
      entityType: "offer",
      entityId: offer.id,
      summary: `Offer ${offer.offer_ref} submitted`,
      metadata: { property_id: property.id, amount: data.amount },
    });

    return offer;
  });

/* --------------------------------------- reads -------------------------------------- */

async function attachProperties(ctx: Ctx, offers: any[]) {
  const ids = [...new Set(offers.map((o) => o.property_id))];
  if (!ids.length) return offers;
  const { data: props } = await ctx.supabase
    .from("properties")
    .select("id,title,slug,price,images,county,town,category,sale_state,owner_id")
    .in("id", ids);
  const byId = Object.fromEntries((props ?? []).map((p: any) => [p.id, p]));
  return offers.map((o) => ({ ...o, property: byId[o.property_id] ?? null }));
}

export const listMyOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { data, error } = await ctx.supabase
      .from("offers")
      .select("*")
      .eq("buyer_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return attachProperties(ctx, data ?? []);
  });

export const listReceivedOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { data, error } = await ctx.supabase
      .from("offers")
      .select("*")
      .or(`owner_id.eq.${ctx.userId},agent_id.eq.${ctx.userId}`)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return attachProperties(ctx, data ?? []);
  });

export const getOffer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ offerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const offer = await loadOffer(ctx, data.offerId);
    const admin = await isAdmin(ctx);
    const role = partyRole(offer, ctx.userId, admin);
    if (!role) throw new Error("Forbidden");

    const [{ data: events }, { data: messages }, withProp] = await Promise.all([
      ctx.supabase.from("offer_events").select("*").eq("offer_id", offer.id).order("created_at"),
      ctx.supabase.from("offer_messages").select("*").eq("offer_id", offer.id).order("created_at"),
      attachProperties(ctx, [offer]),
    ]);

    // Mark counterpart messages as read for this viewer.
    const unread = (messages ?? []).filter((m: any) => m.sender_id !== ctx.userId && !m.read_at);
    if (unread.length) {
      await ctx.supabase
        .from("offer_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread.map((m: any) => m.id));
    }

    return { offer: withProp[0], events: events ?? [], messages: messages ?? [], role };
  });

/* --------------------------------------- actions ------------------------------------ */

const actSchema = z.object({
  offerId: z.string().uuid(),
  action: z.enum(["accept", "reject", "counter", "withdraw", "request_info", "review"]),
  amount: z.number().positive().max(100_000_000_000).optional(),
  note: z.string().trim().max(2000).optional(),
  expiresAt: z.string().datetime().optional(),
  saleState: z.enum(["offer_accepted", "sale_in_progress", "reserved", "sold"]).optional(),
});

export const actOnOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => actSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const offer = await loadOffer(ctx, data.offerId);
    const admin = await isAdmin(ctx);
    const role = partyRole(offer, ctx.userId, admin);
    if (!role) throw new Error("Forbidden");

    const sellerSide = role === "owner" || role === "agent" || role === "admin";
    if (["accept", "reject", "request_info", "review"].includes(data.action) && !sellerSide && data.action !== "accept") {
      throw new Error("Not allowed for this role");
    }
    if (data.action === "withdraw" && role !== "buyer") throw new Error("Only the buyer can withdraw");
    if (["pending", "under_review", "counter_offered"].indexOf(offer.status) === -1) {
      throw new Error(`This offer is ${offer.status} and can no longer be changed`);
    }
    // Buyers may only accept a seller counter offer.
    if (data.action === "accept" && role === "buyer" && offer.status !== "counter_offered") {
      throw new Error("There is no counter offer to accept");
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { last_actor: role };
    let eventType: string = data.action;
    let amount: number | null = null;

    switch (data.action) {
      case "review":
        patch.status = "under_review";
        eventType = "status";
        break;
      case "counter": {
        if (!data.amount) throw new Error("Counter offer amount required");
        amount = data.amount;
        patch.status = "counter_offered";
        patch.current_amount = data.amount;
        patch.expires_at = data.expiresAt ?? offer.expires_at;
        break;
      }
      case "accept":
        patch.status = "accepted";
        patch.closed_at = now;
        eventType = "accepted";
        break;
      case "reject":
        patch.status = "rejected";
        patch.closed_at = now;
        eventType = "rejected";
        break;
      case "withdraw":
        patch.status = "withdrawn";
        patch.closed_at = now;
        eventType = "withdrawn";
        break;
      case "request_info":
        eventType = "info_request";
        break;
    }

    if (sellerSide && !offer.first_response_at) patch.first_response_at = now;

    const { data: updated, error } = await ctx.supabase
      .from("offers")
      .update(patch)
      .eq("id", offer.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await ctx.supabase.from("offer_events").insert({
      offer_id: offer.id,
      actor_id: ctx.userId,
      actor_role: role,
      type: eventType,
      amount,
      body: data.note ?? null,
      expires_at: data.action === "counter" ? (data.expiresAt ?? null) : null,
    });

    // Optional listing status change on acceptance.
    if (data.action === "accept" && data.saleState && sellerSide) {
      await ctx.supabase.from("properties").update({ sale_state: data.saleState }).eq("id", offer.property_id);
    }

    const counterpartId = role === "buyer" ? offer.owner_id : offer.buyer_id;
    const titles: Record<string, string> = {
      accept: "Offer accepted",
      reject: "Offer rejected",
      counter: "Counter offer received",
      withdraw: "Offer withdrawn",
      request_info: "More information requested",
      review: "Offer under review",
    };
    await notify([
      {
        user_id: counterpartId,
        type: `offer_${data.action}`,
        title: titles[data.action],
        body: `Offer ${offer.offer_ref}${amount ? ` — new price ${Number(amount).toLocaleString()}` : ""}.`,
        link: `/dashboard/offers/${offer.id}`,
      },
    ]);

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: ctx.userId,
      actorEmail: (ctx.claims as any)?.email ?? null,
      action: `offer.${data.action}`,
      entityType: "offer",
      entityId: offer.id,
      summary: `${titles[data.action]} — ${offer.offer_ref}`,
      before: { status: offer.status },
      after: { status: updated.status, amount },
    });

    return updated;
  });

/* -------------------------------------- messaging ----------------------------------- */

export const sendOfferMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        offerId: z.string().uuid(),
        body: z.string().trim().max(4000).optional(),
        attachments: z.array(z.string().url().max(1000)).max(5).optional(),
      })
      .refine((v) => !!v.body?.length || !!v.attachments?.length, { message: "Message cannot be empty" })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const offer = await loadOffer(ctx, data.offerId);
    const admin = await isAdmin(ctx);
    const role = partyRole(offer, ctx.userId, admin);
    if (!role) throw new Error("Forbidden");

    const { data: allowed } = await ctx.supabase.rpc("check_and_hit_rate_limit", {
      _bucket: "offer_message",
      _key: `u:${ctx.userId}`,
      _limit: 60,
      _window_seconds: 3600,
    });
    if (allowed === false) throw new Error("Too many messages. Please slow down.");

    const { data: msg, error } = await ctx.supabase
      .from("offer_messages")
      .insert({
        offer_id: offer.id,
        sender_id: ctx.userId,
        body: data.body ?? null,
        attachments: data.attachments ?? [],
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await notify([
      {
        user_id: role === "buyer" ? offer.owner_id : offer.buyer_id,
        type: "offer_message",
        title: "New message on your offer",
        body: (data.body ?? "Attachment received").slice(0, 140),
        link: `/dashboard/offers/${offer.id}`,
      },
    ]);

    return msg;
  });

/* ---------------------------------------- admin ------------------------------------- */

export const adminListOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        status: z.string().max(30).optional(),
        limit: z.number().int().min(1).max(1000).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);

    let q = ctx.supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const withProps = await attachProperties(ctx, rows ?? []);

    const needle = data.q?.toLowerCase();
    const filtered = needle
      ? withProps.filter((o: any) =>
          [o.offer_ref, o.buyer_name, o.buyer_email, o.buyer_phone, o.property?.title].some((v) =>
            (v ?? "").toString().toLowerCase().includes(needle),
          ),
        )
      : withProps;

    const nums = filtered.map((o: any) => Number(o.current_amount ?? o.amount));
    const accepted = filtered.filter((o: any) => o.status === "accepted");
    const rejected = filtered.filter((o: any) => o.status === "rejected");
    const responded = filtered.filter((o: any) => o.first_response_at);
    const avgResponseHours = responded.length
      ? responded.reduce(
          (s: number, o: any) =>
            s + (new Date(o.first_response_at).getTime() - new Date(o.created_at).getTime()) / 3600000,
          0,
        ) / responded.length
      : null;
    const avgDiff = filtered.length
      ? filtered.reduce(
          (s: number, o: any) => s + (Number(o.current_amount ?? o.amount) - Number(o.asking_price)),
          0,
        ) / filtered.length
      : 0;

    return {
      offers: filtered,
      stats: {
        total: filtered.length,
        accepted: accepted.length,
        rejected: rejected.length,
        avgValue: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0,
        avgDiff,
        avgResponseHours,
        conversionRate: filtered.length ? (accepted.length / filtered.length) * 100 : 0,
      },
    };
  });

export const expireStaleOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("expire_offers" as any);
    if (error) throw new Error(error.message);
    return { expired: data ?? 0 };
  });
