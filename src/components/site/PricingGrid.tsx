import { Link } from "@tanstack/react-router";
import { Check, X as XIcon } from "lucide-react";

export type PricingPackage = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  duration_days: number;
  max_listings: number;
  max_photos: number;
  max_videos: number;
  is_featured: boolean;
  homepage_placement: boolean;
  priority_search: boolean;
  category_highlight: boolean;
  analytics_enabled: boolean;
  whatsapp_button: boolean;
  lead_management: boolean;
  renewal_enabled: boolean;
  auto_expiry: boolean;
  active: boolean;
  badge_color?: string | null;
};

type Props = {
  packages: PricingPackage[];
  /** When true, cards use a #preview link instead of routing to /dashboard/new. */
  preview?: boolean;
};

const FEATURE_ROWS: { key: keyof PricingPackage; label: string; kind: "bool" | "num" | "days" }[] = [
  { key: "max_listings", label: "Active listings", kind: "num" },
  { key: "max_photos", label: "Photos per listing", kind: "num" },
  { key: "max_videos", label: "Videos per listing", kind: "num" },
  { key: "duration_days", label: "Duration (days)", kind: "days" },
  { key: "is_featured", label: "Featured listing badge", kind: "bool" },
  { key: "homepage_placement", label: "Homepage placement", kind: "bool" },
  { key: "priority_search", label: "Priority in search", kind: "bool" },
  { key: "category_highlight", label: "Category highlight", kind: "bool" },
  { key: "analytics_enabled", label: "Analytics dashboard", kind: "bool" },
  { key: "whatsapp_button", label: "WhatsApp contact button", kind: "bool" },
  { key: "lead_management", label: "Lead / CRM access", kind: "bool" },
  { key: "renewal_enabled", label: "Renewal enabled", kind: "bool" },
  { key: "auto_expiry", label: "Auto-expire at end of duration", kind: "bool" },
];

function priceLabel(p: PricingPackage) {
  const n = Number(p.price);
  return n === 0 ? "Free" : `KES ${n.toLocaleString()}`;
}

function perksFor(p: PricingPackage): string[] {
  const list: string[] = [];
  list.push(`${p.max_listings} listing${p.max_listings > 1 ? "s" : ""}`);
  list.push(`${p.max_photos} photos${p.max_videos ? ` · ${p.max_videos} video${p.max_videos > 1 ? "s" : ""}` : ""}`);
  list.push(`${p.duration_days} days duration`);
  if (p.is_featured) list.push("Featured listing badge");
  if (p.homepage_placement) list.push("Homepage placement");
  if (p.priority_search) list.push("Priority in search");
  if (p.category_highlight) list.push("Category highlight");
  if (p.analytics_enabled) list.push("Analytics dashboard");
  if (p.whatsapp_button) list.push("WhatsApp contact button");
  if (p.lead_management) list.push("Lead / CRM access");
  if (p.renewal_enabled) list.push("Renewal enabled");
  return list;
}

export function PricingGrid({ packages, preview = false }: Props) {
  if (!packages.length) {
    return <div className="text-center py-16 text-muted-foreground">No packages available right now. Please check back soon.</div>;
  }

  const gridCols =
    packages.length >= 4 ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : packages.length === 3 ? "md:grid-cols-2 lg:grid-cols-3"
    : "md:grid-cols-2";

  return (
    <>
      <div className={`grid gap-5 ${gridCols}`}>
        {packages.map((p) => {
          const highlight = p.is_featured || p.homepage_placement;
          const cta = preview ? "#preview" : "/dashboard/new";
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border p-6 flex flex-col ${highlight ? "border-primary shadow-glow" : "border-border shadow-soft"} bg-card`}
            >
              {highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
                  Recommended
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.badge_color || "#0F766E" }} />
                <h3 className="text-lg font-bold">{p.name}</h3>
              </div>
              {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
              <div className="mt-3">
                <span className="text-3xl font-extrabold">{priceLabel(p)}</span>
                {Number(p.price) > 0 && <span className="text-sm text-muted-foreground"> / {p.duration_days}d</span>}
              </div>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {perksFor(p).map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span>{perk}</span>
                  </li>
                ))}
              </ul>
              {preview ? (
                <a href={cta} className="btn-primary btn-primary-hover mt-6 justify-center pointer-events-none opacity-70">
                  {Number(p.price) === 0 ? "Get started" : "Choose package"}
                </a>
              ) : (
                <Link to={cta as string as never} className="btn-primary btn-primary-hover mt-6 justify-center">
                  {Number(p.price) === 0 ? "Get started" : "Choose package"}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed feature breakdown */}
      <div className="mt-14">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold">Detailed feature breakdown</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Compare every included feature across packages. Everything below is exactly what you get after payment.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 min-w-[220px]">Feature</th>
                  {packages.map((p) => (
                    <th key={p.id} className="text-left px-4 py-3 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.badge_color || "#0F766E" }} />
                        <span className="font-semibold text-foreground">{p.name}</span>
                      </div>
                      <div className="text-[11px] normal-case text-muted-foreground font-normal mt-0.5">{priceLabel(p)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.key as string} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    {packages.map((p) => {
                      const v = p[row.key] as any;
                      if (row.kind === "bool") {
                        return (
                          <td key={p.id} className="px-4 py-3">
                            {v ? (
                              <span className="inline-flex items-center gap-1 text-primary"><Check className="h-4 w-4" /> Included</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground/60"><XIcon className="h-4 w-4" /> —</span>
                            )}
                          </td>
                        );
                      }
                      if (row.kind === "days") {
                        return <td key={p.id} className="px-4 py-3">{v} days</td>;
                      }
                      return <td key={p.id} className="px-4 py-3">{v}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
