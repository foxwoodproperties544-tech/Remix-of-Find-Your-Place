import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden");
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "company"
  );
}

/* ------------------------------------------------------------------ */
/* public: enquiries + view tracking                                   */
/* ------------------------------------------------------------------ */

const enquirySchema = z.object({
  businessId: z.string().uuid(),
  propertyId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.enum(["form", "whatsapp", "call", "email", "property"]).default("form"),
  clientKey: z.string().trim().max(80).optional(),
});

export const submitBusinessEnquiry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => enquirySchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allowed } = await supabaseAdmin.rpc("check_and_hit_rate_limit", {
      _bucket: "business_enquiry",
      _key: data.clientKey || data.email || data.phone || "anon",
      _limit: 5,
      _window_seconds: 600,
    });
    if (allowed === false) throw new Error("Too many enquiries. Please try again in a few minutes.");

    const { error } = await supabaseAdmin.from("business_enquiries").insert({
      business_id: data.businessId,
      property_id: data.propertyId || null,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      message: data.message || null,
      source: data.source,
    });
    if (error) throw new Error(error.message);

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("enquiry_count, owner_id, name")
      .eq("id", data.businessId)
      .maybeSingle();

    await supabaseAdmin
      .from("businesses")
      .update({ enquiry_count: ((biz?.enquiry_count as number) ?? 0) + 1 })
      .eq("id", data.businessId);

    if (biz?.owner_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: biz.owner_id,
        type: "business_enquiry",
        title: "New enquiry for your company",
        body: `${data.name} sent an enquiry via Foxwood Properties.`,
        link: "/dashboard/business",
      });
    }
    return { ok: true };
  });

export const trackBusinessView = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ businessId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("business_views").insert({ business_id: data.businessId });
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("view_count")
      .eq("id", data.businessId)
      .maybeSingle();
    await supabaseAdmin
      .from("businesses")
      .update({ view_count: ((biz?.view_count as number) ?? 0) + 1 })
      .eq("id", data.businessId);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* claims                                                              */
/* ------------------------------------------------------------------ */

export const submitBusinessClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().min(6).max(30),
        roleAtCompany: z.string().trim().max(120).optional().or(z.literal("")),
        note: z.string().trim().max(1500).optional().or(z.literal("")),
        proofUrls: z.array(z.string().url()).max(5).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("business_claims")
      .select("id,status")
      .eq("business_id", data.businessId)
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new Error("You already have a pending claim for this company.");

    const { error } = await context.supabase.from("business_claims").insert({
      business_id: data.businessId,
      user_id: context.userId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      role_at_company: data.roleAtCompany || null,
      note: data.note || null,
      proof_urls: data.proofUrls,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBusinessClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("business_claims")
      .select("*, businesses(id,name,slug)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const reviewBusinessClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        claimId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        adminNotes: z.string().trim().max(1000).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: claim, error: e1 } = await context.supabase
      .from("business_claims")
      .select("*")
      .eq("id", data.claimId)
      .maybeSingle();
    if (e1 || !claim) throw new Error("Claim not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const status = data.action === "approve" ? "approved" : "rejected";

    await supabaseAdmin
      .from("business_claims")
      .update({
        status,
        admin_notes: data.adminNotes || null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.claimId);

    if (data.action === "approve") {
      await supabaseAdmin
        .from("businesses")
        .update({ owner_id: claim.user_id, claimed_at: new Date().toISOString() })
        .eq("id", claim.business_id);
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: claim.user_id,
      type: `business_claim_${status}`,
      title: data.action === "approve" ? "Your business claim was approved" : "Your business claim was rejected",
      body:
        data.action === "approve"
          ? "You can now manage your company profile from your dashboard."
          : data.adminNotes || "Please review the requirements and submit again with valid proof.",
      link: "/dashboard/business",
    });

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      action: `business_claim_${status}`,
      entityType: "business_claim",
      entityId: data.claimId,
      summary: `Claim ${status} for business ${claim.business_id}`,
    });

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* admin: businesses CRUD + import                                     */
/* ------------------------------------------------------------------ */

const businessInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  categoryId: z.string().uuid().optional().nullable(),
  shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(6000).optional().or(z.literal("")),
  logoUrl: z.string().trim().max(600).optional().or(z.literal("")),
  coverUrl: z.string().trim().max(600).optional().or(z.literal("")),
  website: z.string().trim().max(300).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  county: z.string().trim().max(80).optional().or(z.literal("")),
  town: z.string().trim().max(80).optional().or(z.literal("")),
  counties: z.array(z.string().max(80)).max(50).default([]),
  towns: z.array(z.string().max(80)).max(200).default([]),
  services: z.array(z.string().max(80)).max(50).default([]),
  propertyTypes: z.array(z.string().max(80)).max(50).default([]),
  socials: z.record(z.string(), z.string().max(300)).default({}),
  businessHours: z.record(z.string(), z.string().max(80)).default({}),
  yearsInBusiness: z.number().int().min(0).max(200).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  verified: z.boolean().default(false),
  featured: z.boolean().default(false),
  status: z.enum(["published", "draft", "archived"]).default("published"),
  planSlug: z.string().trim().max(40).optional().nullable(),
});

async function uniqueSlug(admin: any, name: string, id?: string) {
  const base = slugify(name);
  let candidate = base;
  for (let i = 1; i < 50; i++) {
    const { data } = await admin.from("businesses").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === id) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export const upsertBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => businessInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const slug = await uniqueSlug(supabaseAdmin, data.name, data.id);

    const row = {
      name: data.name,
      slug,
      category_id: data.categoryId || null,
      short_description: data.shortDescription || null,
      description: data.description || null,
      logo_url: data.logoUrl || null,
      cover_url: data.coverUrl || null,
      website: data.website || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      address: data.address || null,
      county: data.county || null,
      town: data.town || null,
      counties: data.counties,
      towns: data.towns,
      services: data.services,
      property_types: data.propertyTypes,
      socials: data.socials,
      business_hours: data.businessHours,
      years_in_business: data.yearsInBusiness ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      verified: data.verified,
      featured: data.featured,
      status: data.status,
      plan_slug: data.planSlug || null,
      created_by: context.userId,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("businesses").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id, slug };
    }
    const { data: ins, error } = await supabaseAdmin.from("businesses").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins!.id, slug };
  });

export const deleteBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("businesses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const importRow = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().max(120).optional().or(z.literal("")),
  county: z.string().trim().max(80).optional().or(z.literal("")),
  town: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  website: z.string().trim().max(300).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  logo_url: z.string().trim().max(600).optional().or(z.literal("")),
  cover_url: z.string().trim().max(600).optional().or(z.literal("")),
  verified: z.string().trim().max(10).optional().or(z.literal("")),
  featured: z.string().trim().max(10).optional().or(z.literal("")),
});

const truthy = (v?: string) => ["true", "yes", "1", "y"].includes((v ?? "").trim().toLowerCase());

export const importBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(z.record(z.string(), z.any())).min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cats } = await supabaseAdmin.from("business_categories").select("id,name,slug");
    const catByKey = new Map<string, string>();
    (cats ?? []).forEach((c: any) => {
      catByKey.set(c.name.toLowerCase(), c.id);
      catByKey.set(c.slug.toLowerCase(), c.id);
    });

    const results: { row: number; ok: boolean; error?: string; name?: string }[] = [];
    let successes = 0;

    for (let i = 0; i < data.rows.length; i++) {
      const parsed = importRow.safeParse(data.rows[i]);
      if (!parsed.success) {
        results.push({
          row: i + 2,
          ok: false,
          error: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
        });
        continue;
      }
      const v = parsed.data;
      const slug = await uniqueSlug(supabaseAdmin, v.name);
      const { error } = await supabaseAdmin.from("businesses").insert({
        name: v.name,
        slug,
        category_id: v.category ? catByKey.get(v.category.toLowerCase()) ?? null : null,
        county: v.county || null,
        town: v.town || null,
        counties: v.county ? [v.county] : [],
        towns: v.town ? [v.town] : [],
        address: v.address || null,
        website: v.website || null,
        email: v.email || null,
        phone: v.phone || null,
        whatsapp: v.whatsapp || null,
        description: v.description || null,
        short_description: (v.description || "").slice(0, 200) || null,
        logo_url: v.logo_url || null,
        cover_url: v.cover_url || null,
        verified: truthy(v.verified),
        featured: truthy(v.featured),
        status: "published",
        created_by: context.userId,
      });
      if (error) results.push({ row: i + 2, ok: false, error: error.message, name: v.name });
      else {
        successes++;
        results.push({ row: i + 2, ok: true, name: v.name });
      }
    }
    return { successes, total: data.rows.length, results };
  });

/* ------------------------------------------------------------------ */
/* admin: categories, plans, enquiries, reports                        */
/* ------------------------------------------------------------------ */

export const upsertBusinessCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(500).optional().or(z.literal("")),
        sortOrder: z.number().int().min(0).max(999).default(0),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row = {
      name: data.name,
      slug: slugify(data.name),
      description: data.description || null,
      sort_order: data.sortOrder,
      active: data.active,
    };
    const q = data.id
      ? context.supabase.from("business_categories").update(row).eq("id", data.id)
      : context.supabase.from("business_categories").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertBusinessPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(80),
        price: z.number().min(0).max(10_000_000),
        durationDays: z.number().int().min(1).max(3650).default(30),
        listingLimit: z.number().int().min(0).max(100000).default(20),
        featuredPlacement: z.boolean().default(false),
        analyticsAccess: z.boolean().default(true),
        perks: z.array(z.string().max(160)).max(20).default([]),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row = {
      name: data.name,
      slug: slugify(data.name),
      price: data.price,
      duration_days: data.durationDays,
      listing_limit: data.listingLimit,
      featured_placement: data.featuredPlacement,
      analytics_access: data.analyticsAccess,
      perks: data.perks,
      active: data.active,
    };
    const q = data.id
      ? context.supabase.from("business_plans").update(row).eq("id", data.id)
      : context.supabase.from("business_plans").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDirectoryEnquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        businessId: z.string().uuid().optional(),
        status: z.enum(["new", "contacted", "converted", "closed", "all"]).default("all"),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("business_enquiries")
      .select("*, businesses(id,name,slug), properties(id,title,slug)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.businessId) q = q.eq("business_id", data.businessId);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateEnquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "converted", "closed"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("business_enquiries")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const directoryLeadReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: enquiries } = await supabaseAdmin
      .from("business_enquiries")
      .select("id,business_id,status,created_at")
      .limit(20000);
    const { data: businesses } = await supabaseAdmin
      .from("businesses")
      .select("id,name,slug,view_count,enquiry_count")
      .order("enquiry_count", { ascending: false })
      .limit(500);

    const rows = enquiries ?? [];
    const total = rows.length;
    const converted = rows.filter((r: any) => r.status === "converted").length;
    const byBusiness = new Map<string, number>();
    rows.forEach((r: any) => {
      if (r.business_id) byBusiness.set(r.business_id, (byBusiness.get(r.business_id) ?? 0) + 1);
    });

    const list = (businesses ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      views: b.view_count ?? 0,
      enquiries: byBusiness.get(b.id) ?? 0,
    }));

    return {
      totalEnquiries: total,
      converted,
      conversionRate: total ? Math.round((converted / total) * 1000) / 10 : 0,
      topByEnquiries: [...list].sort((a, b) => b.enquiries - a.enquiries).slice(0, 10),
      topByViews: [...list].sort((a, b) => b.views - a.views).slice(0, 10),
    };
  });

/* ------------------------------------------------------------------ */
/* business owner dashboard                                            */
/* ------------------------------------------------------------------ */

export const myBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: owned } = await context.supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    return owned ?? [];
  });

export const updateMyBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
        description: z.string().trim().max(6000).optional().or(z.literal("")),
        logoUrl: z.string().trim().max(600).optional().or(z.literal("")),
        coverUrl: z.string().trim().max(600).optional().or(z.literal("")),
        website: z.string().trim().max(300).optional().or(z.literal("")),
        email: z.string().trim().max(255).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
        whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
        address: z.string().trim().max(300).optional().or(z.literal("")),
        county: z.string().trim().max(80).optional().or(z.literal("")),
        town: z.string().trim().max(80).optional().or(z.literal("")),
        services: z.array(z.string().max(80)).max(50).default([]),
        propertyTypes: z.array(z.string().max(80)).max(50).default([]),
        socials: z.record(z.string(), z.string().max(300)).default({}),
        businessHours: z.record(z.string(), z.string().max(80)).default({}),
        yearsInBusiness: z.number().int().min(0).max(200).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("businesses")
      .update({
        short_description: data.shortDescription || null,
        description: data.description || null,
        logo_url: data.logoUrl || null,
        cover_url: data.coverUrl || null,
        website: data.website || null,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        address: data.address || null,
        county: data.county || null,
        town: data.town || null,
        services: data.services,
        property_types: data.propertyTypes,
        socials: data.socials,
        business_hours: data.businessHours,
        years_in_business: data.yearsInBusiness ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const replyToBusinessReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reviewId: z.string().uuid(), reply: z.string().trim().min(2).max(1500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("business_reviews")
      .update({ reply: data.reply, replied_at: new Date().toISOString() })
      .eq("id", data.reviewId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const linkPropertyToBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ propertyId: z.string().uuid(), businessId: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("properties")
      .update({ business_id: data.businessId })
      .eq("id", data.propertyId)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
