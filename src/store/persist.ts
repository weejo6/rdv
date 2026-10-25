import { del, get, set } from 'idb-keyval';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * Stockage IndexedDB (via idb-keyval) : contrairement à localStorage,
 * il conserve les photos / vidéos (Blob) des événements.
 * Les écritures sont regroupées pour ne pas écrire à chaque changement.
 */
export function createIdbStorage<S>(): PersistStorage<S> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { name: string; value: StorageValue<S> } | null = null;

  const flush = () => {
    if (!pending) return;
    const { name, value } = pending;
    pending = null;
    set(name, value).catch((err) => console.warn('[RDV] Sauvegarde impossible', err));
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
  }

  return {
    getItem: async (name) => {
      try {
        return ((await get(name)) as StorageValue<S> | undefined) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pending = { name, value };
      clearTimeout(timer);
      timer = setTimeout(flush, 700);
    },
    removeItem: async (name) => {
      pending = null;
      clearTimeout(timer);
      await del(name);
    },
  };
}
