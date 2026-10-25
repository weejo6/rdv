import type { LatLng } from '../types';

// Géocodage via Nominatim (OpenStreetMap) : gratuit, sans clé, usage modéré.
const BASE = 'https://nominatim.openstreetmap.org';

export interface GeoResult {
  lat: number;
  lng: number;
  label: string;
  detail: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}

function shortName(d: NominatimItem): string {
  const a = d.address ?? {};
  const name = d.name || a.park || a.leisure || a.amenity || a.tourism || a.attraction || a.square;
  const road = a.road || a.pedestrian || a.footway || a.path;
  const city = a.city || a.town || a.village || a.municipality;
  const first = name || road || (d.display_name ?? '').split(',')[0];
  return [first, city].filter((v, i, arr) => v && arr.indexOf(v) === i).join(', ');
}

export async function searchPlaces(q: string, near: LatLng, signal?: AbortSignal): Promise<GeoResult[]> {
  const viewbox = [near.lng - 0.35, near.lat + 0.25, near.lng + 0.35, near.lat - 0.25].join(',');
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=6&accept-language=fr&viewbox=${viewbox}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimItem[];
  return data.map((d) => ({ lat: Number(d.lat), lng: Number(d.lon), label: shortName(d), detail: d.display_name ?? '' }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${BASE}/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=fr&lat=${lat}&lon=${lng}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimItem & { error?: string };
    if (data.error) return null;
    return shortName(data) || null;
  } catch {
    return null;
  }
}
