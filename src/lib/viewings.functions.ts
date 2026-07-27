import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  ACTIVE_VIEWING_STATUSES,
  DEFAULT_AVAILABILITY,
  nextAvailableSlot,
  slotsForDay,
  toDateKey,
  type Availability,
} from "./viewings";

type Ctx = { supabase: any; userId: string; claims: any };

const PROPERTY_COLS = "id,title,slug,price,images,county,town,address,category,owner_id,open_house_at,contact_phone,contact_whatsapp";

async function isAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  return !!data;
}

async function notify(rows: Array<{ user_id: string | null; type: string; title: string; body: string; link: string }>) {
  const clean = rows.filter((r) => !!r.user_id);
  if (!clean.length) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert(clean as any);
  } catch (e) {
    console.error("[viewings] notification failed", e);
  }
}

async function audit(ctx: Ctx, action: string, entityId: string, summary: string, metadata?: Record<string, unknown>) {
  const { writeAudit } = await import("./audit.server");
  await writeAudit({
    actorId: ctx.userId,
    actorEmail: (ctx.claims as any)?.email ?? null,
    action,
    entityType: "viewing",
    entityId,
    summary,
    metadata: metadata ?? null,
  });
}

function withDefaults(row: any, ownerId: string): Availability {
  return { owner_id: ownerId, ...DEFAULT_AVAILABILITY, ...(row ?? {}) } as Availability;
}

/* ------------------------------- public booking context ------------------------------- */

/**
 * Public: everything the property page needs to render the booking widget —
 * the agent's availability, taken slots (times only, no personal data) and
 * the next free slot. Safe for anonymous visitors.
 */
export const getBookingContext = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ propertyId: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(data.propertyId);
    const { data: property } = await supabaseAdmin
      .from("properties")
      .select(PROPERTY_COLS)
      .eq(isUuid ? "id" : "slug", data.propertyId)
      .eq("status", "published")
      .maybeSingle();
    if (!property) return null;

    const { data: availRow } = await supabaseAdmin
      .from("agent_availability")
      .select("*")
      .eq("owner_id", property.owner_id)
      .maybeSingle();
    const availability = withDefaults(availRow, property.owner_id);

    const horizonEnd = new Date(Date.now() + availability.horizon_days * 86400_000).toISOString();
    const { data: booked } = await supabaseAdmin
      .from("viewings")
      .select("requested_at")
      .eq("agent_id", property.owner_id)
      .in("status", ACTIVE_VIEWING_STATUSES)
      .gte("requested_at", new Date().toISOString())
      .lte("requested_at", horizonEnd);
    const bookedTimes = (booked ?? []).map((b: any) => b.requested_at as string);

    const { data: agent } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, verified, town, county")
      .eq("id", property.owner_id)
      .maybeSingle();

    return {
      property: {
        id: property.id,
        title: property.title,
        slug: property.slug,
        address: property.address,
        town: property.town,
        county: property.county,
        open_house_at: property.open_house_at,
      },
      agent,
      availability,
      bookedTimes,
      nextSlot: nextAvailableSlot(availability, bookedTimes),
    };
  });

/* -------------------------------------- booking -------------------------------------- */

export const getViewingCaptcha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { issueCaptcha } = await import("./captcha.server");
    return issueCaptcha();
  });

const bookSchema = z.object({
  propertyId: z.string().uuid(),
  viewingType: z.enum(["in_person", "virtual", "open_house"]),
  slot: z.string().datetime(),
  visitorCount: z.number().int().min(1).max(20),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  notes: z.string().trim().max(1000).optional(),
  captchaToken: z.string().max(500).optional(),
  captchaAnswer: z.string().trim().max(10).optional(),
});

export const bookViewing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bookSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;

    // Rate limiting with a CAPTCHA grace window once the daily cap is hit.
    const { data: allowed } = await ctx.supabase.rpc("check_and_hit_rate_limit", {
      _bucket: "viewing_book",
      _key: `u:${ctx.userId}`,
      _limit: 5,
      _window_seconds: 86400,
    });
    if (allowed === false) {
      const { verifyCaptcha } = await import("./captcha.server");
      if (!verifyCaptcha(data.captchaToken, data.captchaAnswer)) {
        throw new Error("CAPTCHA_REQUIRED: Please complete the verification below to continue.");
      }
      const { data: graceOk } = await ctx.supabase.rpc("check_and_hit_rate_limit", {
        _bucket: "viewing_book_captcha",
        _key: `u:${ctx.userId}`,
        _limit: 5,
        _window_seconds: 86400,
      });
      if (graceOk === false) throw new Error("Daily booking limit reached. Try again tomorrow.");
    }

    const { data: property, error: pErr } = await ctx.supabase
      .from("properties")
      .select(PROPERTY_COLS + ",status")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!property || property.status !== "published") throw new Error("Listing is not available for viewings");
    if (property.owner_id === ctx.userId) throw new Error("You cannot book a viewing on your own listing");

    const slot = new Date(data.slot);
    if (Number.isNaN(slot.getTime()) || slot.getTime() < Date.now()) throw new Error("Pick a future time slot");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: availRow } = await supabaseAdmin
      .from("agent_availability").select("*").eq("owner_id", property.owner_id).maybeSingle();
    const availability = withDefaults(availRow, property.owner_id);

    if (data.viewingType === "open_house") {
      if (!property.open_house_at) throw new Error("No open house is scheduled for this listing");
    } else {
      if (data.viewingType === "virtual" && !availability.allow_virtual) throw new Error("Virtual viewings are unavailable for this agent");
      if (data.viewingType === "in_person" && !availability.allow_in_person) throw new Error("In-person viewings are unavailable for this agent");

      // Server-side slot validation: the chosen time must be a genuinely free slot.
      const dayKey = toDateKey(slot);
      const { data: booked } = await supabaseAdmin
        .from("viewings").select("requested_at")
        .eq("agent_id", property.owner_id)
        .in("status", ACTIVE_VIEWING_STATUSES)
        .gte("requested_at", new Date(`${dayKey}T00:00:00`).toISOString())
        .lte("requested_at", new Date(`${dayKey}T23:59:59`).toISOString());
      const valid = slotsForDay(availability, dayKey, (booked ?? []).map((b: any) => b.requested_at))
        .some((s) => s.available && Math.abs(new Date(s.iso).getTime() - slot.getTime()) < 60_000);
      if (!valid) throw new Error("That slot is no longer available. Please pick another time.");
    }

    const requestedAt = data.viewingType === "open_house" ? property.open_house_at : slot.toISOString();

    const { data: viewing, error } = await ctx.supabase
      .from("viewings")
      .insert({
        property_id: property.id,
        requester_id: ctx.userId,
        requester_name: data.name,
        requester_email: data.email,
        requester_phone: data.phone,
        requested_at: requestedAt,
        viewing_type: data.viewingType,
        visitor_count: data.visitorCount,
        duration_minutes: availability.slot_minutes,
        meeting_location: data.viewingType === "in_person"
          ? (availability.default_location || property.address || [property.town, property.county].filter(Boolean).join(", ") || null)
          : null,
        notes: data.notes || null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) {
      if ((error as any).code === "23505") throw new Error("That slot was just taken. Please pick another time.");
      throw new Error(error.message);
    }

    await notify([
      {
        user_id: ctx.userId,
        type: "viewing_submitted",
        title: "Viewing request sent",
        body: `Booking ${viewing.booking_ref} for "${property.title}" is awaiting agent confirmation.`,
        link: `/dashboard/viewings/${viewing.id}`,
      },
    ]);
    await audit(ctx, "viewing.book", viewing.id, `Viewing ${viewing.booking_ref} requested`, {
      property_id: property.id, viewing_type: data.viewingType, requested_at: requestedAt,
    });

    return viewing;
  });

/* --------------------------------------- reads --------------------------------------- */

async function attachProperties(ctx: Ctx, rows: any[]) {
  const ids = [...new Set(rows.map((r) => r.property_id))];
  if (!ids.length) return rows;
  const { data: props } = await ctx.supabase
    .from("properties").select("id,title,slug,images,price,county,town,address,owner_id").in("id", ids);
  const byId = Object.fromEntries((props ?? []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({ ...r, property: byId[r.property_id] ?? null }));
}

export const listMyViewings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { data, error } = await ctx.supabase
      .from("viewings").select("*").eq("requester_id", ctx.userId)
      .order("requested_at", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    const rows = await attachProperties(ctx, data ?? []);
    const { data: fb } = await ctx.supabase
      .from("viewing_feedback").select("viewing_id").eq("buyer_id", ctx.userId);
    const done = new Set((fb ?? []).map((f: any) => f.viewing_id));
    return rows.map((r: any) => ({ ...r, has_feedback: done.has(r.id) }));
  });

export const listAgentViewings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { data: owned } = await ctx.supabase.from("properties").select("id").eq("owner_id", ctx.userId);
    const ids = (owned ?? []).map((p: any) => p.id);
    const filters = [`agent_id.eq.${ctx.userId}`];
    if (ids.length) filters.push(`property_id.in.(${ids.join(",")})`);
    const { data, error } = await ctx.supabase
      .from("viewings").select("*").or(filters.join(","))
      .order("requested_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return attachProperties(ctx, data ?? []);
  });

export const getViewing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: viewing, error } = await ctx.supabase
      .from("viewings").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!viewing) throw new Error("Booking not found");

    const [rows, { data: events }, { data: feedback }] = await Promise.all([
      attachProperties(ctx, [viewing]),
      ctx.supabase.from("viewing_events").select("*").eq("viewing_id", viewing.id).order("created_at", { ascending: true }),
      ctx.supabase.from("viewing_feedback").select("*").eq("viewing_id", viewing.id).maybeSingle(),
    ]);
    const full = rows[0];
    const admin = await isAdmin(ctx);
    const role = viewing.requester_id === ctx.userId
      ? "buyer"
      : (viewing.agent_id === ctx.userId || full.property?.owner_id === ctx.userId)
        ? "agent"
        : admin ? "admin" : "none";
    if (role === "none") throw new Error("Forbidden");

    const { data: agent } = await ctx.supabase
      .from("profiles").select("id, full_name, avatar_url, phone, verified").eq("id", viewing.agent_id).maybeSingle();

    // Buyer contact details stay hidden from anyone but the agent/admin.
    const safe = role === "buyer"
      ? { ...full, internal_notes: null }
      : full;
    return { viewing: safe, events: events ?? [], feedback: feedback ?? null, agent, role };
  });

/* -------------------------------------- actions -------------------------------------- */

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum([
    "accept", "decline", "suggest", "reschedule", "confirm_reschedule",
    "cancel", "complete", "no_show", "note", "internal_note",
  ]),
  proposedAt: z.string().datetime().optional(),
  note: z.string().trim().max(1000).optional(),
  virtualLink: z.string().trim().url().max(500).optional(),
  meetingLocation: z.string().trim().max(300).optional(),
});

const AGENT_ACTIONS = new Set(["accept", "decline", "suggest", "complete", "no_show", "internal_note"]);
const BUYER_ACTIONS = new Set(["confirm_reschedule", "reschedule"]);

export const actOnViewing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => actionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: viewing, error } = await ctx.supabase
      .from("viewings").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!viewing) throw new Error("Booking not found");

    const { data: property } = await ctx.supabase
      .from("properties").select("id,title,slug,owner_id").eq("id", viewing.property_id).maybeSingle();

    const admin = await isAdmin(ctx);
    const isBuyer = viewing.requester_id === ctx.userId;
    const isAgent = viewing.agent_id === ctx.userId || property?.owner_id === ctx.userId;
    if (!isBuyer && !isAgent && !admin) throw new Error("Forbidden");

    // Role-based permission enforcement.
    if (AGENT_ACTIONS.has(data.action) && !(isAgent || admin)) throw new Error("Forbidden");
    if (BUYER_ACTIONS.has(data.action) && !(isBuyer || admin)) throw new Error("Forbidden");

    const patch: Record<string, any> = {};
    let buyerMsg: { type: string; title: string; body: string } | null = null;
    let agentMsg: { type: string; title: string; body: string } | null = null;

    switch (data.action) {
      case "accept":
        patch.status = "confirmed";
        patch.confirmed_at = new Date().toISOString();
        if (data.virtualLink) patch.virtual_link = data.virtualLink;
        if (data.meetingLocation) patch.meeting_location = data.meetingLocation;
        buyerMsg = { type: "viewing_confirmed", title: "Viewing confirmed", body: `Booking ${viewing.booking_ref} for "${property?.title ?? "the listing"}" is confirmed.` };
        break;
      case "decline":
        patch.status = "declined";
        patch.cancel_reason = data.note ?? null;
        buyerMsg = { type: "viewing_declined", title: "Viewing declined", body: `Booking ${viewing.booking_ref} was declined${data.note ? `: ${data.note}` : "."}` };
        break;
      case "suggest":
      case "reschedule": {
        if (!data.proposedAt) throw new Error("Pick a new date and time");
        const when = new Date(data.proposedAt);
        if (when.getTime() < Date.now()) throw new Error("Pick a future time");
        patch.status = "rescheduled";
        patch.proposed_at = when.toISOString();
        patch.rescheduled_by = ctx.userId;
        if (data.note) patch.agent_notes = data.note;
        const msg = { title: "Reschedule proposed", body: `A new time was proposed for booking ${viewing.booking_ref}.` };
        if (isBuyer) agentMsg = { type: "viewing_rescheduled", ...msg };
        else buyerMsg = { type: "viewing_rescheduled", ...msg };
        break;
      }
      case "confirm_reschedule":
        if (!viewing.proposed_at) throw new Error("No proposed time to confirm");
        patch.status = "confirmed";
        patch.requested_at = viewing.proposed_at;
        patch.proposed_at = null;
        patch.confirmed_at = new Date().toISOString();
        agentMsg = { type: "viewing_confirmed", title: "New time confirmed", body: `The buyer confirmed the new time for booking ${viewing.booking_ref}.` };
        break;
      case "cancel":
        patch.status = "cancelled";
        patch.cancel_reason = data.note ?? null;
        patch.cancelled_by = ctx.userId;
        if (isBuyer) agentMsg = { type: "viewing_cancelled", title: "Viewing cancelled", body: `The buyer cancelled booking ${viewing.booking_ref}.` };
        else buyerMsg = { type: "viewing_cancelled", title: "Viewing cancelled", body: `Booking ${viewing.booking_ref} was cancelled${data.note ? `: ${data.note}` : "."}` };
        break;
      case "complete":
        patch.status = "completed";
        buyerMsg = { type: "viewing_completed", title: "How was your viewing?", body: `Share feedback on booking ${viewing.booking_ref} — it takes under a minute.` };
        break;
      case "no_show":
        patch.status = "no_show";
        patch.agent_notes = data.note ?? viewing.agent_notes;
        break;
      case "note":
        if (!data.note) throw new Error("Note is required");
        patch.agent_notes = data.note;
        break;
      case "internal_note":
        if (!data.note) throw new Error("Note is required");
        patch.internal_notes = data.note;
        break;
    }

    const { data: updated, error: uErr } = await ctx.supabase
      .from("viewings").update(patch).eq("id", viewing.id).select("*").single();
    if (uErr) throw new Error(uErr.message);

    const link = `/dashboard/viewings/${viewing.id}`;
    const out: any[] = [];
    if (buyerMsg) out.push({ user_id: viewing.requester_id, ...buyerMsg, link });
    if (agentMsg) out.push({ user_id: viewing.agent_id ?? property?.owner_id ?? null, ...agentMsg, link });
    await notify(out);
    await audit(ctx, `viewing.${data.action}`, viewing.id, `Viewing ${viewing.booking_ref}: ${data.action}`, {
      property_id: viewing.property_id, from: viewing.status, to: patch.status ?? viewing.status,
    });

    return updated;
  });

/* -------------------------------------- feedback -------------------------------------- */

export const submitViewingFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      viewingId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comments: z.string().trim().max(1000).optional(),
      asDescribed: z.boolean(),
      interestedInOffer: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { data: viewing } = await ctx.supabase
      .from("viewings").select("id, requester_id, status, agent_id, booking_ref").eq("id", data.viewingId).maybeSingle();
    if (!viewing || viewing.requester_id !== ctx.userId) throw new Error("Forbidden");
    if (viewing.status !== "completed") throw new Error("Feedback opens once the viewing is completed");

    const { error } = await ctx.supabase.from("viewing_feedback").insert({
      viewing_id: viewing.id,
      buyer_id: ctx.userId,
      rating: data.rating,
      comments: data.comments || null,
      as_described: data.asDescribed,
      interested_in_offer: data.interestedInOffer,
    });
    if (error) throw new Error(error.message);

    await notify([{
      user_id: viewing.agent_id,
      type: "viewing_feedback",
      title: "New viewing feedback",
      body: `${data.rating}/5 for booking ${viewing.booking_ref}${data.interestedInOffer ? " — the buyer is interested in making an offer." : "."}`,
      link: `/dashboard/viewings/${viewing.id}`,
    }]);
    await audit(ctx, "viewing.feedback", viewing.id, `Feedback submitted for ${viewing.booking_ref}`, { rating: data.rating });
    return { ok: true };
  });

/* ------------------------------------- availability ------------------------------------ */

export const getMyAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { data } = await ctx.supabase
      .from("agent_availability").select("*").eq("owner_id", ctx.userId).maybeSingle();
    return withDefaults(data, ctx.userId);
  });

export const saveAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      working_days: z.array(z.number().int().min(0).max(6)).max(7),
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
      slot_minutes: z.number().int().min(15).max(240),
      buffer_minutes: z.number().int().min(0).max(120),
      max_per_day: z.number().int().min(1).max(30),
      lead_time_hours: z.number().int().min(0).max(168),
      horizon_days: z.number().int().min(1).max(120),
      blocked_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(200),
      block_public_holidays: z.boolean(),
      allow_virtual: z.boolean(),
      allow_in_person: z.boolean(),
      default_location: z.string().trim().max(300).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (data.start_time >= data.end_time) throw new Error("End time must be after start time");
    const { error } = await ctx.supabase
      .from("agent_availability")
      .upsert({ owner_id: ctx.userId, ...data, default_location: data.default_location || null }, { onConflict: "owner_id" });
    if (error) throw new Error(error.message);
    await audit(ctx, "viewing.availability_update", ctx.userId, "Availability calendar updated");
    return { ok: true };
  });

/* ---------------------------------------- admin ---------------------------------------- */

export const adminListViewings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      q: z.string().trim().max(200).optional(),
      status: z.string().max(30).optional(),
      viewingType: z.string().max(30).optional(),
      agentId: z.string().uuid().optional(),
      propertyId: z.string().uuid().optional(),
      buyerId: z.string().uuid().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(1000).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    if (!(await isAdmin(ctx))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin.from("viewings").select("*").order("requested_at", { ascending: false }).limit(data.limit ?? 500);
    if (data.status) q = q.eq("status", data.status);
    if (data.viewingType) q = q.eq("viewing_type", data.viewingType);
    if (data.agentId) q = q.eq("agent_id", data.agentId);
    if (data.propertyId) q = q.eq("property_id", data.propertyId);
    if (data.buyerId) q = q.eq("requester_id", data.buyerId);
    if (data.from) q = q.gte("requested_at", data.from);
    if (data.to) q = q.lte("requested_at", data.to);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const propIds = [...new Set((rows ?? []).map((r: any) => r.property_id))];
    const agentIds = [...new Set((rows ?? []).map((r: any) => r.agent_id).filter(Boolean))];
    const [{ data: props }, { data: agents }] = await Promise.all([
      supabaseAdmin.from("properties").select("id,title,slug,county,town").in("id", propIds.length ? propIds : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("profiles").select("id,full_name").in("id", agentIds.length ? agentIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const propById = Object.fromEntries((props ?? []).map((p: any) => [p.id, p]));
    const agentById = Object.fromEntries((agents ?? []).map((a: any) => [a.id, a]));

    let list = (rows ?? []).map((r: any) => ({
      ...r,
      property: propById[r.property_id] ?? null,
      agent_name: agentById[r.agent_id]?.full_name ?? null,
    }));

    const needle = data.q?.toLowerCase();
    if (needle) {
      list = list.filter((r: any) =>
        [r.booking_ref, r.requester_name, r.requester_email, r.property?.title, r.agent_name]
          .some((v: any) => (v ?? "").toString().toLowerCase().includes(needle)),
      );
    }

    // Analytics rollup
    const count = (s: string) => list.filter((r: any) => r.status === s).length;
    const confirmTimes = list
      .filter((r: any) => r.first_response_at)
      .map((r: any) => (new Date(r.first_response_at).getTime() - new Date(r.created_at).getTime()) / 3600_000)
      .filter((h: number) => h >= 0);

    const tally = (key: (r: any) => string | null) => {
      const m = new Map<string, number>();
      for (const r of list) {
        const k = key(r);
        if (!k) continue;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
    };

    return {
      rows: list,
      analytics: {
        total: list.length,
        confirmed: count("confirmed") + count("approved"),
        completed: count("completed"),
        cancelled: count("cancelled") + count("declined"),
        noShows: count("no_show"),
        avgConfirmHours: confirmTimes.length
          ? Math.round((confirmTimes.reduce((a: number, b: number) => a + b, 0) / confirmTimes.length) * 10) / 10
          : null,
        topProperties: tally((r) => r.property?.title ?? null),
        topAgents: tally((r) => r.agent_name),
        topLocations: tally((r) => [r.property?.town, r.property?.county].filter(Boolean).join(", ") || null),
      },
    };
  });
