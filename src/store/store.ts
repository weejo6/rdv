import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CancelReason,
  CategoryId,
  EventKind,
  Filters,
  LatLng,
  MediaItem,
  Notif,
  OccurrenceState,
  Place,
  RdvEvent,
  Recurrence,
} from '../types';
import { CATEGORIES } from '../lib/categories';
import { distanceKm, fmtDistance } from '../lib/geo';
import { PEOPLE, WELCOME_MESSAGES, firstNameOf } from '../lib/people';
import { chance, pick, rand, uid } from '../lib/random';
import {
  DEMO_HOME,
  isNearGrenoble,
  makeLiveEvent,
  makePlannedEvent,
  regularsFor,
  seedWorld,
  welcomeNotifs,
} from '../lib/seed';
import { DEFAULT_FILTERS, matchesFilters } from '../lib/selectors';
import { isActive, isFull, isJoined, isMine, phaseOf, remainingSpots, takenCount, timing } from '../lib/status';
import { plural, quoted } from '../lib/text';
import { DAY, HOUR, MIN, fmtDay, fmtTime, simNow, type Clock } from '../lib/time';
import { useNow } from './now';
import { createIdbStorage } from './persist';

export type Panel = 'list' | 'notifs' | 'mine' | 'demo' | null;
export type ToastTone = 'success' | 'info' | 'warn' | 'danger' | 'live' | 'brand';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
  eventId?: string;
}

export interface FlyTarget extends LatLng {
  zoom?: number;
  /** Sur mobile, décale la cible vers le haut pour qu'elle reste visible au-dessus du panneau. */
  offset?: boolean;
  key: number;
}

export interface CreateDraft {
  kind: EventKind;
  title: string;
  category: CategoryId;
  capacity: number;
  alreadyPresent: number;
  place: Place;
  startAt?: number;
  recurrence?: Recurrence;
  durationMin: number;
  description: string;
  media: MediaItem[];
}

type NotifInput = Omit<Notif, 'id' | 'at' | 'read'>;
type ToastInput = Omit<Toast, 'id'>;

interface PersistedState {
  seededAt: number;
  simOffset: number;
  me: { name: string };
  myPos: Place;
  posMode: 'demo' | 'real';
  geoAsked: boolean;
  introSeen: boolean;
  events: Record<string, RdvEvent>;
  notifs: Notif[];
  simEnabled: boolean;
  filters: Filters;
}

interface UiState {
  hydrated: boolean;
  clock: Clock;
  toasts: Toast[];
  panel: Panel;
  selectedId: string | null;
  createOpen: boolean;
  createPreset: LatLng | null;
  flyTarget: FlyTarget | null;
  locating: boolean;
}

interface Actions {
  afterHydrate: () => void;
  nowSim: () => number;
  tick: () => void;

  // UI
  select: (id: string | null, opts?: { fly?: boolean }) => void;
  togglePanel: (p: Exclude<Panel, null>) => void;
  closeDrawer: () => void;
  openCreate: (preset?: LatLng) => void;
  closeCreate: () => void;
  flyTo: (p: LatLng, zoom?: number, offset?: boolean) => void;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
  toast: (t: ToastInput) => void;
  dismissToast: (id: string) => void;
  markAllRead: () => void;
  setMeName: (name: string) => void;
  dismissIntro: () => void;

  // Événements
  createEvent: (d: CreateDraft) => void;
  join: (id: string) => void;
  leave: (id: string) => void;
  cancelEvent: (id: string, scope?: 'occurrence' | 'series') => void;
  respondConfirm: (id: string, occKey: string, stage: 'j1' | 'h1', yes: boolean) => void;

  // Simulation
  setSimEnabled: (on: boolean) => void;
  simJoin: (targetId?: string) => void;
  simLeave: (force?: boolean) => void;
  spawnLive: (force?: boolean) => void;
  spawnPlanned: () => void;
  jump: (ms: number) => void;
  jumpTo: (ts: number) => void;
  setSpeed: (speed: number) => void;
  resetClock: () => void;
  resetDemo: () => void;

  // Position
  initGeolocation: () => void;
  useRealPosition: () => void;
  useDemoPosition: () => void;
  ensureContentAround: (p: LatLng) => void;
  reseed: (center: LatLng) => void;
}

export type StoreState = PersistedState & UiState & Actions;

const MAX_NOTIFS = 200;

const orgName = (e: RdvEvent) => firstNameOf(e.organizerId, 'toi');

/** Annule une séance (régulier) ou l'événement entier. */
function cancelOccurrence(
  e: RdvEvent,
  key: string,
  occ: OccurrenceState,
  reason: CancelReason,
  now: number,
  scope: 'occurrence' | 'series',
): RdvEvent {
  const sim = e.sim ? { ...e.sim, willCancel: undefined } : undefined;
  if (e.kind === 'regular' && scope === 'occurrence') {
    return { ...e, sim, occ: { ...e.occ, [key]: { ...occ, cancelled: reason } } };
  }
  return { ...e, sim, occ: { ...e.occ, [key]: occ }, cancelled: { at: now, reason } };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      const nowSim = () => simNow(get().clock);

      const patchEvent = (e: RdvEvent) => set((s) => ({ events: { ...s.events, [e.id]: e } }));

      const notify = (items: NotifInput[], at = nowSim()) => {
        if (!items.length) return;
        const list: Notif[] = items.map((n) => ({ ...n, id: uid('n'), at, read: false })).reverse();
        set((s) => ({ notifs: [...list, ...s.notifs].slice(0, MAX_NOTIFS) }));
      };

      const toast = (t: ToastInput) => {
        const id = uid('t');
        set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-4) }));
      };

      /** Après un saut dans le temps, on regarnit la carte (sans notifications). */
      const replenish = () => {
        const s = get();
        const now = nowSim();
        const open = Object.values(s.events).filter(
          (e) => !isMine(e) && isActive(e, now) && !isFull(e) && distanceKm(s.myPos, e.place) < 25,
        );
        const lives = open.filter((e) => e.kind === 'live').length;
        const planned = open.length - lives;
        const added: RdvEvent[] = [];
        for (let i = lives; i < 4; i++) added.push(makeLiveEvent(s.myPos, now));
        for (let i = planned; i < 14; i++) added.push(makePlannedEvent(s.myPos, now));
        if (added.length) set((st) => ({ events: { ...st.events, ...Object.fromEntries(added.map((e) => [e.id, e])) } }));
      };

      const setClock = (clock: Clock) => {
        set({ clock });
        get().tick();
        replenish();
      };

      return {
        // — État sauvegardé —
        seededAt: 0,
        simOffset: 0,
        me: { name: 'Jo' },
        myPos: DEMO_HOME,
        posMode: 'demo',
        geoAsked: false,
        introSeen: false,
        events: {},
        notifs: [],
        simEnabled: true,
        filters: DEFAULT_FILTERS,

        // — État d'interface —
        hydrated: false,
        clock: { anchorReal: Date.now(), anchorSim: Date.now(), speed: 1 },
        toasts: [],
        panel: null,
        selectedId: null,
        createOpen: false,
        createPreset: null,
        flyTarget: null,
        locating: false,

        afterHydrate: () => {
          const s = get();
          const real = Date.now();
          const stale = !s.seededAt || real - s.seededAt > 12 * HOUR || Object.keys(s.events).length === 0;
          set({ clock: { anchorReal: real, anchorSim: stale ? real : real + (s.simOffset || 0), speed: 1 } });
          if (stale) get().reseed(s.myPos);
          useNow.setState({ now: nowSim() });
          set({ hydrated: true });
        },

        nowSim,

        /**
         * Appelé chaque seconde : confirmations J-1 / H-1, annulations automatiques,
         * passages en live, rappels, fins d'événements, rotation des séances régulières.
         */
        tick: () => {
          const s = get();
          const now = simNow(s.clock);
          useNow.setState({ now });
          if (!s.hydrated) return;

          let events = s.events;
          let changed = false;
          const notifs: NotifInput[] = [];
          const toasts: ToastInput[] = [];
          const put = (e: RdvEvent) => {
            if (!changed) {
              events = { ...events };
              changed = true;
            }
            events[e.id] = e;
          };
          const drop = (id: string) => {
            if (!changed) {
              events = { ...events };
              changed = true;
            }
            delete events[id];
          };

          for (const e0 of Object.values(s.events)) {
            let e = e0;
            const mine = isMine(e);
            const joined = isJoined(e);
            const label = quoted(e.title);

            if (e.cancelled) {
              if (!mine && !joined && now - e.cancelled.at > HOUR) drop(e.id);
              continue;
            }

            const t = timing(e, now);
            // Régulier sans plus aucune séance : rien à planifier.
            if (!Number.isFinite(t.start)) continue;

            // Nouvelle séance d'un événement régulier : les inscriptions repartent (sauf la tienne).
            if (e.kind === 'regular' && e.occurrenceKey !== t.start) {
              let occMap = e.occ;
              // Saut dans le temps par-dessus une séance dont la confirmation était en attente :
              // sans réponse, cette séance est annulée automatiquement.
              if (mine && e.occurrenceKey !== undefined && e.occurrenceKey < t.start) {
                const prevKey = String(e.occurrenceKey);
                const prev = e.occ[prevKey];
                if (prev && !prev.cancelled && (prev.j1 === 'pending' || prev.h1 === 'pending')) {
                  occMap = {
                    ...e.occ,
                    [prevKey]: {
                      ...prev,
                      j1: prev.j1 === 'pending' ? 'expired' : prev.j1,
                      h1: prev.h1 === 'pending' ? 'expired' : prev.h1,
                      cancelled: 'no-response',
                    },
                  };
                  notifs.push({
                    kind: 'cancel',
                    title: `La séance de ${label} (${fmtDay(e.occurrenceKey, now).toLowerCase()} ${fmtTime(e.occurrenceKey)}) a été annulée automatiquement`,
                    body: "Tu n'as pas répondu à la demande de confirmation.",
                    eventId: e.id,
                  });
                }
              }
              const fresh = mine ? [] : regularsFor(e);
              e = {
                ...e,
                occ: occMap,
                occurrenceKey: t.start,
                participants: joined ? ['me', ...fresh] : fresh,
                fullAt: undefined,
              };
              put(e);
            }

            const key = String(t.start);
            const occ: OccurrenceState = { ...(e.occ[key] ?? {}) };
            let occChanged = false;
            let cancelReason: CancelReason | null = null;

            // Annulation automatique : demandes de confirmation à l'organisateur (toi).
            if (mine && e.kind !== 'live') {
              if (
                occ.j1 === undefined &&
                now >= t.start - DAY &&
                now < t.start - HOUR &&
                e.createdAt <= t.start - DAY
              ) {
                occ.j1 = 'pending';
                occChanged = true;
                notifs.push({
                  kind: 'confirm',
                  title: `Confirmes-tu ${label} ?`,
                  body: `Ton RDV a lieu ${fmtDay(t.start, now).toLowerCase()} à ${fmtTime(t.start)}. Sans réponse avant H-1, il sera annulé automatiquement.`,
                  eventId: e.id,
                  confirm: { eventId: e.id, occKey: key, stage: 'j1' },
                });
                toasts.push({
                  tone: 'brand',
                  title: 'Demande de confirmation (J-1)',
                  body: `Confirmes-tu ${label} ? Réponds depuis les notifications 🔔`,
                  eventId: e.id,
                });
              }
              if (occ.j1 === 'pending' && now >= t.start - HOUR) {
                occ.j1 = 'expired';
                occChanged = true;
                cancelReason = 'no-response';
              } else if (
                occ.h1 === undefined &&
                now >= t.start - HOUR &&
                now < t.start &&
                e.createdAt <= t.start - HOUR
              ) {
                occ.h1 = 'pending';
                occChanged = true;
                notifs.push({
                  kind: 'confirm',
                  title: `Dernière confirmation : ${label}`,
                  body: `Ça commence à ${fmtTime(t.start)}. Sans réponse d'ici là, le RDV sera annulé.`,
                  eventId: e.id,
                  confirm: { eventId: e.id, occKey: key, stage: 'h1' },
                });
                toasts.push({
                  tone: 'brand',
                  title: 'Confirmation H-1',
                  body: `${label} commence dans 1 h. Tu confirmes ?`,
                  eventId: e.id,
                });
              }
              if (!cancelReason && occ.h1 === 'pending' && now >= t.start) {
                occ.h1 = 'expired';
                occChanged = true;
                cancelReason = 'no-response';
              }
            }

            // Organisateurs fictifs qui ne confirment pas.
            if (!mine && e.sim?.willCancel && e.kind !== 'live' && now < t.start) {
              const threshold = e.sim.willCancel === 'j1' ? t.start - DAY + 3 * HOUR : t.start - 45 * MIN;
              if (now >= threshold) cancelReason = 'organizer';
            }

            if (cancelReason) {
              const n = e.participants.filter((p) => p !== 'me').length;
              const series = e.kind === 'regular';
              const updated = cancelOccurrence(e, key, occ, cancelReason, now, 'occurrence');
              put(updated);
              const what = series
                ? `La séance de ${label} (${fmtDay(t.start, now).toLowerCase()} ${fmtTime(t.start)})`
                : label;
              if (mine) {
                notifs.push({
                  kind: 'cancel',
                  title: `${what} a été annulé${series ? 'e' : ''} automatiquement`,
                  body: `Tu n'as pas répondu à la demande de confirmation. ${plural(n, 'participant prévenu', 'participants prévenus')}.`,
                  eventId: e.id,
                });
                toasts.push({ tone: 'danger', title: `${label} annulé`, body: "Pas de réponse à la demande de confirmation.", eventId: e.id });
              } else if (joined) {
                notifs.push({
                  kind: 'cancel',
                  title: `${what} est annulé${series ? 'e' : ''}`,
                  body: `${orgName(e)} (orga) n'a pas confirmé sa présence. Désolé !`,
                  eventId: e.id,
                });
                toasts.push({ tone: 'danger', title: `${label} est annulé`, body: `${orgName(e)} n'a pas confirmé.`, eventId: e.id });
              }
              continue;
            }

            const phase = now < t.start ? 'upcoming' : now < t.end ? 'live' : 'ended';
            if (mine || joined) {
              if (phase === 'live' && e.kind !== 'live' && !occ.liveNotified) {
                occ.liveNotified = true;
                occChanged = true;
                notifs.push({
                  kind: 'live',
                  title: `${label} passe en live 🟢`,
                  body: mine
                    ? 'Ton RDV commence : il apparaît maintenant en vert sur la carte.'
                    : `C'est parti ! Rendez-vous ${e.place.label}.`,
                  eventId: e.id,
                });
                toasts.push({ tone: 'live', title: `${label} est en direct`, body: 'Il passe au vert sur la carte.', eventId: e.id });
              }
              if (joined && !mine && e.kind !== 'live' && !occ.reminderSent && now >= t.start - HOUR && now < t.start) {
                occ.reminderSent = true;
                occChanged = true;
                notifs.push({
                  kind: 'reminder',
                  title: `Rappel : ${label} dans 1 h`,
                  body: `${fmtTime(t.start)} · ${e.place.label}`,
                  eventId: e.id,
                });
              }
              if (phase === 'ended' && e.kind !== 'regular' && !occ.endedNotified) {
                occ.endedNotified = true;
                occChanged = true;
                notifs.push({
                  kind: 'ended',
                  title: `${label} est terminé`,
                  body: mine
                    ? `Merci d'avoir organisé ! ${plural(takenCount(e), 'personne a participé', 'personnes ont participé')}.`
                    : 'On espère que c’était top 🙌',
                  eventId: e.id,
                });
              }
            } else if (phase === 'ended' && now - t.end > 2 * HOUR) {
              drop(e.id);
              continue;
            }

            if (occChanged) put({ ...e, occ: { ...e.occ, [key]: occ } });
          }

          if (changed) set({ events });
          notify(notifs, now);
          toasts.slice(0, 3).forEach(toast);
        },

        // ——————————————————— Interface ———————————————————

        select: (id, opts) => {
          set({ selectedId: id });
          if (id && opts?.fly) {
            const e = get().events[id];
            if (e) get().flyTo(e.place, undefined, true);
          }
        },
        togglePanel: (p) => set((s) => ({ panel: s.panel === p && !s.selectedId ? null : p, selectedId: null })),
        closeDrawer: () => set({ panel: null, selectedId: null }),
        openCreate: (preset) => set({ createOpen: true, createPreset: preset ?? null }),
        closeCreate: () => set({ createOpen: false, createPreset: null }),
        flyTo: (p, zoom, offset) =>
          set((s) => ({ flyTarget: { lat: p.lat, lng: p.lng, zoom, offset, key: (s.flyTarget?.key ?? 0) + 1 } })),
        setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
        resetFilters: () => set((s) => ({ filters: { ...DEFAULT_FILTERS, radiusKm: s.filters.radiusKm } })),
        toast,
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        markAllRead: () =>
          set((s) => (s.notifs.some((n) => !n.read) ? { notifs: s.notifs.map((n) => (n.read ? n : { ...n, read: true })) } : s)),
        setMeName: (name) => set({ me: { name } }),
        dismissIntro: () => set({ introSeen: true }),

        // ——————————————————— Événements ———————————————————

        createEvent: (d) => {
          const now = nowSim();
          const e: RdvEvent = {
            id: uid('e'),
            kind: d.kind,
            title: d.title.trim(),
            emoji: CATEGORIES[d.category].emoji,
            category: d.category,
            description: d.description.trim(),
            capacity: d.capacity,
            alreadyPresent: d.alreadyPresent,
            participants: [],
            place: { ...d.place, label: d.place.label.trim() },
            startAt: d.kind === 'live' ? now : d.kind === 'event' ? d.startAt : undefined,
            recurrence: d.kind === 'regular' ? d.recurrence : undefined,
            durationMin: d.durationMin,
            organizerId: 'me',
            createdAt: now,
            occ: {},
            media: d.media,
          };
          if (e.kind === 'regular') e.occurrenceKey = timing(e, now).start;

          const s = get();
          // Si les filtres actifs masquent le nouveau RDV, on les réinitialise.
          const filters = matchesFilters(e, s.filters, s.myPos, now)
            ? s.filters
            : { ...DEFAULT_FILTERS, radiusKm: Math.max(DEFAULT_FILTERS.radiusKm, Math.ceil(distanceKm(s.myPos, e.place)) + 1) };
          set({ events: { ...s.events, [e.id]: e }, createOpen: false, createPreset: null, panel: null, selectedId: e.id, filters });
          get().flyTo(e.place, 16, true);

          const missing = remainingSpots(e);
          const t = timing(e, now);
          toast({
            tone: e.kind === 'live' ? 'live' : 'success',
            title: 'RDV publié ! 🎉',
            body:
              e.kind === 'live'
                ? `Ton live est en vert sur la carte. Il manque ${plural(missing, 'personne')}.`
                : `Les gens du coin peuvent le rejoindre. Il manque ${plural(missing, 'personne')}.`,
            eventId: e.id,
          });
          notify([
            {
              kind: 'info',
              title: `Ton RDV ${quoted(e.title)} est en ligne`,
              body:
                e.kind === 'live'
                  ? `Il est visible en vert jusqu'à ${fmtTime(t.end)}. Dès qu'il est complet, il disparaît de la carte.`
                  : `Tu recevras une demande de confirmation 24 h puis 1 h avant (${fmtDay(t.start, now).toLowerCase()} à ${fmtTime(t.start)}). Sans réponse, il sera annulé automatiquement.`,
              eventId: e.id,
            },
          ]);
          if (s.simEnabled) {
            setTimeout(() => get().simJoin(e.id), rand(2500, 4000));
            setTimeout(() => get().simJoin(e.id), rand(7000, 10000));
          }
        },

        join: (id) => {
          const e = get().events[id];
          const now = nowSim();
          if (!e || isMine(e) || isJoined(e) || isFull(e) || !isActive(e, now)) return;
          const becameFull = remainingSpots(e) === 1;
          patchEvent({ ...e, participants: [...e.participants, 'me'], fullAt: becameFull ? Date.now() : e.fullAt });

          const t = timing(e, now);
          const when = phaseOf(e, now) === 'live' ? 'maintenant' : `${fmtDay(t.start, now).toLowerCase()} à ${fmtTime(t.start)}`;
          toast(
            becameFull
              ? { tone: 'success', title: 'Tu as eu la dernière place ! 🎉', body: `${quoted(e.title)} est complet : il disparaît de la carte.`, eventId: id }
              : { tone: 'success', title: `Tu participes à ${quoted(e.title)}`, body: `Rendez-vous ${when} · ${e.place.label}` },
          );
          notify([
            {
              kind: 'success',
              title: `Inscription confirmée : ${quoted(e.title)}`,
              body: `Rendez-vous ${when} · ${e.place.label}. ${orgName(e)} est au courant.`,
              eventId: id,
            },
          ]);

          if (get().simEnabled) {
            const org = e.organizerId;
            setTimeout(() => {
              const cur = get().events[id];
              if (!cur || !isJoined(cur)) return;
              const msg = pick(WELCOME_MESSAGES);
              notify([{ kind: 'message', title: `${firstNameOf(org)} (orga) · ${cur.title}`, body: msg, eventId: id, personId: org }]);
              toast({ tone: 'info', title: `💬 ${firstNameOf(org)}`, body: msg, eventId: id });
            }, rand(2500, 5000));
          }
        },

        leave: (id) => {
          const e = get().events[id];
          if (!e || !isJoined(e)) return;
          const wasFull = isFull(e);
          patchEvent({ ...e, participants: e.participants.filter((p) => p !== 'me'), fullAt: undefined });
          const others = e.participants.filter((p) => p !== 'me').length;
          const who = `${orgName(e)} (orga) et ${plural(others, 'participant')}`;
          toast({
            tone: 'warn',
            title: `Désinscription de ${quoted(e.title)}`,
            body: `Notification envoyée à ${who}.${wasFull ? ' Une place se libère : le RDV réapparaît sur la carte.' : ''}`,
          });
          notify([{ kind: 'leave', title: `Tu t’es retiré·e de ${quoted(e.title)}`, body: `${who} ont été prévenus.`, eventId: id }]);
        },

        cancelEvent: (id, scope = 'series') => {
          const e = get().events[id];
          const now = nowSim();
          if (!e || !isMine(e) || e.cancelled) return;
          const t = timing(e, now);
          const key = String(t.start);
          const n = e.participants.length;
          const updated = cancelOccurrence(e, key, { ...(e.occ[key] ?? {}) }, 'manual', now, scope);
          patchEvent(updated);
          const prevenus = plural(n, 'participant prévenu', 'participants prévenus');
          if (e.kind === 'regular' && scope === 'occurrence') {
            const next = timing(updated, now).start;
            const title = `Séance annulée (${fmtDay(t.start, now).toLowerCase()} ${fmtTime(t.start)})`;
            const body = `${prevenus}. Prochaine séance : ${fmtDay(next, now).toLowerCase()} à ${fmtTime(next)}.`;
            toast({ tone: 'warn', title, body, eventId: id });
            notify([{ kind: 'cancel', title: `${quoted(e.title)} · ${title.toLowerCase()}`, body, eventId: id }]);
          } else {
            toast({ tone: 'danger', title: `${quoted(e.title)} est annulé`, body: `${prevenus}.`, eventId: id });
            notify([{ kind: 'cancel', title: `Tu as annulé ${quoted(e.title)}`, body: `${prevenus}.`, eventId: id }]);
          }
        },

        respondConfirm: (id, occKey, stage, yes) => {
          const e = get().events[id];
          const now = nowSim();
          if (!e || e.cancelled) return;
          const occ: OccurrenceState = { ...(e.occ[occKey] ?? {}) };
          if (occ[stage] !== 'pending') return;
          if (String(timing(e, now).start) !== occKey) {
            occ[stage] = 'expired';
            patchEvent({ ...e, occ: { ...e.occ, [occKey]: occ } });
            toast({ tone: 'info', title: 'Cette demande a expiré' });
            return;
          }
          if (yes) {
            occ[stage] = 'yes';
            patchEvent({ ...e, occ: { ...e.occ, [occKey]: occ } });
            toast({ tone: 'success', title: 'RDV confirmé ✅', body: `${quoted(e.title)} est maintenu.`, eventId: id });
            notify([
              {
                kind: 'success',
                title: `${quoted(e.title)} confirmé`,
                body: stage === 'j1' ? 'Une dernière confirmation te sera demandée 1 h avant.' : 'Bon RDV ! 🙌',
                eventId: id,
              },
            ]);
          } else {
            occ[stage] = 'no';
            const n = e.participants.length;
            patchEvent(cancelOccurrence(e, occKey, occ, 'declined', now, 'occurrence'));
            const prevenus = plural(n, 'participant prévenu', 'participants prévenus');
            toast({ tone: 'danger', title: `${quoted(e.title)} annulé`, body: `${prevenus}.`, eventId: id });
            notify([{ kind: 'cancel', title: `${quoted(e.title)} annulé`, body: `Tu as répondu « non » à la confirmation. ${prevenus}.`, eventId: id }]);
          }
        },

        // ——————————————————— Simulation ———————————————————

        setSimEnabled: (on) => set({ simEnabled: on }),

        /** Un habitant fictif rejoint un RDV (en priorité les tiens). */
        simJoin: (targetId) => {
          const s = get();
          const now = nowSim();
          let target = targetId ? s.events[targetId] : undefined;
          if (!targetId) {
            const active = Object.values(s.events).filter(
              (e) => isActive(e, now) && !isFull(e) && distanceKm(s.myPos, e.place) <= 60,
            );
            // Tes RDV tout juste créés se remplissent vite (effet démo) ; les plus anciens, tranquillement.
            const mineOpen = active.filter(isMine);
            const fresh = mineOpen.filter((e) => now - e.createdAt < 15 * MIN);
            if (fresh.length && chance(0.7)) target = pick(fresh);
            else if (mineOpen.length && chance(0.12)) target = pick(mineOpen);
            else {
              // On évite de vider la carte trop vite : remplir la dernière place reste plus rare.
              const others = active.filter((e) => !isMine(e) && (remainingSpots(e) > 1 || chance(0.3)));
              if (others.length) target = pick(others);
            }
          }
          if (!target || !isActive(target, now) || isFull(target)) return;
          const e = target;
          const candidates = PEOPLE.filter((p) => p.id !== e.organizerId && !e.participants.includes(p.id));
          if (!candidates.length) return;
          const person = pick(candidates);
          const becameFull = remainingSpots(e) === 1;
          const updated: RdvEvent = {
            ...e,
            participants: [...e.participants, person.id],
            fullAt: becameFull ? Date.now() : e.fullAt,
          };
          patchEvent(updated);

          const label = quoted(e.title);
          if (isMine(e)) {
            const rem = remainingSpots(updated);
            notify([
              {
                kind: 'join',
                title: `${person.firstName} a rejoint ${label}`,
                body: `${takenCount(updated)}/${updated.capacity} · ${becameFull ? 'complet !' : plural(rem, 'place restante', 'places restantes')}`,
                eventId: e.id,
                personId: person.id,
              },
            ]);
            if (becameFull) {
              notify([
                {
                  kind: 'full',
                  title: `${label} est complet 🎉`,
                  body: "Il n'apparaît plus sur la carte. Tous les participants ont été prévenus.",
                  eventId: e.id,
                },
              ]);
              toast({ tone: 'success', title: `${label} est complet ! 🎉`, body: 'Il disparaît de la carte.', eventId: e.id });
            } else {
              toast({ tone: 'info', title: `${person.firstName} a rejoint ton RDV`, body: `${label} · ${plural(rem, 'place restante', 'places restantes')}`, eventId: e.id });
            }
          } else if (isJoined(e) && becameFull) {
            notify([{ kind: 'full', title: `${label} est complet`, body: 'Tu as eu ta place à temps 😉', eventId: e.id }]);
          }
        },

        /** Un habitant fictif se désinscrit (notification à l'orga et aux participants). */
        simLeave: (force) => {
          const s = get();
          const now = nowSim();
          const withSims = (e: RdvEvent) => e.participants.some((p) => p !== 'me');
          const involved = Object.values(s.events).filter(
            (e) => isActive(e, now) && (isMine(e) || isJoined(e)) && withSims(e),
          );
          if (!involved.length) {
            if (!force) return;
            const others = Object.values(s.events).filter((e) => isActive(e, now) && withSims(e));
            if (!others.length) return;
            const e = pick(others);
            const pid = pick(e.participants.filter((p) => p !== 'me'));
            patchEvent({ ...e, participants: e.participants.filter((p) => p !== pid), fullAt: undefined });
            toast({ tone: 'warn', title: `${firstNameOf(pid)} s'est désinscrit·e de ${quoted(e.title)}`, body: 'L’orga et les participants ont été prévenus.', eventId: e.id });
            return;
          }
          const e = pick(involved);
          const pid = pick(e.participants.filter((p) => p !== 'me'));
          const wasFull = isFull(e);
          const updated = { ...e, participants: e.participants.filter((p) => p !== pid), fullAt: undefined };
          patchEvent(updated);
          const rem = remainingSpots(updated);
          const body = wasFull
            ? 'Une place se libère : le RDV réapparaît sur la carte.'
            : `${plural(rem, 'place restante', 'places restantes')}.${isMine(e) ? '' : ' L’orga et les participants ont été prévenus.'}`;
          notify([
            {
              kind: 'leave',
              title: `${firstNameOf(pid)} a annulé sa participation à ${quoted(e.title)}`,
              body,
              eventId: e.id,
              personId: pid,
            },
          ]);
          toast({ tone: 'warn', title: `${firstNameOf(pid)} s'est désinscrit·e`, body: `${quoted(e.title)} · ${body}`, eventId: e.id });
        },

        /** Un habitant fictif lance un live à proximité. */
        spawnLive: (force) => {
          const s = get();
          const now = nowSim();
          const lives = Object.values(s.events).filter(
            (e) => e.kind === 'live' && !isMine(e) && isActive(e, now) && !isFull(e),
          );
          if (!force && lives.length >= 7) return;
          const e = makeLiveEvent(s.myPos, now);
          patchEvent(e);
          const dist = fmtDistance(distanceKm(s.myPos, e.place));
          const missing = remainingSpots(e);
          notify([
            {
              kind: 'live',
              title: `Nouveau live à ${dist} : ${e.title}`,
              body: `${e.place.label} · il manque ${plural(missing, 'personne')}`,
              eventId: e.id,
            },
          ]);
          toast({
            tone: 'live',
            title: `🟢 Live à ${dist} : ${e.title}`,
            body: `${firstNameOf(e.organizerId)} cherche ${plural(missing, 'personne')} · ${e.place.label}`,
            eventId: e.id,
          });
        },

        /** Garde un stock d'événements planifiés autour de l'utilisateur. */
        spawnPlanned: () => {
          const s = get();
          const now = nowSim();
          const planned = Object.values(s.events).filter(
            (e) => e.kind !== 'live' && !isMine(e) && isActive(e, now) && !isFull(e) && distanceKm(s.myPos, e.place) < 25,
          );
          if (planned.length >= 18) return;
          patchEvent(makePlannedEvent(s.myPos, now));
        },

        jump: (ms) => setClock({ anchorReal: Date.now(), anchorSim: nowSim() + ms, speed: get().clock.speed }),
        jumpTo: (ts) => setClock({ anchorReal: Date.now(), anchorSim: ts, speed: get().clock.speed }),
        setSpeed: (speed) => setClock({ anchorReal: Date.now(), anchorSim: nowSim(), speed }),
        resetClock: () => setClock({ anchorReal: Date.now(), anchorSim: Date.now(), speed: 1 }),

        resetDemo: () => {
          const real = Date.now();
          const center = get().myPos;
          const events = seedWorld(center, real, { includeMine: true });
          set({
            clock: { anchorReal: real, anchorSim: real, speed: 1 },
            events,
            notifs: welcomeNotifs(events, real),
            seededAt: real,
            filters: DEFAULT_FILTERS,
            selectedId: null,
            panel: null,
            simEnabled: true,
            toasts: [],
          });
          useNow.setState({ now: real });
          get().flyTo(center, 14);
          toast({ tone: 'info', title: 'Démo réinitialisée', body: 'Nouveaux RDV générés autour de toi.' });
        },

        // ——————————————————— Position ———————————————————

        initGeolocation: () => {
          if (get().geoAsked || typeof navigator === 'undefined' || !navigator.geolocation) return;
          set({ geoAsked: true });
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              if (isNearGrenoble(p)) {
                set({ myPos: { ...p, label: 'Ma position' }, posMode: 'real' });
                get().flyTo(p, 15);
                toast({ tone: 'info', title: '📍 Position détectée', body: 'Voici les RDV autour de toi.' });
              } else {
                toast({
                  tone: 'info',
                  title: 'Démo centrée sur Grenoble',
                  body: 'Tu sembles loin de Grenoble. Ouvre le panneau « Démo » pour générer des RDV autour de toi.',
                });
              }
            },
            () => {},
            { timeout: 10_000, maximumAge: 10 * MIN },
          );
        },

        useRealPosition: () => {
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            toast({ tone: 'danger', title: 'Géolocalisation indisponible sur ce navigateur' });
            return;
          }
          set({ locating: true });
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const p: Place = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Ma position' };
              set({ myPos: p, posMode: 'real', locating: false });
              get().ensureContentAround(p);
              get().flyTo(p, 14);
              toast({ tone: 'success', title: '📍 Position mise à jour' });
            },
            (err) => {
              set({ locating: false });
              toast({
                tone: 'danger',
                title: 'Géolocalisation impossible',
                body: err.code === 1 ? 'Autorise l’accès à ta position dans le navigateur.' : 'Position indisponible pour le moment.',
              });
            },
            { enableHighAccuracy: true, timeout: 12_000 },
          );
        },

        useDemoPosition: () => {
          set({ myPos: DEMO_HOME, posMode: 'demo' });
          get().ensureContentAround(DEMO_HOME);
          get().flyTo(DEMO_HOME, 14);
        },

        ensureContentAround: (p) => {
          const now = nowSim();
          const near = Object.values(get().events).filter(
            (e) => !isMine(e) && isActive(e, now) && distanceKm(p, e.place) < 15,
          ).length;
          if (near >= 6) return;
          get().reseed(p);
          toast({ tone: 'info', title: 'RDV générés autour de toi', body: 'La démo a créé des événements fictifs dans ton quartier.' });
        },

        reseed: (center) => {
          const now = nowSim();
          const s = get();
          // On garde tes RDV et ceux auxquels tu es inscrit ; le reste est régénéré.
          const kept = Object.fromEntries(Object.entries(s.events).filter(([, e]) => isMine(e) || isJoined(e)));
          const hasActiveMine = Object.values(kept).some((e) => isMine(e) && isActive(e, now));
          const fresh = seedWorld(center, now, { includeMine: !hasActiveMine });
          const events = { ...fresh, ...kept };
          set({ events, seededAt: Date.now(), notifs: s.notifs.length ? s.notifs : welcomeNotifs(events, now) });
        },
      };
    },
    {
      name: 'rdv-demo',
      version: 1,
      storage: createIdbStorage<PersistedState>(),
      partialize: (s): PersistedState => ({
        seededAt: s.seededAt,
        simOffset: simNow(s.clock) - Date.now(),
        me: s.me,
        myPos: s.myPos,
        posMode: s.posMode,
        geoAsked: s.geoAsked,
        introSeen: s.introSeen,
        events: s.events,
        notifs: s.notifs,
        simEnabled: s.simEnabled,
        filters: s.filters,
      }),
      // Ancienne version de données : on repart d'une démo neuve.
      migrate: () => ({}) as PersistedState,
      onRehydrateStorage: () => (state) => {
        (state ?? useStore.getState()).afterHydrate();
      },
    },
  ),
);
