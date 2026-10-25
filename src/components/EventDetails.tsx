import { useEffect, useState } from 'react';
import {
  Ban,
  BellRing,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleAlert,
  MapPin,
  Navigation,
  PartyPopper,
  Radio,
  ShieldCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { CATEGORIES, KINDS } from '../lib/categories';
import { whenLong } from '../lib/format';
import { directionsUrl, distanceKm, fmtDistance } from '../lib/geo';
import { fullNameOf } from '../lib/people';
import { displayKind, isFull, isJoined, isMine, phaseOf, remainingSpots, takenCount, timing } from '../lib/status';
import { plural } from '../lib/text';
import { fmtDay, fmtTime } from '../lib/time';
import { Avatar, KindBadge, MediaView, cssVars } from './ui';

type Confirming = null | 'leave' | 'cancel' | 'cancel-series';

export function EventDetails({ id }: { id: string }) {
  const e = useStore((s) => s.events[id]);
  const now = useNow((s) => s.now);
  const myPos = useStore((s) => s.myPos);
  const meName = useStore((s) => s.me.name);
  const panel = useStore((s) => s.panel);
  const select = useStore((s) => s.select);
  const closeDrawer = useStore((s) => s.closeDrawer);
  const join = useStore((s) => s.join);
  const leave = useStore((s) => s.leave);
  const cancelEvent = useStore((s) => s.cancelEvent);
  const respondConfirm = useStore((s) => s.respondConfirm);
  const [confirming, setConfirming] = useState<Confirming>(null);

  useEffect(() => setConfirming(null), [id]);

  if (!e) {
    return (
      <div className="details">
        <div className="details__body">
          <p className="muted">Ce RDV n'existe plus.</p>
          <button type="button" className="btn btn--ghost" onClick={closeDrawer}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  const t = timing(e, now);
  const ph = phaseOf(e, now);
  const kind = displayKind(e, now);
  const mine = isMine(e);
  const joined = isJoined(e);
  const full = isFull(e);
  const rem = remainingSpots(e);
  const taken = takenCount(e);
  const active = ph === 'upcoming' || ph === 'live';
  const cat = CATEGORIES[e.category];
  const when = whenLong(e, now);
  const occKey = String(t.start);
  const occ = e.occ[occKey];
  const pendingStage = mine && active ? (occ?.h1 === 'pending' ? 'h1' : occ?.j1 === 'pending' ? 'j1' : null) : null;
  const color = KINDS[kind].color;
  const nextLabel = Number.isFinite(t.start) ? `${fmtDay(t.start, now).toLowerCase()} ${fmtTime(t.start)}` : '';
  const otherPresent = Math.max(0, e.alreadyPresent - 1);

  return (
    <div className="details" style={cssVars({ '--c': color, '--soft': KINDS[kind].soft })}>
      <div className="drawer__scroll">
        <div
          className={`cover${e.media.length ? ' cover--media' : ''}`}
          style={{ background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}
        >
          {e.media.length ? (
            <div className="gallery">
              {e.media.map((m) => (
                <MediaView key={m.id} m={m} className="gallery__item" />
              ))}
            </div>
          ) : (
            <span className="cover__emoji">{e.emoji}</span>
          )}
          <div className="cover__nav">
            {panel ? (
              <button type="button" className="round-btn" onClick={() => select(null)} aria-label="Retour">
                <ChevronLeft size={20} />
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="round-btn" onClick={closeDrawer} aria-label="Fermer">
              <X size={20} />
            </button>
          </div>
          <div className="cover__badges">
            <KindBadge kind={kind} live={ph === 'live'} />
            {ph === 'live' && e.kind !== 'live' && <span className="glass-badge">{KINDS[e.kind].label}</span>}
          </div>
        </div>

        <div className="details__body">
          <div className="details__cat">
            {e.emoji} {cat.label}
          </div>
          <h2 className="details__title">{e.title}</h2>
          <div className="details__org">
            <Avatar id={e.organizerId} size={24} />
            <span>
              Organisé par <b>{mine ? `toi (${meName})` : fullNameOf(e.organizerId)}</b>
            </span>
          </div>

          {ph === 'cancelled' && (
            <div className="banner banner--danger">
              <Ban size={18} />
              <div>
                <b>Événement annulé</b>
                <span>
                  {e.cancelled?.reason === 'no-response'
                    ? "L'organisateur n'a pas répondu à la demande de confirmation."
                    : e.cancelled?.reason === 'declined'
                      ? "L'organisateur a indiqué ne pas pouvoir l'assurer."
                      : e.cancelled?.reason === 'organizer'
                        ? "L'organisateur n'a pas confirmé sa présence."
                        : "Annulé par l'organisateur. Les participants ont été prévenus."}
                </span>
              </div>
            </div>
          )}
          {ph === 'ended' && (
            <div className="banner banner--muted">
              <Check size={18} />
              <div>
                <b>Événement terminé</b>
                <span>Il n'apparaît plus sur la carte.</span>
              </div>
            </div>
          )}
          {active && full && (
            <div className="banner banner--dark">
              <PartyPopper size={18} />
              <div>
                <b>Complet !</b>
                <span>Il a disparu de la carte : plus personne ne peut s'inscrire.</span>
              </div>
            </div>
          )}
          {ph === 'live' && !full && (
            <div className="banner banner--live">
              <Radio size={18} />
              <div>
                <b>{e.kind === 'live' ? 'Live en cours' : 'Ça a commencé : ce RDV est passé en live'}</b>
                <span>{rem > 0 ? `Il manque encore ${plural(rem, 'personne')}, fonce !` : ''}</span>
              </div>
            </div>
          )}

          {pendingStage && (
            <div className="confirm-card">
              <BellRing size={20} />
              <div>
                <b>Confirmes-tu ton RDV ?</b>
                <span>
                  {pendingStage === 'j1' ? 'Demande envoyée 24 h avant.' : 'Dernière demande, 1 h avant.'} Sans réponse, il
                  sera annulé automatiquement.
                </span>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn--sm btn--primary"
                    style={cssVars({ '--c': 'var(--live)' })}
                    onClick={() => respondConfirm(e.id, occKey, pendingStage, true)}
                  >
                    <Check size={16} /> Je confirme
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => respondConfirm(e.id, occKey, pendingStage, false)}
                  >
                    Annuler le RDV
                  </button>
                </div>
              </div>
            </div>
          )}

          <ul className="info">
            <li>
              <span className="info__icon">
                <CalendarDays size={18} />
              </span>
              <div>
                <b>{when.line}</b>
                <span>{when.sub}</span>
              </div>
            </li>
            <li>
              <span className="info__icon">
                <MapPin size={18} />
              </span>
              <div>
                <b>{e.place.label}</b>
                <span>
                  à {fmtDistance(distanceKm(myPos, e.place))} de toi ·{' '}
                  <a href={directionsUrl(e.place)} target="_blank" rel="noreferrer" className="link">
                    <Navigation size={12} /> Itinéraire
                  </a>
                </span>
              </div>
            </li>
            <li>
              <span className="info__icon">
                <Users size={18} />
              </span>
              <div className="grow">
                <b>
                  {taken} / {e.capacity} personnes
                </b>
                <span>{full ? 'Complet' : `Il reste ${plural(rem, 'place', 'places')}`}</span>
                <div className="progress">
                  <i style={{ width: `${Math.min(100, (taken / e.capacity) * 100)}%` }} />
                </div>
              </div>
            </li>
          </ul>

          {mine && e.kind !== 'live' && active && (
            <div className="auto-cancel">
              <ShieldCheck size={16} />
              <span>
                Annulation automatique : une confirmation te sera demandée 24 h puis 1 h avant
                {e.kind === 'regular' ? ' chaque séance' : ''}. Statut :{' '}
                <b>J-1 {stateLabel(occ?.j1)}</b> · <b>H-1 {stateLabel(occ?.h1)}</b>
              </span>
            </div>
          )}

          <section className="section">
            <h4>
              Participants <span className="count">{taken}</span>
            </h4>
            <div className="people">
              <span className="person person--org">
                <Avatar id={e.organizerId} size={26} />
                {mine ? 'Toi' : fullNameOf(e.organizerId)} <small>orga</small>
              </span>
              {e.participants.map((pid) => (
                <span key={pid} className={`person${pid === 'me' ? ' person--me' : ''}`}>
                  <Avatar id={pid} size={26} />
                  {pid === 'me' ? 'Toi' : fullNameOf(pid)}
                </span>
              ))}
            </div>
            {otherPresent > 0 && (
              <p className="muted small">
                + {plural(otherPresent, 'personne déjà présente', 'personnes déjà présentes')}{' '}
                {mine ? 'avec toi' : "avec l'organisateur"}
              </p>
            )}
          </section>

          {e.description && (
            <section className="section">
              <h4>Description</h4>
              <p className="desc">{e.description}</p>
            </section>
          )}
        </div>
      </div>

      {active && (
        <footer className="details__footer">
          {confirming ? (
            <div className="confirm-row">
              <span>
                <CircleAlert size={16} />
                {confirming === 'leave'
                  ? "L'organisateur et les participants seront prévenus."
                  : confirming === 'cancel-series'
                    ? 'Toutes les séances seront annulées.'
                    : 'Les participants seront prévenus.'}
              </span>
              <div className="row">
                <button type="button" className="btn btn--ghost grow" onClick={() => setConfirming(null)}>
                  Retour
                </button>
                <button
                  type="button"
                  className="btn btn--danger-solid grow"
                  onClick={() => {
                    if (confirming === 'leave') leave(e.id);
                    else cancelEvent(e.id, confirming === 'cancel-series' ? 'series' : 'occurrence');
                    setConfirming(null);
                  }}
                >
                  {confirming === 'leave' ? 'Me désinscrire' : 'Confirmer l’annulation'}
                </button>
              </div>
            </div>
          ) : mine ? (
            e.kind === 'regular' ? (
              <div className="row">
                <button type="button" className="btn btn--danger grow" onClick={() => setConfirming('cancel')}>
                  Annuler la séance ({nextLabel})
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setConfirming('cancel-series')}>
                  Supprimer la série
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn--danger btn--block" onClick={() => setConfirming('cancel')}>
                <Ban size={18} /> Annuler l'événement
              </button>
            )
          ) : joined ? (
            <div className="row">
              <span className="joined-chip grow">
                <Check size={18} /> Tu participes
              </span>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirming('leave')}>
                <UserMinus size={18} /> Me désinscrire
              </button>
            </div>
          ) : full ? (
            <button type="button" className="btn btn--block" disabled>
              Complet
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => join(e.id)}>
              {ph === 'live' ? 'Je viens maintenant !' : 'Je participe'}
              <span className="btn__sub">{plural(rem, 'place restante', 'places restantes')}</span>
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

function stateLabel(s?: string) {
  switch (s) {
    case 'pending':
      return '⏳ en attente';
    case 'yes':
      return '✅ confirmée';
    case 'no':
      return '❌ refusée';
    case 'expired':
      return '⌛ expirée';
    default:
      return '— à venir';
  }
}
