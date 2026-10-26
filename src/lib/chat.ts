import type { ChatMessage, RdvEvent } from '../types';
import { firstNameOf } from './people';
import { chance, pick, randInt, shuffle, uid } from './random';
import { timing } from './status';
import { MIN, fmtDay, fmtTime } from './time';
import { normalize } from './text';

/**
 * Discussion d'un RDV (simulée) : messages de départ, réponses aux questions,
 * et petits messages spontanés des participants.
 */

const msg = (from: string, text: string, at: number): ChatMessage => ({ id: uid('c'), from, text, at });

/** Qui peut parler dans la discussion (hors toi). */
export const chatMembers = (e: RdvEvent) =>
  [e.organizerId, ...e.participants].filter((id, i, arr) => id !== 'me' && arr.indexOf(id) === i);

export const unreadCount = (e: RdvEvent) =>
  (e.chat ?? []).filter((m) => m.from !== 'me' && m.at > (e.chatReadAt ?? 0)).length;

const BRING: Record<string, string> = {
  sport: 'Une gourde et des baskets, c’est tout ! J’ai le ballon / le matos.',
  jeux: 'Juste ta bonne humeur 😄 J’ai les jeux. Si tu as un jeu préféré, ramène-le !',
  musique: 'Ton instrument si tu en joues, sinon ta voix 🎶',
  culture: 'Rien de spécial, prévois juste de bonnes chaussures pour marcher.',
  nature: 'De bonnes chaussures, de l’eau, un coupe-vent et de quoi grignoter 🥾',
  food: 'Un plat ou une boisson à partager, ce que tu veux !',
  bienetre: 'Un tapis si tu en as un, sinon une serviette fait l’affaire 🙏',
  autre: 'Rien de spécial, viens comme tu es !',
};

const AMBIENT = [
  'Hâte d’y être ! 😄',
  'Quelqu’un y va en vélo ? On peut faire le trajet ensemble 🚲',
  'J’amène de quoi grignoter 🍪',
  'Je serai peut-être 5 min en retard, commencez sans moi !',
  'Première fois pour moi, j’ai trop hâte',
  'Il paraît qu’il va faire beau 🌤️',
  'Je ramène un pote, il s’inscrit sur l’app 👍',
  'Super idée ce RDV, merci l’orga !',
  'On se retrouve où exactement ? Je ne connais pas bien le coin',
  'J’ai mis un bonnet rouge, vous me reconnaîtrez 😅',
];

const GREETINGS = ['Salut tout le monde 👋', 'Coucou ! Ravi·e de vous rejoindre', 'Hello ! Content·e d’être de la partie 😊'];

/** Quelques messages déjà échangés avant ton arrivée. */
export function initialChat(e: RdvEvent, now: number): ChatMessage[] {
  const others = e.participants.filter((p) => p !== 'me');
  if (e.organizerId === 'me' || !others.length || chance(0.25)) return [];
  const t = timing(e, now);
  const out: ChatMessage[] = [];
  let at = now - randInt(60, 600) * MIN;
  // « demain », « samedi »… par rapport au moment où le message a été écrit.
  const when = Number.isFinite(t.start) && t.start > now ? `${fmtDay(t.start, at).toLowerCase()} à ${fmtTime(t.start)}` : 'tout à l’heure';
  out.push(msg(e.organizerId, `Bienvenue à tous ! RDV ${when}, ${e.place.label} 🙌`, at));
  for (const p of shuffle(others).slice(0, randInt(1, 3))) {
    at += randInt(5, 90) * MIN;
    if (at > now) break;
    out.push(msg(p, pick([...GREETINGS, ...AMBIENT]), at));
  }
  return out;
}

/** Réponse simulée à un message : qui répond, et quoi. */
export function replyTo(text: string, e: RdvEvent, now: number, meName: string): { from: string; text: string } | null {
  const members = chatMembers(e);
  if (!members.length) return null;
  const q = normalize(text);
  const has = (...words: string[]) => words.some((w) => q.includes(w));
  const t = timing(e, now);
  const time = Number.isFinite(t.start) ? fmtTime(t.start) : '';
  // Les questions pratiques vont à l'orga (ou, si c'est toi l'orga, à un participant).
  const orga = e.organizerId !== 'me' ? e.organizerId : pick(members);
  const anyone = pick(members);

  if (has('heure', 'quand', 'horaire', 'retard', 'commence', 'debut'))
    return { from: orga, text: `On démarre à ${time}, mais pas de stress si tu as 5 min de retard 😉` };
  if (has('ou ', 'ou?', 'adresse', 'trouver', 'endroit', 'lieu', 'retrouve', 'exactement'))
    return { from: orga, text: `${e.place.label} ! Je serai à l’entrée, je vous fais signe 👋` };
  if (has('apporter', 'amener', 'ramener', 'prendre', 'materiel', 'matos', 'prevoir'))
    return { from: orga, text: BRING[e.category] ?? BRING.autre };
  if (has('niveau', 'debutant', 'jamais', 'nul', 'regles'))
    return { from: orga, text: 'Aucun niveau requis, on est là pour s’amuser ! On t’expliquera tout 🙂' };
  if (has('pluie', 'pleut', 'meteo', 'froid', 'neige'))
    return { from: orga, text: 'S’il fait vraiment mauvais, on décale : je vous préviens ici 🌧️' };
  if (has('parking', 'garer', 'voiture', 'velo', 'metro', 'tram', 'bus', 'transport'))
    return { from: anyone, text: 'Il y a de la place pour se garer pas loin, et les transports passent juste à côté 🚋' };
  if (has('ami', 'pote', 'copain', 'copine', 'accompagn', '+1'))
    return { from: orga, text: 'Plus on est de fous ! Dis-lui de s’inscrire sur l’app pour qu’on ait le bon compte 🙂' };
  if (has('annul', 'desist', 'peux pas', 'pourrai pas'))
    return { from: orga, text: 'Pas de souci, pense juste à te désinscrire pour libérer ta place 🙏' };
  if (has('merci'))
    return { from: anyone, text: pick(['Avec plaisir ! 🙌', 'De rien 😊', 'Merci à toi !']) };
  if (has('salut', 'bonjour', 'hello', 'coucou', 'bonsoir', 'hey'))
    return { from: anyone, text: `Salut ${meName} ! Bienvenue dans le groupe 👋` };
  if (q.includes('?'))
    return { from: orga, text: 'Bonne question ! On en parle sur place, mais je pense que oui 😄' };
  return { from: anyone, text: pick(['Trop bien 😄', 'Hâte d’y être !', 'Top 👍', 'Carrément !', 'On va bien s’amuser 🎉']) };
}

/** Message spontané d'un participant. */
export function ambientMessage(e: RdvEvent): { from: string; text: string } | null {
  const members = chatMembers(e);
  if (!members.length) return null;
  return { from: pick(members), text: pick(AMBIENT) };
}

export const greeting = () => pick(GREETINGS);

export const senderName = (id: string, meName: string) => (id === 'me' ? meName : firstNameOf(id));
