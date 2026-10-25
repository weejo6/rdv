import { useMemo, useState } from 'react';
import { List } from 'lucide-react';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { itemsInView } from '../lib/selectors';
import { distanceKm } from '../lib/geo';
import { timing } from '../lib/status';
import { plural } from '../lib/text';
import { EmptyState, EventCard, PanelHeader } from './ui';

export function ListPanel() {
  const events = useStore((s) => s.events);
  const filters = useStore((s) => s.filters);
  const view = useStore((s) => s.view);
  const myPos = useStore((s) => s.myPos);
  const select = useStore((s) => s.select);
  const resetFilters = useStore((s) => s.resetFilters);
  const now = useNow((s) => s.now);
  const [sort, setSort] = useState<'distance' | 'time'>('distance');

  const items = useMemo(() => {
    const list = itemsInView(events, filters, view, now);
    const ref = view?.center ?? myPos;
    return list.sort((a, b) =>
      sort === 'distance'
        ? distanceKm(ref, a.place) - distanceKm(ref, b.place)
        : timing(a, now).start - timing(b, now).start,
    );
  }, [events, filters, view, myPos, now, sort]);

  return (
    <>
      <PanelHeader
        title="Dans cette zone"
        subtitle={`${plural(items.length, 'RDV', 'RDV')} dans la partie visible de la carte`}
        icon={<List size={18} />}
      />
      <div className="sortbar">
        <span>Trier par</span>
        <button type="button" className={`tab${sort === 'distance' ? ' is-on' : ''}`} onClick={() => setSort('distance')}>
          Distance
        </button>
        <button type="button" className={`tab${sort === 'time' ? ' is-on' : ''}`} onClick={() => setSort('time')}>
          Horaire
        </button>
      </div>
      <div className="drawer__scroll">
        {items.length === 0 ? (
          <EmptyState emoji="🔎" title="Aucun RDV dans cette zone">
            Déplace la carte, dézoome ou recherche une ville.
            {(filters.kinds.length > 0 || filters.categories.length > 0) && (
              <button type="button" className="btn btn--ghost" onClick={resetFilters}>
                Effacer les filtres
              </button>
            )}
          </EmptyState>
        ) : (
          items.map((e) => <EventCard key={e.id} e={e} now={now} onClick={() => select(e.id, { fly: true })} />)
        )}
      </div>
    </>
  );
}
