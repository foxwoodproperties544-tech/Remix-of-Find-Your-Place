import { useEffect, useRef } from "react";
import type { Property } from "@/lib/mock-data";
import { LOCATION_COORDS } from "@/lib/kenya-locations";

interface Props {
  properties: Property[];
  height?: number;
}

/**
 * Lazy-load Leaflet + MarkerCluster from CDN. Runs client-only.
 */
async function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L && w.L.markerClusterGroup) return w.L;

  if (!document.querySelector('link[data-leaflet]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.setAttribute("data-leaflet", "true");
    document.head.appendChild(link);
  }
  if (!document.querySelector('link[data-leaflet-cluster]')) {
    for (const href of [
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
    ]) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-leaflet-cluster", "true");
      document.head.appendChild(link);
    }
  }
  if (!w.L) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Leaflet"));
      document.head.appendChild(s);
    });
  }
  if (!(window as any).L.markerClusterGroup) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load MarkerCluster"));
      document.head.appendChild(s);
    });
  }
  return (window as any).L;
}

function fmtPrice(n: number) {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `KSh ${(n / 1_000).toFixed(0)}K`;
  return `KSh ${n}`;
}

function coordsFor(p: Property): { lat: number; lng: number } | null {
  if (p.lat != null && p.lng != null) return { lat: p.lat, lng: p.lng };
  const key = p.town || p.county;
  const hit = key ? (LOCATION_COORDS as any)[key] : null;
  if (!hit) return null;
  // Tiny jitter so multiple listings in the same town don't perfectly overlap.
  const jitter = () => (Math.random() - 0.5) * 0.01;
  return { lat: hit.lat + jitter(), lng: hit.lng + jitter() };
}

export function PropertyMap({ properties, height = 520 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([-0.5, 37.5], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;
      }
      const map = mapRef.current;

      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        chunkedLoading: true,
        maxClusterRadius: 55,
      });
      const bounds: [number, number][] = [];

      properties.forEach((p) => {
        const c = coordsFor(p);
        if (!c) return;
        bounds.push([c.lat, c.lng]);
        const img = p.image;
        const detailHref = `/properties/${p.slug ?? p.id}`;
        const popupHtml = `
          <div style="width:220px;font-family:inherit">
            <a href="${detailHref}" style="display:block;text-decoration:none;color:inherit">
              ${img ? `<img src="${img}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:8px 8px 0 0"/>` : ""}
              <div style="padding:8px 4px 2px">
                <div style="font-weight:700;color:#0F766E;font-size:14px;margin-bottom:2px">${fmtPrice(p.price)}${p.priceSuffix ? `<span style="color:#666;font-weight:500;font-size:11px"> ${p.priceSuffix}</span>` : ""}</div>
                <div style="font-weight:600;font-size:13px;line-height:1.25;margin-bottom:4px">${p.title.replace(/</g, "&lt;")}</div>
                <div style="color:#666;font-size:11px">${[p.town, p.county].filter(Boolean).join(", ")}</div>
                <div style="color:#666;font-size:11px;margin-top:2px">${p.bedrooms ? `${p.bedrooms} bd · ` : ""}${p.bathrooms ? `${p.bathrooms} ba` : ""}</div>
              </div>
            </a>
          </div>`;
        const marker = L.marker([c.lat, c.lng], { title: p.title });
        marker.bindPopup(popupHtml, { maxWidth: 240, closeButton: true });
        cluster.addLayer(marker);
      });

      map.addLayer(cluster);
      clusterRef.current = cluster;

      if (bounds.length > 0) {
        try {
          map.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 12 });
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [properties]);

  // Full teardown when component unmounts
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
      }
    };
  }, []);

  const mapped = properties.filter((p) => coordsFor(p)).length;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div ref={containerRef} style={{ height }} className="w-full bg-muted" />
      <div className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
        <span>
          Showing <span className="font-semibold text-foreground">{mapped}</span> of {properties.length} on the map. Zoom in to see clusters expand.
        </span>
        {mapped < properties.length && (
          <span className="text-[10px]">Listings without coordinates aren't pinned.</span>
        )}
      </div>
    </div>
  );
}
