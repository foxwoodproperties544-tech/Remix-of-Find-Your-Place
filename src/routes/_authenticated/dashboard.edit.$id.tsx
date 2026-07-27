import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, X, Loader2, UploadCloud, FileText } from "lucide-react";
import { fetchPropertyRowById } from "@/lib/properties";
import { CATEGORIES as CATS, ALL_TYPES, TYPE_GROUPS } from "@/lib/taxonomy";

const CATEGORIES = [...CATS];
const TYPES = ALL_TYPES;
const COUNTIES = ["Nairobi", "Kiambu", "Kajiado", "Machakos", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu"];

export const Route = createFileRoute("/_authenticated/dashboard/edit/$id")({
  loader: async ({ params }) => {
    const row = await fetchPropertyRowById(params.id);
    if (!row) throw notFound();
    return { row };
  },
  head: () => ({ meta: [{ title: "Edit listing — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-bold">Listing not found</h1>
      <Link to="/dashboard" className="btn-primary btn-primary-hover mt-6 inline-flex">Back to dashboard</Link>
    </div>
  ),
  errorComponent: () => <div className="container-page py-20 text-center"><h1 className="text-2xl font-bold">Something went wrong</h1></div>,
  component: EditListing,
});

function EditListing() {
  const { row } = Route.useLoaderData();
  const { user } = useAuth();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [uploadingDocs, setUploadingDocs] = useState(0);
  const [images, setImages] = useState<string[]>(row.images ?? []);
  const initialDocs = Array.isArray(row.documents)
    ? (row.documents as any[]).filter(d => d && typeof d === "object" && typeof d.url === "string").map(d => ({ name: String(d.name ?? "Document"), url: String(d.url) }))
    : [];
  const [docs, setDocs] = useState<{ name: string; url: string }[]>(initialDocs);
  const [form, setForm] = useState({
    title: row.title,
    description: row.description,
    price: String(row.price),
    price_suffix: row.price_suffix ?? "",
    category: row.category,
    property_type: row.property_type,
    county: row.county,
    town: row.town,
    area: row.area ?? "",
    bedrooms: String(row.bedrooms),
    bathrooms: String(row.bathrooms),
    size: row.size ?? "",
    features: (row.features ?? []).join(", "),
    amenities: (row.amenities ?? []).join(", "),
    contact_phone: row.contact_phone ?? "",
    contact_whatsapp: row.contact_whatsapp ?? "",
    video_url: (row as any).video_url ?? "",
    lat: (row as any).lat != null ? String((row as any).lat) : "",
    lng: (row as any).lng != null ? String((row as any).lng) : "",
    status: row.status,
  });

  useEffect(() => {
    if (user && user.id !== row.owner_id) toast.error("You cannot edit this listing");
  }, [user, row.owner_id]);

  function upd<K extends keyof typeof form>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function uploadFiles(files: File[]) {
    if (!user) return;
    const valid = files.filter(f => f.type.startsWith("image/") && f.size <= 8 * 1024 * 1024);
    setUploading(n => n + valid.length);
    for (const file of valid) {
      try {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g,"_")}`;
        const { error } = await supabase.storage.from("property-images").upload(path, file);
        if (error) throw error;
        const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
        let url = pub?.publicUrl;
        try { const r = await fetch(url, { method: "HEAD" }); if (!r.ok) throw 0; }
        catch { const { data: s } = await supabase.storage.from("property-images").createSignedUrl(path, 60*60*24*365*10); if (s?.signedUrl) url = s.signedUrl; }
        if (url) setImages(s => [...s, url!]);
      } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
      finally { setUploading(n => n - 1); }
    }
  }

  async function uploadDocs(files: File[]) {
    if (!user) return;
    setUploadingDocs(n => n + files.length);
    for (const file of files) {
      try {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g,"_")}`;
        const { error } = await supabase.storage.from("property-docs").upload(path, file);
        if (error) throw error;
        const { data: s } = await supabase.storage.from("property-docs").createSignedUrl(path, 60*60*24*365*10);
        if (s?.signedUrl) setDocs(d => [...d, { name: file.name, url: s.signedUrl }]);
      } catch (e: any) { toast.error(e.message); }
      finally { setUploadingDocs(n => n - 1); }
    }
  }

  async function save(newStatus?: string) {
    if (!user) return;
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        price: Number(form.price) || 0,
        price_suffix: form.price_suffix || null,
        category: form.category,
        property_type: form.property_type,
        county: form.county,
        town: form.town,
        area: form.area || null,
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        size: form.size || null,
        images,
        features: form.features.split(",").map((s: string) => s.trim()).filter(Boolean),
        amenities: form.amenities.split(",").map((s: string) => s.trim()).filter(Boolean),
        contact_phone: form.contact_phone || null,
        contact_whatsapp: form.contact_whatsapp || null,
        video_url: form.video_url || null,
        documents: docs,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
      };
      if (newStatus) payload.status = newStatus;
      const { error } = await supabase.from("properties").update(payload).eq("id", row.id);
      if (error) throw error;
      toast.success("Listing updated");
      nav({ to: "/dashboard" });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const input = "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary";
  const label = "text-xs font-semibold text-foreground/80";

  return (
    <div className="container-page py-10 max-w-3xl">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="text-3xl font-bold mt-2">Edit listing</h1>
      <p className="text-sm text-muted-foreground mt-1">Current status: <span className="font-semibold text-foreground">{form.status}</span></p>

      <div className="mt-6">
        <ListingPriceManager
          propertyId={row.id}
          propertyKey={row.id}
          currentPrice={Number(row.price)}
          listedAt={(row as any).published_at ?? row.created_at}
        />
      </div>

      <div className="mt-8 space-y-6">
        <div><label className={label}>Title</label><input value={form.title} onChange={e => upd("title", e.target.value)} className={input} /></div>
        <div><label className={label}>Description</label><textarea value={form.description} onChange={e => upd("description", e.target.value)} className={`${input} min-h-32`} /></div>

        <div className="grid md:grid-cols-3 gap-4">
          <div><label className={label}>Category</label><select value={form.category} onChange={e => upd("category", e.target.value)} className={input}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className={label}>Type</label><select value={form.property_type} onChange={e => upd("property_type", e.target.value)} className={input}>{TYPE_GROUPS.map(g => <optgroup key={g.label} label={g.label}>{g.items.map(t => <option key={t}>{t}</option>)}</optgroup>)}</select></div>
          <div><label className={label}>County</label><select value={form.county} onChange={e => upd("county", e.target.value)} className={input}>{COUNTIES.map(c => <option key={c}>{c}</option>)}</select></div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div><label className={label}>Town</label><input value={form.town} onChange={e => upd("town", e.target.value)} className={input} /></div>
          <div><label className={label}>Area / Estate</label><input value={form.area} onChange={e => upd("area", e.target.value)} className={input} /></div>
          <div><label className={label}>Size</label><input value={form.size} onChange={e => upd("size", e.target.value)} className={input} /></div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div><label className={label}>Price (KSh)</label><input type="number" value={form.price} onChange={e => upd("price", e.target.value)} className={input} /></div>
          <div><label className={label}>Price suffix</label><input value={form.price_suffix} onChange={e => upd("price_suffix", e.target.value)} className={input} /></div>
          <div><label className={label}>Bedrooms</label><input type="number" value={form.bedrooms} onChange={e => upd("bedrooms", e.target.value)} className={input} /></div>
          <div><label className={label}>Bathrooms</label><input type="number" value={form.bathrooms} onChange={e => upd("bathrooms", e.target.value)} className={input} /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div><label className={label}>Features (comma-separated)</label><input value={form.features} onChange={e => upd("features", e.target.value)} className={input} /></div>
          <div><label className={label}>Amenities (comma-separated)</label><input value={form.amenities} onChange={e => upd("amenities", e.target.value)} className={input} /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div><label className={label}>Contact phone</label><input value={form.contact_phone} onChange={e => upd("contact_phone", e.target.value)} className={input} /></div>
          <div><label className={label}>WhatsApp</label><input value={form.contact_whatsapp} onChange={e => upd("contact_whatsapp", e.target.value)} className={input} /></div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-3"><label className={label}>Video URL</label><input value={form.video_url} onChange={e => upd("video_url", e.target.value)} className={input} placeholder="https://youtu.be/..." /></div>
          <div><label className={label}>Latitude</label><input value={form.lat} onChange={e => upd("lat", e.target.value)} className={input} /></div>
          <div><label className={label}>Longitude</label><input value={form.lng} onChange={e => upd("lng", e.target.value)} className={input} /></div>
        </div>

        <div>
          <label className={label}>Photos</label>
          <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/50">
            <input type="file" multiple accept="image/*" className="hidden" onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) uploadFiles(f); e.target.value = ""; }} />
            <UploadCloud className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold">Add more photos</span>
          </label>
          {(images.length > 0 || uploading > 0) && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((src, i) => (
                <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-border">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">COVER</span>}
                  <button onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-background/95 shadow" aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => <div key={`u${i}`} className="aspect-square rounded-xl border grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>)}
            </div>
          )}
        </div>

        <div>
          <label className={label}>Documents</label>
          <label className="mt-2 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/50">
            <input type="file" multiple className="hidden" onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) uploadDocs(f); e.target.value = ""; }} />
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold">Attach documents</span>
          </label>
          {(docs.length > 0 || uploadingDocs > 0) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate">{d.name}</span>
                  <button onClick={() => setDocs(docs.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
              ))}
              {Array.from({ length: uploadingDocs }).map((_, i) => <div key={`ud${i}`} className="flex items-center gap-2 rounded-lg border p-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</div>)}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border flex flex-wrap justify-end gap-2">
          <Link to="/dashboard" className="btn-ghost">Cancel</Link>
          {form.status === "draft" && (
            <button disabled={saving} onClick={() => save("pending")} className="btn-primary btn-primary-hover">Submit for review</button>
          )}
          {(form.status === "rejected") && (
            <button disabled={saving} onClick={() => save("pending")} className="btn-primary btn-primary-hover">Resubmit for review</button>
          )}
          <button disabled={saving || uploading > 0} onClick={() => save()} className="btn-primary btn-primary-hover">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
