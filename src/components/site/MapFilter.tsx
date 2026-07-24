import { useEffect, useRef } from "react";
import { LOCATION_COORDS } from "@/lib/kenya-locations";

interface Props {
  selectedCounty?: string;
  onSelect: (name: string) => void;
}

// Lazy-load Leaflet from CDN so it never touches the SSR bundle.
async function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return w.L;
  if (!document.querySelector('link[data-leaflet]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.setAttribute("data-leaflet", "true");
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-leaflet]')) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.setAttribute("data-leaflet", "true");
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Leaflet"));
      document.head.appendChild(s);
    });
  }
  return (window as any).L;
}

export function MapFilter({ selectedCounty, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !containerRef.current) return;
      if (mapRef.current) return;
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([-0.5, 37.5], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      Object.entries(LOCATION_COORDS).forEach(([name, { lat, lng }]) => {
        const marker = L.marker([lat, lng], { title: name }).addTo(map);
        marker.bindTooltip(name, { permanent: false, direction: "top" });
        marker.on("click", () => onSelect(name));
      });
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [onSelect]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div ref={containerRef} className="h-[420px] w-full bg-muted" />
      {selectedCounty && (
        <div className="border-t border-border bg-card px-3 py-2 text-xs">
          Filtered to <span className="font-semibold">{selectedCounty}</span>.
        </div>
      )}
    </div>
  );
}
