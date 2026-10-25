import { useMemo, useState } from 'react';
import { List } from 'lucide-react';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { mapItems } from '../lib/selectors';
import { distanceKm } from '../lib/geo';
import { timing } from '../lib/status';
import { plural } from '../lib/text';
import { EmptyState, EventCard, PanelHeader } from './ui';

export function ListPanel() {
  const events = useStore((s) => s.events);
  const filters = useStore((s) => s.filters);
  const myPos = useStore((s) => s.myPos);
  const select = useStore((s) => s.select);
  const resetFilters = useStore((s) => s.resetFilters);
  const now = useNow((s) => s.now);
  const [sort, setSort] = useState<'distance' | 'time'>('distance');

  const items = useMemo(() => {
    const list = mapItems(events, filters, myPos, now, 0).map((i) => i.e);
    return list.sort((a, b) =>
      sort === 'distance'
        ? distanceKm(myPos, a.place) - distanceKm(myPos, b.place)
        : timing(a, now).start - timing(b, now).start,
    );
  }, [events, filters, myPos, now, sort]);

  return (
    <>
      <PanelHeader
        title="Autour de toi"
        subtitle={`${plural(items.length, 'RDV', 'RDV')} à moins de ${filters.radiusKm} km`}
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
          <EmptyState emoji="🔎" title="Aucun RDV ne correspond">
            <button type="button" className="btn btn--ghost" onClick={resetFilters}>
              Effacer les filtres
            </button>
          </EmptyState>
        ) : (
          items.map((e) => <EventCard key={e.id} e={e} now={now} onClick={() => select(e.id, { fly: true })} />)
        )}
      </div>
    </>
  );
}
