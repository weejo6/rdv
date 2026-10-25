import { describe, expect, it } from 'vitest';
import { distanceKm } from './geo';
import { GRENOBLE_REGION, MONTREAL_REGION, parseRegion, regionAround, regionInCity } from './regions';
import { makeSeedContext, seedWorld } from './seed';

const NOW = new Date(2026, 9, 25, 10, 0).getTime();

describe('villes faites main', () => {
  it('reconnaît Montréal et ses liens directs', () => {
    expect(regionInCity(MONTREAL_REGION.home)?.id).toBe('montreal');
    expect(parseRegion('Montréal')).toBe('montreal');
    expect(parseRegion('grenoble')).toBe('grenoble');
    expect(parseRegion('paris')).toBeNull();
  });

  it('génère le contenu de Montréal sur ses lieux', () => {
    const events = Object.values(seedWorld(makeSeedContext(MONTREAL_REGION.home, null), NOW, { home: true, areaId: 'a' }));
    expect(events.length).toBe(MONTREAL_REGION.seeds.length);
    expect(events.some((e) => e.title === 'Tam-tams du Mont-Royal')).toBe(true);
    // Tous les RDV sont dans la région montréalaise.
    expect(events.every((e) => distanceKm(MONTREAL_REGION.center, e.place) < 45)).toBe(true);
  });

  it('une ville d’arrière-plan n’a ni ton tournoi ni tes inscriptions', () => {
    const events = Object.values(seedWorld(makeSeedContext(MONTREAL_REGION.home, null), NOW, { home: false, areaId: 'm' }));
    expect(events.some((e) => e.organizerId === 'me')).toBe(false);
    expect(events.some((e) => e.participants.includes('me'))).toBe(false);
    expect(events.every((e) => e.areaId === 'm')).toBe(true);
  });

  it('chaque lieu de modèle existe dans sa ville', () => {
    for (const region of [GRENOBLE_REGION, MONTREAL_REGION]) {
      for (const tpl of region.seeds) expect(region.places[tpl.place], `${region.id}: ${tpl.place}`).toBeDefined();
      for (const key of region.urbanSpots) expect(region.places[key], `${region.id}: ${key}`).toBeDefined();
    }
  });

  it('dans l’agglomération grenobloise, les RDV sont autour de soi (pas dans le centre de Grenoble)', () => {
    const echirolles = { lat: 45.1436, lng: 5.7183 }; // ~5 km du centre
    expect(regionInCity(echirolles)).toBeNull();
    expect(regionAround(echirolles)?.id).toBe('grenoble');
    const events = Object.values(seedWorld(makeSeedContext(echirolles, null), NOW, { home: true, areaId: 'a' }));
    const near = events.filter((e) => distanceKm(echirolles, e.place) < 4);
    expect(near.length).toBeGreaterThan(events.length / 2);
  });
});
