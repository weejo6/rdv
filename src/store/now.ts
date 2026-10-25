import { create } from 'zustand';

/** Heure simulée courante, mise à jour chaque seconde (séparée du store principal). */
export const useNow = create<{ now: number }>(() => ({ now: Date.now() }));
