import type { LatLng } from '../types';
import { fetchWithTimeout, markPhotonDown, photonAvailable } from './services';

/**
 * Recherche d'adresses et de lieux (données OpenStreetMap, sans clé d'API) :
 * - suggestions pendant la frappe : Photon (fait pour ça) ;
 * - recherche validée (Entrée) : Nominatim en secours ;
 * - nom d'un point de la carte : Nominatim.
 */

const PHOTON_SEARCH = 'https://photon.komoot.io/api/';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

export interface GeoResult {
  lat: number;
  lng: number;
  label: string;
  detail: string;
  /** Zoom adapté (ville, quartier, adresse…). */
  zoom: number;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

const zoomForType = (type?: string) =>
  type === 'country' ? 6 : type === 'state' ? 8 : type === 'county' ? 10 : type === 'city' ? 13 : type === 'district' || type === 'locality' ? 14 : 16;

const uniqueJoin = (parts: (string | undefined)[]) =>
  parts.filter((v, i, arr): v is string => !!v && arr.indexOf(v) === i).join(', ');

/** Suggestions pendant la frappe (null si le service ne répond pas). */
export async function suggestPlaces(q: string, near: LatLng, signal?: AbortSignal): Promise<GeoResult[] | null> {
  if (!photonAvailable()) return null;
  const params = new URLSearchParams({
    q,
    limit: '6',
    lang: 'fr',
    lat: near.lat.toFixed(4),
    lon: near.lng.toFixed(4),
  });
  try {
    const res = await fetchWithTimeout(`${PHOTON_SEARCH}?${params}`, 5000, { signal });
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) markPhotonDown();
      return null;
    }
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const out: GeoResult[] = [];
    for (const f of data.features ?? []) {
      const [lng, lat] = f.geometry?.coordinates ?? [];
      const p = f.properties ?? {};
      if (lat == null || lng == null) continue;
      const label = p.name || uniqueJoin([p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street]);
      if (!label) continue;
      out.push({ lat, lng, label, detail: uniqueJoin([p.city !== label ? p.city : undefined, p.state, p.country]), zoom: zoomForType(p.type) });
    }
    return out;
  } catch (err) {
    if (!signal?.aborted) markPhotonDown();
    return null;
  }
}

interface NominatimItem {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  addresstype?: string;
  address?: Record<string, string>;
}

function shortName(d: NominatimItem): string {
  const a = d.address ?? {};
  const name = d.name || a.park || a.leisure || a.amenity || a.tourism || a.attraction || a.square;
  const road = a.road || a.pedestrian || a.footway || a.path;
  const city = a.city || a.town || a.village || a.municipality;
  const first = name || road || (d.display_name ?? '').split(',')[0];
  return uniqueJoin([first, city]);
}

/** Recherche validée (Entrée) : Nominatim, une requête à la fois. */
export async function searchPlaces(q: string, near: LatLng): Promise<GeoResult[]> {
  const viewbox = [near.lng - 0.35, near.lat + 0.25, near.lng + 0.35, near.lat - 0.25].join(',');
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&accept-language=fr&viewbox=${viewbox}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetchWithTimeout(url, 10_000);
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimItem[];
    return data.map((d) => ({
      lat: Number(d.lat),
      lng: Number(d.lon),
      label: shortName(d),
      detail: d.display_name ?? '',
      zoom: zoomForType(d.addresstype),
    }));
  } catch {
    return [];
  }
}

/** Suggestions si possible, sinon recherche Nominatim. */
export async function findPlaces(q: string, near: LatLng): Promise<GeoResult[]> {
  const fast = await suggestPlaces(q, near);
  return fast && fast.length ? fast : searchPlaces(q, near);
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=fr&lat=${lat}&lon=${lng}`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimItem & { error?: string };
    if (data.error) return null;
    return shortName(data) || null;
  } catch {
    return null;
  }
}
