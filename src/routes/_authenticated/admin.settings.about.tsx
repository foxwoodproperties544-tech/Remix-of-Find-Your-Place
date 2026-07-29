import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { Button } from "@/components/ui/button";
import { StructuredDataPreview } from "@/components/admin/StructuredDataPreview";
import {
  DEFAULT_PARTNERS, DEFAULT_STATS, DEFAULT_TESTIMONIALS, PARTNER_CATEGORIES,
  PARTNER_CATEGORY_LABEL, SETTINGS_KEYS, itemsOr, moveItem,
  type PartnerCategory, type PartnerItem, type Testimonial,
} from "@/lib/about-content";
import { ArrowDown, ArrowUp, BarChart3, ImagePlus, Loader2, Plus, Save, Star, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings/about")({
  component: AboutSettings,
  head: () => ({ meta: [
    { title: "About page settings — Foxwood Admin" },
    { name: "description", content: "Manage Foxwood About page statistics, partners, testimonials, and structured data." },
    { property: "og:title", content: "About page settings — Foxwood Admin" },
    { property: "og:description", content: "Manage Foxwood About page content." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

type Stat = { label: string; value: number; suffix: string };
const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

async function imageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > 1_500_000) throw new Error("Image must be smaller than 1.5 MB");
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function MoveDelete({ index, length, move, remove }: { index: number; length: number; move: (to: number) => void; remove: () => void }) {
  return <div className="flex justify-end gap-1">
    <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index - 1)} title="Move up" aria-label="Move up"><ArrowUp /></Button>
    <Button type="button" variant="ghost" size="icon" disabled={index === length - 1} onClick={() => move(index + 1)} title="Move down" aria-label="Move down"><ArrowDown /></Button>
    <Button type="button" variant="ghost" size="icon" onClick={remove} title="Delete" aria-label="Delete"><Trash2 className="text-destructive" /></Button>
  </div>;
}

function AboutSettings() {
  const { isAdmin, loading: rolesLoading } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stat[]>(DEFAULT_STATS);
  const [partners, setPartners] = useState<PartnerItem[]>(DEFAULT_PARTNERS);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.from("platform_settings").select("key,value")
        .in("key", [SETTINGS_KEYS.stats, SETTINGS_KEYS.partners, SETTINGS_KEYS.testimonials]);
      if (error) toast.error("Could not load About page settings");
      const byKey = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
      setStats(itemsOr<Stat>(byKey[SETTINGS_KEYS.stats], DEFAULT_STATS));
      setPartners(itemsOr<PartnerItem>(byKey[SETTINGS_KEYS.partners], DEFAULT_PARTNERS));
      setTestimonials(itemsOr<Testimonial>(byKey[SETTINGS_KEYS.testimonials], DEFAULT_TESTIMONIALS));
      setLoading(false);
    })();
  }, []);

  async function addImage(event: ChangeEvent<HTMLInputElement>, update: (value: string) => void) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { update(await imageDataUrl(file)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Image upload failed"); }
  }

  async function save() {
    if (stats.some((item) => !item.label.trim() || !Number.isFinite(item.value))) return toast.error("Every statistic needs a label and number");
    if (partners.some((item) => !item.name.trim())) return toast.error("Every organisation needs a name");
    if (testimonials.some((item) => !item.name.trim() || !item.text.trim() || item.rating < 1 || item.rating > 5)) return toast.error("Every testimonial needs a name, text, and rating from 1 to 5");
    setSaving(true);
    const { error } = await supabase.from("platform_settings").upsert([
      { key: SETTINGS_KEYS.stats, value: { items: stats } as never },
      { key: SETTINGS_KEYS.partners, value: { items: partners } as never },
      { key: SETTINGS_KEYS.testimonials, value: { items: testimonials } as never },
    ], { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("About page settings saved");
  }

  if (rolesLoading || !isAdmin || loading) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">About page settings</h1><p className="text-sm text-muted-foreground">Manage social proof, partner categories, customer stories, and SEO checks.</p></div>
        <Button asChild variant="outline"><Link to="/admin/settings/about-content">Edit services & process</Link></Button>
      </div>

      <section className="space-y-4 rounded-md border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary"><BarChart3 className="h-4 w-4" /><h2 className="font-bold">Our numbers</h2></div>
        {stats.map((stat, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_9rem_6rem]">
          <input className={inputCls} value={stat.label} aria-label={`Statistic ${index + 1} label`} onChange={(event) => setStats(stats.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} />
          <input className={inputCls} type="number" value={stat.value} aria-label={`Statistic ${index + 1} value`} onChange={(event) => setStats(stats.map((item, i) => i === index ? { ...item, value: Number(event.target.value) } : item))} />
          <input className={inputCls} value={stat.suffix} aria-label={`Statistic ${index + 1} suffix`} onChange={(event) => setStats(stats.map((item, i) => i === index ? { ...item, suffix: event.target.value } : item))} />
        </div>)}
      </section>

      <section className="space-y-4 rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary"><UsersRound className="h-4 w-4" /><div><h2 className="font-bold">Credibility organisations</h2><p className="text-xs text-muted-foreground">Reorder items with arrows; category order follows the numbered list.</p></div></div>
          <Button type="button" variant="secondary" onClick={() => setPartners([...partners, { name: "", category: "partner" }])}><Plus /> Add organisation</Button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{PARTNER_CATEGORIES.map((category, index) => <span key={category}>{index + 1}. {PARTNER_CATEGORY_LABEL[category]}</span>)}</div>
        {partners.map((partner, index) => <div key={index} className="space-y-3 rounded-md border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-[5rem_1fr_11rem]">
            <label className="grid h-16 w-20 cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40" title="Upload logo">
              {partner.logo_url ? <img src={partner.logo_url} alt="Logo preview" className="h-full w-full object-contain p-1" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(event) => void addImage(event, (logo_url) => setPartners(partners.map((item, i) => i === index ? { ...item, logo_url } : item)))} />
            </label>
            <div className="space-y-2">
              <input className={inputCls} placeholder="Organisation name" value={partner.name} onChange={(event) => setPartners(partners.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
              <input className={inputCls} type="url" placeholder="Website (optional)" value={partner.url ?? ""} onChange={(event) => setPartners(partners.map((item, i) => i === index ? { ...item, url: event.target.value } : item))} />
            </div>
            <select className={inputCls} value={partner.category} onChange={(event) => setPartners(partners.map((item, i) => i === index ? { ...item, category: event.target.value as PartnerCategory } : item))}>
              {PARTNER_CATEGORIES.map((category) => <option key={category} value={category}>{PARTNER_CATEGORY_LABEL[category]}</option>)}
            </select>
          </div>
          <MoveDelete index={index} length={partners.length} move={(to) => setPartners(moveItem(partners, index, to))} remove={() => setPartners(partners.filter((_, i) => i !== index))} />
        </div>)}
      </section>

      <section className="space-y-4 rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary"><Star className="h-4 w-4" /><div><h2 className="font-bold">Customer testimonials</h2><p className="text-xs text-muted-foreground">Add, edit, reorder, or remove stories shown on the About page.</p></div></div>
          <Button type="button" variant="secondary" onClick={() => setTestimonials([...testimonials, { name: "", location: "", rating: 5, text: "" }])}><Plus /> Add testimonial</Button>
        </div>
        {testimonials.length === 0 && <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No curated testimonials yet. Approved customer reviews will be used as a fallback.</p>}
        {testimonials.map((testimonial, index) => <div key={index} className="space-y-3 rounded-md border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-[5rem_1fr_7rem]">
            <label className="grid h-20 w-20 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border bg-muted/40" title="Upload customer photo">
              {testimonial.photo_url ? <img src={testimonial.photo_url} alt="Customer preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void addImage(event, (photo_url) => setTestimonials(testimonials.map((item, i) => i === index ? { ...item, photo_url } : item)))} />
            </label>
            <div className="space-y-2">
              <input className={inputCls} placeholder="Customer name" value={testimonial.name} onChange={(event) => setTestimonials(testimonials.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
              <input className={inputCls} placeholder="Location" value={testimonial.location} onChange={(event) => setTestimonials(testimonials.map((item, i) => i === index ? { ...item, location: event.target.value } : item))} />
            </div>
            <label className="text-xs font-semibold text-muted-foreground">Rating<select className={`${inputCls} mt-1`} value={testimonial.rating} onChange={(event) => setTestimonials(testimonials.map((item, i) => i === index ? { ...item, rating: Number(event.target.value) } : item))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
          </div>
          <textarea className={inputCls} rows={4} maxLength={1200} placeholder="Customer story" value={testimonial.text} onChange={(event) => setTestimonials(testimonials.map((item, i) => i === index ? { ...item, text: event.target.value } : item))} />
          <MoveDelete index={index} length={testimonials.length} move={(to) => setTestimonials(moveItem(testimonials, index, to))} remove={() => setTestimonials(testimonials.filter((_, i) => i !== index))} />
        </div>)}
      </section>

      <StructuredDataPreview />

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={() => void save()} disabled={saving} size="lg">{saving ? <Loader2 className="animate-spin" /> : <Save />} Save all changes</Button>
      </div>
    </div>
  );
}
