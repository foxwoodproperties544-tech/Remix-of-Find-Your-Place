import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { adminInviteAgent, listCompAgents, revokeCompAgent } from "@/lib/admin-agents.functions";
import { ShieldCheck, UserPlus, Sparkles, Trash2, Loader2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/agents")({
  component: AdminAgents,
  head: () => ({
    meta: [
      { title: "Invite agents — Foxwood Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AdminAgents() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const qc = useQueryClient();
  const inviteFn = useServerFn(adminInviteAgent);
  const listFn = useServerFn(listCompAgents);
  const revokeFn = useServerFn(revokeCompAgent);

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    whatsapp: "",
    company_name: "",
    bio: "",
    comp_reason: "",
    send_invite: true,
  });

  const { data: comps, isLoading } = useQuery({
    queryKey: ["admin-comp-agents"],
    enabled: isAdmin,
    queryFn: () => listFn(),
  });

  const inviteMut = useMutation({
    mutationFn: () => inviteFn({ data: { ...form, tier_slug: "founding" } }),
    onSuccess: (r: any) => {
      toast.success(
        r.created
          ? `Agent invited — magic-link email sent`
          : `Existing user upgraded to Founding Agent`,
      );
      setForm({
        email: "", full_name: "", phone: "", whatsapp: "",
        company_name: "", bio: "", comp_reason: "", send_invite: true,
      });
      qc.invalidateQueries({ queryKey: ["admin-comp-agents"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to invite"),
  });

  const revokeMut = useMutation({
    mutationFn: (userId: string) => revokeFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Complimentary plan revoked");
      qc.invalidateQueries({ queryKey: ["admin-comp-agents"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-xl font-bold mt-3">Admins only</h1>
        <button onClick={() => nav({ to: "/dashboard/account" })} className="btn-primary btn-primary-hover mt-4">Back</button>
      </div>
    );
  }

  const canSubmit = form.email.trim() && form.full_name.trim().length >= 2 && !inviteMut.isPending;

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
          <Sparkles className="h-3.5 w-3.5" /> Founding Agents Program
        </div>
        <h1 className="text-3xl font-bold mt-2">Invite agents (free)</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Hand-pick early agents and grant them a 90-day complimentary <strong>Founding Agent</strong> plan
          (20 listings, verified badge, no payment). They receive an email invite to set their password.
        </p>
      </div>

      {/* Invite form */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) inviteMut.mutate(); }}
        className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-3xl"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Invite new agent</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email *">
            <input required type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputCls} placeholder="agent@example.com" />
          </Field>
          <Field label="Full name *">
            <input required value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className={inputCls} placeholder="Jane Wanjiku" />
          </Field>
          <Field label="Phone">
            <input value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputCls} placeholder="+254 7XX XXX XXX" />
          </Field>
          <Field label="WhatsApp">
            <input value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              className={inputCls} placeholder="+254 7XX XXX XXX" />
          </Field>
          <Field label="Agency / company">
            <input value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              className={inputCls} placeholder="Foxwood Realty" />
          </Field>
          <Field label="Reason for comp (internal note)">
            <input value={form.comp_reason}
              onChange={(e) => setForm((f) => ({ ...f, comp_reason: e.target.value }))}
              className={inputCls} placeholder="Top producer, Nairobi" />
          </Field>
        </div>

        <Field label="Short bio (optional)">
          <textarea value={form.bio} rows={3}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className={inputCls} placeholder="10+ years in Nairobi residential sales…" />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.send_invite}
            onChange={(e) => setForm((f) => ({ ...f, send_invite: e.target.checked }))} />
          Send magic-link invite email
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={!canSubmit}
            className="btn-primary btn-primary-hover inline-flex items-center gap-2 disabled:opacity-50">
            {inviteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Invite as Founding Agent
          </button>
          <span className="text-xs text-muted-foreground">
            90 days · 20 listings · verified · no payment
          </span>
        </div>
      </form>

      {/* Comp agent list */}
      <div>
        <h2 className="font-semibold mb-3">Complimentary agents ({comps?.length ?? 0})</h2>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Granted</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && !comps?.length && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No comp agents yet — invite your first above.</td></tr>
              )}
              {comps?.map((c: any) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-1.5">
                      {c.full_name ?? "Unnamed"}
                      {c.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.company_name ?? "—"} · {c.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 uppercase text-xs font-semibold text-primary">{c.tier}</td>
                  <td className="px-4 py-3 text-xs">
                    {c.tier_expires_at ? new Date(c.tier_expires_at).toDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.comp_granted_at ? new Date(c.comp_granted_at).toDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">{c.comp_reason ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Revoke ${c.full_name}'s complimentary plan?`)) revokeMut.mutate(c.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-foreground/80 mb-1">{label}</div>
      {children}
    </label>
  );
}
