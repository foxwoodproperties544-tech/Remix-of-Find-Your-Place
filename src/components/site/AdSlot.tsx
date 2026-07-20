import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveAds, trackAdImpression, trackAdClick } from "@/lib/ads.functions";

export type Placement = "homepage_hero" | "homepage_banner" | "properties_top" | "sidebar" | "blog_inline";

type Ad = { id: string; title: string; image_url: string; target_url: string; placement: string };

export function AdSlot({ placement, className }: { placement: Placement; className?: string }) {
  const fetchAds = useServerFn(getActiveAds);
  const impress = useServerFn(trackAdImpression);
  const click = useServerFn(trackAdClick);
  const trackedRef = useRef<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ["ads", placement],
    queryFn: () => fetchAds({ data: { placement } }) as Promise<Ad[]>,
    staleTime: 60_000,
  });

  const ad = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  }, [data]);

  useEffect(() => {
    if (!ad) return;
    if (trackedRef.current.has(ad.id)) return;
    trackedRef.current.add(ad.id);
    impress({ data: { id: ad.id } }).catch(() => {});
  }, [ad, impress]);

  if (!ad) return null;

  async function go(e: React.MouseEvent) {
    e.preventDefault();
    try {
      const res: any = await click({ data: { id: ad!.id } });
      window.open(res.target ?? ad!.target_url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(ad!.target_url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <a
      href={ad.target_url}
      onClick={go}
      className={`relative block overflow-hidden rounded-2xl border border-border shadow-sm group ${className ?? ""}`}
      aria-label={`Sponsored: ${ad.title}`}
    >
      <img
        src={ad.image_url}
        alt={ad.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
      <span className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider bg-black/60 text-white px-2 py-0.5 rounded">
        Sponsored
      </span>
    </a>
  );
}
