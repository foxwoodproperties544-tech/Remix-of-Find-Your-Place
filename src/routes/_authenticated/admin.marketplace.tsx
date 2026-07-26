import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import {
  setVerificationCheck,
  setInvestmentRating,
  upsertAreaGuide,
  updateDueDiligenceRequest,
  listDueDiligenceRequests,
} from "@/lib/marketplace-admin.functions";
import { fetchVerificationCriteria, fetchInvestmentFactors, UUID_RE } from "@/lib/scoring";
import { ShieldCheck, TrendingUp, MapPinned, FileSearch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/marketplace")({
  component: AdminMarketplace,
  head: () => ({
    meta: [
      { title: "Marketplace controls — Foxwood admin" },
      { name: "description", content: "Admin controls for verification scores, investment scores, area guides and due-diligence requests." },
      { property: "og:title", content: "Marketplace controls — Foxwood admin" },
      { property: "og:description", content: "Verification and investment scoring, area guides and due-diligence queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const TABS = [
  { key: "scores", label: "Property scoring", icon: ShieldCheck },
  { key: "guides", label: "Area guides", icon: MapPinned },
  { key: "dd", label: "Due-diligence queue", icon: FileSearch },
] as const;

function AdminMarketplace() {
  const { isAdmin, loading } = useAdminGuard();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("scores");

  if (loading) return <p className="text-sm text-muted-foreground">Checking permissions…</p>;
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Marketplace controls</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every change here is role-checked on the server and written to the admin audit log.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border transition ${
              tab === t.key ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted/50"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "scores" && <ScoresPanel />}
      {tab === "guides" && <GuidesPanel />}
      {tab === "dd" && <DueDiligencePanel />}
    </div>
  );
}

/* ----------------------------- scoring ----------------------------- */

function ScoresPanel() {
  const qc = useQueryClient();
  const [propertyId, setPropertyId] = useState("");
  const valid = UUID_RE.test(propertyId);

  const setCheck = useServerFn(setVerificationCheck);
  const setRating = useServerFn(setInvestmentRating);

  const { data: criteria } = useQuery({ queryKey: ["verification-criteria"], queryFn: fetchVerificationCriteria });
  const { data: factors } = useQuery({ queryKey: ["investment-factors"], queryFn: fetchInvestmentFactors });

  const { data: current } = useQuery({
    queryKey: ["admin-scores", propertyId],
    enabled: valid,
    queryFn: async () => {
      const [checks, ratings, prop] = await Promise.all([
        supabase.from("property_verification_checks").select("criterion_key, passed").eq("property_id", propertyId),
        supabase.from("property_investment_ratings").select("factor_key, value").eq("property_id", propertyId),
        supabase.from("properties").select("title, property_type").eq("id", propertyId).maybeSingle(),
      ]);
      return {
        checks: new Map((checks.data ?? []).map((c: any) => [c.criterion_key, c.passed])),
        ratings: new Map((ratings.data ?? []).map((r: any) => [r.factor_key, Number(r.value)])),
        title: (prop.data as any)?.title as string | undefined,
      };
    },
  });

  const saveCheck = useMutation({
    mutationFn: (v: { criterionKey: string; passed: boolean }) =>
      setCheck({ data: { propertyId, criterionKey: v.criterionKey, passed: v.passed } }),
    onSuccess: () => {
      toast.success("Verification check saved");
      qc.invalidateQueries({ queryKey: ["admin-scores", propertyId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const saveRating = useMutation({
    mutationFn: (v: { factorKey: string; value: number }) =>
      setRating({ data: { propertyId, factorKey: v.factorKey, value: v.value } }),
    onSuccess: () => {
      toast.success("Investment rating saved");
      qc.invalidateQueries({ queryKey: ["admin-scores", propertyId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  return (
    <div className="space-y-5">
      <label className="block max-w-xl">
        <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Property ID (UUID)</span>
        <input
          className="input"
          value={propertyId}
          maxLength={36}
          placeholder="00000000-0000-0000-0000-000000000000"
          onChange={(e) => setPropertyId(e.target.value.trim())}
        />
        {propertyId && !valid && <span className="text-xs text-destructive">Enter a valid property UUID</span>}
        {current?.title && <span className="text-xs text-muted-foreground">Editing: {current.title}</span>}
      </label>

      {valid && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Verification checks</h2>
            <ul className="mt-3 space-y-2">
              {(criteria ?? []).filter((c) => c.active).map((c) => (
                <li key={c.key} className="flex items-center justify-between gap-3 text-sm">
                  <span>{c.label}</span>
                  <input
                    type="checkbox"
                    aria-label={c.label}
                    checked={!!current?.checks.get(c.key)}
                    disabled={saveCheck.isPending}
                    onChange={(e) => saveCheck.mutate({ criterionKey: c.key, passed: e.target.checked })}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-secondary" /> Investment factors</h2>
            <ul className="mt-3 space-y-3">
              {(factors ?? []).filter((f) => f.active).map((f) => (
                <li key={f.key} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span>{f.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      className="input !w-24"
                      defaultValue={current?.ratings.get(f.key) ?? ""}
                      aria-label={`${f.label} rating out of 10`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (e.target.value === "" || Number.isNaN(v) || v < 0 || v > 10) return;
                        saveRating.mutate({ factorKey: f.key, value: v });
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- area guides ----------------------------- */

function GuidesPanel() {
  const qc = useQueryClient();
  const save = useServerFn(upsertAreaGuide);
  const [form, setForm] = useState({ slug: "", name: "", county: "", town: "", overview: "", published: false });

  const { data: guides } = useQuery({
    queryKey: ["admin-area-guides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("area_guides").select("id, slug, name, county, town, published").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: () =>
      save({
        data: {
          slug: form.slug.toLowerCase(),
          name: form.name,
          level: form.town ? ("town" as const) : ("county" as const),
          county: form.county || undefined,
          town: form.town || undefined,
          overview: form.overview || undefined,
          published: form.published,
        },
      }),
    onSuccess: () => {
      toast.success("Area guide saved");
      setForm({ slug: "", name: "", county: "", town: "", overview: "", published: false });
      qc.invalidateQueries({ queryKey: ["admin-area-guides"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save guide"),
  });

  const togglePublish = useMutation({
    mutationFn: (g: any) =>
      save({
        data: {
          id: g.id,
          slug: g.slug,
          name: g.name,
          level: g.town ? ("town" as const) : ("county" as const),
          county: g.county ?? undefined,
          town: g.town ?? undefined,
          published: !g.published,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-area-guides"] }),
    onError: (e: any) => toast.error(e?.message ?? "Could not update guide"),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <form
        className="rounded-2xl border border-border bg-card p-5 grid gap-3"
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
      >
        <h2 className="font-bold">New area guide</h2>
        <input required maxLength={120} className="input" placeholder="Name (e.g. Kitengela)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required maxLength={120} pattern="[a-z0-9-]+" className="input" placeholder="slug-like-this" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input maxLength={80} className="input" placeholder="County" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
        <input maxLength={80} className="input" placeholder="Town (optional)" value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} />
        <textarea rows={4} maxLength={6000} className="input" placeholder="Overview" value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish immediately
        </label>
        <button className="btn-primary btn-primary-hover text-sm" disabled={create.isPending}>Save guide</button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">Existing guides</h2>
        <ul className="mt-3 divide-y divide-border">
          {(guides ?? []).map((g: any) => (
            <li key={g.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-semibold">{g.name}</span>{" "}
                <span className="text-muted-foreground">/{g.slug}</span>
              </span>
              <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => togglePublish.mutate(g)}>
                {g.published ? "Unpublish" : "Publish"}
              </button>
            </li>
          ))}
          {(guides ?? []).length === 0 && <li className="py-4 text-sm text-muted-foreground">No guides yet.</li>}
        </ul>
      </div>
    </div>
  );
}

/* ----------------------------- due diligence ----------------------------- */

const DD_STATUSES = ["new", "in_progress", "completed", "cancelled"] as const;

function DueDiligencePanel() {
  const qc = useQueryClient();
  const list = useServerFn(listDueDiligenceRequests);
  const update = useServerFn(updateDueDiligenceRequest);

  const { data: rows } = useQuery({
    queryKey: ["admin-dd-requests"],
    queryFn: () => list({ data: {} }),
  });

  const setStatus = useMutation({
    mutationFn: (v: { requestId: string; status: (typeof DD_STATUSES)[number] }) => update({ data: v }),
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["admin-dd-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update"),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">Received</th><th>Service</th><th>Name</th><th>Contact</th><th>County</th><th>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(rows ?? []).map((r: any) => (
            <tr key={r.id}>
              <td className="py-2">{new Date(r.created_at).toLocaleDateString()}</td>
              <td>{r.service}</td>
              <td>{r.name}</td>
              <td>{r.phone}{r.email ? ` · ${r.email}` : ""}</td>
              <td>{r.county ?? "—"}</td>
              <td>
                <select
                  className="input !py-1 !text-xs"
                  value={r.status ?? "new"}
                  aria-label={`Status for ${r.name}`}
                  onChange={(e) => setStatus.mutate({ requestId: r.id, status: e.target.value as any })}
                >
                  {DD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {(rows ?? []).length === 0 && (
            <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No requests yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
