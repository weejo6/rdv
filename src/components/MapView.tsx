import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { RdvEvent } from '../types';
import { useStore } from '../store/store';
import { useNow } from '../store/now';
import { mapItems } from '../lib/selectors';
import { displayKind, isMine, remainingSpots } from '../lib/status';
import { eventIcon, meIcon } from './markerIcons';

// Tuiles OpenStreetMap : gratuites, sans clé d'API (attribution obligatoire).
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>';

/** Accès à la carte Leaflet depuis les boutons (zoom, recentrage). */
export const mapRef: { current: L.Map | null } = { current: null };

const canHover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;

export function MapView({ drawerOpen }: { drawerOpen: boolean }) {
  const initial = useRef(useStore.getState().myPos).current;
  const events = useStore((s) => s.events);
  const filters = useStore((s) => s.filters);
  const myPos = useStore((s) => s.myPos);
  const selectedId = useStore((s) => s.selectedId);
  const now = useNow((s) => s.now);

  const items = useMemo(() => mapItems(events, filters, now, Date.now()), [events, filters, now]);

  return (
    <MapContainer
      center={[initial.lat, initial.lng]}
      zoom={14}
      minZoom={4}
      zoomControl={false}
      className="map"
      worldCopyJump
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      <MapController drawerOpen={drawerOpen} />
      <Marker position={[myPos.lat, myPos.lng]} icon={meIcon} zIndexOffset={-500} interactive={false} keyboard={false} />
      {items.map(({ e, leaving }) => (
        <EventMarker key={e.id} e={e} now={now} leaving={leaving} selected={e.id === selectedId} />
      ))}
    </MapContainer>
  );
}

function EventMarker({ e, now, selected, leaving }: { e: RdvEvent; now: number; selected: boolean; leaving: boolean }) {
  const select = useStore((s) => s.select);
  const kind = displayKind(e, now);
  const icon = eventIcon({ kind, emoji: e.emoji, remaining: remainingSpots(e), selected, leaving, mine: isMine(e) });
  const handlers = useMemo(() => ({ click: () => select(e.id, { fly: true }) }), [e.id, select]);
  return (
    <Marker
      position={[e.place.lat, e.place.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : kind === 'live' ? 400 : 0}
      eventHandlers={handlers}
      title={e.title}
    >
      {canHover && !leaving && (
        <Tooltip direction="top" offset={[0, -44]} opacity={1} className="pin-tip">
          {e.title}
        </Tooltip>
      )}
    </Marker>
  );
}

function MapController({ drawerOpen }: { drawerOpen: boolean }) {
  const map = useMap();
  const flyTarget = useStore((s) => s.flyTarget);
  const select = useStore((s) => s.select);
  const openCreate = useStore((s) => s.openCreate);
  const setView = useStore((s) => s.setView);

  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map]);

  // La zone affichée sert à la liste « Dans cette zone » et au compteur.
  useEffect(() => {
    const update = () => {
      const b = map.getBounds();
      const c = map.getCenter();
      setView({ center: { lat: c.lat, lng: c.lng }, bounds: [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()] });
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [map, setView]);

  useMapEvents({
    click: () => {
      if (useStore.getState().selectedId) select(null);
    },
    // Clic droit / appui long : créer un RDV à cet endroit.
    contextmenu: (ev) => openCreate({ lat: ev.latlng.lat, lng: ev.latlng.lng }),
  });

  // Le panneau latéral réduit la largeur de la carte (bureau).
  useLayoutEffect(() => {
    map.invalidateSize();
  }, [drawerOpen, map]);

  useEffect(() => {
    if (!flyTarget) return;
    const zoom = flyTarget.zoom ?? Math.max(map.getZoom(), 15);
    let target = L.latLng(flyTarget.lat, flyTarget.lng);
    if (flyTarget.offset && window.innerWidth < 768) {
      const pt = map.project(target, zoom).add([0, window.innerHeight * 0.28]);
      target = map.unproject(pt, zoom);
    }
    // Carte pas encore dimensionnée (onglet masqué…) : l'animation donnerait des coordonnées invalides.
    const size = map.getSize();
    try {
      if (!size.x || !size.y || !Number.isFinite(target.lat)) map.setView([flyTarget.lat, flyTarget.lng], zoom, { animate: false });
      else map.flyTo(target, zoom, { duration: 0.8 });
    } catch {
      map.setView([flyTarget.lat, flyTarget.lng], zoom, { animate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTarget?.key]);

  return null;
}
