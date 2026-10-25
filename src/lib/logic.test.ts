import { describe, expect, it } from 'vitest';
import type { RdvEvent } from '../types';
import { displayKind, isFull, phaseOf, remainingSpots, timing } from './status';
import { DAY, HOUR, MIN, fmtWeekdays, occurrenceFor } from './time';
import { fmtDistance } from './geo';
import { plural } from './text';

const base = (over: Partial<RdvEvent> = {}): RdvEvent => ({
  id: 'e1',
  kind: 'event',
  title: 'Partie de loup-garou',
  emoji: '🐺',
  category: 'jeux',
  description: '',
  capacity: 10,
  alreadyPresent: 4,
  participants: [],
  place: { lat: 45.18, lng: 5.73, label: 'Parc Paul Mistral' },
  durationMin: 120,
  organizerId: 'p1',
  createdAt: 0,
  occ: {},
  media: [],
  ...over,
});

// Dimanche 25 octobre 2026, 10:00 (heure locale)
const SUNDAY_10H = new Date(2026, 9, 25, 10, 0).getTime();

describe('occurrenceFor', () => {
  it('trouve la prochaine séance du jour même', () => {
    const start = occurrenceFor({ weekdays: [0], time: '14:00' }, 120, SUNDAY_10H);
    expect(new Date(start).getHours()).toBe(14);
    expect(start - SUNDAY_10H).toBe(4 * HOUR);
  });

  it('garde la séance en cours tant qu’elle n’est pas finie', () => {
    const during = new Date(2026, 9, 25, 15, 0).getTime();
    const start = occurrenceFor({ weekdays: [0], time: '14:00' }, 120, during);
    expect(new Date(start).getHours()).toBe(14);
    expect(new Date(start).getDate()).toBe(25);
  });

  it('passe à la semaine suivante une fois la séance terminée', () => {
    const after = new Date(2026, 9, 25, 17, 0).getTime();
    const start = occurrenceFor({ weekdays: [0], time: '14:00' }, 120, after);
    expect(new Date(start).getDate()).toBe(1); // dimanche 1er novembre
  });

  it('trouve encore une séance après plusieurs annulations', () => {
    const rec = { weekdays: [0], time: '14:00' };
    const cancelled = new Set<number>();
    let s = occurrenceFor(rec, 120, SUNDAY_10H);
    for (let i = 0; i < 8; i++) {
      cancelled.add(s);
      s = occurrenceFor(rec, 120, SUNDAY_10H, (x) => cancelled.has(x));
    }
    expect(Number.isFinite(s)).toBe(true);
    expect(Math.round((s - SUNDAY_10H) / DAY)).toBe(56);
  });

  it('renvoie une valeur stable si l’heure est invalide', () => {
    const e = base({ kind: 'regular', recurrence: { weekdays: [0], time: '' } });
    expect(occurrenceFor({ weekdays: [0], time: '' }, 120, SUNDAY_10H)).toBe(Infinity);
    expect(phaseOf(e, SUNDAY_10H)).toBe('ended');
  });

  it('ignore les séances annulées', () => {
    const first = occurrenceFor({ weekdays: [0], time: '14:00' }, 120, SUNDAY_10H);
    const next = occurrenceFor({ weekdays: [0], time: '14:00' }, 120, SUNDAY_10H, (s) => s === first);
    expect(Math.round((next - first) / DAY)).toBe(7);
  });
});

describe('statut d’un événement', () => {
  it('passe en live (vert) quand il commence', () => {
    const e = base({ startAt: SUNDAY_10H + HOUR });
    expect(phaseOf(e, SUNDAY_10H)).toBe('upcoming');
    expect(displayKind(e, SUNDAY_10H)).toBe('event');
    expect(phaseOf(e, SUNDAY_10H + HOUR + MIN)).toBe('live');
    expect(displayKind(e, SUNDAY_10H + HOUR + MIN)).toBe('live');
    expect(phaseOf(e, SUNDAY_10H + 4 * HOUR)).toBe('ended');
  });

  it('un régulier en cours de séance est affiché en live', () => {
    const e = base({ kind: 'regular', recurrence: { weekdays: [0], time: '09:30' } });
    expect(displayKind(e, SUNDAY_10H)).toBe('live');
    expect(timing(e, SUNDAY_10H).start).toBe(new Date(2026, 9, 25, 9, 30).getTime());
  });

  it('un événement annulé reste annulé', () => {
    const e = base({ startAt: SUNDAY_10H + HOUR, cancelled: { at: SUNDAY_10H, reason: 'manual' } });
    expect(phaseOf(e, SUNDAY_10H)).toBe('cancelled');
  });

  it('compte les places et détecte le complet', () => {
    const e = base({ capacity: 6, alreadyPresent: 4, participants: ['p2'] });
    expect(remainingSpots(e)).toBe(1);
    expect(isFull(e)).toBe(false);
    expect(isFull({ ...e, participants: ['p2', 'me'] })).toBe(true);
  });
});

describe('formatage', () => {
  it('décrit les récurrences', () => {
    expect(fmtWeekdays([0])).toBe('Tous les dimanches');
    expect(fmtWeekdays([4, 2])).toBe('Tous les mardis et jeudis');
    expect(fmtWeekdays([0, 1, 2, 3, 4, 5, 6])).toBe('Tous les jours');
  });

  it('formate les distances', () => {
    expect(fmtDistance(0.34)).toBe('350 m');
    expect(fmtDistance(1.24)).toBe('1,2 km');
    expect(fmtDistance(38.4)).toBe('38 km');
  });

  it('accorde le pluriel', () => {
    expect(plural(1, 'place')).toBe('1 place');
    expect(plural(3, 'place')).toBe('3 places');
  });
});
