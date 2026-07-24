import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import { Loader2, Upload, Phone, MessageCircle, LifeBuoy } from "lucide-react";
import {
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  supportMessageFor,
  trackSupportClick,
  whatsappUrl,
} from "@/lib/support";

const TITLE = "Support Center — Foxwood Properties";
const DESC = "Submit a support ticket, track your open issues, or reach the Foxwood team by phone and WhatsApp.";
const OG_IMAGE = absoluteUrl(heroTools);

export const Route = createFileRoute("/help-center")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/help-center` }],
  }),
  component: HelpCenterPage,
});

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  body: string;
  screenshot_path: string | null;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  { v: "general", l: "General question" },
  { v: "account", l: "Account & sign-in" },
  { v: "listing", l: "Listing a property" },
  { v: "payments", l: "Payments & pricing" },
  { v: "verification", l: "Verification / KYC" },
  { v: "bug", l: "Bug report" },
  { v: "other", l: "Other" },
];
const PRIORITIES = [
  { v: "low", l: "Low" },
  { v: "normal", l: "Normal" },
  { v: "high", l: "High" },
  { v: "urgent", l: "Urgent" },
];

function statusColor(s: string) {
  return (
    {
      open: "bg-amber-100 text-amber-800",
      in_progress: "bg-blue-100 text-blue-800",
      waiting_user: "bg-purple-100 text-purple-800",
      resolved: "bg-emerald-100 text-emerald-800",
      closed: "bg-muted text-muted-foreground",
    }[s] ?? "bg-muted text-muted-foreground"
  );
}

function HelpCenterPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  };

  useEffect(() => { if (userId) load(userId); else setLoading(false); }, [userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!userId) { setErr("Please sign in to submit a ticket."); return; }
    if (subject.trim().length < 4) { setErr("Subject is too short."); return; }
    if (body.trim().length < 10) { setErr("Please describe your issue in more detail."); return; }
    setSubmitting(true);
    try {
      let screenshotPath: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Screenshot must be 5MB or smaller.");
        const ext = file.name.split(".").pop() || "png";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("support-uploads").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        screenshotPath = path;
      }
      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId, subject: subject.trim(), category, priority, body: body.trim(), screenshot_path: screenshotPath,
      });
      if (error) throw error;
      setMsg("Ticket submitted. We'll respond by email and here in your Support Center.");
      setSubject(""); setBody(""); setFile(null); setCategory("general"); setPriority("normal");
      load(userId);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        image={heroTools}
        eyebrow="Support Center"
        title="We're here to help"
        subtitle="Submit a ticket, track its status, or reach us instantly."
      />
      <section className="container-page py-14 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          {/* Submit form */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" /> Submit a ticket</h2>
            {!userId ? (
              <p className="mt-3 text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary underline">Sign in</Link> to open a support ticket so we can track its status.
              </p>
            ) : (
              <form className="mt-4 grid gap-4" onSubmit={submit}>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} required
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Describe your issue</label>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000} required
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Screenshot (optional, max 5MB)</label>
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    <span>{file ? file.name : "Choose file or drop here"}</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
                {err && <div className="text-sm text-destructive">{err}</div>}
                {msg && <div className="text-sm text-emerald-700">{msg}</div>}
                <div>
                  <button type="submit" disabled={submitting} className="btn-primary btn-primary-hover">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Submit ticket
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Tickets list */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold">My tickets</h2>
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !userId ? (
              <p className="mt-3 text-sm text-muted-foreground">Sign in to view your tickets.</p>
            ) : tickets.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {tickets.map((t) => (
                  <li key={t.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.subject}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(t.created_at).toLocaleString()} · {t.category} · {t.priority}
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full ${statusColor(t.status)}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                    {t.admin_response && (
                      <div className="mt-2 rounded-lg bg-primary-soft border border-primary/20 p-3 text-sm">
                        <div className="text-xs font-semibold text-primary mb-1">Foxwood support</div>
                        {t.admin_response}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl border border-primary/20 bg-primary-soft p-5">
            <div className="text-xs uppercase tracking-wider text-primary/80 font-semibold">Talk to us</div>
            <div className="mt-1 text-lg font-bold text-primary">{SUPPORT_PHONE_DISPLAY}</div>
            <p className="mt-1 text-xs text-foreground/70">Mon–Sat, 8AM–6PM EAT.</p>
            <div className="mt-3 grid gap-2">
              <a href={`tel:${SUPPORT_PHONE_TEL}`} onClick={() => trackSupportClick("call", "faq")}
                className="btn-primary btn-primary-hover !py-2 !px-4 text-sm justify-center">
                <Phone className="h-4 w-4" /> Call
              </a>
              <a href={whatsappUrl(supportMessageFor("faq"))} target="_blank" rel="noopener noreferrer"
                onClick={() => trackSupportClick("whatsapp", "faq")}
                className="btn-secondary !py-2 !px-4 text-sm justify-center">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <Link to="/faq" className="btn-ghost !py-2 !px-4 text-sm justify-center">Browse FAQ</Link>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
