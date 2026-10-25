import { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, MapPin, Search, Sparkles, X } from 'lucide-react';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { CATEGORIES } from '../lib/categories';
import { distanceKm, fmtDistance } from '../lib/geo';
import { findPlaces, suggestPlaces, type GeoResult } from '../lib/geocode';
import { REGIONS } from '../lib/regions';
import { isActive } from '../lib/status';
import { normalize, plural } from '../lib/text';

interface Item {
  key: string;
  section: string;
  icon: React.ReactNode;
  label: string;
  detail?: string;
  run: () => void;
}

/**
 * Recherche façon carte : villes de démo, RDV, et n'importe quel lieu (OpenStreetMap).
 * Choisir un lieu y emmène la carte ; s'il est vide, des RDV de démo y sont générés.
 */
export function SearchBox() {
  const events = useStore((s) => s.events);
  const myPos = useStore((s) => s.myPos);
  const view = useStore((s) => s.view);
  const select = useStore((s) => s.select);
  const flyTo = useStore((s) => s.flyTo);
  const exploreAt = useStore((s) => s.exploreAt);
  const toast = useStore((s) => s.toast);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const near = view?.center ?? myPos;
  const nq = normalize(q.trim());

  // Fermer en cliquant ailleurs.
  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Suggestions de lieux pendant la frappe.
  useEffect(() => {
    setPlaces([]);
    if (nq.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      const found = await suggestPlaces(q.trim(), near, ctrl.signal);
      if (!ctrl.signal.aborted) {
        setPlaces(found ?? []);
        setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nq]);

  const close = () => {
    setOpen(false);
    setQ('');
    setPlaces([]);
    inputRef.current?.blur();
  };

  const searchEverywhere = async () => {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    const found = await findPlaces(query, near);
    setLoading(false);
    if (!found.length) {
      toast({ tone: 'warn', title: 'Aucun lieu trouvé', body: `Rien pour « ${query} ».` });
      return;
    }
    close();
    void exploreAt({ lat: found[0].lat, lng: found[0].lng, label: found[0].label }, found[0].zoom);
  };

  const items = useMemo<Item[]>(() => {
    if (nq.length < 2) return [];
    const now = useNow.getState().now;
    const active = Object.values(events).filter((e) => isActive(e, now));
    const out: Item[] = [];

    for (const r of Object.values(REGIONS)) {
      if (!normalize(r.name).includes(nq)) continue;
      const count = active.filter((e) => distanceKm(e.place, r.home) < 20).length;
      out.push({
        key: `city-${r.id}`,
        section: 'Villes de démo',
        icon: <Sparkles size={16} />,
        label: r.name,
        detail: plural(count, 'RDV', 'RDV'),
        run: () => flyTo(r.home, 13),
      });
    }

    active
      .filter((e) =>
        [e.title, e.place.label, CATEGORIES[e.category].label].some((t) => normalize(t).includes(nq)),
      )
      .sort((a, b) => distanceKm(near, a.place) - distanceKm(near, b.place))
      .slice(0, 5)
      .forEach((e) =>
        out.push({
          key: `rdv-${e.id}`,
          section: 'RDV',
          icon: <span className="search__emoji">{e.emoji}</span>,
          label: e.title,
          detail: `${e.place.label} · ${fmtDistance(distanceKm(myPos, e.place))}`,
          run: () => select(e.id, { fly: true }),
        }),
      );

    places.forEach((p, i) =>
      out.push({
        key: `place-${i}-${p.lat}`,
        section: 'Lieux',
        icon: <MapPin size={16} />,
        label: p.label,
        detail: p.detail,
        run: () => void exploreAt({ lat: p.lat, lng: p.lng, label: p.label }, p.zoom),
      }),
    );

    out.push({
      key: 'search',
      section: places.length ? '' : 'Lieux',
      icon: <Search size={16} />,
      label: `Chercher « ${q.trim()} » sur la carte`,
      detail: 'Ville, adresse, parc, bar…',
      run: () => void searchEverywhere(),
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nq, events, places, near.lat, near.lng, myPos]);

  useEffect(() => setActive(0), [nq, places.length]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    if (item.key !== 'search') close();
    item.run();
  };

  let lastSection = '';
  return (
    <div className="search" ref={wrapRef}>
      <Search size={18} className="searchbar__icon" />
      <input
        ref={inputRef}
        className="searchbar__input"
        value={q}
        onChange={(ev) => {
          setQ(ev.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(ev) => {
          if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (ev.key === 'Enter') {
            ev.preventDefault();
            choose(items[active]);
          } else if (ev.key === 'Escape') {
            close();
          }
        }}
        placeholder="Rechercher une ville, un lieu, un RDV…"
        aria-label="Rechercher"
        aria-expanded={open && items.length > 0}
      />
      {loading && <LoaderCircle size={16} className="spin search__spinner" />}
      {q && (
        <button type="button" className="icon-btn icon-btn--sm" onClick={close} aria-label="Effacer">
          <X size={16} />
        </button>
      )}
      {open && items.length > 0 && (
        <div className="search__results" role="listbox">
          {items.map((it, i) => {
            const header = it.section && it.section !== lastSection ? it.section : null;
            if (it.section) lastSection = it.section;
            return (
              <div key={it.key}>
                {header && <div className="search__section">{header}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`search__item${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(it)}
                >
                  <span className="search__icon">{it.icon}</span>
                  <span className="search__text">
                    <b>{it.label}</b>
                    {it.detail && <span>{it.detail}</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
