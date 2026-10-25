import type { LatLng, Place } from '../types';
import { distanceKm } from './geo';
import { pick } from './random';
import { fetchWithTimeout, markPhotonDown, photonAvailable } from './services';

/**
 * Vrais lieux autour de l'utilisateur, tirés d'OpenStreetMap via l'API Photon (komoot) :
 * gratuite, sans clé, et capable de renvoyer « les parcs les plus proches », « les bars les
 * plus proches »… Ils servent à placer les RDV simulés sur des lieux qui existent.
 */

export type SpotKind =
  | 'park'
  | 'pitch'
  | 'square'
  | 'market'
  | 'bar'
  | 'cinema'
  | 'museum'
  | 'culture'
  | 'view'
  | 'peak'
  | 'water';

export interface PoolPlace extends Place {
  kind: SpotKind;
}

export interface PlacePool {
  center: LatLng;
  places: PoolPlace[];
}

const PHOTON_REVERSE = 'https://photon.komoot.io/reverse';

/**
 * Quelques requêtes groupées (Photon renvoie les lieux les plus proches parmi plusieurs tags).
 * Le service est gratuit et limite les abus : on reste à 5 requêtes, espacées d'une seconde.
 */
const GROUPS: { tags: string[]; radius: number; limit: number }[] = [
  { tags: ['leisure:park', 'leisure:garden', 'leisure:pitch', 'place:square', 'amenity:marketplace'], radius: 4, limit: 50 },
  { tags: ['amenity:bar', 'amenity:pub', 'amenity:cafe'], radius: 2.5, limit: 30 },
  { tags: ['amenity:cinema', 'tourism:museum', 'amenity:theatre', 'amenity:arts_centre', 'amenity:library'], radius: 8, limit: 25 },
  { tags: ['tourism:viewpoint', 'natural:peak'], radius: 25, limit: 30 },
  { tags: ['natural:water'], radius: 25, limit: 40 },
];

const KINDS: Record<string, SpotKind> = {
  'leisure:park': 'park',
  'leisure:garden': 'park',
  'leisure:pitch': 'pitch',
  'place:square': 'square',
  'amenity:marketplace': 'market',
  'amenity:bar': 'bar',
  'amenity:pub': 'bar',
  'amenity:cafe': 'bar',
  'amenity:cinema': 'cinema',
  'tourism:museum': 'museum',
  'amenity:theatre': 'culture',
  'amenity:arts_centre': 'culture',
  'amenity:library': 'culture',
  'tourism:viewpoint': 'view',
  'natural:peak': 'peak',
  'natural:water': 'water',
};

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    osm_key?: string;
    osm_value?: string;
    /** [minLon, maxLat, maxLon, minLat] */
    extent?: [number, number, number, number];
  };
}

async function fetchGroup(center: LatLng, g: (typeof GROUPS)[number]): Promise<PoolPlace[] | null> {
  const params = new URLSearchParams({
    lat: center.lat.toFixed(5),
    lon: center.lng.toFixed(5),
    radius: String(g.radius),
    limit: String(g.limit),
    lang: 'fr',
  });
  g.tags.forEach((t) => params.append('osm_tag', t));
  try {
    const res = await fetchWithTimeout(`${PHOTON_REVERSE}?${params}`, 6000);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const out: PoolPlace[] = [];
    for (const f of data.features ?? []) {
      const [lng, lat] = f.geometry?.coordinates ?? [];
      const p = f.properties ?? {};
      const kind = KINDS[`${p.osm_key}:${p.osm_value}`];
      if (lat == null || lng == null || !kind) continue;
      let label = p.name?.trim() ?? '';
      if (kind === 'water' && !isRealLake(label, p.extent)) continue;
      if (!label) {
        if (kind === 'pitch') label = 'Terrain de sport';
        else if (kind === 'market') label = 'Place du marché';
        else if (kind === 'view') label = 'Point de vue';
        else continue;
      }
      out.push({ lat, lng, label, kind });
    }
    return out;
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Écarte fontaines, bassins et petites mares : on veut des lacs / étangs pour les balades. */
function isRealLake(name: string, extent?: [number, number, number, number]) {
  if (!name || /^(fontaine|bassin|piscine|mare|abreuvoir|lavoir)\b/i.test(name)) return false;
  if (/^(lac|étang|etang|retenue|réservoir|reservoir|plan d['’]eau|base de loisirs)\b/i.test(name)) return true;
  if (!extent) return false;
  const width = distanceKm({ lat: extent[1], lng: extent[0] }, { lat: extent[1], lng: extent[2] });
  return width > 0.25;
}

async function fromPhoton(center: LatLng): Promise<PoolPlace[] | null> {
  if (!photonAvailable()) return null;
  const all: PoolPlace[] = [];
  for (let i = 0; i < GROUPS.length; i++) {
    if (i > 0) await delay(1000);
    const res = await fetchGroup(center, GROUPS[i]);
    // Si le service ne répond pas dès la première requête, on n'insiste pas (et on le met de côté).
    if (res === null && i === 0) {
      markPhotonDown();
      return null;
    }
    if (res) all.push(...res);
  }
  return all;
}

// ——— Secours : Nominatim (recherche par catégorie, 1 requête / seconde maximum) ———

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

const NOMINATIM_QUERIES: { q: string; kind: SpotKind; types: string[]; limit: number; spanKm: number }[] = [
  { q: 'parc', kind: 'park', types: ['leisure:park', 'leisure:garden'], limit: 30, spanKm: 4 },
  { q: 'terrain de sport', kind: 'pitch', types: ['leisure:pitch'], limit: 20, spanKm: 4 },
  { q: 'bar', kind: 'bar', types: ['amenity:bar', 'amenity:pub', 'amenity:cafe'], limit: 25, spanKm: 2.5 },
  { q: 'cinéma', kind: 'cinema', types: ['amenity:cinema'], limit: 6, spanKm: 8 },
  { q: 'musée', kind: 'museum', types: ['tourism:museum'], limit: 8, spanKm: 8 },
];

async function fromNominatim(center: LatLng): Promise<PoolPlace[] | null> {
  const all: PoolPlace[] = [];
  for (let i = 0; i < NOMINATIM_QUERIES.length; i++) {
    const q = NOMINATIM_QUERIES[i];
    if (i > 0) await delay(1100);
    const dLat = q.spanKm / 111;
    const dLng = q.spanKm / (111 * Math.cos((center.lat * Math.PI) / 180));
    const params = new URLSearchParams({
      q: q.q,
      format: 'jsonv2',
      limit: String(q.limit),
      bounded: '1',
      viewbox: [center.lng - dLng, center.lat + dLat, center.lng + dLng, center.lat - dLat].join(','),
      'accept-language': 'fr',
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(`${NOMINATIM_SEARCH}?${params}`, { signal: ctrl.signal });
      if (!res.ok) {
        if (i === 0) return null;
        continue;
      }
      const data = (await res.json()) as { lat: string; lon: string; name?: string; category?: string; type?: string }[];
      for (const d of data) {
        if (!q.types.includes(`${d.category}:${d.type}`)) continue;
        const label = d.name?.trim() || (q.kind === 'pitch' ? 'Terrain de sport' : '');
        if (label) all.push({ lat: Number(d.lat), lng: Number(d.lon), label, kind: q.kind });
      }
    } catch {
      if (i === 0) return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return all;
}

/** Récupère les lieux autour d'un point (null si aucun service ne répond). */
export async function fetchPlacePool(center: LatLng): Promise<PlacePool | null> {
  const raw = (await fromPhoton(center)) ?? (await fromNominatim(center));
  if (!raw) return null;

  const places: PoolPlace[] = [];
  const seen = new Set<string>();
  for (const p of raw) {
    // Un même lieu est souvent présent deux fois (point + contour).
    const key = `${p.kind}|${p.label.toLowerCase()}`;
    if (p.label !== 'Terrain de sport' && seen.has(key)) continue;
    seen.add(key);
    places.push(p);
  }

  // « Terrain de sport » → « Parc de la Tête d'Or · terrain de sport » quand un parc est tout proche.
  const parks = places.filter((p) => p.kind === 'park');
  for (const p of places) {
    if (p.kind !== 'pitch' || p.label !== 'Terrain de sport') continue;
    let best: PoolPlace | null = null;
    let bestD = 0.4;
    for (const park of parks) {
      const d = distanceKm(p, park);
      if (d < bestD) {
        best = park;
        bestD = d;
      }
    }
    if (best) p.label = `${best.label} · terrain de sport`;
  }
  return { center, places };
}

/**
 * Choisit un lieu du type voulu (par ordre de préférence), si possible dans la bonne
 * fourchette de distance et pas déjà utilisé par un autre RDV.
 */
export function pickFromPool(
  pool: PoolPlace[],
  kinds: SpotKind[],
  center: LatLng,
  range: [number, number],
  used?: Set<string>,
): Place | null {
  const keyOf = (p: PoolPlace) => `${p.label}|${p.lat}|${p.lng}`;
  const tryPick = (filter: (d: number) => boolean) => {
    for (const kind of kinds) {
      const candidates = pool.filter((p) => p.kind === kind && filter(distanceKm(center, p)));
      if (!candidates.length) continue;
      const unused = used ? candidates.filter((p) => !used.has(keyOf(p))) : candidates;
      const chosen = pick(unused.length ? unused : candidates);
      used?.add(keyOf(chosen));
      return { lat: chosen.lat, lng: chosen.lng, label: chosen.label };
    }
    return null;
  };
  return tryPick((d) => d >= range[0] && d <= range[1]) ?? tryPick((d) => d <= Math.max(range[1] * 2, 3));
}
