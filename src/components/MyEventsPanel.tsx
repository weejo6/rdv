import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { RdvEvent } from '../types';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { isActive, isJoined, isMine, timing } from '../lib/status';
import { Avatar, EmptyState, EventCard } from './ui';

type Tab = 'mine' | 'joined' | 'history';

export function MyEventsPanel() {
  const events = useStore((s) => s.events);
  const me = useStore((s) => s.me);
  const setMeName = useStore((s) => s.setMeName);
  const select = useStore((s) => s.select);
  const openCreate = useStore((s) => s.openCreate);
  const closeDrawer = useStore((s) => s.closeDrawer);
  const now = useNow((s) => s.now);
  const [tab, setTab] = useState<Tab>('mine');

  const { mine, joined, history } = useMemo(() => {
    const all = Object.values(events).filter((e) => isMine(e) || isJoined(e));
    const byStart = (a: RdvEvent, b: RdvEvent) => timing(a, now).start - timing(b, now).start;
    return {
      mine: all.filter((e) => isMine(e) && isActive(e, now)).sort(byStart),
      joined: all.filter((e) => !isMine(e) && isActive(e, now)).sort(byStart),
      history: all.filter((e) => !isActive(e, now)).sort((a, b) => byStart(b, a)),
    };
  }, [events, now]);

  const list = tab === 'mine' ? mine : tab === 'joined' ? joined : history;

  return (
    <>
      <header className="profile">
        <Avatar id="me" size={52} />
        <div className="profile__text">
          <input
            className="profile__name"
            value={me.name}
            maxLength={24}
            onChange={(ev) => setMeName(ev.target.value)}
            onBlur={(ev) => !ev.target.value.trim() && setMeName('Jo')}
            aria-label="Ton prénom"
          />
          <span>
            {mine.length} organisé{mine.length > 1 ? 's' : ''} · {joined.length} inscription{joined.length > 1 ? 's' : ''}
          </span>
        </div>
        <button type="button" className="icon-btn" onClick={closeDrawer} aria-label="Fermer">
          <X size={20} />
        </button>
      </header>
      <nav className="tabs">
        <button type="button" className={`tab${tab === 'mine' ? ' is-on' : ''}`} onClick={() => setTab('mine')}>
          J'organise <span>{mine.length}</span>
        </button>
        <button type="button" className={`tab${tab === 'joined' ? ' is-on' : ''}`} onClick={() => setTab('joined')}>
          J'y vais <span>{joined.length}</span>
        </button>
        <button type="button" className={`tab${tab === 'history' ? ' is-on' : ''}`} onClick={() => setTab('history')}>
          Historique <span>{history.length}</span>
        </button>
      </nav>
      <div className="drawer__scroll">
        {list.length === 0 ? (
          tab === 'mine' ? (
            <EmptyState emoji="🗓️" title="Tu n'organises rien pour l'instant">
              <button type="button" className="btn btn--primary" onClick={() => openCreate()}>
                <Plus size={18} /> Créer un RDV
              </button>
            </EmptyState>
          ) : tab === 'joined' ? (
            <EmptyState emoji="🧭" title="Aucune inscription">
              Explore la carte et rejoins un RDV près de chez toi.
            </EmptyState>
          ) : (
            <EmptyState emoji="📜" title="Pas encore d'historique" />
          )
        ) : (
          list.map((e) => <EventCard key={e.id} e={e} now={now} onClick={() => select(e.id, { fly: true })} />)
        )}
        {tab === 'mine' && list.length > 0 && (
          <p className="muted small pad">
            Les RDV complets disparaissent de la carte mais restent visibles ici.
          </p>
        )}
      </div>
    </>
  );
}
