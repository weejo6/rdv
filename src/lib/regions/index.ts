import type { LatLng } from '../../types';
import { distanceKm } from '../geo';
import { normalize } from '../text';
import { GRENOBLE_REGION } from './grenoble';
import { MONTREAL_REGION } from './montreal';
import type { Region, RegionId } from './types';

export type { LiveTpl, Region, RegionId, SeedTpl, When } from './types';
export { GRENOBLE_REGION, MONTREAL_REGION };

export const REGIONS: Record<RegionId, Region> = {
  grenoble: GRENOBLE_REGION,
  montreal: MONTREAL_REGION,
};

const ALL = Object.values(REGIONS);

/** Ville faite main dans laquelle on se trouve (contenu fait main), sinon null. */
export const regionInCity = (p: LatLng) => ALL.find((r) => distanceKm(p, r.center) < r.cityRadiusKm) ?? null;

/** Région faite main proche (ses lieux complètent les vrais lieux alentour), sinon null. */
export const regionAround = (p: LatLng) => ALL.find((r) => distanceKm(p, r.center) < r.regionRadiusKm) ?? null;

/** « montreal », « Montréal », « grenoble »… → identifiant de ville. */
export function parseRegion(value: string | null | undefined): RegionId | null {
  if (!value) return null;
  const v = normalize(value).replace(/[^a-z]/g, '');
  return (Object.keys(REGIONS) as RegionId[]).find((id) => id === v) ?? null;
}

/** Ville de secours si la géolocalisation est refusée : devinée d'après le fuseau horaire. */
export function guessRegion(): RegionId {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (/^America\/(Montreal|Toronto|Iqaluit|Nipigon|Thunder_Bay)$/.test(tz)) return 'montreal';
  } catch {
    /* fuseau inconnu */
  }
  return 'grenoble';
}
