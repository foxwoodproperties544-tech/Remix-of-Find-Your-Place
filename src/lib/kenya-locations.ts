// Approximate coordinates for popular Kenyan locations, used for OpenStreetMap embeds.
export const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  Nairobi: { lat: -1.2921, lng: 36.8219 },
  Kiambu: { lat: -1.1714, lng: 36.8356 },
  Kitengela: { lat: -1.4747, lng: 36.9597 },
  Syokimau: { lat: -1.3583, lng: 36.9527 },
  Katani: { lat: -1.3833, lng: 36.9667 },
  Ngong: { lat: -1.3606, lng: 36.6553 },
  Isinya: { lat: -1.6833, lng: 36.85 },
  Juja: { lat: -1.1036, lng: 37.0144 },
  Matuu: { lat: -1.1333, lng: 37.55 },
  Machakos: { lat: -1.5177, lng: 37.2634 },
  Kajiado: { lat: -1.85, lng: 36.7833 },
  Mombasa: { lat: -4.0435, lng: 39.6682 },
  Kisumu: { lat: -0.0917, lng: 34.768 },
  Nakuru: { lat: -0.3031, lng: 36.08 },
  "Uasin Gishu": { lat: 0.5143, lng: 35.2698 },
};

export function coordsFor(town?: string | null, county?: string | null) {
  if (town && LOCATION_COORDS[town]) return LOCATION_COORDS[town];
  if (county && LOCATION_COORDS[county]) return LOCATION_COORDS[county];
  return LOCATION_COORDS.Nairobi;
}

export function osmEmbedUrl(lat: number, lng: number, delta = 0.02) {
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function osmLinkUrl(lat: number, lng: number, zoom = 14) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}
