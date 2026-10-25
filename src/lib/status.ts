import type { EventKind, RdvEvent } from '../types';
import { MIN, occurrenceFor } from './time';

export interface Timing {
  start: number;
  end: number;
}

/** Début / fin de l'occurrence pertinente (la séance en cours ou la prochaine pour un régulier). */
export function timing(e: RdvEvent, now: number): Timing {
  const dur = e.durationMin * MIN;
  if (e.kind === 'regular' && e.recurrence) {
    const start = occurrenceFor(e.recurrence, e.durationMin, now, (s) => !!e.occ[String(s)]?.cancelled);
    return { start, end: start + dur };
  }
  const start = e.startAt ?? e.createdAt;
  return { start, end: start + dur };
}

export type Phase = 'upcoming' | 'live' | 'ended' | 'cancelled';

export function phaseOf(e: RdvEvent, now: number): Phase {
  if (e.cancelled) return 'cancelled';
  const t = timing(e, now);
  if (now < t.start) return 'upcoming';
  if (now < t.end) return 'live';
  return 'ended';
}

export const isActive = (e: RdvEvent, now: number) => {
  const p = phaseOf(e, now);
  return p === 'upcoming' || p === 'live';
};

/**
 * Couleur affichée : un événement ou un régulier qui a commencé « passe live » (vert).
 */
export const displayKind = (e: RdvEvent, now: number): EventKind => (phaseOf(e, now) === 'live' ? 'live' : e.kind);

export const takenCount = (e: RdvEvent) => e.alreadyPresent + e.participants.length;

export const remainingSpots = (e: RdvEvent) => Math.max(0, e.capacity - takenCount(e));

export const isFull = (e: RdvEvent) => remainingSpots(e) <= 0;

export const isMine = (e: RdvEvent) => e.organizerId === 'me';

export const isJoined = (e: RdvEvent) => e.participants.includes('me');
