export const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export const chance = (p: number) => Math.random() < p;

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const uid = (prefix = '') =>
  `${prefix}${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
