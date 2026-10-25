import type { CategoryId, EventKind } from '../types';

export const CATEGORIES: Record<CategoryId, { label: string; emoji: string; from: string; to: string }> = {
  sport: { label: 'Sport', emoji: '⚽', from: '#FDBA74', to: '#F97316' },
  jeux: { label: 'Jeux', emoji: '🎲', from: '#C4B5FD', to: '#8B5CF6' },
  musique: { label: 'Musique', emoji: '🎸', from: '#F9A8D4', to: '#EC4899' },
  culture: { label: 'Culture', emoji: '🎭', from: '#FDE68A', to: '#F59E0B' },
  nature: { label: 'Nature', emoji: '🏔️', from: '#86EFAC', to: '#16A34A' },
  food: { label: 'Food & apéro', emoji: '🍕', from: '#FCA5A5', to: '#EF4444' },
  bienetre: { label: 'Bien-être', emoji: '🧘', from: '#99F6E4', to: '#14B8A6' },
  autre: { label: 'Autre', emoji: '✨', from: '#CBD5E1', to: '#64748B' },
};

export const CATEGORY_ORDER: CategoryId[] = ['sport', 'jeux', 'musique', 'culture', 'nature', 'food', 'bienetre', 'autre'];

export const KINDS: Record<
  EventKind,
  { label: string; plural: string; color: string; soft: string; desc: string; example: string }
> = {
  event: {
    label: 'Événement',
    plural: 'Événements',
    color: '#2563EB',
    soft: '#EFF4FF',
    desc: 'Planifié et ponctuel',
    example: 'Ce dimanche à 14 h, une partie de loup-garou',
  },
  regular: {
    label: 'Régulier',
    plural: 'Réguliers',
    color: '#7C3AED',
    soft: '#F3EEFF',
    desc: 'Planifié et récurrent',
    example: 'Tous les dimanches à 14 h, loup-garou',
  },
  live: {
    label: 'Live',
    plural: 'Live',
    color: '#16A34A',
    soft: '#EAF8EF',
    desc: 'Créé à la volée, éphémère',
    example: 'Tu es au parc et il te manque 2 joueurs',
  },
};

export const KIND_ORDER: EventKind[] = ['event', 'regular', 'live'];
