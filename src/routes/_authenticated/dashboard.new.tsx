import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { X, UploadCloud, Loader2, ImageIcon, Info, FileText, MapPin } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/dashboard/new")({
  component: NewListing,
  head: () => ({ meta: [{ title: "Post a listing — Foxwood Properties" }] }),
});

import { CATEGORIES as CATS, ALL_TYPES, TYPE_GROUPS } from "@/lib/taxonomy";
const CATEGORIES = [...CATS];
const TYPES = ALL_TYPES;
const COUNTIES = ["Nairobi", "Kiambu", "Kajiado", "Machakos", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu"];

const schema = z.object({
  title: z.string().trim().min(6, "Title must be at least 6 characters").max(120, "Title too long"),
  description: z.string().trim().min(30, "Description must be at least 30 characters").max(4000),
  price: z.coerce.number().positive("Price must be greater than 0"),
  price_suffix: z.string().trim().max(20).optional(),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  property_type: z.enum(TYPES as [string, ...string[]]),
  county: z.string().min(1),
  town: z.string().trim().min(2, "Town is required").max(80),
  area: z.string().trim().max(80).optional(),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  size: z.string().trim().max(60).optional(),
  features: z.string().max(500).optional(),
  amenities: z.string().max(500).optional(),
  contact_phone: z.string().trim().max(30).optional(),
  contact_whatsapp: z.string().trim().max(30).optional(),
  video_url: z.string().trim().max(500).optional(),
  lat: z.string().trim().optional(),
  lng: z.string().trim().optional(),
});

type Errors = Partial<Record<keyof z.infer<typeof schema> | "images", string>>;
type DocEntry = { name: string; url: string };

function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState<false | "draft" | "submit">(false);
  const [uploading, setUploading] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const dropRef = useRef<HTMLLabelElement>(null);
  const [form, setForm] = useState({
    title: "", description: "", price: "", price_suffix: "",
    category: "For Sale", property_type: "Houses",
    county: "Nairobi", town: "", area: "",
    bedrooms: "0", bathrooms: "0", size: "",
    features: "", amenities: "",
    contact_phone: "", contact_whatsapp: "",
    video_url: "", lat: "", lng: "",
  });

  function upd<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as keyof Errors]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!user) return;
    const valid = files.filter((f) => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name} exceeds 8 MB`); return false; }
      return true;
    });
    if (!valid.length) return;
    setUploading((n) => n + valid.length);
    for (const file of valid) {
      try {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error } = await supabase.storage.from("property-images").upload(path, file);
        if (error) throw error;
        // Try public URL first (works if bucket is public), else fall back to a long-lived signed URL.
        const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
        let url = pub?.publicUrl;
        // Probe public URL — if forbidden, use signed URL
        try {
          const head = await fetch(url, { method: "HEAD" });
          if (!head.ok) throw new Error("not public");
        } catch {
          const { data: signed } = await supabase.storage
            .from("property-images")
            .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
          if (signed?.signedUrl) url = signed.signedUrl;
        }
        if (url) setImages((s) => [...s, url!]);
      } catch (err: any) {
        toast.error(err?.message ?? `Failed to upload ${file.name}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }, [user]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) uploadFiles(files);
  }

  async function uploadDocs(files: File[]) {
    if (!user) return;
    const valid = files.filter((f) => {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} exceeds 20 MB`); return false; }
      return true;
    });
    if (!valid.length) return;
    setUploadingDocs((n) => n + valid.length);
    for (const file of valid) {
      try {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error } = await supabase.storage.from("property-docs").upload(path, file);
        if (error) throw error;
        const { data: signed } = await supabase.storage.from("property-docs").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (signed?.signedUrl) setDocs((d) => [...d, { name: file.name, url: signed.signedUrl }]);
      } catch (err: any) {
        toast.error(err?.message ?? `Failed to upload ${file.name}`);
      } finally {
        setUploadingDocs((n) => n - 1);
      }
    }
  }


  async function save(mode: "draft" | "submit", e?: React.FormEvent) {
    e?.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    const newErrors: Errors = {};
    if (mode === "submit") {
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof Errors;
          if (!newErrors[key]) newErrors[key] = issue.message;
        }
      }
      if (images.length === 0) newErrors.images = "Please add at least one photo";
    } else {
      // draft: require only a title
      if (!form.title || form.title.trim().length < 3) newErrors.title = "Give your draft a short title (3+ chars)";
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      toast.error("Please fix the highlighted fields");
      const first = document.querySelector('[data-error="true"]');
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(mode);
    try {
      const v = (parsed.success ? parsed.data : (form as any));
      const latNum = form.lat ? Number(form.lat) : null;
      const lngNum = form.lng ? Number(form.lng) : null;
      const { error } = await supabase.from("properties").insert({
        owner_id: user.id,
        title: v.title,
        description: v.description || "",
        price: Number(v.price) || 0,
        price_suffix: v.price_suffix || null,
        category: v.category,
        property_type: v.property_type,
        county: v.county,
        town: v.town || "",
        area: v.area || null,
        bedrooms: Number(v.bedrooms) || 0,
        bathrooms: Number(v.bathrooms) || 0,
        size: v.size || null,
        images,
        features: (v.features ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
        amenities: (v.amenities ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
        contact_phone: v.contact_phone || null,
        contact_whatsapp: v.contact_whatsapp || null,
        video_url: form.video_url || null,
        documents: docs,
        lat: latNum,
        lng: lngNum,
        status: mode === "draft" ? "draft" : "pending",
      });
      if (error) throw error;
      toast.success(mode === "draft" ? "Draft saved" : "Listing submitted for review");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }


  const input = "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors";
  const label = "text-xs font-semibold text-foreground/80";
  const errCls = (k: keyof Errors) => errors[k] ? "border-destructive focus:border-destructive" : "";
  const errText = (k: keyof Errors) => errors[k] ? <div data-error="true" className="mt-1 text-xs text-destructive">{errors[k]}</div> : null;

  return (
    <div className="container-page py-10 max-w-3xl">
      <h1 className="text-3xl font-bold">Post a listing</h1>
      <p className="text-sm text-muted-foreground mt-1">Fill in the details below. Your listing will be reviewed by an admin before going live.</p>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft/40 p-3 text-xs text-primary">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Add clear, high-quality photos to help your listing stand out. You can drag & drop multiple images at once.</span>
      </div>

      <form onSubmit={(e) => save("submit", e)} className="mt-8 space-y-6" noValidate>
        <div>
          <label className={label}>Title *</label>
          <input value={form.title} onChange={(e) => upd("title", e.target.value)} className={`${input} ${errCls("title")}`} placeholder="Modern 3BR Apartment in Westlands" />
          {errText("title")}
        </div>

        <div>
          <label className={label}>Description *</label>
          <textarea value={form.description} onChange={(e) => upd("description", e.target.value)} className={`${input} min-h-32 ${errCls("description")}`} placeholder="Describe the property, its layout, neighbourhood, and standout features..." />
          {errText("description")}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className={label}>Category *</label>
            <select value={form.category} onChange={(e) => upd("category", e.target.value)} className={input}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Type *</label>
            <select value={form.property_type} onChange={(e) => upd("property_type", e.target.value)} className={input}>
              {TYPE_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((t) => <option key={t}>{t}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>County *</label>
            <select value={form.county} onChange={(e) => upd("county", e.target.value)} className={input}>
              {COUNTIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className={label}>Town *</label>
            <input value={form.town} onChange={(e) => upd("town", e.target.value)} className={`${input} ${errCls("town")}`} placeholder="Kitengela" />
            {errText("town")}
          </div>
          <div>
            <label className={label}>Area / Estate</label>
            <input value={form.area} onChange={(e) => upd("area", e.target.value)} className={input} placeholder="Acacia" />
          </div>
          <div>
            <label className={label}>Size</label>
            <input value={form.size} onChange={(e) => upd("size", e.target.value)} className={input} placeholder="1,200 sq ft or 1/4 Acre" />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className={label}>Price (KSh) *</label>
            <input type="number" min="0" value={form.price} onChange={(e) => upd("price", e.target.value)} className={`${input} ${errCls("price")}`} />
            {errText("price")}
          </div>
          <div>
            <label className={label}>Price suffix</label>
            <input value={form.price_suffix} onChange={(e) => upd("price_suffix", e.target.value)} className={input} placeholder="/mo, /night" />
          </div>
          <div>
            <label className={label}>Bedrooms</label>
            <input type="number" min="0" value={form.bedrooms} onChange={(e) => upd("bedrooms", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Bathrooms</label>
            <input type="number" min="0" value={form.bathrooms} onChange={(e) => upd("bathrooms", e.target.value)} className={input} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={label}>Features (comma-separated)</label>
            <input value={form.features} onChange={(e) => upd("features", e.target.value)} className={input} placeholder="Parking, CCTV, Garden" />
          </div>
          <div>
            <label className={label}>Amenities (comma-separated)</label>
            <input value={form.amenities} onChange={(e) => upd("amenities", e.target.value)} className={input} placeholder="Wi-Fi, Water, Security" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={label}>Contact phone</label>
            <input value={form.contact_phone} onChange={(e) => upd("contact_phone", e.target.value)} className={input} placeholder="+254 700 000 000" />
          </div>
          <div>
            <label className={label}>WhatsApp number</label>
            <input value={form.contact_whatsapp} onChange={(e) => upd("contact_whatsapp", e.target.value)} className={input} placeholder="+254 700 000 000" />
          </div>
        </div>

        <div>
          <label className={label}>Photos *</label>
          <label
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-2 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 cursor-pointer text-center transition-colors ${dragOver ? "border-primary bg-primary-soft/50" : "border-border hover:bg-muted/50"} ${errors.images ? "border-destructive" : ""}`}
          >
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) uploadFiles(files); e.target.value = ""; }} />
            <UploadCloud className="h-8 w-8 text-primary" />
            <div className="text-sm font-semibold">Drop images here or click to browse</div>
            <div className="text-xs text-muted-foreground">PNG, JPG, WebP up to 8 MB — you can select multiple</div>
          </label>
          {errors.images && <div data-error="true" className="mt-1 text-xs text-destructive">{errors.images}</div>}

          {(images.length > 0 || uploading > 0) && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((src, i) => (
                <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">COVER</span>}
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-background/95 shadow opacity-0 group-hover:opacity-100 transition"
                    aria-label="Remove image">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <div key={`u-${i}`} className="aspect-square rounded-xl border border-border bg-muted grid place-items-center">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> The first photo becomes the cover image.</div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end gap-2">
          <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="btn-ghost">Cancel</button>
          <button disabled={saving || uploading > 0} className="btn-primary btn-primary-hover">
            {saving ? "Submitting..." : uploading > 0 ? "Uploading photos..." : "Submit for review"}
          </button>
        </div>
      </form>
    </div>
  );
}
