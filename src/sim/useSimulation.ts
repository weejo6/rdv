import { useEffect } from 'react';
import { useStore } from '../store/store';
import { chance, rand } from '../lib/random';

/**
 * Fait vivre la démo :
 * - horloge (chaque seconde) : confirmations, lives, annulations automatiques ;
 * - habitants fictifs (en temps réel) : inscriptions, désinscriptions, nouveaux lives.
 */
export function useSimulation() {
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const st = useStore.getState;
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const tickId = setInterval(() => st().tick(), 1000);
    st().tick();

    const loop = (fn: () => void, min: number, max: number, first = rand(min, max)) => {
      const run = () => {
        if (!alive) return;
        if (st().simEnabled) fn();
        schedule(rand(min, max));
      };
      const schedule = (delay: number) => {
        const id = setTimeout(() => {
          timers.delete(id);
          run();
        }, delay);
        timers.add(id);
      };
      schedule(first);
    };

    loop(() => st().simJoin(), 5_000, 10_000, 4_000);
    loop(() => chance(0.7) && st().simLeave(), 35_000, 65_000, 30_000);
    loop(() => st().spawnLive(), 40_000, 75_000, 15_000);
    loop(() => st().spawnPlanned(), 30_000, 50_000);
    loop(() => chance(0.6) && st().simChat(), 45_000, 90_000, 40_000);

    return () => {
      alive = false;
      clearInterval(tickId);
      timers.forEach(clearTimeout);
    };
  }, [hydrated]);
}
