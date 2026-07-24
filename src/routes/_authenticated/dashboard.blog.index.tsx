import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listMyBlogPosts } from "@/lib/blog-submission.functions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PlusCircle, FileText, Clock, CheckCircle2, XCircle, AlertTriangle, Archive, ExternalLink, Pencil, CreditCard, RefreshCw } from "lucide-react";
import { RenewPackageDialog } from "@/components/site/RenewPackageDialog";

export const Route = createFileRoute("/_authenticated/dashboard/blog/")({
  component: MyBlogPage,
  head: () => ({ meta: [{ title: "My blog posts — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

const STATUS_META: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: "Draft", icon: FileText, className: "bg-muted text-muted-foreground" },
  pending_payment: { label: "Pending payment", icon: CreditCard, className: "bg-amber-100 text-amber-800" },
  paid: { label: "Paid", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800" },
  pending_review: { label: "Pending review", icon: Clock, className: "bg-blue-100 text-blue-800" },
  changes_requested: { label: "Changes requested", icon: AlertTriangle, className: "bg-orange-100 text-orange-800" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800" },
  published: { label: "Published", icon: CheckCircle2, className: "bg-primary/10 text-primary" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-700" },
  expired: { label: "Expired", icon: Clock, className: "bg-muted text-muted-foreground" },
  archived: { label: "Archived", icon: Archive, className: "bg-muted text-muted-foreground" },
};

function MyBlogPage() {
  const listFn = useServerFn(listMyBlogPosts);
  const { data: posts, isLoading } = useQuery({
    queryKey: ["my-blog-posts"],
    queryFn: () => listFn(),
  });

  return (
    <DashboardShell>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My blog posts</h1>
          <p className="text-sm text-muted-foreground mt-1">Write articles, choose a package, and submit for admin review.</p>
        </div>
        <Link to="/dashboard/blog/new" className="btn-primary btn-primary-hover inline-flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Write a blog
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : !posts?.length ? (
          <div className="p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <h2 className="mt-3 font-semibold">No blog posts yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Start writing to share your expertise.</p>
            <Link to="/dashboard/blog/new" className="btn-primary btn-primary-hover mt-4 inline-flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Write your first blog
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((p: any) => {
              const meta = STATUS_META[p.status] ?? STATUS_META.draft;
              const Icon = meta.icon;
              const canEdit = ["draft", "changes_requested", "rejected"].includes(p.status);
              const needsPayment = ["draft", "changes_requested", "rejected", "expired"].includes(p.status);
              return (
                <div key={p.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                      {p.blog_packages && (
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {p.blog_packages.name}
                        </span>
                      )}
                      {p.is_sponsored && <span className="text-[11px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">Sponsored</span>}
                    </div>
                    <div className="mt-1 font-semibold truncate">{p.title}</div>
                    {p.admin_notes && ["changes_requested", "rejected"].includes(p.status) && (
                      <div className="mt-2 text-xs bg-orange-50 text-orange-900 border border-orange-200 rounded-lg p-2">
                        <strong>Admin note:</strong> {p.admin_notes}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(p.updated_at).toLocaleDateString()}
                      {p.expires_at && ` · Expires ${new Date(p.expires_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.status === "published" && (
                      <Link to="/blog/$slug" params={{ slug: p.slug }} className="btn-ghost text-sm inline-flex items-center gap-1">
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </Link>
                    )}
                    {canEdit && (
                      <Link to="/dashboard/blog/$id/edit" params={{ id: p.id }} className="btn-ghost text-sm inline-flex items-center gap-1">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                    )}
                    {needsPayment && (
                      <Link to="/dashboard/blog/$id/pay" params={{ id: p.id }} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5" /> {p.status === "expired" ? "Renew" : "Choose package & submit"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
