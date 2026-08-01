import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a valid phone").max(30),
  message: z.string().trim().min(10, "Tell us a bit more").max(2000),
});

export function ServiceLeadForm({ service }: { service: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function upd<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: any = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] ??= i.message;
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("inquiries").insert({
        property_key: `service:${service.toLowerCase().replace(/\s+/g, "-")}`,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message: `[Service: ${service}]\n\n${parsed.data.message}`,
      });
      if (error) throw error;
      setDone(true);
      toast.success("Thanks — we'll be in touch shortly.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold">Request received</h3>
        <p className="mt-1 text-sm text-muted-foreground">A Foxwood advisor will reach out within one business day.</p>
      </div>
    );
  }

  const input = "w-full rounded-lg border border-border bg-field px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors";
  const err = (k: keyof typeof form) => errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4" noValidate>
      <div>
        <h3 className="text-lg font-bold">Request {service.toLowerCase()}</h3>
        <p className="text-xs text-muted-foreground mt-1">Fill in your details and we'll get back within one business day.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold">Full name</label>
          <input value={form.name} onChange={(e) => upd("name", e.target.value)} className={input} placeholder="Jane Wanjiru" />
          {err("name")}
        </div>
        <div>
          <label className="text-xs font-semibold">Phone</label>
          <input value={form.phone} onChange={(e) => upd("phone", e.target.value)} className={input} placeholder="+254 700 000 000" />
          {err("phone")}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold">Email</label>
        <input value={form.email} onChange={(e) => upd("email", e.target.value)} className={input} placeholder="you@example.com" />
        {err("email")}
      </div>
      <div>
        <label className="text-xs font-semibold">How can we help?</label>
        <textarea value={form.message} onChange={(e) => upd("message", e.target.value)} className={`${input} min-h-28`} placeholder={`Tell us what you need for ${service.toLowerCase()}...`} />
        {err("message")}
      </div>
      <button disabled={loading} className="btn-primary btn-primary-hover w-full">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send request</>}
      </button>
    </form>
  );
}
