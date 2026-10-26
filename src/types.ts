/** Les 3 types d'événement : chacun a sa couleur sur la carte. */
export type EventKind = 'event' | 'regular' | 'live';

export type CategoryId = 'sport' | 'jeux' | 'musique' | 'culture' | 'nature' | 'food' | 'bienetre' | 'autre';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  label: string;
}

export interface Person {
  id: string;
  firstName: string;
  initial: string;
  color: string;
}

export interface MediaItem {
  id: string;
  kind: 'image' | 'video';
  name: string;
  blob: Blob;
}

/** Récurrence hebdomadaire : jours (0 = dimanche … 6 = samedi) + heure "HH:MM". */
export interface Recurrence {
  weekdays: number[];
  time: string;
}

export type ConfirmState = 'pending' | 'yes' | 'no' | 'expired';
export type CancelReason = 'manual' | 'no-response' | 'declined' | 'organizer';

/** État propre à une occurrence (une date précise) d'un événement. */
export interface OccurrenceState {
  /** Demande de confirmation envoyée 24 h avant. */
  j1?: ConfirmState;
  /** Demande de confirmation envoyée 1 h avant. */
  h1?: ConfirmState;
  /** Séance annulée (événements réguliers uniquement). */
  cancelled?: CancelReason;
  liveNotified?: boolean;
  reminderSent?: boolean;
  endedNotified?: boolean;
}

export interface RdvEvent {
  id: string;
  kind: EventKind;
  title: string;
  emoji: string;
  category: CategoryId;
  description: string;
  /** Nombre total de personnes recherché. */
  capacity: number;
  /** Personnes déjà présentes à la création (organisateur inclus). */
  alreadyPresent: number;
  /** Personnes inscrites via l'app ('me' = l'utilisateur). */
  participants: string[];
  place: Place;
  /** Début (événement ponctuel et live). */
  startAt?: number;
  /** Récurrence (événement régulier). */
  recurrence?: Recurrence;
  durationMin: number;
  /** 'me' ou l'id d'une personne simulée. */
  organizerId: string;
  createdAt: number;
  /** Début de la séance à laquelle s'appliquent les inscriptions (réguliers). */
  occurrenceKey?: number;
  occ: Record<string, OccurrenceState>;
  cancelled?: { at: number; reason: CancelReason };
  /** Horodatage (temps réel) du passage à « complet », pour l'animation de sortie. */
  fullAt?: number;
  media: MediaItem[];
  /** Comportement simulé des organisateurs fictifs. */
  sim?: { willCancel?: 'j1' | 'h1' };
  /** RDV « à toi » fourni par la démo (et non créé par toi). */
  demoSeed?: boolean;
  /** Zone de démo qui a généré ce RDV (absent pour les RDV que tu crées). */
  areaId?: string;
  /** Discussion entre participants. */
  chat?: ChatMessage[];
  /** Dernière lecture de la discussion par toi (heure simulée). */
  chatReadAt?: number;
}

export interface ChatMessage {
  id: string;
  /** 'me' ou l'id d'une personne simulée. */
  from: string;
  text: string;
  at: number;
}

export type NotifKind =
  | 'join'
  | 'leave'
  | 'full'
  | 'cancel'
  | 'confirm'
  | 'live'
  | 'reminder'
  | 'message'
  | 'info'
  | 'ended'
  | 'success';

export interface Notif {
  id: string;
  at: number;
  kind: NotifKind;
  title: string;
  body?: string;
  eventId?: string;
  personId?: string;
  read: boolean;
  confirm?: { eventId: string; occKey: string; stage: 'j1' | 'h1' };
}

export interface Filters {
  kinds: EventKind[];
  categories: CategoryId[];
}

/** Zone visible de la carte : [sud, ouest, nord, est]. */
export interface MapViewState {
  center: LatLng;
  bounds: [number, number, number, number];
}
