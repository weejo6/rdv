import { useCallback, useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LoaderCircle, LocateFixed, Search } from 'lucide-react';
import type { Place } from '../types';
import { useStore } from '../store/store';
import { findPlaces, reverseGeocode, suggestPlaces, type GeoResult } from '../lib/geocode';
import { TILE_ATTRIBUTION, TILE_URL } from './MapView';
import { pickerIcon } from './markerIcons';

/**
 * Choix du lieu : clic sur la carte, épingle déplaçable, recherche d'adresse
 * ou géolocalisation. Le nom du lieu est déduit automatiquement (modifiable).
 */
export function LocationPicker({
  value,
  onChange,
  color,
  emoji,
  error,
}: {
  value: Place;
  onChange: (p: Place) => void;
  color: string;
  emoji: string;
  error?: string | null;
}) {
  const myPos = useStore((s) => s.myPos);
  const posMode = useStore((s) => s.posMode);
  const toast = useStore((s) => s.toast);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [naming, setNaming] = useState(false);
  const labelTouched = useRef(false);
  const requestId = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const moveTo = useCallback(
    async (lat: number, lng: number, label?: string) => {
      if (label) {
        labelTouched.current = false;
        requestId.current++;
        setNaming(false);
        onChange({ lat, lng, label });
        return;
      }
      onChange({ lat, lng, label: valueRef.current.label });
      if (labelTouched.current) return;
      const id = ++requestId.current;
      setNaming(true);
      const name = await reverseGeocode(lat, lng);
      if (id !== requestId.current) return;
      setNaming(false);
      if (name && !labelTouched.current) onChange({ ...valueRef.current, label: name });
    },
    [onChange],
  );

  // Nom automatique au premier affichage si le lieu n'en a pas.
  useEffect(() => {
    if (!value.label || value.label === 'Ma position') void moveTo(value.lat, value.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suggestions pendant la frappe (avec un petit délai).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      const found = await suggestPlaces(q, value, ctrl.signal);
      if (!ctrl.signal.aborted) {
        if (found) setResults(found);
        setSearching(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /** Entrée : recherche complète (avec le service de secours si besoin). */
  const searchNow = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    const found = await findPlaces(q, value);
    setSearching(false);
    if (found.length === 1) {
      void moveTo(found[0].lat, found[0].lng, found[0].label);
      setQuery('');
      setResults([]);
    } else setResults(found);
    if (!found.length) toast({ tone: 'warn', title: 'Aucun lieu trouvé', body: `Rien pour « ${q} ».` });
  };

  const locate = () => {
    if (posMode === 'demo' || !navigator.geolocation) {
      void moveTo(myPos.lat, myPos.lng, myPos.label);
      toast({ tone: 'info', title: '📍 Position de démo utilisée', body: myPos.label });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        void moveTo(p.coords.latitude, p.coords.longitude);
      },
      () => {
        setLocating(false);
        void moveTo(myPos.lat, myPos.lng);
        toast({ tone: 'warn', title: 'Géolocalisation indisponible', body: 'Ta dernière position connue est utilisée.' });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="picker">
      <div className="picker__search">
        <Search size={16} className="picker__search-icon" />
        <input
          className="input input--icon"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              void searchNow();
            }
          }}
          placeholder="Rechercher une adresse ou un lieu (Entrée)…"
        />
        {searching && <LoaderCircle size={16} className="spin picker__spinner" />}
        {results.length > 0 && (
          <div className="picker__results">
            {results.map((r, i) => (
              <button
                key={`${r.lat},${r.lng},${i}`}
                type="button"
                className="picker__result"
                onClick={() => {
                  void moveTo(r.lat, r.lng, r.label);
                  setResults([]);
                  setQuery('');
                }}
              >
                <b>{r.label}</b>
                <span>{r.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="picker__map">
        <MapContainer center={[value.lat, value.lng]} zoom={16} zoomControl={false} attributionControl={false}>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <PickerController value={value} onPick={(lat, lng) => void moveTo(lat, lng)} />
          <Marker
            position={[value.lat, value.lng]}
            icon={pickerIcon(color, emoji)}
            draggable
            eventHandlers={{
              dragend: (ev) => {
                const ll = (ev.target as L.Marker).getLatLng();
                void moveTo(ll.lat, ll.lng);
              },
            }}
          />
        </MapContainer>
        <button type="button" className="picker__locate" onClick={locate} disabled={locating}>
          {locating ? <LoaderCircle size={16} className="spin" /> : <LocateFixed size={16} />}
          Me géolocaliser
        </button>
      </div>
      <p className="hint">Touche la carte ou déplace l'épingle pour ajuster le lieu exact.</p>

      <div className="input-wrap">
        <input
          className={`input${error ? ' is-error' : ''}`}
          value={value.label}
          onChange={(ev) => {
            labelTouched.current = true;
            onChange({ ...value, label: ev.target.value });
          }}
          placeholder={naming ? 'Recherche du nom du lieu…' : 'Nom du lieu (ex : Parc Paul Mistral)'}
          maxLength={80}
        />
        {naming && <LoaderCircle size={16} className="spin input-wrap__spinner" />}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

function PickerController({ value, onPick }: { value: Place; onPick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useMapEvents({ click: (ev) => onPick(ev.latlng.lat, ev.latlng.lng) });
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);
  useEffect(() => {
    if (!map.getBounds().pad(-0.2).contains([value.lat, value.lng])) map.panTo([value.lat, value.lng]);
  }, [value.lat, value.lng, map]);
  return null;
}
