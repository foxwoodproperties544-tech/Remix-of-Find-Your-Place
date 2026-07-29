import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown, LayoutGrid, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PROCESS, DEFAULT_SERVICES, ICON_NAMES, SETTINGS_KEYS, iconFor, itemsOr, moveItem,
  type ProcessStep, type ServiceCard,
} from "@/lib/about-content";

export const Route = createFileRoute("/_authenticated/admin/settings/about-content")({
  component: AboutContentSettings,
  head: () => ({ meta: [
    { title: "About page content — Foxwood Admin" },
    { name: "description", content: "Manage Foxwood About page services and process steps." },
    { property: "og:title", content: "About page content — Foxwood Admin" },
    { property: "og:description", content: "Manage Foxwood About page services and process steps." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

const inputCls = "rounded-lg border border-border bg-background px-3 py-2 text-sm w-full";

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const Icon = iconFor(value);
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Icon" className={inputCls}>
        {ICON_NAMES.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}

function Editor<T extends { icon: string; title: string; description: string }>({
  title, subtitle, icon: HeadIcon, items, setItems, blank, max,
}: {
  title: string;
  subtitle: string;
  icon: typeof LayoutGrid;
  items: T[];
  setItems: (v: T[]) => void;
  blank: T;
  max?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <HeadIcon className="h-4 w-4" />
          <div>
            <h2 className="font-bold">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setItems([...items, { ...blank }])}
          disabled={!!max && items.length >= max}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}

      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
            <IconPicker value={it.icon} onChange={(icon) => setItems(items.map((x, idx) => (idx === i ? { ...x, icon } : x)))} />
            <input
              value={it.title}
              onChange={(e) => setItems(items.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
              placeholder="Title"
              aria-label={`Item ${i + 1} title`}
              className={inputCls}
            />
          </div>
          <textarea
            value={it.description}
            onChange={(e) => setItems(items.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))}
            placeholder="Short description"
            aria-label={`Item ${i + 1} description`}
            rows={2}
            className={inputCls}
          />
          <div className="flex justify-end gap-1">
            <button type="button" aria-label="Move up" onClick={() => setItems(moveItem(items, i, i - 1))} className="btn-ghost px-2 py-1"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Move down" onClick={() => setItems(moveItem(items, i, i + 1))} className="btn-ghost px-2 py-1"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" aria-label="Delete" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="btn-ghost px-2 py-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AboutContentSettings() {
  const { isAdmin, loading: rolesLoading } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServiceCard[]>(DEFAULT_SERVICES);
  const [steps, setSteps] = useState<ProcessStep[]>(DEFAULT_PROCESS);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", [SETTINGS_KEYS.services, SETTINGS_KEYS.process]);
      const byKey = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      setServices(itemsOr<ServiceCard>(byKey[SETTINGS_KEYS.services], DEFAULT_SERVICES));
      setSteps(itemsOr<ProcessStep>(byKey[SETTINGS_KEYS.process], DEFAULT_PROCESS));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (services.some((s) => !s.title.trim()) || steps.some((s) => !s.title.trim())) {
      return toast.error("Every card and step needs a title");
    }
    setSaving(true);
    const { error } = await supabase.from("platform_settings").upsert(
      [
        { key: SETTINGS_KEYS.services, value: { items: services } as any },
        { key: SETTINGS_KEYS.process, value: { items: steps } as any },
      ],
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("About page content saved");
  };

  if (rolesLoading || !isAdmin || loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">About page content</h1>
        <p className="text-sm text-muted-foreground">
          Manage the “What we do” service cards and the four-step “How Foxwood works” process, including their icons.
        </p>
      </div>

      <Editor
        title="What we do — service cards"
        subtitle="Shown in the services grid on the About Us page."
        icon={LayoutGrid}
        items={services}
        setItems={setServices}
        blank={{ icon: "Sparkles", title: "", description: "" }}
      />

      <Editor
        title="How Foxwood works — process steps"
        subtitle="Up to four steps, displayed in order."
        icon={ListOrdered}
        items={steps}
        setItems={setSteps}
        blank={{ icon: "Search", title: "", description: "" }}
        max={4}
      />

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary btn-primary-hover">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </div>
    </div>
  );
}
