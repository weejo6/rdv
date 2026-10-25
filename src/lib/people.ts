import type { Person } from '../types';

const NAMES: [string, string][] = [
  ['Camille', 'R'], ['Léa', 'M'], ['Hugo', 'B'], ['Lucas', 'D'], ['Chloé', 'F'], ['Manon', 'G'],
  ['Théo', 'L'], ['Inès', 'K'], ['Nathan', 'P'], ['Jade', 'S'], ['Louis', 'V'], ['Emma', 'C'],
  ['Raphaël', 'T'], ['Sarah', 'A'], ['Arthur', 'N'], ['Zoé', 'H'], ['Maxime', 'R'], ['Clara', 'J'],
  ['Noah', 'E'], ['Lina', 'B'], ['Antoine', 'M'], ['Juliette', 'D'], ['Mathis', 'G'], ['Alice', 'P'],
  ['Tom', 'L'], ['Lou', 'F'], ['Paul', 'C'], ['Anaïs', 'R'], ['Yanis', 'B'], ['Margaux', 'T'],
  ['Enzo', 'S'], ['Romane', 'V'], ['Bastien', 'M'], ['Élodie', 'N'], ['Karim', 'B'], ['Fatou', 'D'],
  ['Sofia', 'R'], ['Mehdi', 'A'], ['Pauline', 'G'], ['Quentin', 'L'], ['Nina', 'P'], ['Victor', 'H'],
  ['Agathe', 'M'], ['Samuel', 'K'], ['Lison', 'T'], ['Adam', 'F'], ['Mila', 'C'], ['Gabriel', 'J'],
];

const COLORS = [
  '#F97316', '#EF4444', '#EC4899', '#A855F7', '#6366F1', '#0EA5E9',
  '#14B8A6', '#22C55E', '#EAB308', '#F43F5E', '#8B5CF6', '#06B6D4',
];

/** Habitants fictifs qui peuplent la démo. */
export const PEOPLE: Person[] = NAMES.map(([firstName, initial], i) => ({
  id: `p${i}`,
  firstName,
  initial,
  color: COLORS[(i * 5) % COLORS.length],
}));

const BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));

export const getPerson = (id: string) => BY_ID.get(id);

/** Prénom affichable ; « toi » pour l'utilisateur. */
export function firstNameOf(id: string, meName = 'Toi') {
  if (id === 'me') return meName;
  return BY_ID.get(id)?.firstName ?? 'Quelqu’un';
}

export function fullNameOf(id: string, meName = 'Toi') {
  if (id === 'me') return meName;
  const p = BY_ID.get(id);
  return p ? `${p.firstName} ${p.initial}.` : 'Quelqu’un';
}

/** Petits messages envoyés par les organisateurs fictifs quand on rejoint leur RDV. */
export const WELCOME_MESSAGES = [
  'Trop bien, à tout à l’heure ! 👋',
  'Bienvenue ! On sera bien entourés 😄',
  'Super, merci ! Je t’envoie l’adresse exacte la veille.',
  'Génial ! Pense à prendre de l’eau 💧',
  'Top, on t’attend ! Tu me reconnaîtras à mon bonnet orange 🧡',
  'Yes ! Plus on est de fous… 🎉',
];
