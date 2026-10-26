import { describe, expect, it } from 'vitest';
import type { RdvEvent } from '../types';
import { chatMembers, replyTo, unreadCount } from './chat';

const NOW = new Date(2026, 9, 27, 10, 0).getTime();

const ev = (over: Partial<RdvEvent> = {}): RdvEvent => ({
  id: 'e1', kind: 'event', title: 'Partie de loup-garou', emoji: '🐺', category: 'jeux', description: '',
  capacity: 10, alreadyPresent: 3, participants: ['me', 'p1', 'p2'],
  place: { lat: 45.18, lng: 5.73, label: 'Parc Paul Mistral' },
  startAt: new Date(2026, 9, 27, 14, 0).getTime(), durationMin: 120, organizerId: 'p0', createdAt: 0, occ: {}, media: [],
  ...over,
});

describe('discussion', () => {
  it('les membres sont l’orga et les participants, sans toi', () => {
    expect(chatMembers(ev())).toEqual(['p0', 'p1', 'p2']);
  });

  it('l’orga répond aux questions pratiques', () => {
    const where = replyTo('On se retrouve où exactement ?', ev(), NOW, 'Jo');
    expect(where?.from).toBe('p0');
    expect(where?.text).toContain('Parc Paul Mistral');
    expect(replyTo('Ça commence à quelle heure ?', ev(), NOW, 'Jo')?.text).toContain('14:00');
    expect(replyTo('Il faut apporter quoi ?', ev(), NOW, 'Jo')?.text).toMatch(/jeux/);
  });

  it('compte les messages non lus', () => {
    const e = ev({
      chat: [
        { id: 'a', from: 'p1', text: 'Salut', at: 1 },
        { id: 'b', from: 'me', text: 'Hello', at: 2 },
        { id: 'c', from: 'p2', text: 'Coucou', at: 3 },
      ],
      chatReadAt: 1,
    });
    expect(unreadCount(e)).toBe(1);
  });
});
