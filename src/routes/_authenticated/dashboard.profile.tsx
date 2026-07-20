import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserCog, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "My profile — Foxwood" }, { name: "robots", content: "noindex" }] }),
});

type ProfileForm = {
  full_name: string;
  phone: string;
  whatsapp: string;
  company_name: string;
  bio: string;
  avatar_url: string;
};

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileForm>({
    full_name: "", phone: "", whatsapp: "", company_name: "", bio: "", avatar_url: "",
  });
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        whatsapp: data.whatsapp ?? "",
        company_name: data.company_name ?? "",
        bio: data.bio ?? "",
        avatar_url: data.avatar_url ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async (payload: ProfileForm) => {
      const { error } = await supabase.from("profiles").update(payload).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  async function handleAvatarUpload(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("property-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
      setForm((f) => ({ ...f, avatar_url: pub.publicUrl }));
      toast.success("Avatar uploaded — click Save to apply");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
        <UserCog className="h-3.5 w-3.5" /> Profile
      </div>
      <h1 className="text-3xl font-bold mt-2">My profile</h1>
      <p className="text-sm text-muted-foreground mt-1">This information appears on your public agent profile and listings.</p>

      <form
        className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6"
        onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}
      >
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center">
            {form.avatar_url
              ? <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              : <UserCog className="h-8 w-8 text-muted-foreground" />}
          </div>
          <label className="btn-ghost text-sm cursor-pointer inline-flex items-center gap-2">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload avatar"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) handleAvatarUpload(f);
            }} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </Field>
          <Field label="Company">
            <input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254…" />
          </Field>
          <Field label="WhatsApp">
            <input className="input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+254…" />
          </Field>
        </div>

        <Field label="Short bio">
          <textarea className="input min-h-[120px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={600} />
          <div className="text-xs text-muted-foreground mt-1">{form.bio.length}/600</div>
        </Field>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="submit" className="btn-primary btn-primary-hover" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}
