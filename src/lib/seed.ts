import type { CategoryId, EventKind, LatLng, Notif, Place, RdvEvent } from '../types';
import { PEOPLE } from './people';
import { DAY, HOUR, MIN } from './time';
import { distanceKm, jitter, randomAround } from './geo';
import { chance, pick, randInt, shuffle, uid } from './random';
import { timing } from './status';
import { plural, quoted } from './text';
import { pickFromPool, type PoolPlace, type SpotKind } from './places';
import { GRENOBLE_REGION, regionAround, regionInCity, type LiveTpl, type Region, type SeedTpl, type When } from './regions';

/**
 * Génération des RDV simulés.
 * - Dans une ville faite main (Grenoble, Montréal) : son contenu, sur ses lieux.
 * - Ailleurs : des modèles génériques placés sur les vrais lieux alentour (OpenStreetMap),
 *   complétés par les lieux faits main de la région s'il y en a une.
 */

/** Noms de lieux génériques, en dernier recours (pas de données OpenStreetMap). */
const GENERIC_SPOTS = [
  'Parc du quartier', 'Square', 'Place du marché', 'Berges de la rivière', 'City stade', 'Esplanade',
  'Jardin public', 'Parvis de la mairie', 'Terrain multisport', 'Place de l’église', 'Coulée verte',
];

/** Contexte de génération. */
export interface SeedContext {
  center: LatLng;
  /** Ville faite main dans laquelle on se trouve. */
  city: Region | null;
  pool: PoolPlace[] | null;
  /** true si les lieux viennent vraiment d'OpenStreetMap (sinon on peut retomber sur du générique). */
  realData: boolean;
}

/** Construit le contexte : vrais lieux récupérés + lieux faits main de la région. */
export function makeSeedContext(center: LatLng, fetched: PoolPlace[] | null): SeedContext {
  const region = regionAround(center);
  const pool = [...(fetched ?? []), ...(region ? Object.values(region.places) : [])];
  return { center, city: regionInCity(center), pool: pool.length ? pool : null, realData: !!fetched?.length };
}

// ————————————————————————————————————————————————————————————————
// Événements de départ
// ————————————————————————————————————————————————————————————————

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
 * Lieu d'un RDV de départ : lieu fait main, vrai lieu OpenStreetMap, ou point générique si on
 * n'a aucune donnée. Avec des données mais aucun lieu du bon type : null (RDV non généré).
 */
function seedPlace(tpl: SeedTpl, ctx: SeedContext, used: Set<string>): Place | null {
  if (ctx.city) {
    const base = ctx.city.places[tpl.place];
    return { ...jitter(base, 20), label: base.label };
  }
  const dist = tpl.alt?.dist ?? tpl.dist ?? [0.3, 3];
  if (ctx.pool) {
    const p =
      pickFromPool(ctx.pool, tpl.spots ?? ['park'], ctx.center, dist, used) ??
      (tpl.mine ? pickFromPool(ctx.pool, ['park', 'square'], ctx.center, [0, 3], used) : null);
    if (p) return { ...jitter(p, 15), label: p.label };
    // Avec de vraies données mais aucun lieu adapté, on ne génère pas ce RDV.
    if (ctx.realData) return null;
  }
  return { ...randomAround(ctx.center, dist[0], Math.min(dist[1], 6)), label: tpl.generic ?? pick(GENERIC_SPOTS) };
}

function buildSeed(tpl: SeedTpl, ctx: SeedContext, now: number, used: Set<string>): RdvEvent | null {
  const place = seedPlace(tpl, ctx, used);
  if (!place) return null;
  const local = !!ctx.city;
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
  // Hors ville faite main, on réutilise les modèles de Grenoble qui savent s'adapter (types de lieux).
  const templates = ctx.city ? ctx.city.seeds : GRENOBLE_REGION.seeds.filter((t) => t.spots);
  const out: Record<string, RdvEvent> = {};
  const used = new Set<string>();
  for (const tpl of templates) {
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

const LIVE_TPL: LiveTpl[] = [
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
  if (ctx.city) {
    const city = ctx.city;
    const candidates = city.urbanSpots.map((k) => city.places[k]);
    const near = candidates.filter((p) => distanceKm(ctx.center, p) < maxKm);
    const base = pick(near.length ? near : candidates);
    return { ...jitter(base, 70), label: base.label };
  }
  if (ctx.pool) {
    const p = pickFromPool(ctx.pool, spots, ctx.center, [0, maxKm]);
    if (p) return { ...jitter(p, 40), label: p.label };
  }
  return { ...randomAround(ctx.center, 0.2, Math.min(maxKm, 2.5)), label: pick(GENERIC_SPOTS) };
}

/** Un habitant fictif lance un live près de l'utilisateur. */
export function makeLiveEvent(ctx: SeedContext, now: number): RdvEvent {
  const tpl = pick([...LIVE_TPL, ...(regionAround(ctx.center)?.extraLives ?? [])]);
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
