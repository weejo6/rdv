import type { LatLng } from '../types';

const EARTH_RADIUS_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** « 350 m », « 1,2 km », « 38 km » */
export function fmtDistance(km: number): string {
  const m = Math.round((km * 1000) / 50) * 50;
  if (m < 1000) return `${Math.max(50, m)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km).toLocaleString('fr-FR')} km`;
}

export function offsetKm(p: LatLng, northKm: number, eastKm: number): LatLng {
  return {
    lat: p.lat + northKm / 110.574,
    lng: p.lng + eastKm / (111.32 * Math.cos(rad(p.lat))),
  };
}

export function randomAround(p: LatLng, minKm: number, maxKm: number): LatLng {
  const angle = Math.random() * Math.PI * 2;
  const r = minKm + Math.sqrt(Math.random()) * (maxKm - minKm);
  return offsetKm(p, Math.sin(angle) * r, Math.cos(angle) * r);
}

export const jitter = (p: LatLng, meters: number): LatLng => randomAround(p, 0, meters / 1000);

export const directionsUrl = (p: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
