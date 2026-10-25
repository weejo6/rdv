import type { Filters, LatLng, MapViewState, RdvEvent } from '../types';
import { displayKind, isActive, isFull } from './status';

export const DEFAULT_FILTERS: Filters = { kinds: [], categories: [] };

export function matchesFilters(e: RdvEvent, f: Filters, now: number): boolean {
  if (f.kinds.length && !f.kinds.includes(displayKind(e, now))) return false;
  if (f.categories.length && !f.categories.includes(e.category)) return false;
  return true;
}

export interface MapItem {
  e: RdvEvent;
  /** Vient de devenir complet : on joue l'animation de sortie avant de le retirer. */
  leaving: boolean;
}

const LEAVE_ANIMATION_MS = 1800;

/** Événements affichés sur la carte : actifs, non complets, et correspondant aux filtres. */
export function mapItems(events: Record<string, RdvEvent>, f: Filters, now: number, realNow: number): MapItem[] {
  const out: MapItem[] = [];
  for (const e of Object.values(events)) {
    if (!isActive(e, now)) continue;
    let leaving = false;
    if (isFull(e)) {
      if (realNow > 0 && e.fullAt && realNow - e.fullAt < LEAVE_ANIMATION_MS) leaving = true;
      else continue;
    }
    if (!matchesFilters(e, f, now)) continue;
    out.push({ e, leaving });
  }
  return out;
}

export const inBounds = (p: LatLng, b: MapViewState['bounds']) =>
  p.lat >= b[0] && p.lat <= b[2] && p.lng >= b[1] && p.lng <= b[3];

/** RDV visibles dans la zone affichée (pour la liste et le compteur). */
export function itemsInView(
  events: Record<string, RdvEvent>,
  f: Filters,
  view: MapViewState | null,
  now: number,
): RdvEvent[] {
  const all = mapItems(events, f, now, 0).map((i) => i.e);
  return view ? all.filter((e) => inBounds(e.place, view.bounds)) : all;
}
