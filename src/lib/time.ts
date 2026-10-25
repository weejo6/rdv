import type { Recurrence } from '../types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/**
 * Horloge simulée : la démo peut avancer dans le temps (+1 h, +1 jour…)
 * ou accélérer, pour montrer les confirmations, les passages en live, etc.
 */
export interface Clock {
  anchorReal: number;
  anchorSim: number;
  speed: number;
}

export const simNow = (c: Clock, real = Date.now()) => c.anchorSim + (real - c.anchorReal) * c.speed;

const WD_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const WD_PLURAL = ['dimanches', 'lundis', 'mardis', 'mercredis', 'jeudis', 'vendredis', 'samedis'];
export const WD_ABBR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const WD_LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
/** Ordre d'affichage : la semaine commence le lundi. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** « Aujourd'hui », « Demain », « Samedi », « Dim. 3 nov. » */
export function fmtDay(ts: number, now: number) {
  const diff = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  if (diff > 1 && diff < 7) return capitalize(WD_LONG[new Date(ts).getDay()]);
  return capitalize(new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(ts));
}

export function fmtFullDate(ts: number) {
  return capitalize(
    new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(ts),
  );
}

/** « dans 5 min », « il y a 2 h », « dans 3 j » */
export function fmtRelative(ts: number, now: number) {
  const d = ts - now;
  const a = Math.abs(d);
  if (a < MIN) return d >= 0 ? 'dans un instant' : "à l'instant";
  let s: string;
  if (a < HOUR) s = `${Math.round(a / MIN)} min`;
  else if (a < DAY) {
    const h = Math.floor(a / HOUR);
    const m = Math.round((a % HOUR) / MIN);
    s = m && h < 4 ? `${h} h ${pad(m)}` : `${Math.round(a / HOUR)} h`;
  } else s = `${Math.round(a / DAY)} j`;
  return d >= 0 ? `dans ${s}` : `il y a ${s}`;
}

export function fmtDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${pad(m)}` : `${h} h`;
}

/** Écart entre l'heure simulée et l'heure réelle : « +1 j 2 h ». */
export function fmtOffset(ms: number) {
  const sign = ms < 0 ? '−' : '+';
  let a = Math.round(Math.abs(ms) / MIN) * MIN;
  const d = Math.floor(a / DAY);
  a -= d * DAY;
  const h = Math.floor(a / HOUR);
  a -= h * HOUR;
  const m = Math.floor(a / MIN);
  const parts = [d && `${d} j`, h && `${h} h`, m && `${m} min`].filter(Boolean);
  return parts.length ? `${sign}${parts.join(' ')}` : 'temps réel';
}

/** « Tous les dimanches », « Tous les mardis et jeudis », « En semaine »… */
export function fmtWeekdays(days: number[]) {
  const sorted = WEEK_ORDER.filter((d) => days.includes(d));
  if (sorted.length === 7) return 'Tous les jours';
  if (sorted.length === 5 && !days.includes(0) && !days.includes(6)) return 'Tous les jours de la semaine';
  if (sorted.length === 2 && days.includes(0) && days.includes(6)) return 'Tous les week-ends';
  const names = sorted.map((d) => WD_PLURAL[d]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}` : names[0];
  return `Tous les ${list}`;
}

export const fmtHour = (time: string) => time.replace(':', 'h');

/**
 * Début de la séance en cours ou de la prochaine séance d'un événement régulier.
 * `skip` permet d'ignorer les séances annulées.
 * Renvoie `Infinity` s'il n'y a plus aucune séance (valeur stable, traitée comme « terminé »).
 */
export function occurrenceFor(
  rec: Recurrence,
  durationMin: number,
  now: number,
  skip?: (start: number) => boolean,
): number {
  const [h, m] = rec.time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Infinity;
  for (let d = -1; d <= 400; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setHours(h, m, 0, 0);
    if (!rec.weekdays.includes(day.getDay())) continue;
    const start = day.getTime();
    if (start + durationMin * MIN <= now) continue;
    if (skip?.(start)) continue;
    return start;
  }
  return Infinity;
}

export const isValidTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

export function toDateInput(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
