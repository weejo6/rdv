import type { CategoryId, EventKind, LatLng, Place, Recurrence } from '../../types';
import type { PoolPlace, SpotKind } from '../places';

export type RegionId = 'grenoble' | 'montreal';

/** Moment d'un événement de départ, relatif à « maintenant ». */
export type When = { weekday: number; time: string } | { daysAhead: number; time: string } | { inMinutes: number };

/** Modèle d'événement de départ. */
export interface SeedTpl {
  title: string;
  emoji: string;
  kind: EventKind;
  category: CategoryId;
  /** Lieu fait main (clé de `Region.places`). */
  place: string;
  /**
   * Pour réutiliser le modèle ailleurs (hors ville faite main) : types de lieux OpenStreetMap
   * acceptés (par préférence), distance visée (km) et nom de secours.
   */
  spots?: SpotKind[];
  dist?: [number, number];
  generic?: string;
  /** Variante hors de la ville pour les contenus trop locaux. */
  alt?: { title: string; description: string; dist?: [number, number] };
  capacity: number;
  present: number;
  joined: number;
  when?: When;
  recurrence?: Recurrence;
  startedMinAgo?: number;
  durationMin: number;
  description: string;
  meJoined?: boolean;
  /** RDV « organisé par toi » fourni par la démo (montre la confirmation J-1). */
  mine?: boolean;
}

export interface LiveTpl {
  title: string;
  emoji: string;
  category: CategoryId;
  cap: [number, number];
  spots: SpotKind[];
}

/** Ville avec du contenu de démo fait main. */
export interface Region {
  id: RegionId;
  name: string;
  center: LatLng;
  /** En deçà : contenu fait main. */
  cityRadiusKm: number;
  /** En deçà : les lieux faits main complètent les vrais lieux alentour. */
  regionRadiusKm: number;
  /** Position de démo. */
  home: Place;
  places: Record<string, PoolPlace>;
  /** Lieux où des lives peuvent apparaître. */
  urbanSpots: string[];
  seeds: SeedTpl[];
  /** Lives propres à la ville, en plus des lives génériques. */
  extraLives?: LiveTpl[];
}

/** Petit utilitaire pour déclarer un lieu. */
export const spot = (lat: number, lng: number, label: string, kind: SpotKind): PoolPlace => ({ lat, lng, label, kind });
