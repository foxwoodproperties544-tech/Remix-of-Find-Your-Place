import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Download, CheckCircle2, XCircle } from "lucide-react";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import {
  upsertBusiness, deleteBusiness, importBusinesses, listBusinessClaims, reviewBusinessClaim,
  upsertBusinessCategory, upsertBusinessPlan, listDirectoryEnquiries, updateEnquiryStatus,
  directoryLeadReport,
} from "@/lib/directory.functions";
import { fetchCategories, fetchBusinessPlans } from "@/lib/directory";

export const Route = createFileRoute("/_authenticated/admin/directory")({
  head: () => ({ meta: [{ title: "Business directory — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminDirectory,
});

const TABS = ["Businesses", "Import", "Claims", "Categories", "Plans", "Enquiries", "Reports"] as const;
type Tab = (typeof TABS)[number];

const EMPTY = {
  id: undefined as string | undefined,
  name: "", categoryId: "", shortDescription: "", description: "", logoUrl: "", coverUrl: "",
  website: "", email: "", phone: "", whatsapp: "", address: "", county: "", town: "",
  counties: "", towns: "", services: "", propertyTypes: "", yearsInBusiness: "",
  verified: false, featured: false, status: "published" as "published" | "draft" | "archived",
};

function AdminDirectory() {
  const { isAdmin, loading } = useRoles();
  const [tab, setTab] = useState<Tab>("Businesses");

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Admins only.</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Business directory management</h1>
        <p className="text-sm text-muted-foreground">Companies, claims, categories, plans, enquiries and lead reports.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t ? "bg-primary text-primary-foreground" : "border border-border"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Businesses" && <BusinessesTab />}
      {tab === "Import" && <ImportTab />}
      {tab === "Claims" && <ClaimsTab />}
      {tab === "Categories" && <CategoriesTab />}
      {tab === "Plans" && <PlansTab />}
      {tab === "Enquiries" && <EnquiriesTab />}
      {tab === "Reports" && <ReportsTab />}
    </div>
  );
}

function useAllBusinesses() {
  return useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function BusinessesTab() {
  const qc = useQueryClient();
  const save = useServerFn(upsertBusiness);
  const del = useServerFn(deleteBusiness);
  const { data: rows = [], isLoading } = useAllBusinesses();
  const { data: cats = [] } = useQuery({ queryKey: ["business-categories"], queryFn: fetchCategories });
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);

  const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

  const m = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: form.id,
          name: form.name,
          categoryId: form.categoryId || null,
          shortDescription: form.shortDescription,
          description: form.description,
          logoUrl: form.logoUrl, coverUrl: form.coverUrl, website: form.website,
          email: form.email, phone: form.phone, whatsapp: form.whatsapp,
          address: form.address, county: form.county, town: form.town,
          counties: list(form.counties), towns: list(form.towns),
          services: list(form.services), propertyTypes: list(form.propertyTypes),
          socials: {}, businessHours: {},
          yearsInBusiness: form.yearsInBusiness ? Number(form.yearsInBusiness) : null,
          verified: form.verified, featured: form.featured, status: form.status,
        } as any,
      }),
    onSuccess: () => {
      toast.success("Saved");
      setForm({ ...EMPTY });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  function exportCsv() {
    const header = ["name", "slug", "county", "town", "email", "phone", "whatsapp", "website", "verified", "featured", "status"];
    const csv = [header.join(","),
      ...rows.map((r: any) => header.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "foxwood-directory.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setForm({ ...EMPTY }); setOpen(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add business
        </button>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {open && (
        <form className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Company name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <label className="text-sm">
            <span className="mb-1 block font-medium">Category</span>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <Field label="County" value={form.county} onChange={(v) => setForm({ ...form, county: v })} />
          <Field label="Town" value={form.town} onChange={(v) => setForm({ ...form, town: v })} />
          <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
          <Field label="Years in business" value={form.yearsInBusiness} onChange={(v) => setForm({ ...form, yearsInBusiness: v })} />
          <Field label="Logo URL" value={form.logoUrl} onChange={(v) => setForm({ ...form, logoUrl: v })} />
          <Field label="Cover URL" value={form.coverUrl} onChange={(v) => setForm({ ...form, coverUrl: v })} />
          <Field label="Counties served (comma separated)" value={form.counties} onChange={(v) => setForm({ ...form, counties: v })} />
          <Field label="Towns served (comma separated)" value={form.towns} onChange={(v) => setForm({ ...form, towns: v })} />
          <Field label="Services (comma separated)" value={form.services} onChange={(v) => setForm({ ...form, services: v })} />
          <Field label="Property types (comma separated)" value={form.propertyTypes} onChange={(v) => setForm({ ...form, propertyTypes: v })} />
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Short description</span>
            <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Description</span>
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} /> Verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured
            </label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <button type="submit" disabled={m.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save business
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr>
              <th className="p-3">Company</th><th className="p-3">Location</th><th className="p-3">Status</th><th className="p-3">Claimed</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.name}{r.verified ? " ✓" : ""}{r.featured ? " ★" : ""}</td>
                  <td className="p-3 text-muted-foreground">{[r.town, r.county].filter(Boolean).join(", ")}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3">{r.owner_id ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setForm({
                          ...EMPTY, id: r.id, name: r.name, categoryId: r.category_id ?? "",
                          shortDescription: r.short_description ?? "", description: r.description ?? "",
                          logoUrl: r.logo_url ?? "", coverUrl: r.cover_url ?? "", website: r.website ?? "",
                          email: r.email ?? "", phone: r.phone ?? "", whatsapp: r.whatsapp ?? "",
                          address: r.address ?? "", county: r.county ?? "", town: r.town ?? "",
                          counties: (r.counties ?? []).join(", "), towns: (r.towns ?? []).join(", "),
                          services: (r.services ?? []).join(", "), propertyTypes: (r.property_types ?? []).join(", "),
                          yearsInBusiness: r.years_in_business ? String(r.years_in_business) : "",
                          verified: r.verified, featured: r.featured, status: r.status,
                        });
                        setOpen(true);
                      }}
                      className="mr-3 text-primary">Edit</button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete ${r.name}?`)) return;
                        try { await del({ data: { id: r.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-businesses"] }); }
                        catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
                      }}
                      className="text-destructive"><Trash2 className="inline h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function ImportTab() {
  const run = useServerFn(importBusinesses);
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Bulk import companies</h2>
      <p className="text-sm text-muted-foreground">
        Upload a CSV (or Excel exported as CSV) with columns: name, category, county, town, address, website,
        email, phone, whatsapp, description, logo_url, cover_url, verified, featured.
      </p>
      <input type="file" accept=".csv,text/csv"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const parsed = parseCsv(await f.text());
          setRows(parsed);
          setResult(null);
          toast.success(`${parsed.length} rows read`);
        }}
        className="block text-sm" />

      {rows.length > 0 && (
        <>
          <p className="text-sm">{rows.length} rows ready. Preview of first 5:</p>
          <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(rows.slice(0, 5), null, 2)}</pre>
          <button disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await run({ data: { rows: rows.slice(0, 500) } });
                setResult(r);
                toast.success(`${r.successes}/${r.total} imported`);
                qc.invalidateQueries({ queryKey: ["admin-businesses"] });
              } catch (e: any) { toast.error(e?.message ?? "Import failed"); }
              finally { setBusy(false); }
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import {rows.length} companies
          </button>
        </>
      )}

      {result && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">{result.successes} of {result.total} imported.</p>
          <ul className="mt-2 space-y-1 text-xs text-destructive">
            {result.results.filter((r: any) => !r.ok).map((r: any) => <li key={r.row}>Row {r.row}: {r.error}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ClaimsTab() {
  const list = useServerFn(listBusinessClaims);
  const review = useServerFn(reviewBusinessClaim);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin-claims", status], queryFn: () => list({ data: { status } }) });

  return (
    <div className="space-y-4">
      <select value={status} onChange={(e) => setStatus(e.target.value as any)}
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
        {["pending", "approved", "rejected", "all"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No claims.</p>
      ) : (
        <ul className="space-y-3">
          {(rows as any[]).map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.businesses?.name ?? c.business_id}</p>
                  <p className="text-sm text-muted-foreground">{c.full_name} · {c.email} · {c.phone} {c.role_at_company ? `· ${c.role_at_company}` : ""}</p>
                  {c.note && <p className="mt-1 text-sm">{c.note}</p>}
                  {(c.proof_urls ?? []).map((u: string) => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="mr-2 text-xs text-primary underline">proof</a>
                  ))}
                </div>
                {c.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      await review({ data: { claimId: c.id, action: "approve" } });
                      toast.success("Approved"); qc.invalidateQueries({ queryKey: ["admin-claims"] });
                    }} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </button>
                    <button onClick={async () => {
                      const notes = prompt("Reason for rejection?") ?? "";
                      await review({ data: { claimId: c.id, action: "reject", adminNotes: notes } });
                      toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["admin-claims"] });
                    }} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs">
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </div>
                )}
                {c.status !== "pending" && <span className="text-xs uppercase text-muted-foreground">{c.status}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoriesTab() {
  const save = useServerFn(upsertBusinessCategory);
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({ queryKey: ["business-categories"], queryFn: fetchCategories });
  const [name, setName] = useState("");

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <form className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await save({ data: { name, sortOrder: cats.length + 1, active: true } as any });
            setName(""); toast.success("Category added");
            qc.invalidateQueries({ queryKey: ["business-categories"] });
          } catch (err: any) { toast.error(err?.message ?? "Failed"); }
        }}>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="New category name"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add category</button>
      </form>
      <ul className="grid gap-2 sm:grid-cols-2">
        {cats.map((c) => <li key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">{c.name}</li>)}
      </ul>
    </div>
  );
}

function PlansTab() {
  const save = useServerFn(upsertBusinessPlan);
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["business-plans"], queryFn: fetchBusinessPlans });
  const [f, setF] = useState({ name: "", price: "3500", listingLimit: "20", durationDays: "30", featured: false });

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <form className="grid gap-3 sm:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await save({ data: {
              name: f.name, price: Number(f.price), listingLimit: Number(f.listingLimit),
              durationDays: Number(f.durationDays), featuredPlacement: f.featured,
              analyticsAccess: true, perks: [], active: true,
            } as any });
            toast.success("Plan saved"); setF({ ...f, name: "" });
            qc.invalidateQueries({ queryKey: ["business-plans"] });
          } catch (err: any) { toast.error(err?.message ?? "Failed"); }
        }}>
        <Field label="Plan name" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
        <Field label="Price (KSh)" value={f.price} onChange={(v) => setF({ ...f, price: v })} />
        <Field label="Listing limit" value={f.listingLimit} onChange={(v) => setF({ ...f, listingLimit: v })} />
        <Field label="Duration (days)" value={f.durationDays} onChange={(v) => setF({ ...f, durationDays: v })} />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured
          </label>
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
        </div>
      </form>
      <ul className="space-y-2">
        {plans.map((p) => (
          <li key={p.id} className="rounded-lg border border-border px-3 py-2 text-sm">
            {p.name} — KSh {p.price.toLocaleString()} / {p.duration_days} days · {p.listing_limit} listings
            {p.featured_placement ? " · featured placement" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnquiriesTab() {
  const list = useServerFn(listDirectoryEnquiries);
  const update = useServerFn(updateEnquiryStatus);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin-directory-enquiries"], queryFn: () => list({ data: {} }) });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left"><tr>
          <th className="p-3">Date</th><th className="p-3">Company</th><th className="p-3">Property</th>
          <th className="p-3">Contact</th><th className="p-3">Source</th><th className="p-3">Status</th>
        </tr></thead>
        <tbody>
          {(rows as any[]).map((r) => (
            <tr key={r.id} className="border-t border-border align-top">
              <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-3">{r.businesses?.name ?? "—"}</td>
              <td className="p-3">{r.properties?.title ?? "—"}</td>
              <td className="p-3">{r.name}<br /><span className="text-xs text-muted-foreground">{r.email} {r.phone}</span></td>
              <td className="p-3">{r.source}</td>
              <td className="p-3">
                <select value={r.status}
                  onChange={async (e) => {
                    await update({ data: { id: r.id, status: e.target.value as any } });
                    qc.invalidateQueries({ queryKey: ["admin-directory-enquiries"] });
                  }}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs">
                  {["new", "contacted", "converted", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsTab() {
  const report = useServerFn(directoryLeadReport);
  const { data, isLoading } = useQuery({ queryKey: ["directory-lead-report"], queryFn: () => report({}) });
  const cards = useMemo(
    () => data ? [
      { label: "Total enquiries", value: data.totalEnquiries },
      { label: "Converted", value: data.converted },
      { label: "Conversion rate", value: `${data.conversionRate}%` },
    ] : [],
    [data],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <TopList title="Top companies by enquiries" rows={data?.topByEnquiries ?? []} field="enquiries" />
        <TopList title="Most viewed companies" rows={data?.topByViews ?? []} field="views" />
      </div>
    </div>
  );
}

function TopList({ title, rows, field }: { title: string; rows: any[]; field: "enquiries" | "views" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm">
        {rows.length === 0 && <li className="text-muted-foreground">No data yet.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between gap-3">
            <span className="truncate">{r.name}</span>
            <span className="font-semibold">{r[field]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
