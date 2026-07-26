/** Geo helpers for radius ("search near me") filtering. */
import { LOCATION_COORDS, coordsFor } from "@/lib/kenya-locations";

export interface LatLng { lat: number; lng: number }

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in kilometres between two points. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Places a visitor can centre a radius search on. */
export const RADIUS_PLACES = Object.keys(LOCATION_COORDS).sort();

export function placeCoords(name: string): LatLng | null {
  return LOCATION_COORDS[name] ?? null;
}

/**
 * Best-effort coordinates for a listing: explicit lat/lng when the agent pinned
 * the property, otherwise the town/county centroid.
 */
export function propertyCoords(p: { lat?: number | null; lng?: number | null; town?: string | null; county?: string | null }): LatLng | null {
  if (typeof p.lat === "number" && typeof p.lng === "number") return { lat: p.lat, lng: p.lng };
  if (p.town || p.county) return coordsFor(p.town, p.county);
  return null;
}

export const RADIUS_OPTIONS = [1, 3, 5, 10, 20, 35, 50, 100] as const;
