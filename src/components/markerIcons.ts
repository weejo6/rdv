import L from 'leaflet';
import type { EventKind } from '../types';

const cache = new Map<string, L.DivIcon>();

/** Épingle colorée par type (bleu / violet / vert), avec l'emoji et le nombre de places restantes. */
export function eventIcon(opts: {
  kind: EventKind;
  emoji: string;
  remaining: number;
  selected: boolean;
  leaving: boolean;
  mine: boolean;
}): L.DivIcon {
  const key = `${opts.kind}|${opts.emoji}|${opts.remaining}|${opts.selected}|${opts.leaving}|${opts.mine}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cls = [
    'pin',
    `pin--${opts.kind}`,
    opts.selected && 'is-selected',
    opts.leaving && 'is-leaving',
    opts.mine && 'is-mine',
  ]
    .filter(Boolean)
    .join(' ');
  const badge = opts.leaving ? '✓' : String(opts.remaining);
  const html = `
    <div class="${cls}">
      ${opts.kind === 'live' ? '<span class="pin__ripple"></span>' : ''}
      <div class="pin__body">
        <div class="pin__shape"><span class="pin__emoji">${opts.emoji}</span></div>
        <span class="pin__badge">${badge}</span>
      </div>
    </div>`;
  const icon = L.divIcon({ html, className: 'pin-wrap', iconSize: [44, 52], iconAnchor: [22, 47] });
  cache.set(key, icon);
  return icon;
}

export const meIcon = L.divIcon({
  html: '<div class="me-marker"><span class="me-marker__pulse"></span><span class="me-marker__dot"></span></div>',
  className: 'me-wrap',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const pickerCache = new Map<string, L.DivIcon>();

export function pickerIcon(color: string, emoji: string): L.DivIcon {
  const key = `${color}|${emoji}`;
  const hit = pickerCache.get(key);
  if (hit) return hit;
  const icon = L.divIcon({
    html: `<div class="pin pin--picker" style="--c:${color}"><div class="pin__body"><div class="pin__shape"><span class="pin__emoji">${emoji}</span></div></div></div>`,
    className: 'pin-wrap',
    iconSize: [44, 52],
    iconAnchor: [22, 47],
  });
  pickerCache.set(key, icon);
  return icon;
}
