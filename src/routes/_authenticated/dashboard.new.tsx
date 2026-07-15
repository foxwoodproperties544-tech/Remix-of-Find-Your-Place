import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/new")({
  component: NewListing,
  head: () => ({ meta: [{ title: "Post a listing — Foxwood Properties" }] }),
});

const CATEGORIES = ["For Sale", "For Rent", "For Lease"];
const TYPES = ["Land / Plots", "Houses", "Apartments", "Airbnbs", "Commercial", "Office Spaces", "Shops", "Warehouses", "Farms", "Holiday Homes"];
const COUNTIES = ["Nairobi", "Kiambu", "Kajiado", "Machakos", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu"];

function NewListing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imgInput, setImgInput] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", price: "", price_suffix: "",
    category: "For Sale", property_type: "Houses",
    county: "Nairobi", town: "", area: "",
    bedrooms: "0", bathrooms: "0", size: "",
    features: "", amenities: "",
    contact_phone: "", contact_whatsapp: "",
  });

  function upd<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function uploadFile(file: File) {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("property-images").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = await supabase.storage.from("property-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (data?.signedUrl) setImages((s) => [...s, data.signedUrl]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("properties").insert({
        owner_id: user.id,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        price_suffix: form.price_suffix || null,
        category: form.category,
        property_type: form.property_type,
        county: form.county,
        town: form.town,
        area: form.area || null,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        size: form.size || null,
        images,
        features: form.features.split(",").map((s) => s.trim()).filter(Boolean),
        amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
        contact_phone: form.contact_phone || null,
        contact_whatsapp: form.contact_whatsapp || null,
      }).select("id").single();
      if (error) throw error;
      toast.success("Listing published!");
      navigate({ to: "/properties/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm";
  const label = "text-xs font-semibold text-foreground/80";

  return (
    <div className="container-page py-10 max-w-3xl">
      <h1 className="text-3xl font-bold">Post a listing</h1>
      <p className="text-sm text-muted-foreground mt-1">Fill in the details below. All fields marked * are required.</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div>
          <label className={label}>Title *</label>
          <input required value={form.title} onChange={(e) => upd("title", e.target.value)} className={input} placeholder="Modern 3BR Apartment in Westlands" />
        </div>

        <div>
          <label className={label}>Description *</label>
          <textarea required value={form.description} onChange={(e) => upd("description", e.target.value)} className={input + " min-h-32"} placeholder="Describe the property..." />
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
              {TYPES.map((c) => <option key={c}>{c}</option>)}
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
            <input required value={form.town} onChange={(e) => upd("town", e.target.value)} className={input} placeholder="Kitengela" />
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
            <input required type="number" min="0" value={form.price} onChange={(e) => upd("price", e.target.value)} className={input} />
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
          <label className={label}>Photos</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative h-24 w-32 rounded-lg overflow-hidden border border-border">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-background/95 shadow"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <label className="h-24 w-32 rounded-lg border-2 border-dashed border-border grid place-items-center cursor-pointer hover:bg-muted text-xs text-muted-foreground">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
              <span className="flex flex-col items-center gap-1"><Plus className="h-5 w-5" /> Upload</span>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <input value={imgInput} onChange={(e) => setImgInput(e.target.value)} placeholder="…or paste an image URL" className={input} />
            <button type="button" onClick={() => { if (imgInput) { setImages([...images, imgInput]); setImgInput(""); } }} className="btn-ghost">Add</button>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end gap-2">
          <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary btn-primary-hover">{saving ? "Publishing..." : "Publish listing"}</button>
        </div>
      </form>
    </div>
  );
}
