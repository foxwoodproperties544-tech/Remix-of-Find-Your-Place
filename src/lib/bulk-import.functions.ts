import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const rowSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
  price: z.coerce.number().nonnegative(),
  price_suffix: z.string().trim().max(20).optional().or(z.literal("")),
  category: z.string().trim().min(1),
  property_type: z.string().trim().min(1),
  county: z.string().trim().min(1),
  town: z.string().trim().min(1),
  area: z.string().trim().optional().or(z.literal("")),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  size: z.string().trim().optional().or(z.literal("")),
  features: z.string().trim().optional().or(z.literal("")),
  amenities: z.string().trim().optional().or(z.literal("")),
  contact_phone: z.string().trim().optional().or(z.literal("")),
  contact_whatsapp: z.string().trim().optional().or(z.literal("")),
  video_url: z.string().trim().optional().or(z.literal("")),
  tour_url: z.string().trim().optional().or(z.literal("")),
  images: z.string().trim().optional().or(z.literal("")),
  lat: z.coerce.number().optional().or(z.nan()),
  lng: z.coerce.number().optional().or(z.nan()),
});

export const bulkImportProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ rows: z.array(z.record(z.string(), z.any())).min(1).max(200) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const results: { row: number; ok: boolean; error?: string; id?: string }[] = [];
    let successes = 0;

    for (let i = 0; i < data.rows.length; i++) {
      const raw = data.rows[i];
      const parsed = rowSchema.safeParse(raw);
      if (!parsed.success) {
        results.push({ row: i + 2, ok: false, error: parsed.error.issues.map(x => `${x.path.join(".")}: ${x.message}`).join("; ") });
        continue;
      }
      const v = parsed.data;
      const images = (v.images || "")
        .split(/[|\n,]/g).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
      const features = (v.features || "").split(",").map((s) => s.trim()).filter(Boolean);
      const amenities = (v.amenities || "").split(",").map((s) => s.trim()).filter(Boolean);
      const latNum = Number.isFinite(v.lat as number) ? (v.lat as number) : null;
      const lngNum = Number.isFinite(v.lng as number) ? (v.lng as number) : null;

      const { data: inserted, error } = await context.supabase
        .from("properties")
        .insert({
          owner_id: context.userId!,
          title: v.title,
          description: v.description,
          price: v.price,
          price_suffix: v.price_suffix || null,
          category: v.category,
          property_type: v.property_type,
          county: v.county,
          town: v.town,
          area: v.area || null,
          bedrooms: v.bedrooms ?? 0,
          bathrooms: v.bathrooms ?? 0,
          size: v.size || null,
          images,
          features,
          amenities,
          contact_phone: v.contact_phone || null,
          contact_whatsapp: v.contact_whatsapp || null,
          video_url: v.video_url || null,
          tour_url: v.tour_url || null,
          lat: latNum,
          lng: lngNum,
          status: "draft",
        })
        .select("id")
        .single();

      if (error) {
        results.push({ row: i + 2, ok: false, error: error.message });
      } else {
        successes++;
        results.push({ row: i + 2, ok: true, id: inserted!.id });
      }
    }
    return { successes, total: data.rows.length, results };
  });
