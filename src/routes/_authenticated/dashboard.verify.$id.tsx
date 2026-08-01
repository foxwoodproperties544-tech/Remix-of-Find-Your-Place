import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { submitVerification } from "@/lib/verification.functions";
import { ShieldCheck, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/verify/$id")({
  component: Verify,
  head: () => ({ meta: [{ title: "Verify listing — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

async function uploadDoc(userId: string, propertyId: string, file: File): Promise<string> {
  const path = `${userId}/${propertyId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("property-docs").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = await supabase.storage.from("property-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data!.signedUrl;
}

function Verify() {
  const { id } = useParams({ from: "/_authenticated/dashboard/verify/$id" });
  const { user } = useAuth();
  const nav = useNavigate();
  const [idFile, setIdFile] = useState<File | null>(null);
  const [deedFile, setDeedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const submitFn = useServerFn(submitVerification);

  const { data: prop } = useQuery({
    queryKey: ["prop-verify", id],
    queryFn: async () => (await supabase.from("properties").select("id,title,verified").eq("id", id).maybeSingle()).data,
  });

  const { data: existing } = useQuery({
    queryKey: ["verification-req", id],
    queryFn: async () => (await supabase.from("verification_requests").select("*").eq("property_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      let idUrl: string | undefined;
      let deedUrl: string | undefined;
      if (idFile) idUrl = await uploadDoc(user.id, id, idFile);
      if (deedFile) deedUrl = await uploadDoc(user.id, id, deedFile);
      await submitFn({ data: { propertyId: id, idDocumentUrl: idUrl, titleDeedUrl: deedUrl, notes: notes || undefined } });
    },
    onSuccess: () => { toast.success("Verification submitted for review"); nav({ to: "/dashboard" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to submit"),
  });

  const alreadyVerified = prop?.verified;
  const pending = existing?.status === "pending";

  return (
    <div className="container-page py-10 max-w-2xl">
      <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
      <div className="mt-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1"><ShieldCheck className="h-3.5 w-3.5" /> Verification</div>
        <h1 className="text-2xl font-bold mt-2">Verify this listing</h1>
        <p className="text-sm text-muted-foreground mt-1 truncate">{prop?.title ?? "Loading…"}</p>
      </div>

      {alreadyVerified ? (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary-soft p-5">
          <p className="text-sm font-semibold text-primary">✅ This listing is verified.</p>
        </div>
      ) : pending ? (
        <div className="mt-6 rounded-xl border border-secondary/30 bg-secondary/10 p-5">
          <p className="text-sm font-semibold">Under review</p>
          <p className="text-xs text-muted-foreground mt-1">Your documents have been submitted. An admin will review them within 24–48 hours.</p>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="mt-6 space-y-4">
          <div className="rounded-xl border border-border p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground">Upload clear photos or PDFs. Documents are stored privately and only shared with our verification team.</p>
          </div>

          <FileField label="ID / Passport" file={idFile} onChange={setIdFile} accept="image/*,.pdf" />
          <FileField label="Title deed / ownership document" file={deedFile} onChange={setDeedFile} accept="image/*,.pdf" />

          <label className="block text-sm">
            <span className="font-medium">Notes (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-field" placeholder="Anything the reviewer should know" />
          </label>

          <div className="flex gap-3">
            <button type="button" onClick={() => nav({ to: "/dashboard" })} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={submit.isPending || (!idFile && !deedFile)} className="btn-primary btn-primary-hover disabled:opacity-40">
              {submit.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit for review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function FileField({ label, file, onChange, accept }: { label: string; file: File | null; onChange: (f: File | null) => void; accept: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <Upload className="h-5 w-5 text-muted-foreground" />
        <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="text-sm flex-1" />
        {file && <span className="text-xs text-primary font-medium truncate max-w-[10rem]">{file.name}</span>}
      </div>
    </label>
  );
}
