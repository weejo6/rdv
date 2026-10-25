import { useMemo } from 'react';
import { Bell, List, Search, X } from 'lucide-react';
import type { CategoryId, EventKind } from '../types';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { CATEGORIES, CATEGORY_ORDER, KINDS, KIND_ORDER } from '../lib/categories';
import { mapItems } from '../lib/selectors';
import { Avatar, Logo, cssVars } from './ui';

const RADII = [1, 3, 5, 10, 25, 50, 100];

export function TopBar() {
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const panel = useStore((s) => s.panel);
  const togglePanel = useStore((s) => s.togglePanel);
  const notifs = useStore((s) => s.notifs);
  const events = useStore((s) => s.events);
  const myPos = useStore((s) => s.myPos);
  const now = useNow((s) => s.now);

  const unread = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);
  const count = useMemo(() => mapItems(events, filters, myPos, now, 0).length, [events, filters, myPos, now]);

  const toggleKind = (k: EventKind) =>
    setFilters({ kinds: filters.kinds.includes(k) ? filters.kinds.filter((x) => x !== k) : [...filters.kinds, k] });
  const toggleCat = (c: CategoryId) =>
    setFilters({
      categories: filters.categories.includes(c) ? filters.categories.filter((x) => x !== c) : [...filters.categories, c],
    });
  const noFilter = !filters.kinds.length && !filters.categories.length;

  return (
    <div className="topbar">
      <div className="searchbar">
        <div className="brand">
          <Logo size={26} />
          <span>RDV</span>
        </div>
        <Search size={18} className="searchbar__icon" />
        <input
          className="searchbar__input"
          value={filters.query}
          onChange={(ev) => setFilters({ query: ev.target.value })}
          placeholder="Rechercher un RDV, un lieu…"
          aria-label="Rechercher"
        />
        {filters.query && (
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => setFilters({ query: '' })} aria-label="Effacer">
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          className={`icon-btn${panel === 'list' ? ' is-active' : ''}`}
          onClick={() => togglePanel('list')}
          aria-label="Liste des RDV"
          title="Liste des RDV autour de toi"
        >
          <List size={20} />
          <span className="badge-count badge-count--muted">{count}</span>
        </button>
        <button
          type="button"
          className={`icon-btn${panel === 'notifs' ? ' is-active' : ''}`}
          onClick={() => togglePanel('notifs')}
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
          {unread > 0 && <span className="badge-count">{unread > 9 ? '9+' : unread}</span>}
        </button>
        <button
          type="button"
          className={`icon-btn icon-btn--avatar${panel === 'mine' ? ' is-active' : ''}`}
          onClick={() => togglePanel('mine')}
          aria-label="Mes RDV"
          title="Mes RDV"
        >
          <Avatar id="me" size={32} />
        </button>
      </div>

      <div className="chips" role="toolbar" aria-label="Filtres">
        <button type="button" className={`chip${noFilter ? ' is-on' : ''}`} onClick={resetFilters}>
          Tout
        </button>
        {KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            className={`chip chip--kind${filters.kinds.includes(k) ? ' is-on' : ''}`}
            style={cssVars({ '--c': KINDS[k].color })}
            onClick={() => toggleKind(k)}
          >
            <span className={`chip__dot${k === 'live' ? ' is-live' : ''}`} />
            {KINDS[k].plural}
          </button>
        ))}
        <span className="chip-sep" />
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${filters.categories.includes(c) ? ' is-on' : ''}`}
            onClick={() => toggleCat(c)}
          >
            <span aria-hidden="true">{CATEGORIES[c].emoji}</span>
            {CATEGORIES[c].label}
          </button>
        ))}
        <span className="chip-sep" />
        <label className="chip chip--select">
          📍
          <select
            value={filters.radiusKm}
            onChange={(ev) => setFilters({ radiusKm: Number(ev.target.value) })}
            aria-label="Rayon de recherche"
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                ≤ {r} km
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
