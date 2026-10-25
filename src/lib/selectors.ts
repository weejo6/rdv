import type { Filters, LatLng, RdvEvent } from '../types';
import { CATEGORIES } from './categories';
import { distanceKm } from './geo';
import { displayKind, isActive, isFull } from './status';
import { normalize } from './text';

export const DEFAULT_FILTERS: Filters = { kinds: [], categories: [], radiusKm: 50, query: '' };

export function matchesFilters(e: RdvEvent, f: Filters, myPos: LatLng, now: number): boolean {
  if (f.kinds.length && !f.kinds.includes(displayKind(e, now))) return false;
  if (f.categories.length && !f.categories.includes(e.category)) return false;
  if (distanceKm(myPos, e.place) > f.radiusKm) return false;
  const q = f.query.trim();
  if (q) {
    const haystack = normalize(`${e.title} ${e.description} ${e.place.label} ${CATEGORIES[e.category].label}`);
    if (!haystack.includes(normalize(q))) return false;
  }
  return true;
}

export interface MapItem {
  e: RdvEvent;
  /** Vient de devenir complet : on joue l'animation de sortie avant de le retirer. */
  leaving: boolean;
}

const LEAVE_ANIMATION_MS = 1800;

/** Événements affichés sur la carte : actifs, non complets, et correspondant aux filtres. */
export function mapItems(
  events: Record<string, RdvEvent>,
  f: Filters,
  myPos: LatLng,
  now: number,
  realNow: number,
): MapItem[] {
  const out: MapItem[] = [];
  for (const e of Object.values(events)) {
    if (!isActive(e, now)) continue;
    let leaving = false;
    if (isFull(e)) {
      // realNow = 0 : pas d'animation (listes, compteurs) → les complets sont simplement exclus.
      if (realNow > 0 && e.fullAt && realNow - e.fullAt < LEAVE_ANIMATION_MS) leaving = true;
      else continue;
    }
    if (!matchesFilters(e, f, myPos, now)) continue;
    out.push({ e, leaving });
  }
  return out;
}
