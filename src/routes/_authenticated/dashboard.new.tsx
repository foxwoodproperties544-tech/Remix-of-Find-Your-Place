import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { X, UploadCloud, Loader2, ImageIcon, Info, FileText, MapPin, Crown, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { SupportBanner } from "@/components/site/SupportBanner";
import { PROFILE_COMPLETENESS_COLUMNS, missingProfileFields } from "@/lib/profile-completeness";
import { ListingQualityCard } from "@/components/listings/ListingQualityCard";



export const Route = createFileRoute("/_authenticated/dashboard/new")({
  component: NewListing,
  head: () => ({ meta: [{ title: "Post a listing — Foxwood Properties" }] }),
});

import { CATEGORIES as CATS, ALL_TYPES, TYPE_GROUPS } from "@/lib/taxonomy";
import { KENYA_COUNTIES, KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { TownCombobox } from "@/components/site/TownCombobox";
const CATEGORIES = [...CATS];
const TYPES = ALL_TYPES;
const COUNTIES = KENYA_COUNTIES;


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
  tour_url: z.string().trim().max(500).optional(),
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
  const [imageHashes, setImageHashes] = useState<{ url: string; hash: string }[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
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
    video_url: "", tour_url: "", lat: "", lng: "",
  });
  const [foundingStatus, setFoundingStatus] = useState<{
    isFounding: boolean; quota: number; used: number; remaining: number; atQuota: boolean;
  } | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select(`tier, tier_expires_at, listing_quota, ${PROFILE_COMPLETENESS_COLUMNS}`)
        .eq("id", user.id)
        .maybeSingle();
      const missing = missingProfileFields(prof as any);
      setMissingFields(missing);
      // Trust the stored flag when set; otherwise fall back to the same rules
      // the database uses so a freshly-filled profile isn't blocked by a stale row.
      setProfileComplete(!!(prof as any)?.profile_completed_at || missing.length === 0);
      const active =
        prof?.tier === "founding" &&
        (!prof.tier_expires_at || new Date(prof.tier_expires_at).getTime() > Date.now());
      if (!active) { setFoundingStatus(null); return; }
      const quota = Number(prof?.listing_quota ?? 0);
      const { count } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .in("status", ["pending", "published"]);
      const used = count ?? 0;
      setFoundingStatus({
        isFounding: true,
        quota,
        used,
        remaining: Math.max(0, quota - used),
        atQuota: quota > 0 && used >= quota,
      });
    })();
  }, [user]);



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
        // Hash the file for duplicate detection
        let hash = "";
        try {
          const buf = await file.arrayBuffer();
          const digest = await crypto.subtle.digest("SHA-256", buf);
          hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
          if (imageHashes.some((h) => h.hash === hash)) {
            toast.error(`${file.name} is already added to this listing`);
            setUploading((n) => n - 1);
            continue;
          }
          const { data: usedElsewhere } = await supabase.rpc("image_hash_used_elsewhere", {
            _hash: hash,
          });
          if (usedElsewhere) {
            setDuplicateWarnings((w) => [...w, `${file.name} matches a photo already used on another listing.`]);
            toast.warning(`Duplicate photo detected — ${file.name} is used elsewhere on Foxwood`);
          }

        } catch { /* hashing best-effort */ }

        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error } = await supabase.storage.from("property-images").upload(path, file);
        if (error) throw error;
        const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
        let url = pub?.publicUrl;
        try {
          const head = await fetch(url, { method: "HEAD" });
          if (!head.ok) throw new Error("not public");
        } catch {
          const { data: signed } = await supabase.storage
            .from("property-images")
            .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
          if (signed?.signedUrl) url = signed.signedUrl;
        }
        if (url) {
          setImages((s) => [...s, url!]);
          if (hash) setImageHashes((s) => [...s, { url: url!, hash }]);
        }
      } catch (err: any) {
        toast.error(err?.message ?? `Failed to upload ${file.name}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }, [user, imageHashes]);

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
      // County ↔ town validation
      if (form.county && form.town && !(KENYA_SUBLOCATIONS[form.county] ?? []).includes(form.town)) {
        newErrors.town = `“${form.town}” is not a known area in ${form.county}. Pick a suggestion or change the county.`;
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
      const { data: inserted, error } = await supabase.from("properties").insert({
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
        tour_url: form.tour_url || null,
        documents: docs,
        lat: latNum,
        lng: lngNum,
        status: mode === "draft" ? "draft" : "pending_payment",
      }).select("id").single();
      if (error) throw error;
      if (inserted?.id && imageHashes.length) {
        await supabase.from("property_image_hashes").insert(
          imageHashes.map((h) => ({
            property_id: inserted.id, owner_id: user.id,
            image_hash: h.hash, image_url: h.url,
          }))
        );
      }
      if (mode === "draft") {
        toast.success("Draft saved");
        navigate({ to: "/dashboard" });
      } else {
        // Founding-tier agents get their first N listings free (quota from plan).
        // Beyond quota, they must choose a paid package like anyone else.
        const { data: prof } = await supabase
          .from("profiles").select("tier, tier_expires_at, listing_quota").eq("id", user.id).maybeSingle();
        const compActive = prof?.tier === "founding" &&
          (!prof.tier_expires_at || new Date(prof.tier_expires_at).getTime() > Date.now());
        const quota = Number(prof?.listing_quota ?? 0);
        let usedCount = 0;
        if (compActive && quota > 0) {
          const { count } = await supabase
            .from("properties")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id)
            .in("status", ["pending", "published"])
            .neq("id", inserted!.id);
          usedCount = count ?? 0;
        }
        if (compActive && quota > 0 && usedCount < quota) {
          await supabase.from("properties").update({ status: "pending" }).eq("id", inserted!.id);
          const nowUsed = usedCount + 1;
          const remaining = Math.max(0, quota - nowUsed);
          // Notify agent when they hit the quota with this submission
          if (remaining === 0) {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "founding_quota_reached",
              title: `You've used all ${quota} free founding listings`,
              body: `Great work! To publish any additional listing, choose a paid package. Founding listings already submitted will continue through review.`,
              link: "/dashboard/upgrade",
            });
          }
          toast.success(`Listing submitted — awaiting admin approval (${nowUsed}/${quota} free listings used)`);
          navigate({ to: "/dashboard" });
        } else {
          if (compActive) {
            toast.info(`You've used all ${quota} free founding listings — choose a package to publish this one`);
          } else {
            toast.success("Listing created — choose a package to publish");
          }
          navigate({ to: "/dashboard/pay/$id", params: { id: inserted!.id } });
        }


      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }


  const input = "w-full rounded-lg border border-border bg-field px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors";
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

      <div className="mt-4">
        <SupportBanner context="dashboard" whatsappMessage="Hello Foxwood Properties, I need help posting a listing." />
      </div>

      {profileComplete === false && (
        <div className="mt-4 rounded-2xl border border-secondary/40 bg-secondary/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-secondary">Complete your public agent profile first</div>
            <p className="text-sm text-foreground/80 mt-1">
              Your account is active — we just need a few public profile details so buyers can see who they're dealing with.
            </p>
            {missingFields.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-foreground/80 space-y-0.5">
                {missingFields.map((f) => <li key={f}>{f}</li>)}
              </ul>
            )}
            <Link to="/dashboard/profile" className="btn-primary btn-primary-hover text-sm mt-3 inline-flex">Complete profile</Link>

          </div>
        </div>
      )}

      {foundingStatus?.atQuota && (

        <div className="mt-4 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-secondary">
              You've used all {foundingStatus.quota} free founding listings
            </div>
            <p className="text-sm text-foreground/80 mt-1">
              You can still create a listing, but it won't be published until you choose a paid
              package. Pick a plan first for the smoothest flow.
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Link to="/dashboard/upgrade" className="btn-primary btn-primary-hover text-sm">
                <Crown className="h-4 w-4" /> Choose a plan
              </Link>
              <Link to="/listing-packages" className="btn-ghost text-sm">See packages</Link>
            </div>
          </div>
        </div>
      )}
      {foundingStatus && !foundingStatus.atQuota && foundingStatus.remaining <= 2 && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-soft/40 p-3 text-xs text-primary flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {foundingStatus.remaining} free founding listing{foundingStatus.remaining === 1 ? "" : "s"} left.
            After that you'll need a paid package to publish more.
          </span>
        </div>
      )}


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
            <label className={label}>Town / Area *</label>
            <TownCombobox
              county={form.county}
              value={form.town}
              onChange={(v) => upd("town", v)}
              placeholder="Start typing an area..."
              error={errors.town}
            />
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
          {duplicateWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="font-semibold mb-1">Possible duplicate photos detected</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {duplicateWarnings.slice(-5).map((w, i) => <li key={i}>{w}</li>)}
              </ul>
              <p className="mt-1">Reused photos hurt trust and may be flagged by our moderators.</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className={label}>Video URL (YouTube, Vimeo, or MP4)</label>
            <input value={form.video_url} onChange={(e) => upd("video_url", e.target.value)} className={input} placeholder="https://youtu.be/..." />
          </div>
          <div className="md:col-span-3">
            <label className={label}>360° virtual tour URL (Matterport, Kuula, or YouTube 360)</label>
            <input value={form.tour_url} onChange={(e) => upd("tour_url", e.target.value)} className={input} placeholder="https://my.matterport.com/show/?m=..." />
            <p className="mt-1 text-xs text-muted-foreground">Buyers spend up to 3× longer on listings with a 360° tour.</p>
          </div>
          <div>
            <label className={label}><MapPin className="inline h-3 w-3" /> Latitude</label>
            <input value={form.lat} onChange={(e) => upd("lat", e.target.value)} className={input} placeholder="-1.2921" />
          </div>
          <div>
            <label className={label}><MapPin className="inline h-3 w-3" /> Longitude</label>
            <input value={form.lng} onChange={(e) => upd("lng", e.target.value)} className={input} placeholder="36.8219" />
          </div>
          <div className="flex items-end">
            <p className="text-xs text-muted-foreground">Optional. Overrides the auto-map position for this listing.</p>
          </div>
        </div>

        <div>
          <label className={label}>Documents (PDF, floor plans, title deed scans)</label>
          <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 cursor-pointer text-center hover:bg-muted/50">
            <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) uploadDocs(files); e.target.value = ""; }} />
            <FileText className="h-6 w-6 text-primary" />
            <div className="text-sm font-semibold">Attach documents</div>
            <div className="text-xs text-muted-foreground">Up to 20 MB each</div>
          </label>
          {(docs.length > 0 || uploadingDocs > 0) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate">{d.name}</span>
                  <button type="button" onClick={() => setDocs(docs.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
              ))}
              {Array.from({ length: uploadingDocs }).map((_, i) => (
                <div key={`ud-${i}`} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </div>
              ))}
            </div>
          )}
        </div>

        <ListingQualityCard
          input={{
            title: form.title,
            description: form.description,
            price: form.price,
            images,
            amenities: form.amenities,
            features: form.features,
            bedrooms: form.bedrooms,
            bathrooms: form.bathrooms,
            size: form.size,
            county: form.county,
            town: form.town,
            area: form.area,
            lat: form.lat,
            lng: form.lng,
            video_url: form.video_url,
            tour_url: form.tour_url,
            documents: docs,
          }}
        />

        <div className="pt-4 border-t border-border flex flex-wrap justify-end gap-2">

          <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="btn-ghost">Cancel</button>
          <button type="button" disabled={!!saving || uploading > 0} onClick={() => save("draft")} className="btn-ghost border border-border">
            {saving === "draft" ? "Saving draft…" : "Save as draft"}
          </button>
          <button type="submit" disabled={!!saving || uploading > 0} className="btn-primary btn-primary-hover">
            {saving === "submit" ? "Submitting..." : uploading > 0 ? "Uploading photos..." : "Submit for review"}
          </button>
        </div>
      </form>
    </div>
  );
}
