import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, Smartphone, XCircle } from "lucide-react";
import { BRAND, BRAND_ICONS, ICON_VERSION, v } from "@/lib/branding";
import { useAdminGuard } from "@/hooks/use-admin-guard";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  component: BrandingPage,
  head: () => ({ meta: [{ title: "App branding & icons — Admin" }, { name: "robots", content: "noindex" }] }),
});

type IconState = { path: string; ok: boolean | null };

function BrandingPage() {
  const { loading } = useAdminGuard();
  const [name, setName] = useState<string>(BRAND.name);
  const [shortName, setShortName] = useState<string>(BRAND.shortName);
  const [tagline, setTagline] = useState<string>(BRAND.tagline);
  const [saved, setSaved] = useState(false);
  const [icons, setIcons] = useState<IconState[]>(BRAND_ICONS.map((i) => ({ path: i.path, ok: null })));
  const [manifest, setManifest] = useState<any>(null);

  const dirty = name !== BRAND.name || shortName !== BRAND.shortName || tagline !== BRAND.tagline;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        BRAND_ICONS.map(async (i) => {
          try {
            const res = await fetch(v(i.path), { cache: "no-store" });
            return { path: i.path, ok: res.ok };
          } catch {
            return { path: i.path, ok: false };
          }
        }),
      );
      if (!cancelled) setIcons(results);
      try {
        const res = await fetch(v("/manifest.webmanifest"), { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setManifest(json);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const inSync = useMemo(() => {
    if (!manifest) return null;
    return manifest.name === BRAND.name && manifest.short_name === BRAND.shortName && manifest.theme_color === BRAND.themeColor;
  }, [manifest]);

  async function bustCaches() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.allSettled(keys.map((k) => caches.delete(k)));
      }
      await fetch(`/manifest.webmanifest?v=${ICON_VERSION}&t=${Date.now()}`, { cache: "reload" });
      await Promise.allSettled(
        BRAND_ICONS.map((i) => fetch(`${i.path}?v=${ICON_VERSION}&t=${Date.now()}`, { cache: "reload" })),
      );
      toast.success("Caches cleared — icons and manifest re-fetched.");
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not refresh caches");
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">App branding &amp; PWA icons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview the installed-app name and icon set, confirm the manifest and browser tags are in sync, and force
          existing installs to pick up new artwork.
        </p>
      </header>

      {/* Name management + preview */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">App name</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Full name (browser tab, install prompt)</span>
              <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
                className="w-full rounded-md border border-input bg-field px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Short name (home screen label)</span>
              <input value={shortName} onChange={(e) => { setShortName(e.target.value); setSaved(false); }}
                maxLength={12}
                className="w-full rounded-md border border-input bg-field px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Tagline</span>
              <input value={tagline} onChange={(e) => { setTagline(e.target.value); setSaved(false); }}
                className="w-full rounded-md border border-input bg-field px-3 py-2 text-sm" />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setSaved(true); toast.success("Preview saved. Ask your developer to apply it in branding settings."); }}
                disabled={!dirty}
                className="btn-primary btn-primary-hover disabled:opacity-50"
              >
                Save preview
              </button>
              <button
                type="button"
                onClick={() => { setName(BRAND.name); setShortName(BRAND.shortName); setTagline(BRAND.tagline); setSaved(false); }}
                className="btn-ghost"
              >
                Reset
              </button>
            </div>
            {saved && (
              <p className="text-xs text-muted-foreground">
                Saved preview: <strong>{name}</strong> / <strong>{shortName}</strong> — “{tagline}”.
              </p>
            )}
          </div>

          {/* Install prompt preview */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Install prompt preview</p>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 shadow-sm">
              <img src={v("/favicon-192.png")} alt="App icon preview" width={48} height={48} className="h-12 w-12 rounded-lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{tagline}</p>
              </div>
              <span className="ml-auto rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Install</span>
            </div>

            <p className="mb-3 mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Home screen preview</p>
            <div className="flex gap-6">
              <div className="w-20 text-center">
                <img src={v("/maskable-512.png")} alt="Adaptive icon preview" width={64} height={64}
                  className="mx-auto h-16 w-16 rounded-2xl border border-border object-cover" />
                <p className="mt-1 truncate text-[11px]">{shortName}</p>
              </div>
              <div className="w-20 text-center">
                <img src={v("/apple-touch-icon.png")} alt="iOS icon preview" width={64} height={64}
                  className="mx-auto h-16 w-16 rounded-[18px] border border-border object-cover" />
                <p className="mt-1 truncate text-[11px]">{shortName}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Icon inventory */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">Icon set</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">cache version v{ICON_VERSION}</span>
          <button type="button" onClick={bustCaches} className="ml-auto btn-primary btn-primary-hover inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Force update on installs
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BRAND_ICONS.map((icon) => {
            const state = icons.find((i) => i.path === icon.path);
            return (
              <div key={icon.path} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <img src={v(icon.path)} alt={`${icon.label} preview`} width={40} height={40}
                    className="h-10 w-10 rounded-md border border-border object-contain" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{icon.label}</p>
                    <p className="text-xs text-muted-foreground">{icon.size}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{icon.purpose}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs">
                  {state?.ok === false ? (
                    <><XCircle className="h-3.5 w-3.5 text-destructive" /> Missing</>
                  ) : state?.ok ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Served OK</>
                  ) : (
                    <>Checking…</>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sync status */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Manifest &amp; tag sync</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            Manifest name: <strong>{manifest?.name ?? "…"}</strong> · short name: <strong>{manifest?.short_name ?? "…"}</strong>
          </li>
          <li className="flex items-center gap-2">
            {inSync === false
              ? <><XCircle className="h-4 w-4 text-destructive" /> Manifest and site tags are out of sync.</>
              : inSync
                ? <><CheckCircle2 className="h-4 w-4 text-primary" /> Manifest, tab title and install prompt all use “{BRAND.name}”.</>
                : <>Checking manifest…</>}
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          iOS and Android cache manifest fields at install time. After a name change, some users may need to reinstall the
          app from their browser before the new label appears.
        </p>
      </section>
    </div>
  );
}
