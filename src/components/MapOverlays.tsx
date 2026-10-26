import { useEffect } from 'react';
import {
  CircleCheck,
  CircleX,
  Clapperboard,
  Info,
  LoaderCircle,
  LocateFixed,
  Minus,
  Plus,
  Radio,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react';
import type { Toast } from '../store/store';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { KINDS } from '../lib/categories';
import { MIN, fmtTime } from '../lib/time';
import { mapRef } from './MapView';
import { cssVars } from './ui';

/** Bouton « Créer un RDV » et contrôles de carte (zoom, recentrage). */
export function MapControls() {
  const openCreate = useStore((s) => s.openCreate);
  const flyTo = useStore((s) => s.flyTo);
  const myPos = useStore((s) => s.myPos);
  return (
    <>
      <div className="controls">
        <div className="ctrl-group ctrl-group--zoom">
          <button type="button" className="ctrl" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoomer">
            <Plus size={20} />
          </button>
          <button type="button" className="ctrl" onClick={() => mapRef.current?.zoomOut()} aria-label="Dézoomer">
            <Minus size={20} />
          </button>
        </div>
        <button type="button" className="ctrl" onClick={() => flyTo(myPos, 15)} aria-label="Recentrer sur moi" title="Recentrer sur moi">
          <LocateFixed size={20} />
        </button>
      </div>
      <button type="button" className="fab" onClick={() => openCreate()}>
        <Plus size={22} strokeWidth={2.6} />
        <span>Créer un RDV</span>
      </button>
    </>
  );
}

/** Légende des couleurs + accès au mode démo + horloge simulée. */
export function Legend() {
  const togglePanel = useStore((s) => s.togglePanel);
  const panel = useStore((s) => s.panel);
  const speed = useStore((s) => s.clock.speed);
  const resetClock = useStore((s) => s.resetClock);
  const now = useNow((s) => s.now);
  const shifted = Math.abs(now - Date.now()) > MIN || speed !== 1;
  return (
    <div className="legend">
      {shifted && (
        <button type="button" className="sim-clock" onClick={resetClock} title="Revenir à l'heure réelle">
          <Zap size={14} /> Heure simulée : {new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(now)} {fmtTime(now)}
          {speed !== 1 && ` · x${speed}`}
          <X size={14} />
        </button>
      )}
      <div className="legend__card">
        {(['event', 'regular', 'live'] as const).map((k) => (
          <span key={k} className="legend__item" style={cssVars({ '--c': KINDS[k].color })}>
            <i className={`legend__dot${k === 'live' ? ' is-live' : ''}`} />
            {KINDS[k].label}
          </span>
        ))}
        <button
          type="button"
          className={`legend__demo${panel === 'demo' ? ' is-on' : ''}`}
          onClick={() => togglePanel('demo')}
          title="Mode démo : avancer le temps, simuler des habitants"
        >
          <Clapperboard size={14} /> <span className="legend__demo-label">Démo</span>
        </button>
      </div>
    </div>
  );
}

const TOAST_ICONS = {
  success: CircleCheck,
  info: Info,
  warn: TriangleAlert,
  danger: CircleX,
  live: Radio,
  brand: Zap,
};

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const seeding = useStore((s) => s.seeding);
  return (
    <div className="toasts" aria-live="polite">
      {seeding && (
        <div className="toast toast--info toast--loading" role="status">
          <span className="toast__icon">
            <LoaderCircle size={18} className="spin" />
          </span>
          <div className="toast__text">
            <strong>Recherche des RDV autour de toi…</strong>
            <span>Localisation et repérage des lieux du quartier</span>
          </div>
        </div>
      )}
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useStore((s) => s.dismissToast);
  const select = useStore((s) => s.select);
  const openChat = useStore((s) => s.openChat);
  const exists = useStore((s) => (t.eventId ? !!s.events[t.eventId] : false));
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), 6000);
    return () => clearTimeout(id);
  }, [t.id, dismiss]);
  const Icon = TOAST_ICONS[t.tone];
  return (
    <div className={`toast toast--${t.tone}`} role="status">
      <span className="toast__icon">
        <Icon size={18} />
      </span>
      <div className="toast__text">
        <strong>{t.title}</strong>
        {t.body && <span>{t.body}</span>}
      </div>
      {t.eventId && exists && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            select(t.eventId!, { fly: true });
            if (t.chat) openChat(t.eventId!);
            dismiss(t.id);
          }}
        >
          {t.chat ? 'Répondre' : 'Voir'}
        </button>
      )}
      <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Fermer">
        <X size={16} />
      </button>
    </div>
  );
}
