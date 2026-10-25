/**
 * État des services gratuits utilisés (Photon). S'il ne répond pas (panne, limitation),
 * on arrête de l'appeler pendant un moment au lieu d'attendre à chaque fois.
 */
let photonDownUntil = 0;

export const photonAvailable = () => Date.now() > photonDownUntil;

export const markPhotonDown = () => {
  photonDownUntil = Date.now() + 30 * 60_000;
};

/** fetch avec délai maximum. */
export async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  init?.signal?.addEventListener('abort', onAbort);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener('abort', onAbort);
  }
}
