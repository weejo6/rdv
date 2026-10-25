import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import type { EventKind, MediaItem, RdvEvent } from '../types';
import { useStore } from '../store/store';
import { getPerson } from '../lib/people';
import { KINDS } from '../lib/categories';
import { displayKind, isFull, isJoined, isMine, phaseOf, remainingSpots, timing } from '../lib/status';
import { whenShort } from '../lib/format';
import { distanceKm, fmtDistance } from '../lib/geo';
import { plural } from '../lib/text';

export const cssVars = (vars: Record<string, string>) => vars as CSSProperties;

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="rdv-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7A50" />
          <stop offset="1" stopColor="#F0401C" />
        </linearGradient>
      </defs>
      <path d="M32 3C19.3 3 9 13.1 9 25.6 9 42.4 32 61 32 61s23-18.6 23-35.4C55 13.1 44.7 3 32 3z" fill="url(#rdv-logo)" />
      <circle cx="24.5" cy="25" r="6" fill="#fff" />
      <circle cx="39.5" cy="25" r="6" fill="#fff" fillOpacity=".75" />
    </svg>
  );
}

export function Avatar({ id, size = 32 }: { id: string; size?: number }) {
  const meName = useStore((s) => s.me.name);
  const isMe = id === 'me';
  const p = isMe ? undefined : getPerson(id);
  const name = isMe ? meName : p?.firstName ?? '?';
  const bg = isMe ? 'var(--brand)' : p?.color ?? '#94A3B8';
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.42) }}
      title={isMe ? `${meName} (toi)` : p ? `${p.firstName} ${p.initial}.` : undefined}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AvatarStack({ ids, max = 4, size = 26 }: { ids: string[]; max?: number; size?: number }) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map((id) => (
        <Avatar key={id} id={id} size={size} />
      ))}
      {extra > 0 && (
        <span className="avatar avatar--more" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  right,
  onBack,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const closeDrawer = useStore((s) => s.closeDrawer);
  return (
    <header className="panel-head">
      {onBack && (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
      )}
      {icon && <span className="panel-head__icon">{icon}</span>}
      <div className="panel-head__text">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
      <button type="button" className="icon-btn" onClick={closeDrawer} aria-label="Fermer">
        <X size={20} />
      </button>
    </header>
  );
}

export function KindBadge({ kind, live }: { kind: EventKind; live?: boolean }) {
  return (
    <span className={`kind-badge${live ? ' is-live' : ''}`} style={cssVars({ '--c': KINDS[kind].color })}>
      {live ? 'EN DIRECT' : KINDS[kind].label}
    </span>
  );
}

/** Pastille d'état pour les listes. */
export function StatusPill({ e, now }: { e: RdvEvent; now: number }) {
  const ph = phaseOf(e, now);
  if (ph === 'cancelled') return <span className="pill pill--danger">Annulé</span>;
  if (ph === 'ended') return <span className="pill">Terminé</span>;
  if (isFull(e)) return <span className="pill pill--dark">Complet</span>;
  if (isMine(e)) {
    const occ = e.occ[String(timing(e, now).start)];
    if (occ?.j1 === 'pending' || occ?.h1 === 'pending') return <span className="pill pill--brand">À confirmer</span>;
  }
  if (ph === 'live') return <span className="pill pill--live">En direct</span>;
  return null;
}

export function EventCard({ e, now, onClick }: { e: RdvEvent; now: number; onClick: () => void }) {
  const myPos = useStore((s) => s.myPos);
  const kind = displayKind(e, now);
  const rem = remainingSpots(e);
  const ph = phaseOf(e, now);
  const active = ph === 'upcoming' || ph === 'live';
  return (
    <button
      type="button"
      className={`ecard${active ? '' : ' is-muted'}`}
      onClick={onClick}
      style={cssVars({ '--c': KINDS[kind].color, '--soft': KINDS[kind].soft })}
    >
      <span className={`ecard__emoji${kind === 'live' && active ? ' is-live' : ''}`}>{e.emoji}</span>
      <span className="ecard__body">
        <span className="ecard__title">{e.title}</span>
        <span className="ecard__meta">{whenShort(e, now)}</span>
        <span className="ecard__meta">
          {fmtDistance(distanceKm(myPos, e.place))} · {e.place.label}
        </span>
      </span>
      <span className="ecard__side">
        <StatusPill e={e} now={now} />
        {active && !isFull(e) && <span className="ecard__spots">{plural(rem, 'place', 'places')}</span>}
        {isMine(e) && <span className="ecard__tag">Organisé</span>}
        {!isMine(e) && isJoined(e) && <span className="ecard__tag">Inscrit</span>}
      </span>
    </button>
  );
}

export function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function MediaView({ m, className }: { m: MediaItem; className?: string }) {
  const url = useObjectUrl(m.blob);
  if (!url) return <div className={className} />;
  return m.kind === 'video' ? (
    <video src={url} className={className} controls playsInline preload="metadata" />
  ) : (
    <img src={url} alt={m.name} className={className} />
  );
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__emoji">{emoji}</span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
