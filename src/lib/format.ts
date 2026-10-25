import type { RdvEvent } from '../types';
import { phaseOf, timing } from './status';
import { fmtDay, fmtDuration, fmtHour, fmtRelative, fmtTime, fmtWeekdays } from './time';

/** Résumé d'horaire sur une ligne (listes, cartes). */
export function whenShort(e: RdvEvent, now: number): string {
  const ph = phaseOf(e, now);
  const t = timing(e, now);
  if (ph === 'cancelled') return 'Annulé';
  if (ph === 'ended') return 'Terminé';
  if (ph === 'live') {
    return e.kind === 'live' ? `Live · lancé ${fmtRelative(t.start, now)}` : `En direct · jusqu'à ${fmtTime(t.end)}`;
  }
  const day = `${fmtDay(t.start, now)} · ${fmtTime(t.start)}`;
  return e.kind === 'regular' ? `${day} · chaque semaine` : day;
}

/** Horaire détaillé (fiche événement). */
export function whenLong(e: RdvEvent, now: number): { line: string; sub: string } {
  const ph = phaseOf(e, now);
  const t = timing(e, now);
  const range = `${fmtTime(t.start)} – ${fmtTime(t.end)}`;

  if (e.kind === 'live') {
    const line = `Lancé ${fmtRelative(t.start, now)}`;
    if (ph === 'cancelled') return { line, sub: 'Annulé' };
    if (ph === 'ended') return { line, sub: `Terminé à ${fmtTime(t.end)}` };
    return { line, sub: `Jusqu'à ${fmtTime(t.end)} · se termine ${fmtRelative(t.end, now)}` };
  }

  if (e.kind === 'regular' && e.recurrence) {
    const line = `${fmtWeekdays(e.recurrence.weekdays)} à ${fmtHour(e.recurrence.time)} (${fmtDuration(e.durationMin)})`;
    if (ph === 'cancelled') return { line, sub: 'Événement régulier annulé' };
    if (ph === 'live') return { line, sub: `Séance en cours · jusqu'à ${fmtTime(t.end)}` };
    return {
      line,
      sub: `Prochaine séance : ${fmtDay(t.start, now).toLowerCase()} à ${fmtTime(t.start)} (${fmtRelative(t.start, now)})`,
    };
  }

  const line = `${fmtDay(t.start, now)} · ${range}`;
  if (ph === 'cancelled') return { line, sub: 'Annulé' };
  if (ph === 'ended') return { line, sub: 'Terminé' };
  if (ph === 'live') return { line, sub: `En direct · se termine ${fmtRelative(t.end, now)}` };
  return { line, sub: `Commence ${fmtRelative(t.start, now)}` };
}
