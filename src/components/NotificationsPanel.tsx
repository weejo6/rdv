import { useEffect, useRef } from 'react';
import {
  Bell,
  BellRing,
  CircleCheck,
  CircleX,
  Clock,
  Flag,
  Info,
  MessageCircle,
  PartyPopper,
  Radio,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { Notif, NotifKind } from '../types';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { fmtRelative } from '../lib/time';
import { Avatar, EmptyState, PanelHeader, cssVars } from './ui';

const ICONS: Record<NotifKind, { icon: LucideIcon; color: string }> = {
  join: { icon: UserPlus, color: '#2563EB' },
  leave: { icon: UserMinus, color: '#D97706' },
  full: { icon: PartyPopper, color: '#16A34A' },
  cancel: { icon: CircleX, color: '#DC2626' },
  confirm: { icon: BellRing, color: '#FF5A36' },
  live: { icon: Radio, color: '#16A34A' },
  reminder: { icon: Clock, color: '#7C3AED' },
  message: { icon: MessageCircle, color: '#2563EB' },
  info: { icon: Info, color: '#64748B' },
  ended: { icon: Flag, color: '#64748B' },
  success: { icon: CircleCheck, color: '#16A34A' },
};

export function NotificationsPanel() {
  const notifs = useStore((s) => s.notifs);
  const markAllRead = useStore((s) => s.markAllRead);
  // On garde en mémoire les notifications non lues à l'ouverture pour les surligner.
  const freshIds = useRef<Set<string>>(new Set(notifs.filter((n) => !n.read).map((n) => n.id)));

  useEffect(() => {
    const t = setTimeout(markAllRead, 800);
    return () => clearTimeout(t);
  }, [notifs.length, markAllRead]);

  useEffect(() => {
    notifs.forEach((n) => !n.read && freshIds.current.add(n.id));
  }, [notifs]);

  const pending = notifs.filter((n) => n.kind === 'confirm').length;

  return (
    <>
      <PanelHeader
        title="Notifications"
        subtitle={pending ? 'Confirmations, inscriptions, lives à proximité…' : 'Activité autour de tes RDV'}
        icon={<Bell size={18} />}
      />
      <div className="drawer__scroll">
        {notifs.length === 0 ? (
          <EmptyState emoji="🔔" title="Rien de neuf pour l'instant" />
        ) : (
          notifs.map((n) => <NotifItem key={n.id} n={n} fresh={freshIds.current.has(n.id)} />)
        )}
      </div>
    </>
  );
}

function NotifItem({ n, fresh }: { n: Notif; fresh: boolean }) {
  const now = useNow((s) => s.now);
  const select = useStore((s) => s.select);
  const respondConfirm = useStore((s) => s.respondConfirm);
  const event = useStore((s) => (n.eventId ? s.events[n.eventId] : undefined));
  const { icon: Icon, color } = ICONS[n.kind];

  const confirmState = n.confirm && event ? event.occ[n.confirm.occKey]?.[n.confirm.stage] : undefined;
  const cancelled = !!event?.cancelled || (n.confirm && event?.occ[n.confirm.occKey]?.cancelled);

  return (
    <div
      className={`notif${fresh ? ' is-new' : ''}${event ? ' is-link' : ''}`}
      style={cssVars({ '--c': color })}
      onClick={() => event && select(event.id, { fly: true })}
    >
      {n.personId ? (
        <span className="notif__avatar">
          <Avatar id={n.personId} size={38} />
          <span className="notif__mini">
            <Icon size={11} />
          </span>
        </span>
      ) : (
        <span className="notif__icon">
          <Icon size={18} />
        </span>
      )}
      <div className="notif__text">
        <div className="notif__title">{n.title}</div>
        {n.body && <div className="notif__body">{n.body}</div>}
        {n.confirm && (
          <div className="notif__actions" onClick={(ev) => ev.stopPropagation()}>
            {confirmState === 'pending' && !cancelled ? (
              <>
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  style={cssVars({ '--c': 'var(--live)' })}
                  onClick={() => respondConfirm(n.confirm!.eventId, n.confirm!.occKey, n.confirm!.stage, true)}
                >
                  Oui, je confirme
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--danger"
                  onClick={() => respondConfirm(n.confirm!.eventId, n.confirm!.occKey, n.confirm!.stage, false)}
                >
                  Non, annuler
                </button>
              </>
            ) : (
              <span className={`pill ${confirmState === 'yes' ? 'pill--live' : 'pill--danger'}`}>
                {confirmState === 'yes'
                  ? 'Confirmé ✓'
                  : confirmState === 'no'
                    ? 'Refusé · RDV annulé'
                    : confirmState === 'expired'
                      ? 'Sans réponse · RDV annulé'
                      : 'RDV annulé'}
              </span>
            )}
          </div>
        )}
        <div className="notif__time">{fmtRelative(n.at, now)}</div>
      </div>
    </div>
  );
}
