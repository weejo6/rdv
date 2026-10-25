import type { CategoryId, EventKind, LatLng, Notif, Place, RdvEvent, Recurrence } from '../types';
import { PEOPLE } from './people';
import { DAY, HOUR, MIN } from './time';
import { distanceKm, jitter, randomAround } from './geo';
import { chance, pick, randInt, shuffle, uid } from './random';
import { timing } from './status';
import { plural, quoted } from './text';
import { pickFromPool, type PoolPlace, type SpotKind } from './places';

// ————————————————————————————————————————————————————————————————
// Lieux réels autour de Grenoble (contenu de démo « fait main »)
// Ailleurs, les lieux viennent d'OpenStreetMap (voir places.ts).
// ————————————————————————————————————————————————————————————————

export const GRENOBLE: LatLng = { lat: 45.1885, lng: 5.7245 };
export const DEMO_HOME: Place = { lat: 45.1892, lng: 5.7246, label: 'Place Victor Hugo, Grenoble' };
export const isNearGrenoble = (p: LatLng) => distanceKm(p, GRENOBLE) < 40;

export const PLACES = {
  paulMistral: { lat: 45.1858, lng: 5.7362, label: 'Parc Paul Mistral' },
  paulMistralKiosque: { lat: 45.1869, lng: 5.7331, label: 'Parc Paul Mistral · pelouse nord' },
  paulMistralStade: { lat: 45.1838, lng: 5.7392, label: 'Parc Paul Mistral · city stade' },
  jardinDeVille: { lat: 45.1926, lng: 5.7297, label: 'Jardin de Ville' },
  bastille: { lat: 45.1987, lng: 5.7253, label: 'Fort de la Bastille' },
  quaiJay: { lat: 45.1942, lng: 5.7236, label: 'Quai Stéphane Jay' },
  notreDame: { lat: 45.1929, lng: 5.7318, label: 'Place Notre-Dame' },
  saintAndre: { lat: 45.1924, lng: 5.7283, label: 'Place Saint-André' },
  grenette: { lat: 45.1903, lng: 5.7276, label: 'Place Grenette' },
  sainteClaire: { lat: 45.1913, lng: 5.7306, label: 'Halle Sainte-Claire' },
  ileVerte: { lat: 45.1985, lng: 5.744, label: "Berges de l'Isère · Île Verte" },
  villeneuve: { lat: 45.1633, lng: 5.7352, label: 'Parc Jean Verlhac · Villeneuve' },
  campus: { lat: 45.1932, lng: 5.7685, label: 'Domaine universitaire · Saint-Martin-d’Hères' },
  melies: { lat: 45.1838, lng: 5.7213, label: 'Cinéma Le Méliès' },
  deBonne: { lat: 45.1848, lng: 5.7223, label: 'Parc de la Caserne de Bonne' },
  championnet: { lat: 45.1873, lng: 5.7218, label: 'Place Championnet' },
  anneau: { lat: 45.1829, lng: 5.7425, label: 'Anneau de vitesse · Parc Paul Mistral' },
  jardinPlantes: { lat: 45.1862, lng: 5.7318, label: 'Jardin des Plantes' },
  musee: { lat: 45.195, lng: 5.7325, label: 'Musée de Grenoble' },
  esplanade: { lat: 45.1962, lng: 5.7143, label: 'Esplanade de la Porte de France' },
  gare: { lat: 45.1913, lng: 5.7147, label: 'Parvis de la gare' },
  chamrousse: { lat: 45.1255, lng: 5.8775, label: 'Chamrousse 1650 · départ des lacs Robert' },
  stNizier: { lat: 45.1697, lng: 5.6337, label: 'Saint-Nizier-du-Moucherotte' },
  sassenage: { lat: 45.2048, lng: 5.6632, label: 'Sassenage · place de la mairie' },
  laffrey: { lat: 45.0215, lng: 5.7742, label: 'Grand lac de Laffrey' },
  colDePorte: { lat: 45.293, lng: 5.77, label: 'Col de Porte · Chartreuse' },
  croixDeFer: { lat: 45.2271, lng: 6.2013, label: 'Col de la Croix de Fer' },
} satisfies Record<string, Place>;

type PlaceKey = keyof typeof PLACES;

/** Spots urbains de Grenoble où des « lives » peuvent apparaître. */
const URBAN_SPOTS: PlaceKey[] = [
  'paulMistral', 'paulMistralKiosque', 'paulMistralStade', 'jardinDeVille', 'quaiJay', 'notreDame',
  'saintAndre', 'grenette', 'ileVerte', 'villeneuve', 'campus', 'deBonne', 'championnet', 'anneau',
  'jardinPlantes', 'esplanade', 'gare',
];

/** Noms de lieux génériques, en dernier recours (pas de données OpenStreetMap). */
const GENERIC_SPOTS = [
  'Parc du quartier', 'Square', 'Place du marché', 'Berges de la rivière', 'City stade', 'Esplanade',
  'Jardin public', 'Parvis de la mairie', 'Terrain multisport', 'Place de l’église', 'Coulée verte',
];

/** Contexte de génération : centre + éventuels vrais lieux alentour. */
export interface SeedContext {
  center: LatLng;
  pool: PoolPlace[] | null;
}

// ————————————————————————————————————————————————————————————————
// Événements de départ
// ————————————————————————————————————————————————————————————————

type When = { weekday: number; time: string } | { daysAhead: number; time: string } | { inMinutes: number };

interface SeedTpl {
  title: string;
  emoji: string;
  kind: EventKind;
  category: CategoryId;
  /** Lieu à Grenoble. */
  place: PlaceKey;
  /** Ailleurs : types de lieux OpenStreetMap acceptés (par préférence) et distance visée (km). */
  spots: SpotKind[];
  dist: [number, number];
  /** Ailleurs, si aucun lieu réel ne convient. */
  generic: string;
  /** Variante hors de Grenoble pour les contenus trop locaux. */
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
  mine?: boolean;
}

const SEEDS: SeedTpl[] = [
  {
    title: 'Partie de loup-garou', emoji: '🐺', kind: 'event', category: 'jeux',
    place: 'paulMistralKiosque', spots: ['park'], generic: 'Parc du quartier', dist: [0.5, 1.5],
    capacity: 10, present: 4, joined: 3, when: { weekday: 0, time: '14:00' }, durationMin: 150,
    description: "On se retrouve sur la pelouse pour quelques parties de loup-garou. J'apporte les cartes et je fais le maître du jeu, débutants bienvenus ! 🐺🌕",
  },
  {
    title: 'Tour en vélo · Col de la Croix de Fer', emoji: '🚴', kind: 'event', category: 'sport',
    place: 'croixDeFer', spots: ['peak', 'view', 'water'], generic: 'Col', dist: [25, 40],
    alt: {
      title: 'Grande sortie vélo',
      description: 'Sortie vélo à la journée avec une belle montée au programme. Rythme cool, on se regroupe au sommet pour la photo. Casque obligatoire, covoiturage possible.',
      dist: [8, 30],
    },
    capacity: 5, present: 2, joined: 1, when: { weekday: 6, time: '08:00' }, durationMin: 360,
    description: 'Montée depuis Allemond : 27 km et ~1 500 m de D+. Rythme cool, on se regroupe au sommet pour la photo et un chocolat chaud. Casque obligatoire, covoiturage possible depuis Grenoble.',
  },
  {
    title: 'Loup-garou du dimanche', emoji: '🐺', kind: 'regular', category: 'jeux',
    place: 'jardinDeVille', spots: ['park'], generic: 'Jardin public', dist: [0.3, 1.2],
    capacity: 12, present: 3, joined: 4, recurrence: { weekdays: [0], time: '14:00' }, durationMin: 180,
    description: 'Chaque dimanche après-midi : loup-garou géant avec rôles spéciaux (sorcière, cupidon, chasseur…). Maître du jeu expérimenté, ambiance bon enfant.',
  },
  {
    title: 'Foot à 5', emoji: '⚽', kind: 'live', category: 'sport',
    place: 'paulMistralStade', spots: ['pitch', 'park'], generic: 'City stade', dist: [0.4, 1.5],
    capacity: 10, present: 7, joined: 0, startedMinAgo: 8, durationMin: 90,
    description: 'On est 7 sur le terrain, il manque 3 joueurs pour faire du 5 contre 5 ! Venez comme vous êtes 😄',
  },
  {
    title: 'Running du soir', emoji: '🏃', kind: 'regular', category: 'sport',
    place: 'quaiJay', spots: ['park', 'water'], generic: 'Berges de la rivière', dist: [0.4, 2],
    capacity: 20, present: 4, joined: 7, meJoined: true, recurrence: { weekdays: [2, 4], time: '19:00' }, durationMin: 60,
    description: 'Footing de 8 km, allure ~6 min/km. Tous niveaux : on attend tout le monde au retour !',
  },
  {
    title: 'Jam session acoustique', emoji: '🎸', kind: 'event', category: 'musique',
    place: 'notreDame', spots: ['square', 'park'], generic: 'Place de l’église', dist: [0.3, 1.2],
    capacity: 8, present: 3, joined: 2, when: { inMinutes: 50 }, durationMin: 120,
    description: 'Guitares, cajón, ukulélé… Viens avec ton instrument ou juste ta voix ! Répertoire folk / pop, on improvise beaucoup.',
  },
  {
    title: 'Coucher de soleil à la Bastille', emoji: '🌄', kind: 'event', category: 'nature',
    place: 'bastille', spots: ['view', 'peak', 'park'], generic: 'Belvédère', dist: [1, 3],
    alt: {
      title: 'Coucher de soleil au belvédère',
      description: "Petite montée à pied jusqu'au point de vue, puis apéro face au coucher de soleil. Prévois une frontale pour la descente !",
      dist: [0.5, 12],
    },
    capacity: 15, present: 2, joined: 6, when: { daysAhead: 1, time: '17:15' }, durationMin: 120,
    description: 'Montée à pied par le jardin des Dauphins (45 min), puis apéro face au Vercors. Prévois une frontale pour la descente !',
  },
  {
    title: 'Apéro jeux de société', emoji: '🎲', kind: 'regular', category: 'jeux',
    place: 'saintAndre', spots: ['bar'], generic: 'Bar du centre', dist: [0.2, 1.2],
    capacity: 12, present: 2, joined: 6, meJoined: true, recurrence: { weekdays: [3], time: '19:00' }, durationMin: 180,
    description: "Tous les mercredis soir : Codenames, Dixit, Skyjo, Time's Up… Ramène tes jeux préférés, ambiance détendue garantie.",
  },
  {
    title: 'Pétanque entre voisins', emoji: '🎯', kind: 'live', category: 'jeux',
    place: 'deBonne', spots: ['park', 'pitch'], generic: 'Square', dist: [0.3, 1],
    capacity: 6, present: 4, joined: 0, startedMinAgo: 20, durationMin: 120,
    description: 'Deux équipes de 3 : il manque 2 personnes. On a les boules et le cochonnet !',
  },
  {
    title: 'Yoga au parc', emoji: '🧘', kind: 'regular', category: 'bienetre',
    place: 'paulMistral', spots: ['park'], generic: 'Parc', dist: [0.6, 2],
    capacity: 15, present: 1, joined: 8, recurrence: { weekdays: [6], time: '10:00' }, durationMin: 75,
    description: "Vinyasa doux en plein air, tous niveaux. Apporte ton tapis et une bouteille d'eau. Gratuit, chapeau libre 🙏",
  },
  {
    title: 'Rando aux lacs Robert', emoji: '🥾', kind: 'event', category: 'nature',
    place: 'chamrousse', spots: ['water', 'peak', 'view'], generic: 'Départ de randonnée', dist: [10, 18],
    alt: {
      title: 'Rando à la journée',
      description: 'Boucle de 10 km avec pique-nique au bord de l’eau. Bonnes chaussures conseillées, covoiturage possible.',
      dist: [5, 30],
    },
    capacity: 8, present: 2, joined: 3, when: { weekday: 0, time: '09:00' }, durationMin: 300,
    description: "Boucle de 9 km / 450 m D+ depuis Chamrousse 1650 jusqu'aux lacs Robert. Pique-nique au bord du lac, covoiturage depuis Grenoble.",
  },
  {
    title: 'Sommet du Moucherotte', emoji: '⛰️', kind: 'event', category: 'nature',
    place: 'stNizier', spots: ['peak', 'view'], generic: 'Sentier de crête', dist: [8, 15],
    alt: {
      title: 'Rando au sommet',
      description: 'Montée au sommet pour profiter de la vue. Niveau intermédiaire, prévois de l’eau et un coupe-vent.',
      dist: [3, 30],
    },
    capacity: 6, present: 1, joined: 2, when: { weekday: 6, time: '09:30' }, durationMin: 240,
    description: 'Montée au Moucherotte (1 901 m) : vue à 360° sur Grenoble, la Chartreuse et le Mont-Blanc par temps clair.',
  },
  {
    title: 'Balade street art', emoji: '🎨', kind: 'event', category: 'culture',
    place: 'grenette', spots: ['square', 'culture'], generic: 'Centre-ville', dist: [0.3, 1.5],
    alt: {
      title: 'Balade street art',
      description: 'Parcours à pied des plus belles fresques du coin. Anecdotes et techniques des artistes au programme.',
    },
    capacity: 12, present: 2, joined: 4, when: { daysAhead: 1, time: '15:00' }, durationMin: 120,
    description: "Parcours des plus belles fresques du Street Art Fest, du centre jusqu'à l'Île Verte. Anecdotes et techniques des artistes au programme.",
  },
  {
    title: 'Pique-nique partagé', emoji: '🧺', kind: 'event', category: 'food',
    place: 'villeneuve', spots: ['park'], generic: 'Grand parc', dist: [1, 4],
    capacity: 20, present: 4, joined: 6, when: { weekday: 0, time: '12:30' }, durationMin: 150,
    description: 'Chacun apporte un plat à partager. Couvertures, frisbee et bonne humeur fournis !',
  },
  {
    title: 'Basket 3x3', emoji: '🏀', kind: 'live', category: 'sport',
    place: 'campus', spots: ['pitch'], generic: 'Terrain multisport', dist: [1, 4],
    capacity: 6, present: 4, joined: 1, startedMinAgo: 5, durationMin: 90,
    description: 'Terrain libre : il manque 1 joueur pour faire du 3 contre 3.',
  },
  {
    title: 'Échecs en plein air', emoji: '♟️', kind: 'regular', category: 'jeux',
    place: 'esplanade', spots: ['square', 'park'], generic: 'Esplanade', dist: [0.5, 1.5],
    capacity: 10, present: 2, joined: 3, recurrence: { weekdays: [6], time: '15:00' }, durationMin: 180,
    description: "Échiquiers en libre accès, parties rapides et blitz. Tous niveaux, on t'apprend volontiers les ouvertures !",
  },
  {
    title: 'Ciné-club : soirée Miyazaki', emoji: '🎬', kind: 'event', category: 'culture',
    place: 'melies', spots: ['cinema', 'culture'], generic: 'Cinéma du quartier', dist: [0.5, 3],
    capacity: 10, present: 3, joined: 4, when: { weekday: 5, time: '20:00' }, durationMin: 180,
    description: "Projection du « Voyage de Chihiro » en VOST, puis on débriefe autour d'un verre.",
  },
  {
    title: 'Sortie vélo dans le Vercors', emoji: '🚵', kind: 'regular', category: 'sport',
    place: 'sassenage', spots: ['square', 'park'], generic: 'Rond-point de départ', dist: [4, 8],
    alt: {
      title: 'Sortie vélo du samedi',
      description: 'Boucle de 60 km sur les petites routes du coin. Niveau intermédiaire, pause café à mi-parcours.',
      dist: [0.5, 5],
    },
    capacity: 10, present: 2, joined: 4, recurrence: { weekdays: [6], time: '09:00' }, durationMin: 240,
    description: "Boucle de 60 km par les gorges d'Engins et Lans-en-Vercors. Niveau intermédiaire, pause café à mi-parcours.",
  },
  {
    title: 'Ultimate frisbee', emoji: '🥏', kind: 'live', category: 'sport',
    place: 'ileVerte', spots: ['park'], generic: 'Grande pelouse', dist: [0.8, 2.5],
    capacity: 12, present: 8, joined: 1, startedMinAgo: 15, durationMin: 120,
    description: 'Match amical sur la pelouse. Il reste 3 places, venez !',
  },
  {
    title: 'Repas partagé à la Halle', emoji: '🍲', kind: 'event', category: 'food',
    place: 'sainteClaire', spots: ['market', 'square'], generic: 'Halle du marché', dist: [0.3, 1.5],
    alt: {
      title: 'Repas partagé au marché',
      description: 'On fait le marché ensemble puis on cuisine un grand repas de saison. Participation : 8 €.',
    },
    capacity: 8, present: 2, joined: 5, when: { daysAhead: 2, time: '12:00' }, durationMin: 90,
    description: 'On fait le marché ensemble puis on cuisine un grand repas de saison. Participation : 8 €.',
  },
  {
    title: 'Karaoké du jeudi', emoji: '🎤', kind: 'regular', category: 'musique',
    place: 'championnet', spots: ['bar'], generic: 'Bar du quartier', dist: [0.3, 1.5],
    capacity: 14, present: 3, joined: 5, recurrence: { weekdays: [4], time: '21:00' }, durationMin: 150,
    description: "Micro ouvert à tous, des tubes des années 80 à aujourd'hui. Fous rires garantis 🎶",
  },
  {
    title: "Balade d'automne au lac de Laffrey", emoji: '🍂', kind: 'event', category: 'nature',
    place: 'laffrey', spots: ['water', 'park'], generic: 'Lac', dist: [12, 20],
    alt: {
      title: "Balade d'automne au bord de l'eau",
      description: "Balade tranquille (7 km, plat) au milieu des couleurs d'automne. Idéal en famille, chiens bienvenus.",
      dist: [1, 30],
    },
    capacity: 10, present: 3, joined: 2, when: { daysAhead: 6, time: '10:00' }, durationMin: 180,
    description: "Tour du Grand lac (7 km, plat) au milieu des couleurs d'automne. Idéal en famille, chiens bienvenus.",
  },
  {
    title: "Course d'orientation en Chartreuse", emoji: '🧭', kind: 'event', category: 'nature',
    place: 'colDePorte', spots: ['park', 'view', 'peak'], generic: 'Forêt', dist: [10, 20],
    alt: {
      title: "Course d'orientation",
      description: 'Parcours balisé de 6 km, cartes et boussoles fournies. Par équipes de 2 ou 3.',
      dist: [1, 15],
    },
    capacity: 12, present: 3, joined: 2, when: { daysAhead: 5, time: '10:00' }, durationMin: 180,
    description: 'Parcours balisé de 6 km en forêt, cartes et boussoles fournies. Par équipes de 2 ou 3.',
  },
  {
    title: "Roller à l'Anneau", emoji: '🛼', kind: 'regular', category: 'sport',
    place: 'anneau', spots: ['park', 'pitch'], generic: 'Piste', dist: [0.8, 2.5],
    alt: {
      title: 'Session roller',
      description: 'Randonnée roller tranquille, tous niveaux. Casque et protections conseillés.',
    },
    capacity: 15, present: 3, joined: 5, recurrence: { weekdays: [1, 5], time: '18:30' }, durationMin: 90,
    description: "Randonnée roller sur l'anneau de vitesse puis balade dans le parc. Casque et protections conseillés.",
  },
  {
    title: 'Visite du Musée de Grenoble', emoji: '🖼️', kind: 'event', category: 'culture',
    place: 'musee', spots: ['museum', 'culture'], generic: 'Musée', dist: [0.4, 3],
    alt: {
      title: 'Visite du musée',
      description: 'Visite des collections en petit groupe, puis un café pour en discuter.',
    },
    capacity: 8, present: 1, joined: 3, when: { daysAhead: 3, time: '14:30' }, durationMin: 120,
    description: "Les collections permanentes sont gratuites ! Focus sur l'art moderne : Matisse, Picasso, Chagall…",
  },
  {
    // Un RDV organisé par l'utilisateur, pour montrer tout de suite la demande de confirmation J-1.
    title: 'Tournoi de Mölkky', emoji: '🪵', kind: 'event', category: 'jeux',
    place: 'jardinPlantes', spots: ['park'], generic: 'Square', dist: [0.3, 1.5], mine: true,
    capacity: 12, present: 2, joined: 5, when: { inMinutes: 22 * 60 + 30 }, durationMin: 150,
    description: 'Tournoi en équipes de 2, lots pour les gagnants 🏆 Jus de pomme et goûter sur place.',
  },
];

function resolveWhen(w: When, now: number): number {
  if ('inMinutes' in w) {
    const step = 5 * MIN;
    return Math.ceil((now + w.inMinutes * MIN) / step) * step;
  }
  const [h, m] = w.time.split(':').map(Number);
  const at = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  if ('daysAhead' in w) return at(w.daysAhead);
  for (let d = 0; d <= 7; d++) {
    const ts = at(d);
    if (new Date(ts).getDay() === w.weekday && ts > now + 30 * MIN) return ts;
  }
  return at(7);
}

function pickParticipants(count: number, exclude: string[]): string[] {
  return shuffle(PEOPLE.filter((p) => !exclude.includes(p.id)))
    .slice(0, Math.max(0, count))
    .map((p) => p.id);
}

/**
 * Lieu d'un RDV de départ : lieu fait main (Grenoble), vrai lieu OpenStreetMap, ou point générique
 * si on n'a aucune donnée. Avec des données mais aucun lieu du bon type : null (RDV non généré).
 */
function seedPlace(tpl: SeedTpl, ctx: SeedContext, used: Set<string>): Place | null {
  if (isNearGrenoble(ctx.center)) {
    const base = PLACES[tpl.place];
    return { ...jitter(base, 20), label: base.label };
  }
  const dist = tpl.alt?.dist ?? tpl.dist;
  if (ctx.pool) {
    const p =
      pickFromPool(ctx.pool, tpl.spots, ctx.center, dist, used) ??
      (tpl.mine ? pickFromPool(ctx.pool, ['park', 'square'], ctx.center, [0, 3], used) : null);
    return p ? { ...jitter(p, 15), label: p.label } : null;
  }
  return { ...randomAround(ctx.center, dist[0], Math.min(dist[1], 6)), label: tpl.generic };
}

function buildSeed(tpl: SeedTpl, ctx: SeedContext, now: number, used: Set<string>): RdvEvent | null {
  const place = seedPlace(tpl, ctx, used);
  if (!place) return null;
  const local = isNearGrenoble(ctx.center);
  const title = !local && tpl.alt ? tpl.alt.title : tpl.title;
  const description = !local && tpl.alt ? tpl.alt.description : tpl.description;
  const organizerId = tpl.mine ? 'me' : pick(PEOPLE).id;
  const maxJoined = tpl.capacity - tpl.present - 1 - (tpl.meJoined ? 1 : 0);
  const sims = pickParticipants(Math.min(tpl.joined, maxJoined), [organizerId]);
  const startAt =
    tpl.kind === 'live' ? now - (tpl.startedMinAgo ?? 0) * MIN : tpl.when ? resolveWhen(tpl.when, now) : undefined;

  const e: RdvEvent = {
    id: uid('e'),
    kind: tpl.kind,
    title,
    emoji: tpl.emoji,
    category: tpl.category,
    description,
    capacity: tpl.capacity,
    alreadyPresent: tpl.present,
    participants: tpl.meJoined ? ['me', ...sims] : sims,
    place,
    startAt,
    recurrence: tpl.recurrence,
    durationMin: tpl.durationMin,
    organizerId,
    createdAt: tpl.mine ? now - 3 * DAY : tpl.kind === 'live' && startAt ? startAt : now - randInt(2, 72) * HOUR,
    occ: {},
    media: [],
    // Quelques organisateurs fictifs ne confirmeront pas leur RDV (annulation automatique).
    sim:
      !tpl.mine && !tpl.meJoined && tpl.kind !== 'live' && chance(0.08)
        ? { willCancel: chance(0.5) ? 'j1' : 'h1' }
        : undefined,
    demoSeed: tpl.mine || undefined,
  };
  if (e.kind === 'regular') e.occurrenceKey = timing(e, now).start;
  return e;
}

/** Génère le monde de départ autour d'un centre. */
export function seedWorld(ctx: SeedContext, now: number, opts: { includeMine: boolean }): Record<string, RdvEvent> {
  const out: Record<string, RdvEvent> = {};
  const used = new Set<string>();
  for (const tpl of SEEDS) {
    if (tpl.mine && !opts.includeMine) continue;
    const e = buildSeed(tpl, ctx, now, used);
    if (e) out[e.id] = e;
  }
  return out;
}

export function welcomeNotifs(events: Record<string, RdvEvent>, now: number): Notif[] {
  const out: Notif[] = [];
  const mine = Object.values(events).find((e) => e.organizerId === 'me');
  if (mine) {
    mine.participants.slice(0, 2).forEach((pid, i) => {
      const p = PEOPLE.find((x) => x.id === pid);
      if (!p) return;
      out.push({
        id: uid('n'),
        at: now - (i + 1) * 47 * MIN,
        kind: 'join',
        title: `${p.firstName} a rejoint ${quoted(mine.title)}`,
        body: 'Ton tournoi se remplit petit à petit 🙌',
        eventId: mine.id,
        personId: pid,
        read: true,
      });
    });
  }
  out.unshift({
    id: uid('n'),
    at: now,
    kind: 'info',
    title: 'Bienvenue sur RDV 👋',
    body: 'Voici les rendez-vous autour de toi. Astuce : clic droit (ou appui long) sur la carte pour créer un RDV à cet endroit.',
    read: false,
  });
  return out;
}

// ————————————————————————————————————————————————————————————————
// Génération continue (simulation)
// ————————————————————————————————————————————————————————————————

const LIVE_TPL: { title: string; emoji: string; category: CategoryId; cap: [number, number]; spots: SpotKind[] }[] = [
  { title: 'Partie de loup-garou', emoji: '🐺', category: 'jeux', cap: [8, 12], spots: ['park'] },
  { title: 'Mölkky', emoji: '🪵', category: 'jeux', cap: [4, 8], spots: ['park'] },
  { title: 'Foot improvisé', emoji: '⚽', category: 'sport', cap: [8, 12], spots: ['pitch', 'park'] },
  { title: "Volley sur l'herbe", emoji: '🏐', category: 'sport', cap: [6, 10], spots: ['park', 'pitch'] },
  { title: 'Spikeball', emoji: '🟡', category: 'sport', cap: [4, 6], spots: ['park'] },
  { title: 'Pétanque', emoji: '🎯', category: 'jeux', cap: [4, 6], spots: ['park', 'square'] },
  { title: 'Tarot au soleil', emoji: '🃏', category: 'jeux', cap: [4, 5], spots: ['bar', 'square'] },
  { title: 'Session slackline', emoji: '🤸', category: 'sport', cap: [3, 6], spots: ['park'] },
  { title: 'Jam guitare', emoji: '🎸', category: 'musique', cap: [3, 6], spots: ['square', 'park'] },
  { title: 'Badminton', emoji: '🏸', category: 'sport', cap: [4, 4], spots: ['park', 'pitch'] },
  { title: 'Apéro improvisé', emoji: '🍻', category: 'food', cap: [5, 10], spots: ['bar', 'park'] },
  { title: 'Croquis urbain', emoji: '✏️', category: 'culture', cap: [3, 8], spots: ['square', 'culture'] },
  { title: 'Ping-pong', emoji: '🏓', category: 'sport', cap: [4, 4], spots: ['pitch', 'park'] },
  { title: 'Balade digestive', emoji: '🚶', category: 'nature', cap: [3, 8], spots: ['park', 'water'] },
];

function liveDescription(present: number, missing: number) {
  return pick([
    `On est ${present}, il manque ${plural(missing, 'personne')} ! Ramène-toi 😄`,
    `Partie lancée à l'instant, on cherche encore ${plural(missing, 'joueur')}. Aucun niveau requis !`,
    `Ça s'est monté sur un coup de tête, rejoins-nous ! Encore ${plural(missing, 'place')}.`,
  ]);
}

function spawnPlace(ctx: SeedContext, maxKm: number, spots: SpotKind[]): Place {
  if (isNearGrenoble(ctx.center)) {
    const candidates = URBAN_SPOTS.map((k) => PLACES[k]).filter((p) => distanceKm(ctx.center, p) < maxKm);
    if (candidates.length) {
      const base = pick(candidates);
      return { ...jitter(base, 70), label: base.label };
    }
  }
  if (ctx.pool) {
    const p = pickFromPool(ctx.pool, spots, ctx.center, [0, maxKm]);
    if (p) return { ...jitter(p, 40), label: p.label };
  }
  return { ...randomAround(ctx.center, 0.2, Math.min(maxKm, 2.5)), label: pick(GENERIC_SPOTS) };
}

/** Un habitant fictif lance un live près de l'utilisateur. */
export function makeLiveEvent(ctx: SeedContext, now: number): RdvEvent {
  const tpl = pick(LIVE_TPL);
  const capacity = randInt(tpl.cap[0], tpl.cap[1]);
  const missing = randInt(1, Math.min(4, capacity - 2));
  const present = capacity - missing;
  const startAt = now - randInt(0, 3) * MIN;
  return {
    id: uid('e'),
    kind: 'live',
    title: tpl.title,
    emoji: tpl.emoji,
    category: tpl.category,
    description: liveDescription(present, missing),
    capacity,
    alreadyPresent: present,
    participants: [],
    place: spawnPlace(ctx, 3.5, tpl.spots),
    startAt,
    durationMin: pick([60, 90, 120]),
    organizerId: pick(PEOPLE).id,
    createdAt: startAt,
    occ: {},
    media: [],
  };
}

const PLANNED_TPL: {
  title: string;
  emoji: string;
  category: CategoryId;
  kind: EventKind;
  cap: [number, number];
  spots: SpotKind[];
  description: string;
}[] = [
  { title: 'Soirée jeu de rôle', emoji: '🐉', category: 'jeux', kind: 'event', cap: [5, 7], spots: ['bar', 'culture'], description: "Initiation à Donjons & Dragons, scénario d'une soirée. Dés et fiches fournis !" },
  { title: 'Sortie trail', emoji: '🏃', category: 'sport', kind: 'event', cap: [6, 12], spots: ['park', 'view'], description: '12 km et 600 m D+ sur les sentiers, allure tranquille. Frontale conseillée.' },
  { title: 'Atelier crêpes', emoji: '🥞', category: 'food', kind: 'event', cap: [6, 10], spots: ['square', 'park'], description: 'On fait la pâte ensemble, chacun ramène une garniture. Sucré ou salé, pas de jaloux !' },
  { title: 'Concert dans le parc', emoji: '🎻', category: 'musique', kind: 'event', cap: [15, 30], spots: ['park'], description: 'Petit concert de musique de chambre en plein air. Apporte un plaid et de quoi grignoter.' },
  { title: 'Initiation escalade', emoji: '🧗', category: 'sport', kind: 'event', cap: [4, 8], spots: ['pitch'], description: 'Séance découverte avec un moniteur. Location chaussons sur place.' },
  { title: 'Tournoi de belote', emoji: '🃏', category: 'jeux', kind: 'event', cap: [8, 16], spots: ['bar'], description: 'Équipes tirées au sort, buvette et bonne ambiance garanties.' },
  { title: 'Club lecture', emoji: '📚', category: 'culture', kind: 'regular', cap: [6, 12], spots: ['culture', 'park'], description: 'On échange autour du livre du mois. Ce mois-ci : un polar !' },
  { title: 'Cours de salsa', emoji: '💃', category: 'musique', kind: 'regular', cap: [10, 20], spots: ['bar', 'square'], description: 'Cours débutants puis soirée dansante. Pas besoin de venir en couple.' },
  { title: 'Ramassage de déchets', emoji: '♻️', category: 'nature', kind: 'event', cap: [10, 25], spots: ['park', 'water'], description: 'Gants et sacs fournis. On nettoie le coin puis on partage un café.' },
  { title: 'Badminton du midi', emoji: '🏸', category: 'sport', kind: 'regular', cap: [4, 8], spots: ['pitch', 'park'], description: 'Une heure de bad pendant la pause déj. Raquettes en prêt.' },
  { title: 'Balade photo', emoji: '📷', category: 'culture', kind: 'event', cap: [5, 10], spots: ['square', 'park'], description: 'Balade pour travailler la lumière de fin de journée. Smartphone accepté !' },
  { title: 'Brunch partagé', emoji: '🥐', category: 'food', kind: 'event', cap: [6, 12], spots: ['bar', 'park'], description: 'Chacun apporte un truc à partager, on s’occupe du café.' },
];

/** Un habitant fictif publie un événement planifié (pour garder la carte vivante). */
export function makePlannedEvent(ctx: SeedContext, now: number): RdvEvent {
  const tpl = pick(PLANNED_TPL);
  const capacity = randInt(tpl.cap[0], tpl.cap[1]);
  const present = randInt(1, Math.max(1, Math.floor(capacity / 4)));
  const organizerId = pick(PEOPLE).id;
  const sims = pickParticipants(randInt(0, Math.floor((capacity - present) / 2)), [organizerId]);
  const hour = pick([10, 12, 14, 15, 18, 19, 20]);
  // setDate / setHours (et non des journées de 24 h fixes) pour rester juste lors des changements d'heure.
  const at = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  };
  const offset = randInt(0, 5);
  let startAt = at(offset);
  if (startAt < now + 2 * HOUR) startAt = at(offset + 1);
  const e: RdvEvent = {
    id: uid('e'),
    kind: tpl.kind,
    title: tpl.title,
    emoji: tpl.emoji,
    category: tpl.category,
    description: tpl.description,
    capacity,
    alreadyPresent: present,
    participants: sims,
    place: spawnPlace(ctx, 6, tpl.spots),
    startAt: tpl.kind === 'event' ? startAt : undefined,
    recurrence:
      tpl.kind === 'regular'
        ? { weekdays: [new Date(startAt).getDay()], time: `${String(hour).padStart(2, '0')}:00` }
        : undefined,
    durationMin: pick([60, 90, 120, 180]),
    organizerId,
    createdAt: now,
    occ: {},
    media: [],
  };
  if (e.kind === 'regular') e.occurrenceKey = timing(e, now).start;
  return e;
}

/** Nouvelles inscriptions « d'habitués » quand une nouvelle séance d'un régulier s'ouvre. */
export function regularsFor(e: RdvEvent): string[] {
  const room = e.capacity - e.alreadyPresent - 1;
  return pickParticipants(randInt(0, Math.max(0, Math.floor(room / 2))), [e.organizerId]);
}
